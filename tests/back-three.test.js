import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {BOARD} from '../src/data.js';
import {activityChanges} from '../src/activities.js';
import {movementPath,backwardPath} from '../src/movement.js';
import {botDecision,applyBotDecision} from '../src/bots.js';
const game=()=>G.createGame({names:['A','B']});
const arrive=()=>{const s=game();s.players[0].position=7;return G.roll(s,1);};
test('the backward tile waits for a second dice roll without advancing the turn',()=>{const s=arrive();assert.equal(BOARD[8].title,'뒤로가기');assert.equal(s.players[0].position,8);assert.equal(s.phase,'backward-roll');assert.equal(s.lastBackwardMove,null);assert.equal(s.turnNumber,0);assert.equal(s.players[0].coins,1200);assert.ok(G.isValidSave(s));assert.throws(()=>G.nextTurn(s));assert.throws(()=>G.startQuiz(s));assert.throws(()=>G.startPurchaseQuiz(s));});
test('the extra dice independently controls every backward distance from one through six',()=>{
 for(let dice=1;dice<=6;dice++){const before=arrive(),s=G.roll(before,dice);assert.equal(s.players[0].position,8-dice);assert.deepEqual(s.lastBackwardMove,{from:8,to:8-dice,steps:dice});assert.equal(s.dice,dice);assert.equal(s.turn,0);assert.equal(s.turnNumber,0);assert.equal(s.players[0].laps,0);assert.ok(G.isValidSave(s));assert.equal(before.players[0].position,8);}
});
test('backward destinations apply purchase, rent or history events exactly once',()=>{
 let s=G.roll(arrive(),4);assert.equal(G.startPurchaseQuiz(s).purchaseChallenge.workId,BOARD[4].id);
 const initial=game();initial.players[0].position=2;initial.ownership[BOARD[2].id]={player:1,level:0};const waiting=G.roll(initial,6),next=G.roll(waiting,6);assert.equal(next.players[0].position,2);assert.equal(next.lastRent.workId,BOARD[2].id);assert.equal(next.players[0].coins,1200-G.fee(next,BOARD[2]));assert.deepEqual(activityChanges(waiting,next).map(n=>n.type),['backward-move','rent']);
 s=G.roll(arrive(),5);assert.equal(s.players[0].position,3);assert.equal(s.eventCursor,1);assert.ok(s.lastEvent);assert.deepEqual(activityChanges(arrive(),s).map(n=>n.type),['backward-move','history-event']);
});
test('forward arrival and backward movement are separate visible paths and notices',()=>{
 const initial=game();initial.players[0].position=7;const waiting=G.roll(initial,1);assert.deepEqual(movementPath(7,1,32),[8]);assert.equal(activityChanges(initial,waiting)[0].type,'backward-entry');
 for(let dice=1;dice<=6;dice++){const next=G.roll(waiting,dice);assert.deepEqual(backwardPath(8,dice,32),Array.from({length:dice},(_,i)=>7-i));assert.equal(activityChanges(waiting,next)[0].text.includes(`${dice}칸`),true);}
});
test('pending backward rolls survive saves and reject invalid second rolls or metadata',()=>{
 const waiting=JSON.parse(JSON.stringify(arrive()));assert.ok(G.isValidSave(waiting));for(const dice of [0,7,1.5])assert.throws(()=>G.roll(waiting,dice));const s=G.roll(waiting,2),invalid=structuredClone(s);invalid.lastBackwardMove.to=1;assert.equal(G.isValidSave(invalid),false);invalid.phase='backward-roll';assert.equal(G.isValidSave(invalid),false);assert.throws(()=>G.rollBackward(game(),1));
 let next=G.nextTurn(s);next=G.roll(next,1);assert.equal(next.lastBackwardMove,null);
});
test('bots also roll an extra die before moving backward',()=>{const s=arrive();s.players[0].isBot=true;const decision=botDecision(s);assert.equal(decision.action,'roll');const next=applyBotDecision(s,decision,5);assert.equal(next.players[0].position,3);assert.equal(next.lastBackwardMove.steps,5);});
test('shared rooms apply one extra roll atomically and reject a duplicate request',async()=>{
 const {RoomService}=await import('../src/room-service.js');const service=new RoomService();try{const session=service.create('A');service.join(session.code,'B');const room=service.get(session.code);room.state=arrive();const revision=room.revision;const snapshot=service.act(session.code,session.token,{action:'roll',revision});assert.equal(snapshot.state.players[0].position,8-snapshot.state.dice);assert.equal(snapshot.state.turnNumber,0);assert.equal(snapshot.state.lastBackwardMove.steps,snapshot.state.dice);assert.throws(()=>service.act(session.code,session.token,{action:'roll',revision}));}finally{service.close();}
});
