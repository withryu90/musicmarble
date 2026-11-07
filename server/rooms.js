import {randomBytes,randomInt} from 'node:crypto';
import * as G from '../src/engine.js';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export class RoomService {
  constructor(){this.rooms=new Map();}
  code(){let code;do{code=Array.from({length:6},()=>ALPHABET[randomInt(ALPHABET.length)]).join('');}while(this.rooms.has(code));return code;}
  nickname(value){if(typeof value!=='string'||!value.trim()||value.trim().length>16)throw Error('닉네임은 1–16자로 입력해 주세요.');return value.trim();}
  create(name){this.nickname(name);if(this.rooms.size>=500)throw Error('현재 방이 많습니다. 잠시 후 다시 시도해 주세요.');const code=this.code(),room={code,members:[],state:null,revision:0,updatedAt:Date.now(),listeners:new Set()};this.rooms.set(code,room);return this.join(code,name);}
  join(code,name){const room=this.get(code);if(room.state)throw Error('이미 시작한 게임입니다. 새 방을 만들거나 기존 참가자는 이어하기를 이용해 주세요.');if(room.members.length>=5)throw Error('이 방은 정원 5명이 모두 찼습니다.');const nickname=this.nickname(name);if(room.members.some(m=>m.name===nickname))throw Error('방 안에서 다른 닉네임을 사용해 주세요.');const member={id:room.members.length,name:nickname,token:randomBytes(32).toString('hex')};room.members.push(member);this.broadcast(room);return {code:room.code,token:member.token,playerId:member.id};}
  get(code){const normalized=String(code||'').trim().toUpperCase();const room=this.rooms.get(normalized);if(!room)throw Error('방을 찾을 수 없습니다. 코드를 확인해 주세요.');return room;}
  authenticate(code,token){const room=this.get(code),member=room.members.find(m=>m.token===token);if(!member)throw Error('참가 정보를 확인할 수 없습니다. 같은 브라우저의 이어하기를 이용해 주세요.');return {room,member};}
  snapshot(room){return {code:room.code,members:room.members.map(({id,name})=>({id,name})),state:room.state,revision:room.revision};}
  broadcast(room){room.revision++;room.updatedAt=Date.now();const snapshot=this.snapshot(room);room.listeners.forEach(fn=>fn(snapshot));}
  act(code,token,{action,args=[],revision}={}){
    const {room,member}=this.authenticate(code,token);
    if(revision!==room.revision)throw Error('게임 상태가 갱신되었습니다. 화면을 확인하고 다시 시도해 주세요.');
    if(!Array.isArray(args))throw Error('잘못된 요청입니다.');
    if(action==='start'){
      if(member.id!==0)throw Error('방장만 게임을 시작할 수 있습니다.');
      if(room.state)throw Error('이미 시작된 게임입니다.');
      const config=args[0]||{};room.state=G.createGame({names:room.members.map(m=>m.name),rounds:Number(config.rounds??8),coins:Number(config.coins??1200)});
    }else{
      const state=room.state;if(!state||state.phase==='finished')throw Error('진행 중인 게임이 없습니다.');
      if(action==='resolveTrade'){
        if(!state.trade||!(member.id===state.trade.to||(args[0]===false&&member.id===state.trade.from)))throw Error('거래 제안을 받은 참가자만 수락할 수 있습니다.');
        if(typeof args[0]!=='boolean')throw Error('수락 여부를 확인해 주세요.');
        room.state=G.resolveTrade(state,args[0]);
      }else if(action==='finishGame'){
        if(member.id!==0)throw Error('방장만 게임을 종료할 수 있습니다.');room.state=G.finishGame(state);
      }else{
        if(member.id!==state.turn)throw Error('지금은 다른 참가자의 차례입니다.');
        if(state.trade)throw Error('거래 응답을 먼저 기다려 주세요.');
        const allowed={roll:s=>G.roll(s,randomInt(1,7)),buy:G.buy,upgrade:G.upgrade,sell:G.sell,startQuiz:G.startQuiz,answerQuiz:G.answerQuiz,closeFeedback:G.closeFeedback,nextTurn:G.nextTurn,proposeTrade:G.proposeTrade};
        if(!Object.hasOwn(allowed,action))throw Error('지원하지 않는 동작입니다.');
        room.state=allowed[action](state,...args);
      }
    }
    this.broadcast(room);return this.snapshot(room);
  }
  subscribe(code,token,fn){const {room}=this.authenticate(code,token);room.listeners.add(fn);fn(this.snapshot(room));return ()=>room.listeners.delete(fn);}
  cleanup(now=Date.now()){for(const [code,room] of this.rooms)if(room.listeners.size===0&&now-room.updatedAt>24*60*60*1000)this.rooms.delete(code);}
}
