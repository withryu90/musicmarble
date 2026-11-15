import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {BOARD} from '../src/data.js';
import {createRollPresentation,presentationStage,presentedSteps,shouldPresentRoll,ROLL_TIMING} from '../src/roll-presentation.js';
import {RoomService} from '../src/room-service.js';
import {visibleActivities} from '../src/activities.js';
const game=()=>G.createGame({names:['A','B','C']});
test('different delivery times and device clocks follow one shared dice, movement and result schedule',()=>{
 const before=game(),after=G.roll(before,6),plan=createRollPresentation(before,after,'roll-1',100000);
 assert.equal(plan.startAt,101200);assert.equal(plan.resultAt-plan.startAt,1000);
 assert.equal(plan.resultAt-100000,2200);assert.equal(plan.closeAt-plan.resultAt,1600);assert.equal(plan.moveAt-plan.closeAt,400);
 assert.deepEqual(plan.path,[1,2,3,4,5,6]);
 for(const time of [plan.startAt-1,plan.startAt,plan.resultAt,plan.closeAt,plan.moveAt,plan.moveAt+720,plan.finishAt]){
  const expected=presentationStage(plan,time),step=presentedSteps(plan,time);
  for(const skew of [-3600000,0,7200000]){
   const deviceTime=time+skew,offset=-skew;
   assert.equal(presentationStage(plan,deviceTime+offset),expected);
   assert.equal(presentedSteps(plan,deviceTime+offset),step);
  }
 }
 assert.equal(presentationStage(plan,plan.finishAt-1),'moving');assert.equal(presentationStage(plan,plan.finishAt),'finished');
 assert.equal(shouldPresentRoll({state:after,rollPresentation:plan},null,plan.startAt+500),true);
 assert.equal(shouldPresentRoll({state:after,rollPresentation:plan},plan.id,plan.startAt+500),false);
 assert.equal(shouldPresentRoll({state:after,rollPresentation:plan},null,plan.finishAt),false);
 assert.equal(presentedSteps(plan,plan.moveAt+ROLL_TIMING.step*4+100),4);
});
test('shared paths preserve reverse movement, jail transfers, failed escapes and an exact final finish',()=>{
 let before=game();before.players[0].position=BOARD.findIndex(c=>c.type==='go-to-prison')-1;
 let after=G.roll(before,1),plan=createRollPresentation(before,after,'transfer',0);
 assert.deepEqual(plan.path,[BOARD.findIndex(c=>c.type==='go-to-prison'),BOARD.findIndex(c=>c.type==='prison')]);
 before={...after,phase:'roll'};after=G.roll(before,2);assert.deepEqual(createRollPresentation(before,after,'failed',0).path,[]);
 before=game();before.players[0].position=8;before.phase='backward-roll';after=G.roll(before,3);
 assert.deepEqual(createRollPresentation(before,after,'reverse',0).path,[7,6,5]);
 before=game();before.players[0].laps=3;before.players[0].position=31;after=G.roll(before,6);
 assert.deepEqual(createRollPresentation(before,after,'finish',0).path,[0]);assert.equal(after.phase,'finished');
});
test('all players receive an identical schedule, early actions are rejected, and the time barrier expires by itself',()=>{
 const service=new RoomService({backgroundTimers:false}),host=service.create('도착자'),guest=service.join(host.code,'친구'),room=service.get(host.code);
 try{
  service.act(host.code,host.token,{action:'start',revision:room.revision});room.state.players[0].position=10;room.publishedState=structuredClone(room.state);
  // Any die 1..6 leads to a valid arrival; the shared timeline covers all cases.
  const rolled=service.act(host.code,host.token,{action:'roll',synchronize:true,revision:room.revision});
  assert.deepEqual(service.snapshot(service.authenticate(guest.code,guest.token).room).rollPresentation,rolled.rollPresentation);
  assert.ok(rolled.serverNow<rolled.rollPresentation.startAt);assert.equal(room.synchronizeRolls,true);
  assert.throws(()=>service.act(host.code,host.token,{action:'startQuiz',revision:room.revision}),/연출/);
  room.rollPresentation.finishAt=Date.now()-1;
  assert.doesNotThrow(()=>service.act(host.code,host.token,{action:'nextTurn',revision:room.revision}));
  assert.equal(shouldPresentRoll(service.snapshot(room),null,Date.now()),false);
 }finally{service.close();}
});
test('shared prison results do not wait for a separate actor receipt after movement has completed',()=>{
 const before=game();before.players[0].position=10;const after=G.roll(before,1);
 const item={id:1,actorId:0,turnNumber:0,type:'prison-entry',actorFirst:true,synchronizedArrival:true};
 assert.deepEqual(visibleActivities({state:after,activities:[item]},1),[item]);
});

test('vacant works and streaming apps have one shared arrival popup without repeated receipts',()=>{
 for(const type of ['work','streaming']){
  const service=new RoomService({backgroundTimers:false}),host=service.create('도착자'),room=service.get(host.code);service.join(host.code,'친구');
  try{
   service.act(host.code,host.token,{action:'start',revision:room.revision});
   const before=structuredClone(room.state);before.players[0].position=BOARD.findIndex(c=>c.type===type)-1;room.publishedState=before;
   room.state=G.roll(before,1);room.rollPresentation=createRollPresentation(before,room.state,'arrival');room.rollPresentation.activityAfterId=room.activitySeq||0;
   service.broadcast(room);const notice=room.activities.at(-1);assert.equal(notice.type,type==='work'?'work-arrival':'streaming-arrival');
   assert.ok(notice.synchronizedArrival);const count=room.activities.length;service.broadcast(room);assert.equal(room.activities.length,count);
  }finally{service.close();}
 }
});
