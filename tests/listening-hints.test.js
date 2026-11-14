import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as G from '../src/engine.js';
import {BOARD,WORKS} from '../src/data.js';
import {LISTENING_HINTS} from '../src/listening-hints.js';
import {RoomService} from '../src/room-service.js';
const purchase=(id='bach-air')=>{const s=G.createGame({names:['가온','나래']});s.players[0].position=BOARD.findIndex(t=>t.id===id);s.phase='action';return G.startPurchaseQuiz(s,()=>0);};
test('paid hint charges once, retains purchase funds and freezes the remaining question time for five seconds',()=>{
 const s=G.beginQuizTimer(purchase(),1000),next=G.buyListeningHint(s,4000);
 assert.equal(next.players[0].coins,1180);assert.equal(s.players[0].coins,1200);
 assert.equal(next.quizDeadline,16000);assert.equal(next.purchaseChallenge.hint.remaining,7000);
 assert.equal(G.expireQuiz(next,15999),next);assert.equal(G.expireQuiz(next,16000).purchaseChallenge.timedOut,true);
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
test('unverified recordings cannot be bought, and every enabled clip has documented reusable rights and five seconds of PCM audio',async()=>{
 assert.equal(Object.keys(LISTENING_HINTS).length,17);
 for(const id of ['stravinsky-firebird','stravinsky-spring','handel-water'])assert.equal(G.canBuyListeningHint(purchase(id)),false);
 const credits=JSON.parse(await readFile(new URL('../src/assets/audio/hints/ATTRIBUTION.json',import.meta.url)));
 for(const [id,hint] of Object.entries(LISTENING_HINTS)){
  assert.ok(WORKS.some(w=>w.id===id));assert.match(hint.source,/^https:/);assert.match(hint.license,/CC BY|Public domain/);assert.ok(hint.artist&&hint.section);
  assert.equal(credits.recordings[id].licenseUrl,hint.licenseUrl);
  const wav=await readFile(new URL('../'+hint.src,import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt16LE(22),1);
  const at=wav.indexOf(Buffer.from('data'));assert.ok(at>0);assert.equal(wav.readUInt32LE(at+4)/(wav.readUInt32LE(24)*2),5);
  let peak=0;for(let i=at+8;i+1<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));assert.ok(peak>200);
 }
});
test('shared room hint requests use server time and enforce the acting player',()=>{
 const rooms=new RoomService({backgroundTimers:false});try{
  const a=rooms.create('가온'),b=rooms.join(a.code,'나래'),room=rooms.get(a.code);rooms.act(a.code,a.token,{action:'start',revision:room.revision});room.state=G.beginQuizTimer(purchase());rooms.broadcast(room);
  assert.throws(()=>rooms.act(a.code,b.token,{action:'buyListeningHint',revision:room.revision}));
  const now=Date.now();rooms.act(a.code,a.token,{action:'buyListeningHint',args:[1],revision:room.revision});assert.ok(room.state.purchaseChallenge.hint.until>=now+5000);assert.equal(room.state.players[0].coins,1180);
  rooms.act(a.code,a.token,{action:'refundListeningHint',args:[1],revision:room.revision});assert.equal(room.state.players[0].coins,1200);
 }finally{rooms.close();}
});
