import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as G from '../src/engine.js';
import {BOARD,WORKS} from '../src/data.js';
import {LISTENING_HINTS,listeningHintDurationMs} from '../src/listening-hints.js';
import {RoomService} from '../src/room-service.js';
const purchase=(id='bach-air')=>{const s=G.createGame({names:['가온','나래']});s.players[0].position=BOARD.findIndex(t=>t.id===id);s.phase='action';return G.startPurchaseQuiz(s,()=>0);};
test('paid hint charges once, retains purchase funds and preserves the remaining question time for the complete recording',()=>{
 const s=G.beginQuizTimer(purchase(),1000),next=G.buyListeningHint(s,4000);
 assert.equal(next.players[0].coins,1180);assert.equal(s.players[0].coins,1200);
 const deadline=11000+listeningHintDurationMs(LISTENING_HINTS['bach-air']);assert.equal(next.quizDeadline,deadline);assert.equal(next.purchaseChallenge.hint.remaining,7000);
 assert.equal(G.expireQuiz(next,deadline-1),next);assert.equal(G.expireQuiz(next,deadline).purchaseChallenge.timedOut,true);
 assert.ok(G.isValidSave(next));assert.throws(()=>G.buyListeningHint(next,5000));
 const future=G.buyListeningHint(G.beginQuizTimer(purchase()),Date.now());assert.throws(()=>G.answerPurchaseQuiz(future,true));
 const poor=purchase();poor.players[0].coins=179;assert.equal(G.canBuyListeningHint(poor),false);assert.throws(()=>G.buyListeningHint(poor));
 poor.players[0].coins=180;assert.equal(G.canBuyListeningHint(poor),true);
 assert.throws(()=>G.buyListeningHint(s,11000));assert.equal(G.canBuyListeningHint(G.createGame({names:['A','B']})),false);
});
test('failed playback refunds once and allows only one retry without losing saved question time',()=>{
 const paid=G.buyListeningHint(G.beginQuizTimer(purchase(),1000),4000),refunded=G.refundListeningHint(paid,4100);
 assert.equal(refunded.players[0].coins,1200);assert.equal(refunded.quizDeadline,11100);assert.ok(G.isValidSave(refunded));
 assert.throws(()=>G.refundListeningHint(refunded));const retry=G.buyListeningHint(refunded,5000);
 assert.equal(retry.players[0].coins,1180);assert.equal(G.canBuyListeningHint(G.refundListeningHint(retry,5100)),false);
});
test('all twenty works use the supplied original M4A files with verified hashes and complete durations',async()=>{
 assert.equal(Object.keys(LISTENING_HINTS).length,20);
 const missing=purchase();missing.purchaseChallenge.workId='missing';assert.equal(G.canBuyListeningHint(missing),false);
 const credits=JSON.parse(await readFile(new URL('../src/assets/audio/hints/ATTRIBUTION.json',import.meta.url)));
 for(const [id,hint] of Object.entries(LISTENING_HINTS)){
  assert.ok(WORKS.some(w=>w.id===id));assert.ok(G.canBuyListeningHint(purchase(id)));assert.equal(hint.original,true);assert.equal(hint.edited,false);assert.equal(hint.sourceType,'user-provided');assert.ok(hint.duration>0&&hint.originalFilename&&hint.rights);
  assert.equal(credits.recordings[id].sha256,hint.sha256);assert.equal(credits.recordings[id].duration,hint.duration);
  const file=await readFile(new URL('../'+hint.src,import.meta.url));assert.equal(file.toString('ascii',4,8),'ftyp');assert.equal(file.length,hint.bytes);assert.equal(createHash('sha256').update(file).digest('hex'),hint.sha256);
 }
 assert.ok(new Set(Object.values(LISTENING_HINTS).map(h=>h.duration)).size>10);
});
test('shared room hint requests use server time and enforce the acting player',()=>{
 const rooms=new RoomService({backgroundTimers:false});try{
  const a=rooms.create('가온'),b=rooms.join(a.code,'나래'),room=rooms.get(a.code);rooms.act(a.code,a.token,{action:'start',revision:room.revision});room.state=G.beginQuizTimer(purchase());rooms.broadcast(room);
  assert.throws(()=>rooms.act(a.code,b.token,{action:'buyListeningHint',revision:room.revision}));
  const now=Date.now();rooms.act(a.code,a.token,{action:'buyListeningHint',args:[1],revision:room.revision});assert.ok(room.state.purchaseChallenge.hint.until>=now+listeningHintDurationMs(LISTENING_HINTS['bach-air']));assert.equal(room.state.players[0].coins,1180);
  rooms.act(a.code,a.token,{action:'pauseListeningHint',args:[1],revision:room.revision});assert.ok(room.state.quizDeadline>Date.now());assert.ok(room.state.purchaseChallenge.hint.paused);
  assert.throws(()=>rooms.act(a.code,b.token,{action:'resumeListeningHint',revision:room.revision}));
  rooms.act(a.code,a.token,{action:'resumeListeningHint',args:[1],revision:room.revision});assert.ok(room.state.purchaseChallenge.hint.until>Date.now());assert.equal(room.state.players[0].coins,1180);
  rooms.act(a.code,a.token,{action:'refundListeningHint',args:[1],revision:room.revision});assert.equal(room.state.players[0].coins,1200);
 }finally{rooms.close();}
});

test('question pause uses the registered full recording length, including fractional seconds',()=>{
 for(const [seconds,ms] of [[1.25,1250],[5,5000],[12.8,12800],[35.42,35420]])assert.equal(listeningHintDurationMs({duration:seconds}),ms);
 for(const duration of [0,-1,NaN,Infinity,undefined])assert.equal(listeningHintDurationMs({duration}),0);
});

test('pausing enables an immediate answer; resume preserves only unused quiz and audio time without another charge',()=>{
 const duration=listeningHintDurationMs(LISTENING_HINTS['bach-air']);
 const paid=G.buyListeningHint(G.beginQuizTimer(purchase(),1000),2000),paused=G.pauseListeningHint(paid,3500);
 assert.equal(paused.quizDeadline,12500);assert.equal(paused.purchaseChallenge.hint.until,0);assert.equal(paused.purchaseChallenge.hint.audioRemainingMs,duration-1500);assert.equal(paused.purchaseChallenge.hint.paused,true);assert.ok(G.isValidSave(paused));
 assert.equal(G.pauseListeningHint(paused,4500),paused);assert.equal(G.answerPurchaseQuiz(paused,true).phase,'purchase-feedback');
 const resumed=G.resumeListeningHint(paused,5500);assert.equal(resumed.players[0].coins,1180);assert.equal(resumed.purchaseChallenge.hint.remaining,7000);assert.equal(resumed.quizDeadline,5500+duration-1500+7000);assert.ok(G.isValidSave(resumed));
 const again=G.pauseListeningHint(resumed,6500);assert.equal(again.quizDeadline,13500);assert.equal(again.purchaseChallenge.hint.audioRemainingMs,duration-2500);assert.equal(again.players[0].coins,1180);
 assert.throws(()=>G.resumeListeningHint(again,13500));assert.throws(()=>G.resumeListeningHint(G.expireQuiz(again,13500),13501));assert.throws(()=>G.pauseListeningHint(purchase()));assert.throws(()=>G.resumeListeningHint(paid,3000));
});
