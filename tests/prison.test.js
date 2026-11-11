import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {BOARD,PRISON_MESSAGE} from '../src/data.js';
import {activityChanges} from '../src/activities.js';
import {RoomService} from '../server/rooms.js';
import {botDecision,applyBotDecision} from '../server/bots.js';
const game=()=>G.createGame({names:['A','B']});
const arrive=(via=false)=>{const s=game();s.players[0].position=via?20:9;return G.roll(s,1);};
const backToA=s=>{s=G.nextTurn(s);assert.equal(s.turn,1);s=G.roll(s,1);return G.nextTurn(s);};
test('prison and go-to-prison preserve board size, arrive with two opportunities and show shared rules',()=>{
 assert.equal(BOARD[10].type,'prison');assert.equal(BOARD[21].type,'go-to-prison');assert.equal(BOARD.length,28);
 for(const via of [false,true]){const s=arrive(via);assert.equal(s.phase,'jailed');assert.equal(s.players[0].position,10);assert.equal(s.players[0].skipTurns,2);assert.equal(s.quizCursor,0);assert.equal(s.eventCursor,0);assert.equal(s.players[0].coins,1200);assert.ok(G.isValidSave(s));const before=game();before.players[0].position=via?20:9;assert.equal(activityChanges(before,s).at(-1).text,PRISON_MESSAGE);}
});
test('first failed escape stays on the tile, spends one chance and does not allow another roll or actions',()=>{
 let s=backToA(arrive());assert.equal(s.turn,0);assert.equal(s.phase,'roll');assert.equal(s.players[0].skipTurns,2);const before=s;s=G.roll(s,5);assert.equal(s.phase,'jailed');assert.equal(s.players[0].position,10);assert.equal(s.players[0].skipTurns,1);assert.equal(s.players[0].coins,1200);assert.equal(s.eventCursor,0);assert.equal(s.leaderLaps,0);assert.ok(G.isValidSave(s));assert.equal(activityChanges(before,s).at(-1).title,'감옥 탈출 실패');assert.throws(()=>G.roll(s,6));assert.throws(()=>G.startQuiz(s));assert.throws(()=>G.startPurchaseQuiz(s));assert.throws(()=>G.buy(s));
});
test('two failed attempts release for the next turn without moving on the failed turn',()=>{
 let s=G.roll(backToA(arrive()),1);s=backToA(s);assert.equal(s.players[0].skipTurns,1);s=G.roll(s,4);assert.equal(s.players[0].skipTurns,0);assert.equal(s.players[0].position,10);assert.equal(s.phase,'jailed');assert.ok(G.isValidSave(s));s=backToA(s);s=G.roll(s,1);assert.equal(s.players[0].position,11);assert.equal(s.phase,'action');assert.equal(s.lastPrisonRoll,null);
});
test('six escapes immediately on either opportunity and resolves the destination once',()=>{
 for(const second of [false,true]){let s=backToA(arrive(true));if(second)s=backToA(G.roll(s,2));const before=s;s=G.roll(s,6);assert.equal(s.lastPrisonRoll.escaped,true);assert.equal(s.players[0].skipTurns,0);assert.equal(s.players[0].position,16);assert.equal(s.phase,'action');assert.equal(s.eventCursor,0);assert.ok(G.isValidSave(s));assert.deepEqual(activityChanges(before,s).map(n=>n.type),['prison-roll']);assert.throws(()=>G.roll(s,6));s=G.nextTurn(s);assert.equal(s.lastPrisonRoll,null);}
});
test('bots receive the same dice chances and cannot skip the escape roll',()=>{
 let s=backToA(arrive());s.players[0].isBot=true;let d=botDecision(s);assert.equal(d.action,'roll');s=applyBotDecision(s,d,3);assert.equal(s.players[0].position,10);d=botDecision(s);assert.equal(d.action,'nextTurn');s=backToA(s);d=botDecision(s);s=applyBotDecision(s,d,6);assert.equal(s.players[0].position,16);assert.equal(s.players[0].skipTurns,0);
});
test('all jailed players retain their own roll turns instead of automatically skipping',()=>{
 let s=game();s.phase='jailed';for(const p of s.players){p.position=10;p.skipTurns=2;}s=G.nextTurn(s);assert.equal(s.turn,1);assert.equal(s.players[1].skipTurns,2);s=G.roll(s,2);s=G.nextTurn(s);assert.equal(s.turn,0);assert.equal(s.players[0].skipTurns,2);assert.equal(s.players[1].skipTurns,1);assert.ok(G.isValidSave(s));
});
test('passing either danger tile does not imprison; forced transfer adds no lap, bonus, rent or quiz',()=>{
 for(const position of [9,20]){const s=game();s.players[0].position=position;const next=G.roll(s,2);assert.equal(next.players[0].skipTurns,0);assert.equal(next.lastPrisonTransfer,null);}
 const s=arrive(true);assert.deepEqual(s.lastPrisonTransfer,{from:21,to:10});assert.equal(s.leaderLaps,0);assert.equal(s.players[0].coins,1200);assert.equal(s.lastRent,null);assert.equal(s.quiz,null);assert.equal(G.nextTurn(s).lastPrisonTransfer,null);
});
test('legacy saves default to no prison and invalid attempts or locations are rejected',()=>{
 const s=game();for(const p of s.players)delete p.skipTurns;assert.ok(G.isValidSave(s));assert.equal(G.roll(s,1).phase,'action');s.players[0].skipTurns=3;assert.equal(G.isValidSave(s),false);s.players[0].skipTurns=1;assert.equal(G.isValidSave(s),false);assert.throws(()=>G.roll(s,1));
});
test('room APIs enforce current-player and revision checks for escape rolls',()=>{
 const service=new RoomService();try{const a=service.create('A'),b=service.join(a.code,'B'),room=service.get(a.code);service.act(a.code,a.token,{action:'start',revision:room.revision});room.state=backToA(arrive());service.broadcast(room);const revision=room.revision;assert.throws(()=>service.act(b.code,b.token,{action:'roll',revision}));service.act(a.code,a.token,{action:'roll',revision});assert.equal(room.state.lastPrisonRoll.dice,room.state.dice);assert.throws(()=>service.act(a.code,a.token,{action:'roll',revision}));assert.ok(service.snapshot(room).activities.some(n=>n.type==='prison-roll'));}finally{service.close();}
});
