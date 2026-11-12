import {RoomService} from './room-service.js?v=duel-bankruptcy-1';
import * as G from './engine.js?v=duel-bankruptcy-1';
export const PEER_PREFIX='musicmarble-rtc-v1-';
const STORE='musicmarble.peer.host.v1';
export function roomPeerId(code){if(typeof code!=='string'||!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw Error('공유 코드는 영문과 숫자 6자리로 입력해 주세요.');return PEER_PREFIX+code;}
export function peerError(error){
 const type=error?.type;
 if(type==='peer-unavailable')return '방장을 찾을 수 없어요. 공유 코드와 방장 화면이 열려 있는지 확인해 주세요.';
 if(type==='unavailable-id')return '같은 방이 다른 탭에서 열려 있거나 연결을 정리 중입니다. 잠시 후 다시 시도해 주세요.';
 if(type==='browser-incompatible')return '이 브라우저는 기기 간 연결을 지원하지 않아요. 최신 Safari·Chrome·Edge·Firefox를 이용해 주세요.';
 if(type==='network'||type==='socket-error'||type==='socket-closed'||type==='server-error'||/match.*pattern|pattern.*match|Invalid URL|WebSocket|SyntaxError/i.test(error?.message||''))return '기기 간 연결을 열지 못했어요. 네트워크와 브라우저를 확인하고 다시 시도해 주세요.';
 return error?.message||'연결을 완료하지 못했어요. 다시 시도해 주세요.';
}
let sdkPromise;
async function loadPeer(){
 if(globalThis.Peer)return globalThis.Peer;
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=new URL('./vendor/peerjs-1.5.5.min.js',import.meta.url).href;
  script.onload=()=>globalThis.Peer?resolve(globalThis.Peer):reject(Error('연결 도구를 불러오지 못했어요.'));
  script.onerror=()=>reject(Error('연결 도구를 불러오지 못했어요. 네트워크를 확인해 주세요.'));document.head.appendChild(script);
 }).catch(e=>{sdkPromise=null;throw e;});
 return sdkPromise;
}
function localStorageOrNull(){try{return globalThis.localStorage||null;}catch{return null;}}
export class PeerTransport{
 constructor({PeerClass=null,storage=localStorageOrNull(),timeout=18000,botDelay=850}={}){
  Object.assign(this,{PeerClass,storage,timeout,botDelay});this.peer=null;this.connection=null;this.service=null;this.session=null;this.listener=null;this.pending=new Map();this.connections=new Set();this.seq=0;this.unsub=[];
 }
 persist(){
  if(!this.service||!this.session)return;
  const r=this.service.get(this.session.code);
  const saved={code:r.code,gameId:r.gameId,createdAt:r.createdAt,members:r.members,state:r.state,mode:r.mode,revision:r.revision,updatedAt:r.updatedAt,activities:r.activities,activitySeq:r.activitySeq,botMemory:r.botMemory,messages:r.messages,chatSeq:r.chatSeq};
  try{this.storage?.setItem(STORE,JSON.stringify(saved));}catch{}
 }
 restore(session){
  let r;try{r=JSON.parse(this.storage?.getItem(STORE)||'null');}catch{return false;}
  if(!r||r.code!==session.code||r.members?.[0]?.token!==session.token||session.playerId!==0||!Array.isArray(r.members)||r.members.length>G.MAX_PLAYERS||r.state&&!G.isValidSave(r.state))return false;
  this.service=new RoomService({botDelay:this.botDelay});this.service.rooms.set(r.code,{...r,listeners:new Set(),chatListeners:new Set(),publishedState:r.state?structuredClone(r.state):null});this.session=session;return true;
 }
 async openPeer(id){
  const Peer=this.PeerClass||await loadPeer();
  return new Promise((resolve,reject)=>{
   let done=false,peer;
   const timer=setTimeout(()=>{if(!done){done=true;peer?.destroy();reject(Error('연결 시간이 초과됐어요. 학교망에서 막히면 다른 네트워크로 다시 시도해 주세요.'));}},this.timeout);
   try{peer=id?new Peer(id,{secure:true,debug:0}):new Peer({secure:true,debug:0});this.peer=peer;}catch(e){clearTimeout(timer);reject(Error(peerError(e)));return;}
   peer.on('connection',conn=>this.accept(conn));
   peer.on('open',()=>{if(done)return;done=true;clearTimeout(timer);resolve(peer);});
   peer.on('error',error=>{if(!done){done=true;clearTimeout(timer);peer.destroy();reject(Error(peerError(error)));}else if(error.type!=='peer-unavailable')this.listener?.onDisconnect?.(peerError(error));});
   peer.on('disconnected',()=>{if(!peer.destroyed){try{peer.reconnect();}catch{}}});
  });
 }
 accept(conn){
  if(!this.service||this.connections.size>=12){conn.close();return;}
  this.connections.add(conn);let bound=null,stops=[],started=Date.now(),count=0;
  const clear=()=>{stops.forEach(fn=>fn());stops=[];};
  const send=data=>{if(conn.open)conn.send(data);};
  conn.on('close',()=>{clear();this.connections.delete(conn);this.persist();});conn.on('error',()=>{clear();conn.close();});
  conn.on('data',packet=>{
   if(!packet||packet.kind!=='request'||typeof packet.id!=='string'||packet.id.length>60)return;
   try{
    if(JSON.stringify(packet).length>16000)throw Error('요청이 너무 큽니다.');
    if(Date.now()-started>10000){started=Date.now();count=0;}if(++count>80)throw Error('잠시 후 다시 시도해 주세요.');
    const {path,body={},session}=packet;let result;
    if(path==='join'){
     if(bound)throw Error('이미 이 방에 참가했습니다.');if(body.code!==this.session.code)throw Error('방 코드를 확인해 주세요.');
     result=this.service.join(body.code,body.nickname,body.characterId);bound=result;
    }else if(path==='resume'){
     if(session?.code!==this.session.code)throw Error('방 코드를 확인해 주세요.');
     const {room,member}=this.service.authenticate(session.code,session.token);bound={...session,playerId:member.id};result={...this.service.snapshot(room),playerId:member.id};
    }else{
     if(!bound||session?.code!==bound.code||session?.token!==bound.token)throw Error('참가 정보를 확인할 수 없습니다.');
     if(path==='subscribe'){
      clear();stops=[this.service.subscribe(bound.code,bound.token,data=>send({kind:'snapshot',data})),this.service.subscribeChat(bound.code,bound.token,data=>send({kind:'chat',data}))];result={ok:true};
     }else if(path==='unsubscribe'){clear();result={ok:true};}
     else result=this.localRequest(path,body,bound);
    }
    this.persist();send({kind:'response',id:packet.id,data:result});
   }catch(e){send({kind:'response',id:packet.id,error:peerError(e)});}
  });
 }
 async connectGuest(code){
  const id=roomPeerId(code);if(this.connection?.open&&this.connection.peer===id)return;
  this.connection?.close();if(!this.peer||this.peer.destroyed)await this.openPeer();
  const conn=this.peer.connect(id,{reliable:true,serialization:'json'});this.connection=conn;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{conn.close();reject(Error('방장과 연결하지 못했어요. 방장 화면과 네트워크를 확인해 주세요.'));},this.timeout);
   const fail=e=>{clearTimeout(timer);reject(Error(peerError(e)));};
   conn.on('open',()=>{clearTimeout(timer);resolve();});conn.on('error',fail);
   const peerFail=e=>{if(e.type==='peer-unavailable')fail(e);};this.peer.on('error',peerFail);
   conn.on('data',packet=>{
    if(packet?.kind==='response'){const pending=this.pending.get(packet.id);if(!pending)return;clearTimeout(pending.timer);this.pending.delete(packet.id);packet.error?pending.reject(Error(packet.error)):pending.resolve(packet.data);}
    else if(packet?.kind==='snapshot')this.listener?.onSnapshot?.(packet.data);
    else if(packet?.kind==='chat')this.listener?.onChat?.(packet.data);
   });
   conn.on('close',()=>{clearTimeout(timer);this.peer?.off?.('error',peerFail);for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('방장과 연결이 끊겼어요. 방장 화면을 열어 둔 뒤 이어하기를 눌러 주세요.'));}this.pending.clear();this.listener?.onDisconnect?.();});
  });
 }
 rpc(path,body,session){
  if(!this.connection?.open)return Promise.reject(Error('방장과 연결되지 않았습니다. 이어하기로 다시 연결해 주세요.'));
  if(this.pending.size>=20)return Promise.reject(Error('처리 중입니다. 잠시 후 다시 시도해 주세요.'));
  const id=String(++this.seq);
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('방장의 응답을 기다리는 중입니다. 연결을 확인해 주세요.'));},this.timeout);
   this.pending.set(id,{resolve,reject,timer});try{this.connection.send({kind:'request',id,path,body,session});}catch(e){clearTimeout(timer);this.pending.delete(id);reject(Error(peerError(e)));}
  });
 }
 localRequest(path,body,session){
  if(path==='action')return this.service.act(session.code,session.token,body);
  if(path==='chat')return this.service.chat(session.code,session.token,body.message);
  if(path==='resume'){const {room,member}=this.service.authenticate(session.code,session.token);return {...this.service.snapshot(room),playerId:member.id};}
  throw Error('지원하지 않는 요청입니다.');
 }
 async request(path,body={},session){
  try{
   if(path==='create'||path==='create-solo'){
    this.close();this.service=new RoomService({botDelay:this.botDelay});
    this.session=path==='create'?this.service.create(body.nickname,body.characterId):this.service.createSolo(body.nickname,body.config,body.characterId);
    if(path==='create'){try{await this.openPeer(roomPeerId(this.session.code));}catch(e){this.close();throw e;}}
    this.persist();return {...this.session};
   }
   if(path==='join'){
    roomPeerId(body.code);this.close();await this.connectGuest(body.code);const joined=await this.rpc(path,body,null);this.session=joined;return joined;
   }
   if(path==='resume'){
    if(!session)throw Error('저장된 참가 정보가 없습니다.');
    if(!this.service&&!this.connection?.open&&this.restore(session)){
     if(this.service.get(session.code).mode!=='solo')await this.openPeer(roomPeerId(session.code));
    }
    if(!this.service){await this.connectGuest(session.code);const result=await this.rpc(path,body,session);this.session=session;return result;}
   }
   if(this.service){const result=this.localRequest(path,body,session);this.persist();return structuredClone(result);}
   return await this.rpc(path,body,session);
  }catch(e){throw Error(peerError(e));}
 }
 subscribe(session,listener){
  this.listener=listener;let active=true;const guarded={onSnapshot:data=>{if(active){this.persist();listener.onSnapshot?.(structuredClone(data));}},onChat:data=>{if(active)listener.onChat?.(structuredClone(data));}};
  if(this.service){this.unsub=[this.service.subscribe(session.code,session.token,guarded.onSnapshot),this.service.subscribeChat(session.code,session.token,guarded.onChat)];}
  else this.rpc('subscribe',{},session).catch(e=>{if(active)listener.onDisconnect?.(e.message);});
  return {close:()=>{active=false;this.unsub.forEach(fn=>fn());this.unsub=[];if(this.listener===listener)this.listener=null;if(this.connection?.open)void this.rpc('unsubscribe',{},session).catch(()=>{});}};
 }
 close(){
  this.listener=null;this.unsub.forEach(fn=>fn());this.unsub=[];
  for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(Error('새 게임 연결로 전환했습니다.'));}this.pending.clear();
  this.connection?.close();this.connection=null;for(const conn of this.connections)conn.close();this.connections.clear();
  this.peer?.destroy();this.peer=null;this.service?.close();this.service=null;this.session=null;
 }
}
