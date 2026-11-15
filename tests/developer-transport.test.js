import test from 'node:test';
import assert from 'node:assert/strict';
import {DeveloperTransport} from '../src/developer-transport.js';
import {GameTransport} from '../src/game-transport.js';
import {RankingClient} from '../src/ranking.js';
import {BOARD} from '../src/data.js';
import * as G from '../src/engine.js';
const setup=()=>{const t=new DeveloperTransport(),session=t.create();return {t,session,debug:(action,args)=>t.request('developer',{action,args},session)};};
test('developer game is local with four distinct manually controlled seats and no ranking ID',async t=>{
 const {t:transport,session,debug}=setup();t.after(()=>transport.close());
 let s=transport.snapshot();assert.equal(s.developer,true);assert.equal(s.gameId,null);assert.equal(s.state.players.length,4);assert.equal(new Set(s.state.players.map(p=>p.characterId)).size,4);assert.ok(s.state.players.every(p=>!p.isBot));
 s=await debug('player',{playerId:3});assert.equal(s.playerId,3);s=await debug('coins',{playerId:3,coins:4321});assert.equal(s.state.players[3].coins,4321);assert.equal(s.state.players[0].coins,1500);
 await assert.rejects(debug('coins',{playerId:3,coins:-1}));await assert.rejects(transport.request('resume',{}, {...session,token:'wrong'}));
});
test('fixed dice uses actual engine result and rejects invalid numbers and stale rolls',async t=>{
 const {t:transport,session,debug}=setup();t.after(()=>transport.close());
 await debug('set-dice',{dice:6});let s=transport.snapshot();s=await transport.request('action',{action:'roll',revision:s.revision},session);assert.equal(s.state.dice,6);assert.equal(s.state.players[0].position,6);assert.ok(s.rollPresentation);
 await assert.rejects(transport.request('action',{action:'roll',revision:0},session));await assert.rejects(debug('set-dice',{dice:7}));
 s=await debug('ready');assert.equal(s.rollPresentation,null);assert.equal(s.state.phase,'roll');await debug('set-dice',{dice:null});assert.equal(transport.snapshot().developerDice,null);
});
for(const kind of ['music','music-correct','music-wrong','learning','gain','loss','prison','concert','streaming','streaming-owned','work-swap','finished','bankruptcy'])test(`developer preview: ${kind}`,async t=>{
 const {t:transport,debug}=setup();t.after(()=>transport.close());const s=await debug('scenario',{kind});assert.ok(G.isValidSave(s.state));assert.equal(s.gameId,null);
 if(kind==='gain')assert.ok(s.state.lastEvent.actual>0);if(kind==='loss')assert.ok(s.state.lastEvent.actual<0);
 if(kind==='music-correct'||kind==='music-wrong')assert.equal(s.state.purchaseChallenge.correct,kind==='music-correct');
 if(kind==='streaming-owned'){assert.notEqual(s.state.platformOwners[BOARD[s.state.players[s.state.turn].position].id],s.state.turn);assert.equal(s.activities.at(-1).type,'streaming-arrival');}
 if(kind==='learning')assert.equal(s.state.phase,'quiz');if(kind==='finished'||kind==='bankruptcy')assert.equal(s.state.phase,'finished');
 const reset=await debug('reset');assert.equal(reset.state.players.length,4);assert.equal(reset.state.phase,'roll');
});
test('each board destination can be reached without corrupting the test game',async t=>{
 const {t:transport,debug}=setup();t.after(()=>transport.close());
 for(let index=0;index<BOARD.length;index++){await debug('reset');const s=await debug('jump',{index});assert.ok(G.isValidSave(s.state),String(index));assert.equal(s.state.players[0].position,BOARD[index].type==='go-to-prison'?BOARD.findIndex(c=>c.type==='prison'):index);}
 await assert.rejects(debug('jump',{index:999}));
});
test('developer routing never contacts shared HTTP or Peer rooms',async t=>{
 const reject=()=>{throw Error('external transport called');},fake={request:reject,subscribe:reject,close(){},connection:null};const transport=new GameTransport({http:fake,peer:fake});t.after(()=>transport.close());
 const session=await transport.request('create-developer');let received;const sub=transport.subscribe(session,{onSnapshot:s=>received=s});assert.equal(received.mode,'developer');
 await transport.request('developer',{action:'coins',args:{playerId:0,coins:3000}},session);assert.equal(received.state.players[0].coins,3000);sub.close();
 await assert.rejects(transport.request('developer',{action:'reset'},{transport:'https'}),/테스트 게임/);
});
test('developer snapshots and sessions cannot register or submit public scores',async()=>{
 let calls=0,writes=0;const ranking=new RankingClient({fetchFn:async()=>{calls++;throw Error('network');},storage:{getItem:()=>null,setItem:()=>writes++}});
 for(const guard of [{developer:true},{mode:'developer'},{}])for(const phase of ['roll','finished'])ranking.observe({gameId:'fake-real-id',state:{phase,players:[{id:0,name:'테스트',coins:1000000}]},...guard},{playerId:0,...(!guard.developer&&!guard.mode?{transport:'developer'}:{})},G.score);
 await ranking.retryPending();assert.equal(calls,0);assert.equal(writes,0);assert.deepEqual(ranking.records,{});
});
