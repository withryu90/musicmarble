import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {QUIZZES} from '../src/data.js';
import {purchaseQuizById} from '../src/purchase-quizzes.js';
import {RoomService} from '../src/room-service.js';
const purchase=()=>G.startPurchaseQuiz(G.roll(G.createGame({names:['가온','나래']}),1),()=>0);
const learning=()=>G.startQuiz(G.roll(G.createGame({names:['가온','나래']}),1));
test('both quiz clocks begin on presentation, last ten seconds and cannot restart',()=>{
 for(const make of [purchase,learning]){
  const pending=make();assert.equal(pending.quizDeadline,null);
  const running=G.beginQuizTimer(pending,1000);assert.equal(running.quizDeadline,11000);
  assert.equal(G.beginQuizTimer(running,6000),running);
  assert.equal(G.expireQuiz(running,10999),running);
  assert.ok(G.isValidSave(running));
 }
});
test('purchase timeout grants no buying right, deducts nothing and permits normal handoff',()=>{
 let s=G.beginQuizTimer(purchase(),1000);s=G.expireQuiz(s,11000);
 assert.equal(s.phase,'purchase-feedback');assert.equal(s.purchaseChallenge.timedOut,true);
 assert.equal(s.purchaseChallenge.correct,false);assert.equal(s.players[0].coins,1200);
 assert.ok(G.isValidSave(s));assert.throws(()=>G.purchaseAndNext(s));
 s=G.closePurchaseFeedback(s);assert.equal(s.turn,1);assert.equal(s.phase,'roll');
});
test('learning timeout records one incorrect attempt without reward or deduction',()=>{
 let s=G.beginQuizTimer(learning(),1000);s=G.expireQuiz(s,11000);
 assert.equal(s.phase,'feedback');assert.deepEqual(s.feedback,{correct:false,index:-1,timedOut:true});
 assert.equal(s.players[0].attempts,1);assert.equal(s.players[0].knowledge,0);assert.equal(s.players[0].coins,1200);
 assert.equal(G.expireQuiz(s,12000),s);assert.ok(G.isValidSave(s));
 assert.equal(G.closeFeedback(s).phase,'action');
});
test('answering cancels the clock and finishing a quiz early preserves its result',()=>{
 const p=G.beginQuizTimer(purchase(),Date.now());const a=G.answerPurchaseQuiz(p,purchaseQuizById(p.purchaseChallenge.questionId).answer);
 assert.equal(a.quizDeadline,null);assert.equal(a.purchaseChallenge.correct,true);assert.equal(G.expireQuiz(a,Date.now()+20000),a);
 const q=G.beginQuizTimer(learning(),Date.now());const b=G.answerQuiz(q,QUIZZES.find(x=>x.id===q.quiz).answer);
 assert.equal(b.quizDeadline,null);assert.equal(b.players[0].coins,1280);assert.ok(G.isValidSave(b));
});
function room(){const service=new RoomService();const a=service.create('가온');service.join(a.code,'나래');const r=service.get(a.code);r.state=purchase();return {service,a,r};}
test('host expires the quiz without a participant click, even after popup dismissal',async()=>{
 const {service,r}=room();try{
  r.state=G.beginQuizTimer(r.state,Date.now()-9980);service.broadcast(r);
  await new Promise(resolve=>setTimeout(resolve,45));
  assert.equal(r.state.phase,'purchase-feedback');assert.equal(r.state.purchaseChallenge.timedOut,true);
  assert.equal(service.quizTimers.size,0);
 }finally{service.close();}
});
test('late network answers are rejected as timeout; clients cannot extend the host clock',()=>{
 const {service,a,r}=room();try{
  let snap=service.act(a.code,a.token,{action:'beginQuizTimer',args:[Date.now()+1000000],revision:r.revision});
  assert.ok(snap.state.quizDeadline<=Date.now()+10000);
  r.state.quizDeadline=Date.now()-1;
  snap=service.act(a.code,a.token,{action:'answerPurchaseQuiz',args:[purchaseQuizById(r.state.purchaseChallenge.questionId).answer],revision:r.revision});
  assert.equal(snap.state.purchaseChallenge.timedOut,true);assert.equal(snap.state.purchaseChallenge.correct,false);
 }finally{service.close();}
});

test('resuming a saved question keeps its old deadline and schedules expiry',async()=>{
 const {service,a,r}=room();try{
  r.state=G.beginQuizTimer(r.state,Date.now()-10001);
  const stop=service.subscribe(a.code,a.token,()=>{});
  await new Promise(resolve=>setTimeout(resolve,15));stop();
  assert.equal(r.state.phase,'purchase-feedback');assert.equal(r.state.purchaseChallenge.timedOut,true);
 }finally{service.close();}
});
