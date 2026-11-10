import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {buyQualified} from '../test-support/purchases.js';
import {RoomService} from '../server/rooms.js';
import {botDecision,applyBotDecision} from '../server/bots.js';
const setup=options=>{const service=new RoomService(options),session=service.createSolo('나',{botCount:4,rounds:4});return {service,session,room:service.get(session.code)};};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function waitForHuman(service,session,room){return new Promise((resolve,reject)=>{let stop;const timeout=setTimeout(()=>{stop?.();reject(Error('Bots did not complete their turns'));},1500);stop=service.subscribe(session.code,session.token,s=>{if(s.state.turn===0&&s.state.turnNumber>=5){clearTimeout(timeout);queueMicrotask(()=>{stop();resolve(s);});}});});}
test('solo creates one human and 1–4 unique randomly named bots without public credentials',()=>{
 const {service,session,room}=setup();try{
  assert.ok(room.members.slice(1).every(m=>!m.name.includes('봇')&&m.name.length<=16));assert.equal(room.members.length,5);assert.equal(new Set(room.members.map(m=>m.name)).size,5);assert.equal(room.mode,'solo');assert.equal(room.state.phase,'roll');assert.equal(room.state.players[0].isBot,false);assert.ok(room.state.players.slice(1).every(p=>p.isBot&&p.coins===1200));
  const publicData=service.snapshot(room);assert.ok(!JSON.stringify(publicData).includes(session.token));assert.ok(publicData.members.slice(1).every(m=>m.isBot&&!m.token));
  assert.throws(()=>service.authenticate(session.code,undefined));assert.throws(()=>service.join(session.code,'손님'));
  assert.throws(()=>service.createSolo('나',{botCount:0}));assert.throws(()=>service.createSolo('나',{botCount:5}));assert.throws(()=>service.createSolo('나',{rounds:1}));
  const two=service.createSolo('나',{botCount:1});assert.equal(service.get(two.code).state.players.length,2);
 }finally{service.close();}
});
test('bots complete a full five-player game with the same rules and bounded decisions',()=>{
 const {service,room}=setup();try{let s=room.state,memory={},steps=0;
  while(s.phase!=='finished'&&steps<4000){
   if(G.current(s).isBot){const decision=botDecision(s,memory,()=>.1);assert.ok(decision);memory=decision.memory;s=applyBotDecision(s,decision,steps%6+1);}
   else if(s.phase==='roll')s=G.roll(s,steps%6+1);
   else if(s.phase==='quiz')s=G.answerQuiz(s,0);
   else if(s.phase==='feedback')s=G.closeFeedback(s);
   else s=G.nextTurn(s);
   assert.ok(G.isValidSave(s));steps++;
  }
  assert.equal(s.phase,'finished');assert.equal(s.round,4);assert.ok(steps<4000);assert.ok(s.players.every(p=>p.coins>=0));assert.ok(s.players.slice(1).some(p=>p.attempts>0));assert.ok(Object.keys(s.ownership).length>0);
 }finally{service.close();}
});
test('randomly declining purchase and optional quiz cannot loop forever',()=>{
 const {service,room}=setup();try{let s=room.state;s.turn=1;s=G.roll(s,1);const decision=botDecision(s,{},()=>.99);assert.equal(decision.action,'nextTurn');assert.equal(applyBotDecision(s,decision,1).turn,2);}finally{service.close();}
});
test('bot quizzes can be wrong and never grant extra rewards',()=>{
 const {service,room}=setup();try{let s=room.state;s.turn=1;s=G.roll(s,6);const d=botDecision(s,{},()=>.99);s=applyBotDecision(s,d,1);assert.equal(s.feedback.correct,false);assert.equal(s.players[1].coins,1200);assert.equal(s.players[1].attempts,1);}finally{service.close();}
});
test('bots accept reasonable trade offers and reject overpriced offers',()=>{
 const {service,room}=setup();try{let s=buyQualified(G.roll(room.state,1));
  s=G.proposeTrade(s,{workId:'bach-air',to:1,price:160});let d=botDecision(s,{},()=>0);assert.deepEqual(d.args,[true]);let accepted=applyBotDecision(s,d,1);assert.equal(accepted.ownership['bach-air'].player,1);assert.equal(accepted.players[1].coins,1040);
  s=G.resolveTrade(s,false);s=G.proposeTrade(s,{workId:'bach-air',to:1,price:1000});d=botDecision(s,{},()=>0);assert.deepEqual(d.args,[false]);assert.equal(applyBotDecision(s,d,1).ownership['bach-air'].player,0);
 }finally{service.close();}
});
test('live bot turns return to the human and cannot execute human turns',async()=>{
 const {service,session,room}=setup({botDelay:1,random:()=>.1});try{
  room.state=G.roll(room.state,1);room.state=G.nextTurn(room.state);
  const next=await waitForHuman(service,session,room);assert.equal(next.state.phase,'roll');assert.equal(next.state.round,1);assert.equal(service.botTimers.size,0);
 }finally{service.close();}
});
test('leaving the screen pauses bots; subscribing again resumes without losing a seat',async()=>{
 const {service,session,room}=setup({botDelay:1,random:()=>.9});try{
  room.state=G.nextTurn(G.roll(room.state,1));const revision=room.revision;
  service.scheduleBot(room);await wait(15);assert.equal(room.revision,revision);assert.equal(room.state.turn,1);
  const stop=service.subscribe(session.code,session.token,()=>{});stop();assert.equal(service.botTimers.size,0);
  await waitForHuman(service,session,room);assert.equal(room.members.length,5);assert.equal(service.authenticate(session.code,session.token).member.id,0);
 }finally{service.close();}
});
test('a bot trade response is automatic even during the human turn',async()=>{
 const {service,session,room}=setup({botDelay:1,random:()=>0});try{
  room.state=buyQualified(G.roll(room.state,1));
  const done=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No response')),500);let stop;stop=service.subscribe(session.code,session.token,s=>{if(s.state.ownership['bach-air']?.player===1){clearTimeout(timeout);queueMicrotask(()=>{stop();resolve(s);});}});});
  service.act(session.code,session.token,{action:'proposeTrade',args:[{workId:'bach-air',to:1,price:150}],revision:room.revision});
  const next=await done;assert.equal(next.state.turn,0);assert.equal(next.state.trade,null);assert.equal(next.state.players[1].coins,1050);
 }finally{service.close();}
});
test('finishing a game clears scheduled bot progression',async()=>{
 const {service,session,room}=setup({botDelay:10});const stop=service.subscribe(session.code,session.token,()=>{});
 try{room.state=G.nextTurn(G.roll(room.state,1));service.scheduleBot(room);service.act(session.code,session.token,{action:'finishGame',revision:room.revision});const revision=room.revision;await wait(20);assert.equal(room.revision,revision);assert.equal(room.state.phase,'finished');}finally{stop();service.close();}
});
