import test from 'node:test';import assert from 'node:assert/strict';
import * as G from '../src/engine.js';import {BOARD} from '../src/data.js';import {RoomService,DISCONNECT_GRACE_MS} from '../src/room-service.js';import {activityChanges} from '../src/activities.js';
const game=count=>G.createGame({names:['A','B','C','D'].slice(0,count)});
test('departures skip stable seat IDs from any pending phase and reclaim investments without phantom payments',()=>{
 for(const count of [3,4])for(const phase of ['roll','action','purchase-quiz','backward-roll','jailed']){
  let s=game(count);s.turn=1;s.phase=phase;s.players[1].position=phase==='jailed'?11:1;if(phase==='jailed')s.players[1].skipTurns=3;
  s.ownership['bach-air']={player:1,level:1};s.platformOwners={'youtube-music':1};s.streamingInstallations={'bach-air':{'youtube-music':1}};
  const next=G.removeDisconnected(s,[1]);assert.equal(next.turn,2);assert.equal(next.phase,'roll');assert.equal(next.players.length,count);assert.equal(next.players[1].withdrawn,true);
  assert.equal(next.players[0].id,0);assert.equal(next.players[2].id,2);assert.equal(next.ownership['bach-air'],undefined);assert.deepEqual(next.platformOwners,{});assert.deepEqual(next.streamingInstallations,{});
  assert.ok(G.isValidSave(next));assert.deepEqual(activityChanges(s,next).filter(n=>n.type==='sale'),[]);
  let step=G.nextTurn({...next,phase:'action'});for(let i=0;i<8;i++){assert.notEqual(step.turn,1);step=G.nextTurn({...step,phase:'action'});}
 }
});
test('departing a trade recipient cancels the pending trade without changing the active quiz or remaining money',()=>{
 let s=game(4);s=G.roll(s,1);s.ownership['bach-air']={player:0,level:0};s=G.proposeTrade(s,{workId:'bach-air',to:2,price:100});
 const next=G.removeDisconnected(s,[2]);assert.equal(next.turn,0);assert.equal(next.trade,null);assert.equal(next.players[0].coins,s.players[0].coins);assert.ok(G.isValidSave(next));
 s=G.startQuiz({...next,phase:'action'});const quiz=s.quiz;s=G.removeDisconnected(s,[3]);assert.equal(s.quiz,quiz);assert.equal(s.phase,'quiz');assert.ok(G.isValidSave(s));
});
test('concert tickets, transfers and new trade targets exclude departed players',()=>{
 let s=G.removeDisconnected(game(4),[1]);s.players[0].position=15;s=G.roll(s,1,()=>0);assert.deepEqual(s.lastConcert.tickets.map(t=>t.playerId),[2,3]);assert.ok(G.isValidSave(s));
 s=G.removeDisconnected(game(3),[1]);s.ownership['bach-air']={player:0,level:0};s.players[0].position=BOARD.findIndex(c=>c.type==='transfer')-1;s=G.roll(s,1,()=>0);assert.equal(s.lastAssignment.to,2);
 assert.throws(()=>G.proposeTrade({...s,phase:'action',ownership:{'bach-air':{player:0,level:0}}},{workId:'bach-air',to:1,price:100}));
});
test('only the last remaining player ends a multiplayer departure game; two-player games keep their existing rules',()=>{
 let s=G.removeDisconnected(game(4),[1]);assert.notEqual(s.phase,'finished');s=G.removeDisconnected(s,[0,3]);assert.equal(s.phase,'finished');assert.deepEqual(s.endReason,{type:'disconnect',playerId:2});assert.ok(G.isValidSave(s));
 const duel=game(2);assert.equal(G.removeDisconnected(duel,[0]),duel);
});
test('a transient reconnect survives; after the grace period the host departs and remaining users resume',()=>{
 const service=new RoomService({backgroundTimers:false});try{
  const sessions=[service.create('A')];for(const name of ['B','C','D'])sessions.push(service.join(sessions[0].code,name));const room=service.get(sessions[0].code);
  service.act(sessions[0].code,sessions[0].token,{action:'start',revision:room.revision});const base=room.connectionTrackingAt;
  for(let t=5000;t<DISCONNECT_GRACE_MS;t+=5000)for(const s of sessions.slice(1))service.updateConnections(room,s.playerId,base+t);
  service.updateConnections(room,1,base+DISCONNECT_GRACE_MS);assert.ok(room.state.players[0].withdrawn);assert.equal(room.hostId,1);assert.equal(room.state.turn,1);assert.equal(room.state.phase,'roll');
  assert.throws(()=>service.authenticate(sessions[0].code,sessions[0].token),e=>e.status===410);
  assert.equal(service.authenticate(sessions[1].code,sessions[1].token).member.id,1);assert.ok(G.isValidSave(room.state));
 }finally{service.close();}
});
test('rejoining within the grace period and a whole class resuming a paused room do not force anyone out',()=>{
 const service=new RoomService({backgroundTimers:false});try{
  const a=service.create('A'),b=service.join(a.code,'B');service.join(a.code,'C');const room=service.get(a.code);service.act(a.code,a.token,{action:'start',revision:room.revision});const base=room.connectionTrackingAt;
  service.updateConnections(room,0,base+30000);service.updateConnections(room,1,base+40000);service.updateConnections(room,2,base+50000);service.updateConnections(room,0,base+60000);assert.equal(G.activePlayers(room.state).length,3);
  service.updateConnections(room,0,base+180000);assert.equal(G.activePlayers(room.state).length,3);
 }finally{service.close();}
});

test('another participant departing cannot reset the current prisoner escape progress',()=>{
 let s=game(4);s.players[0].position=10;s=G.roll(s,1);s.phase='roll';s=G.roll(s,2);s.phase='roll';s=G.roll(s,2);assert.equal(s.players[0].skipTurns,1);
 const next=G.removeDisconnected(s,[2]);assert.equal(next.phase,'jailed');assert.equal(next.players[0].skipTurns,1);assert.deepEqual(next.lastPrisonRoll,s.lastPrisonRoll);assert.ok(G.isValidSave(next));
});
