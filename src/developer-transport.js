import * as G from './engine.js?v=3e16a89b069f';
import {BOARD,WORKS,EVENTS} from './data.js?v=3e16a89b069f';
import {purchaseQuizById} from './purchase-quizzes.js?v=3e16a89b069f';
import {RoomService} from './room-service.js?v=3e16a89b069f';
import {createRollPresentation} from './roll-presentation.js?v=3e16a89b069f';

// This service exists only in this browser. No developer action is sent to a server.
export class DeveloperTransport{
 constructor(){this.service=null;this.session=null;this.nextDice=null;this.debugRevision=0;this.connection=null;}
 create(){
  this.close();this.service=new RoomService({backgroundTimers:false});
  const host=this.service.create('개발자');for(const name of ['테스트 친구 2','테스트 친구 3','테스트 친구 4'])this.service.join(host.code,name);
  this.room=this.service.get(host.code);this.room.mode='solo';
  this.service.act(host.code,host.token,{action:'start',revision:this.room.revision});
  this.nextDice=null;this.debugRevision=1;this.connection={local:true};
  this.session={code:`DEV-LOCAL-${host.code}`,token:host.token,playerId:0,transport:'developer'};
  return {...this.session};
 }
 check(session){if(!this.service||session?.transport!=='developer'||session.code!==this.session.code||session.token!==this.session.token)throw Error('테스트 게임을 다시 시작해 주세요.');}
 snapshot(){const s=this.service.snapshot(this.room);return {...structuredClone(s),code:this.session.code,gameId:null,mode:'developer',developer:true,debugRevision:this.debugRevision,developerDice:this.nextDice,playerId:s.state.trade?.to??s.state.turn,members:s.members.filter(m=>s.state.players[m.id])};}
 clean(){
  const s=structuredClone(this.room.state);
  if(s.phase==='finished'){s.players.forEach(p=>{p.laps=0;p.withdrawn=false;});s.round=1;s.leaderLaps=0;}
  Object.assign(s,{phase:'action',endReason:null,trade:null,quiz:null,feedback:null,quizDeadline:null,purchaseChallenge:null,dice:null,quizUsed:false,purchased:false,streamingHandled:false,swapHandled:false,lastSwap:null,lastEvent:null,lastRent:null,lastAssignment:null,lastPrisonTransfer:null,lastPrisonRoll:null,lastBail:null,lastBackwardMove:null,lastConcert:null,lastStreamingRevenue:[],concertWorkId:null,turnNumber:(s.turnNumber||0)+1});
  return s;
 }
 jump(s,index){
  if(!Number.isInteger(index)||!BOARD[index])throw Error('이동할 칸을 선택해 주세요.');
  const p=G.current(s);p.position=(index-1+BOARD.length)%BOARD.length;p.skipTurns=0;p.bailPaid=false;s.phase='roll';
  this.room.publishedState=structuredClone(s);return G.roll(s,1);
 }
 debug(action,args={}){
  if(action==='set-dice'){
   if(args.dice!==null&&(!Number.isInteger(args.dice)||args.dice<1||args.dice>6))throw Error('주사위는 랜덤 또는 1–6으로 설정해 주세요.');
   this.nextDice=args.dice;this.service.broadcast(this.room);return this.snapshot();
  }
  let s=this.clean();
  if(action==='reset'){
   s=G.createGame({names:['개발자','테스트 친구 2','테스트 친구 3','테스트 친구 4']});
   this.room.members.forEach((m,i)=>m.characterId=s.players[i].characterId);this.nextDice=null;
  }else if(action==='jump')s=this.jump(s,args.index);
  else if(action==='coins'){
   if(!Number.isInteger(args.playerId)||!s.players[args.playerId]||!Number.isInteger(args.coins)||args.coins<0||args.coins>1000000)throw Error('참가자와 0–1,000,000 MC의 정수 금액을 입력해 주세요.');
   s.players[args.playerId].coins=args.coins;s.phase='roll';
  }else if(action==='player'){
   if(!Number.isInteger(args.playerId)||!s.players[args.playerId])throw Error('테스트할 참가자를 선택해 주세요.');
   s.turn=args.playerId;s.phase='roll';
  }else if(action==='ready')s.phase='roll';
  else if(action==='seed-assets'){
   for(const [i,w] of WORKS.entries())if(i<8)s.ownership[w.id]={player:i%s.players.length,level:i===0?1:0};
   s.phase='roll';
  }else if(action==='scenario'){
   const kind=args.kind;s.players.forEach(p=>{p.coins=Math.max(1500,p.coins);});
   if(['music','music-correct','music-wrong','learning'].includes(kind)){
    const w=WORKS[0];delete s.ownership[w.id];G.current(s).coins=Math.max(1500,G.current(s).coins);
    s=this.jump(s,BOARD.indexOf(w));
    s=kind==='learning'?G.startQuiz(s):G.startPurchaseQuiz(s);
    if(kind==='music-correct'||kind==='music-wrong'){const answer=purchaseQuizById(s.purchaseChallenge.questionId).answer;s=G.answerPurchaseQuiz(s,kind==='music-correct'?answer:!answer);}
   }else if(kind==='gain'||kind==='loss'){
    const cursor=s.eventCursor%s.eventDeck.length,target=s.eventDeck.indexOf(EVENTS.findIndex(e=>kind==='gain'?e.amount>0:e.amount<0));[s.eventDeck[cursor],s.eventDeck[target]]=[s.eventDeck[target],s.eventDeck[cursor]];s=this.jump(s,BOARD.findIndex(c=>c.type==='event'));
   }else if(kind==='prison'||kind==='concert'||kind==='streaming'||kind==='streaming-owned'||kind==='work-swap'||kind==='transfer'){
    if(kind==='work-swap'){s.ownership[WORKS[0].id]={player:s.turn,level:1};s.ownership[WORKS[1].id]={player:(s.turn+1)%s.players.length,level:0};}
    if(kind==='transfer'){const highest=WORKS.reduce((a,b)=>a.price>=b.price?a:b);s.ownership[WORKS[0].id]={player:s.turn,level:0};s.ownership[highest.id]={player:s.turn,level:1};}
    if(kind==='streaming')delete s.platformOwners[BOARD.find(c=>c.type==='streaming').id];
    if(kind==='streaming-owned')s.platformOwners[BOARD.find(c=>c.type==='streaming').id]=(s.turn+1)%s.players.length;
    s=this.jump(s,BOARD.findIndex(c=>c.type===(kind==='streaming-owned'?'streaming':kind)));
   }else if(kind==='finished')s=G.finishGame(s);
   else if(kind==='bankruptcy'){
    const names=this.room.members.slice(0,2).map(m=>m.name),characterIds=this.room.members.slice(0,2).map(m=>m.characterId);
    s=G.createGame({names,characterIds});s.players[0].coins=1;s.ownership[WORKS[0].id]={player:1,level:0};this.room.publishedState=structuredClone(s);s=G.roll(s,1);
   }else throw Error('미리 볼 화면을 선택해 주세요.');
  }else throw Error('지원하지 않는 테스트 기능입니다.');
  if(!G.isValidSave(s))throw Error('테스트 상태를 적용하지 못했습니다. 초기화 후 다시 시도해 주세요.');
  this.room.state=s;this.room.rollPresentation=null;this.room.synchronizeRolls=false;this.debugRevision++;
  // Manual edits should not masquerade as real purchases or completed cash trades.
  if(action!=='jump'&&action!=='scenario')this.room.publishedState=structuredClone(s);
  if(action==='scenario'&&args.kind==='streaming-owned'){this.room.rollPresentation=createRollPresentation(this.room.publishedState,s,`dev-preview:${this.debugRevision}`,Date.now()-60000);this.room.rollPresentation.activityAfterId=this.room.activitySeq||0;}
  this.service.broadcast(this.room);return this.snapshot();
 }
 async request(path,body={},session){
  if(path==='create-developer')return this.create();this.check(session);
  if(path==='developer')return this.debug(body.action,body.args||{});
  if(path==='resume'){
   const expired=G.expireQuiz(this.room.state);if(expired!==this.room.state){this.room.state=expired;this.service.broadcast(this.room);}return this.snapshot();
  }
  const state=this.room.state;
  const actor=body.action==='resolveTrade'?state.trade?.to:body.action==='finishGame'?0:state.turn;
  const member=this.room.members[actor??0];
  if(path==='typing'||path==='chat')return {...this.service[path](this.room.code,member.token,path==='chat'?body.message:body.active),code:this.session.code};
  if(path!=='action')throw Error('테스트 게임에서는 이 기능을 사용할 수 없습니다.');
  if(body.action==='roll'){
   if(body.revision!==this.room.revision)throw Error('게임 상태가 갱신되었습니다. 다시 시도해 주세요.');
   if(this.room.rollPresentation?.finishAt>Date.now())throw Error('이동 연출이 끝난 뒤 진행해 주세요.');
   const next=G.roll(state,this.nextDice??Math.floor(Math.random()*6)+1);
   this.room.state=next;this.room.rollPresentation=createRollPresentation(state,next,`dev:${this.room.revision+1}:${state.turnNumber}`);
   this.room.rollPresentation.activityAfterId=this.room.activitySeq||0;
   this.service.broadcast(this.room);
  }else this.service.act(this.room.code,member.token,body);
  return this.snapshot();
 }
 subscribe(session,listener){
  this.check(session);
  const stop=this.service.subscribe(this.room.code,this.session.token,()=>listener.onSnapshot?.(this.snapshot()));
  const chat=this.service.subscribeChat(this.room.code,this.session.token,data=>listener.onChat?.({...data,code:this.session.code}));
  return {close:()=>{stop();chat();}};
 }
 close(){this.service?.close();this.service=null;this.session=null;this.connection=null;}
}
