import {RoomService} from '../../src/room-service.js';
import {expireQuiz} from '../../src/engine.js';
// Expire before the next 15-minute cleanup tick.
const TTL=(24*60-15)*60*1000;
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const sessionFor=(room,member)=>({code:room.code,playerId:member.id,token:member.token,transport:'https'});
const encode=room=>JSON.stringify({...room,listeners:undefined,chatListeners:undefined,publishedState:undefined});
function serviceFor(payload){
 const service=new RoomService({backgroundTimers:false});
 if(payload){const room=JSON.parse(payload);room.listeners=new Set();room.chatListeners=new Set();room.publishedState=room.state?structuredClone(room.state):null;service.rooms.set(room.code,room);}
 return service;
}
const snapshot=(service,room)=>({...service.snapshot(room),messages:room.messages||[],chatSeq:room.chatSeq||0});
const changed=result=>Number(result.meta?.changes??result.changes??0);
export async function onlineRoomRequest(db,path,body,now=Date.now()){
 if(path==='create'){
  if(typeof body.requestId!=='string'||!/^[a-f0-9]{64}$/.test(body.requestId))fail('방 생성 정보를 확인해 주세요.');
  const existing=await db.prepare('SELECT * FROM online_rooms WHERE create_key = ? AND expires_at > ?').bind(body.requestId,now).first();
  if(existing){const room=JSON.parse(existing.payload);return sessionFor(room,room.members[0]);}
  await db.prepare('DELETE FROM online_rooms WHERE expires_at <= ?').bind(now).run();
  const count=await db.prepare('SELECT COUNT(*) AS total FROM online_rooms').first();if(count.total>=500)fail('현재 방이 많습니다. 잠시 후 다시 시도해 주세요.',503);
  for(let retry=0;retry<10;retry++){
   const service=serviceFor(),session=service.create(body.nickname,body.characterId),room=service.get(session.code);
   const result=await db.prepare('INSERT OR IGNORE INTO online_rooms (code, create_key, payload, version, expires_at) VALUES (?, ?, ?, 1, ?)').bind(room.code,body.requestId,encode(room),now+TTL).run();
   if(changed(result))return {...session,transport:'https'};
   const duplicate=await db.prepare('SELECT * FROM online_rooms WHERE create_key = ? AND expires_at > ?').bind(body.requestId,now).first();
   if(duplicate){const saved=JSON.parse(duplicate.payload);return sessionFor(saved,saved.members[0]);}
  }
  fail('새 코드를 만들지 못했습니다. 다시 시도해 주세요.',503);
 }
 if(typeof body.code!=='string'||!/^\d{6}$/.test(body.code))fail('숫자 6자리 공유 코드를 입력해 주세요.');
 const row=await db.prepare('SELECT * FROM online_rooms WHERE code = ? AND expires_at > ?').bind(body.code,now).first();
 if(!row)fail('방을 찾을 수 없습니다. 공유 코드를 확인해 주세요.',404);
 const service=serviceFor(row.payload),room=service.get(body.code);let result;
 if(path==='join'){
  if(typeof body.requestId!=='string'||!/^[a-f0-9]{64}$/.test(body.requestId))fail('참가 정보를 확인해 주세요.');
  const previous=room.members.find(m=>m.joinKey===body.requestId);
  if(previous)return sessionFor(room,previous);
  result=service.join(body.code,body.nickname,body.characterId);room.members[result.playerId].joinKey=body.requestId;result.transport='https';
 }else{
  let member;try{member=service.authenticate(body.code,body.token).member;}catch{fail('참가 정보를 확인할 수 없습니다. 이전 게임 이어하기를 이용해 주세요.',403);}
  if(path==='resume'){
   const expired=room.state?expireQuiz(room.state,now):null;
   if(expired&&expired!==room.state){room.state=expired;service.broadcast(room);}
   result={...snapshot(service,room),playerId:member.id};
  }else if(path==='action')result=service.act(body.code,body.token,body);
  else if(path==='chat')result=service.chat(body.code,body.token,body.message);
  else fail('지원하지 않는 요청입니다.',404);
 }
 const payload=encode(room);
 if(payload!==row.payload){
  const updated=await db.prepare('UPDATE online_rooms SET payload = ?, version = version + 1, expires_at = ? WHERE code = ? AND version = ?').bind(payload,now+TTL,room.code,row.version).run();
  if(!changed(updated))fail('게임 상태가 갱신되었습니다. 화면을 확인하고 다시 시도해 주세요.',409);
 }
 return result;
}
