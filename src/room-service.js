import {roomConfig} from './lobby-config.js?v=1477e2c29975';
import {randomInt,randomToken} from './random.js?v=1477e2c29975';
import * as G from './engine.js?v=1477e2c29975';
import {botDecision,applyBotDecision} from './bots.js?v=1477e2c29975';
import {activityChanges} from './activities.js?v=1477e2c29975';
import {drawCharacterIds,characterById} from './characters.js?v=1477e2c29975';
const CODE_DIGITS='0123456789';
export class RoomService {
  constructor({botDelay=850,random=Math.random,backgroundTimers=true}={}){this.backgroundTimers=backgroundTimers;this.rooms=new Map();this.botDelay=botDelay;this.random=random;this.botTimers=new Map();this.quizTimers=new Map();}
  code(){let code;do{code=Array.from({length:6},()=>CODE_DIGITS[randomInt(CODE_DIGITS.length)]).join('');}while(this.rooms.has(code));return code;}
  nickname(value){if(typeof value!=='string'||!value.trim()||value.trim().length>16)throw Error('닉네임은 1–16자로 입력해 주세요.');return value.trim();}
  chooseCharacter(id,used=[]){if(!id)return drawCharacterIds(1,used)[0];if(!characterById(id))throw Error('캐릭터를 다시 선택해 주세요.');if(used.includes(id))throw Error('이미 다른 참가자가 선택한 캐릭터입니다. 다른 캐릭터를 골라 주세요.');return id;}
  create(name,characterId){this.nickname(name);this.chooseCharacter(characterId);if(this.rooms.size>=500)throw Error('현재 방이 많습니다. 잠시 후 다시 시도해 주세요.');const code=this.code(),room={code,gameId:randomToken(),createdAt:Date.now(),members:[],config:roomConfig(),state:null,revision:0,updatedAt:Date.now(),listeners:new Set()};this.rooms.set(code,room);return this.join(code,name,characterId);}
  join(code,name,characterId){const room=this.get(code);if(room.state)throw Error('이미 시작한 게임입니다. 새 방을 만들거나 기존 참가자는 이어하기를 이용해 주세요.');if(room.members.length>=G.MAX_PLAYERS)throw Error('이 방은 정원 4명이 모두 찼습니다.');const nickname=this.nickname(name);if(room.members.some(m=>m.name===nickname))throw Error('방 안에서 다른 닉네임을 사용해 주세요.');const member={id:room.members.length,name:nickname,characterId:this.chooseCharacter(characterId,room.members.map(m=>m.characterId)),token:randomToken()};room.members.push(member);this.broadcast(room);return {code:room.code,token:member.token,playerId:member.id};}
  createSolo(name,{botCount=3,rounds=8,coins=1200}={},characterId){
    this.nickname(name);
    if(!Number.isInteger(botCount)||botCount<1||botCount>G.MAX_PLAYERS-1||![4,8,12].includes(rounds)||![1000,1200,1600].includes(coins))throw Error('봇 1–3명과 수업 설정을 확인해 주세요.');
    const session=this.create(name,characterId),room=this.get(session.code);
    room.mode='solo';
    const pool=['반짝이는 아르페지오','춤추는 알레그로','푸른 아다지오','설레는 크레셴도','달빛 소나타','노래하는 칸타빌레','꿈꾸는 안단테','따뜻한 레가토','경쾌한 스타카토','별빛 세레나데','빛나는 비브라토','산들바람 론도','다정한 돌체','은빛 카덴차','싱그러운 스케르초','용감한 포르테','고요한 피아니시모','낭만적인 루바토','자유로운 카프리치오','행복한 리타르단도'];
    const available=pool.filter(n=>n!==name.trim());
    for(let i=0;i<botCount;i++){
      const index=randomInt(available.length),nickname=available.splice(index,1)[0];
      room.members.push({id:i+1,name:nickname,isBot:true,characterId:drawCharacterIds(1,room.members.map(m=>m.characterId))[0]});
    }
    room.config=roomConfig({rounds,coins});room.state=G.createGame({names:room.members.map(m=>m.name),characterIds:room.members.map(m=>m.characterId),rounds,coins});
    room.state.players.forEach(p=>p.isBot=!!room.members[p.id].isBot);
    this.broadcast(room);return session;
  }
  botNeeded(room){
    const s=room.state;
    if(!s||s.phase==='finished')return false;
    return s.trade?!!s.players[s.trade.to].isBot:!!G.current(s).isBot;
  }
  scheduleBot(room){
    if(this.botTimers.has(room.code)||!room.listeners.size||!this.botNeeded(room))return;
    const timer=setTimeout(()=>{
      this.botTimers.delete(room.code);
      if(!room.listeners.size||!this.rooms.has(room.code)||!this.botNeeded(room))return;
      const decision=botDecision(room.state,room.botMemory,this.random);
      if(!decision)return;
      room.botMemory=decision.memory;
      room.state=applyBotDecision(room.state,decision,randomInt(1,7));
      this.broadcast(room);
    },this.botDelay);
    timer.unref?.();this.botTimers.set(room.code,timer);
  }
  scheduleQuiz(room){
    if(!this.backgroundTimers)return;
    clearTimeout(this.quizTimers.get(room.code));this.quizTimers.delete(room.code);
    if(!room.state?.quizDeadline||!['quiz','purchase-quiz'].includes(room.state.phase))return;
    const timer=setTimeout(()=>{
      this.quizTimers.delete(room.code);
      if(!this.rooms.has(room.code))return;
      const next=G.expireQuiz(room.state);
      if(next!==room.state){room.state=next;this.broadcast(room);}else this.scheduleQuiz(room);
    },Math.max(0,room.state.quizDeadline-Date.now()));
    timer.unref?.();this.quizTimers.set(room.code,timer);
  }
  close(){for(const timer of this.quizTimers.values())clearTimeout(timer);this.quizTimers.clear();for(const timer of this.botTimers.values())clearTimeout(timer);this.botTimers.clear();}
  get(code){const normalized=String(code||'').trim().toUpperCase();const room=this.rooms.get(normalized);if(!room)throw Error('방을 찾을 수 없습니다. 코드를 확인해 주세요.');return room;}
  authenticate(code,token){const room=this.get(code),member=room.members.find(m=>!m.isBot&&typeof token==='string'&&m.token===token);if(!member)throw Error('참가 정보를 확인할 수 없습니다. 같은 브라우저의 이어하기를 이용해 주세요.');return {room,member};}
  chat(code,token,message){
    const {room,member}=this.authenticate(code,token);
    if(typeof message!=='string'||!message.trim()||message.trim().length>200||/[\x00-\x08\x0b-\x1f\x7f]/.test(message))throw Error('채팅은 1–200자로 입력해 주세요.');
    const now=Date.now();if(member.lastChatAt!==undefined&&now-member.lastChatAt<800)throw Error('잠시 후 다시 보내 주세요.');
    member.lastChatAt=now;room.chatSeq=(room.chatSeq??0)+1;
    room.messages=[...(room.messages??[]),{id:room.chatSeq,playerId:member.id,name:member.name,characterId:member.characterId,text:message.trim(),sentAt:now}].slice(-100);
    room.updatedAt=now;const payload={code:room.code,messages:room.messages};room.chatListeners?.forEach(fn=>fn(payload));return payload;
  }
  subscribeChat(code,token,fn){const {room}=this.authenticate(code,token);room.chatListeners??=new Set();room.chatListeners.add(fn);fn({code:room.code,messages:room.messages??[]});return ()=>room.chatListeners.delete(fn);}
  snapshot(room){return {code:room.code,gameId:room.gameId||null,createdAt:room.createdAt||null,mode:room.mode||'multiplayer',config:room.config||roomConfig(),members:room.members.map(({id,name,isBot,characterId})=>({id,name,isBot:!!isBot,characterId})),state:room.state,revision:room.revision,activities:room.activities||[]};}
  broadcast(room){room.activities??=[];room.activitySeq??=0;for(const notice of activityChanges(room.publishedState,room.state))room.activities.push({...notice,id:++room.activitySeq});room.activities=room.activities.slice(-200);room.publishedState=room.state?structuredClone(room.state):null;room.revision++;room.updatedAt=Date.now();const snapshot=this.snapshot(room);room.listeners.forEach(fn=>fn(snapshot));this.scheduleBot(room);this.scheduleQuiz(room);}
  act(code,token,{action,args=[],revision}={}){
    const {room,member}=this.authenticate(code,token);
    if(room.state){const expired=G.expireQuiz(room.state);if(expired!==room.state){room.state=expired;this.broadcast(room);if(['answerQuiz','answerPurchaseQuiz','beginQuizTimer','expireQuiz'].includes(action))return this.snapshot(room);}}
    if(revision!==room.revision)throw Error('게임 상태가 갱신되었습니다. 화면을 확인하고 다시 시도해 주세요.');
    if(!Array.isArray(args))throw Error('잘못된 요청입니다.');
    if(action==='rerollCharacter'){
      const canSoloRedraw=room.mode==='solo'&&room.state?.round===1&&room.state.turn===member.id&&room.state.phase==='roll'&&room.state.dice===null;
      if(room.state&&!canSoloRedraw)throw Error('게임을 시작한 뒤에는 캐릭터를 바꿀 수 없습니다.');
      member.characterId=drawCharacterIds(1,room.members.map(m=>m.characterId))[0];
      if(room.state){room.state=structuredClone(room.state);room.state.players[member.id].characterId=member.characterId;}
    }else if(action==='configure'){
      if(member.id!==0)throw Error('방장만 수업 설정을 바꿀 수 있습니다.');
      if(room.state)throw Error('게임 시작 후 설정은 바꿀 수 없습니다.');
      room.config=roomConfig(args[0]||{},room.config||roomConfig());
    }else if(action==='start'){
      if(member.id!==0)throw Error('방장만 게임을 시작할 수 있습니다.');
      if(room.state)throw Error('이미 시작된 게임입니다.');
      const config=roomConfig(args[0]||{},room.config||roomConfig());room.config=config;room.state=G.createGame({names:room.members.map(m=>m.name),characterIds:room.members.map(m=>m.characterId),...config});
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
        const allowed={pauseListeningHint:s=>G.pauseListeningHint(s),resumeListeningHint:s=>G.resumeListeningHint(s),buyListeningHint:s=>G.buyListeningHint(s),refundListeningHint:s=>G.refundListeningHint(s),beginQuizTimer:s=>G.beginQuizTimer(s),expireQuiz:s=>G.expireQuiz(s),buyPlatform:G.buyPlatform,installStreaming:G.installStreaming,skipStreaming:G.skipStreaming,roll:s=>G.roll(s,randomInt(1,7)),buy:G.purchaseAndNext,purchaseAndNext:G.purchaseAndNext,skipPurchase:G.skipPurchase,startPurchaseQuiz:G.startPurchaseQuiz,answerPurchaseQuiz:G.answerPurchaseQuiz,closePurchaseFeedback:G.closePurchaseFeedback,upgrade:G.upgrade,sell:G.sell,startQuiz:G.startQuiz,answerQuiz:G.answerQuiz,closeFeedback:G.closeFeedback,nextTurn:G.nextTurn,proposeTrade:G.proposeTrade};
        if(!Object.hasOwn(allowed,action))throw Error('지원하지 않는 동작입니다.');
        room.state=allowed[action](state,...args);
      }
    }
    this.broadcast(room);return this.snapshot(room);
  }
  subscribe(code,token,fn){const {room}=this.authenticate(code,token);room.listeners.add(fn);fn(this.snapshot(room));this.scheduleBot(room);this.scheduleQuiz(room);return ()=>{room.listeners.delete(fn);if(!room.listeners.size){clearTimeout(this.botTimers.get(room.code));this.botTimers.delete(room.code);}};}
  cleanup(now=Date.now()){for(const [code,room] of this.rooms)if(room.listeners.size===0&&now-room.updatedAt>24*60*60*1000){clearTimeout(this.botTimers.get(code));this.botTimers.delete(code);clearTimeout(this.quizTimers.get(code));this.quizTimers.delete(code);this.rooms.delete(code);}}
}
