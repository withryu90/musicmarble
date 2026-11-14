import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {BOARD,PRISON_MESSAGE} from '../src/data.js';
import {activityChanges} from '../src/activities.js';
import {RoomService} from '../server/rooms.js';
import {botDecision,applyBotDecision} from '../server/bots.js';
const game=()=>G.createGame({names:['A','B']});
const arrive=(via=false)=>{const s=game();s.players[0].position=via?23:10;return G.roll(s,1);};
const backToA=s=>{s=G.nextTurn(s);assert.equal(s.turn,1);s=G.roll(s,1);return G.nextTurn(s);};
test('prison and go-to-prison preserve board size, arrive with three opportunities and show shared rules',()=>{
 assert.equal(BOARD[11].type,'prison');assert.equal(BOARD[24].type,'go-to-prison');assert.equal(BOARD.length,32);
 for(const via of [false,true]){const s=arrive(via);assert.equal(s.phase,'jailed');assert.equal(s.players[0].position,11);assert.equal(s.players[0].skipTurns,3);assert.equal(s.quizCursor,0);assert.equal(s.eventCursor,0);assert.equal(s.players[0].coins,1200);assert.ok(G.isValidSave(s));const before=game();before.players[0].position=via?23:10;assert.equal(activityChanges(before,s).at(-1).text,PRISON_MESSAGE);}
});
test('first failed escape stays on the tile, spends one chance and does not allow another roll or actions',()=>{
 let s=backToA(arrive());assert.equal(s.turn,0);assert.equal(s.phase,'roll');assert.equal(s.players[0].skipTurns,3);const before=s;s=G.roll(s,5);assert.equal(s.phase,'jailed');assert.equal(s.players[0].position,11);assert.equal(s.players[0].skipTurns,2);assert.equal(s.players[0].coins,1200);assert.equal(s.eventCursor,0);assert.equal(s.leaderLaps,0);assert.ok(G.isValidSave(s));assert.equal(activityChanges(before,s).at(-1).title,'감옥 탈출 실패');assert.throws(()=>G.roll(s,6));assert.throws(()=>G.startQuiz(s));assert.throws(()=>G.startPurchaseQuiz(s));assert.throws(()=>G.buy(s));
});
test('three failed attempts release for the fourth turn without moving on a failed turn',()=>{
 let s=arrive();
 for(const [attempt,dice] of [1,4,2].entries()){
 s=G.roll(backToA(s),dice);assert.equal(s.players[0].skipTurns,2-attempt);
 assert.equal(s.players[0].position,11);assert.equal(s.phase,'jailed');assert.ok(G.isValidSave(s));
 }
 s=G.roll(backToA(s),1);assert.equal(s.players[0].position,12);assert.equal(s.phase,'action');assert.equal(s.lastPrisonRoll,null);
});
test('six escapes immediately on any of the three opportunities and resolves the destination once',()=>{
 for(const priorFailures of [0,1,2]){let s=backToA(arrive(true));for(let i=0;i<priorFailures;i++)s=backToA(G.roll(s,2));const before=s;s=G.roll(s,6);assert.equal(s.lastPrisonRoll.escaped,true);assert.equal(s.players[0].skipTurns,0);assert.equal(s.players[0].position,17);assert.equal(s.phase,'action');assert.equal(s.eventCursor,before.eventCursor);assert.ok(G.isValidSave(s));assert.deepEqual(activityChanges(before,s).map(n=>n.type),['prison-roll']);assert.throws(()=>G.roll(s,6));s=G.nextTurn(s);assert.equal(s.lastPrisonRoll,null);}
});
test('bots receive the same dice chances and cannot skip the escape roll',()=>{
 let s=backToA(arrive());s.players[0].isBot=true;let d=botDecision(s);assert.equal(d.action,'roll');s=applyBotDecision(s,d,3);assert.equal(s.players[0].position,11);d=botDecision(s);assert.equal(d.action,'nextTurn');s=backToA(s);d=botDecision(s);s=applyBotDecision(s,d,6);assert.equal(s.players[0].position,17);assert.equal(s.players[0].skipTurns,0);
});
test('all jailed players retain their own roll turns instead of automatically skipping',()=>{
 let s=game();s.phase='jailed';for(const p of s.players){p.position=11;p.skipTurns=3;}s=G.nextTurn(s);assert.equal(s.turn,1);assert.equal(s.players[1].skipTurns,3);s=G.roll(s,2);s=G.nextTurn(s);assert.equal(s.turn,0);assert.equal(s.players[0].skipTurns,3);assert.equal(s.players[1].skipTurns,2);assert.ok(G.isValidSave(s));
});
test('passing either danger tile does not imprison; forced transfer adds no lap, bonus, rent or quiz',()=>{
 for(const position of [10,23]){const s=game();s.players[0].position=position;const next=G.roll(s,2);assert.equal(next.players[0].skipTurns,0);assert.equal(next.lastPrisonTransfer,null);}
 const s=arrive(true);assert.deepEqual(s.lastPrisonTransfer,{from:24,to:11});assert.equal(s.leaderLaps,0);assert.equal(s.players[0].coins,1200);assert.equal(s.lastRent,null);assert.equal(s.quiz,null);assert.equal(G.nextTurn(s).lastPrisonTransfer,null);
});
test('legacy saves default to no prison and invalid attempts or locations are rejected',()=>{
 const s=game();for(const p of s.players)delete p.skipTurns;assert.ok(G.isValidSave(s));assert.equal(G.roll(s,1).phase,'action');s.players[0].skipTurns=4;assert.equal(G.isValidSave(s),false);s.players[0].skipTurns=1;assert.equal(G.isValidSave(s),false);assert.throws(()=>G.roll(s,1));
});
test('room APIs enforce current-player and revision checks for escape rolls',()=>{
 const service=new RoomService();try{const a=service.create('A'),b=service.join(a.code,'B'),room=service.get(a.code);service.act(a.code,a.token,{action:'start',revision:room.revision});room.state=backToA(arrive());service.broadcast(room);const revision=room.revision;assert.throws(()=>service.act(b.code,b.token,{action:'roll',revision}));service.act(a.code,a.token,{action:'roll',revision});assert.equal(room.state.lastPrisonRoll.dice,room.state.dice);assert.throws(()=>service.act(a.code,a.token,{action:'roll',revision}));assert.ok(service.snapshot(room).activities.some(n=>n.type==='prison-roll'));}finally{service.close();}
});

test('bail deducts 400 once, stays this turn and frees any next dice roll after restoring the save',()=>{
 for(const via of [false,true])for(const dice of [1,2,3,4,5,6]){
 const initial=arrive(via),paid=G.payBail(initial);
 assert.equal(initial.players[0].coins,1200);assert.equal(paid.players[0].coins,800);
 assert.equal(paid.phase,'jailed');assert.equal(paid.turn,0);assert.equal(paid.players[0].position,11);
 assert.equal(paid.players[0].skipTurns,0);assert.equal(paid.players[0].bailPaid,true);assert.ok(G.isValidSave(paid));
 assert.throws(()=>G.payBail(paid));assert.throws(()=>G.roll(paid,dice));
 const restored=JSON.parse(JSON.stringify(paid)),ready=backToA(restored),moved=G.roll(ready,dice);
 assert.equal(moved.players[0].position,11+dice);assert.equal(moved.players[0].bailPaid,false);assert.equal(moved.lastPrisonRoll,null);assert.equal(moved.lastBail,null);assert.ok(G.isValidSave(moved));
 const notices=activityChanges(initial,paid);assert.equal(notices.filter(n=>n.type==='bail-paid').length,1);assert.deepEqual(notices.at(-1).changes,[{playerId:0,amount:-400}]);
 assert.equal(activityChanges(paid,structuredClone(paid)).some(n=>n.type==='bail-paid'),false);
 }
});
test('bail rejects insufficient funds and invalid contexts, and can release after one failed escape',()=>{
 const poor=arrive();poor.players[0].coins=399;assert.equal(G.canPayBail(poor),false);assert.throws(()=>G.payBail(poor));assert.equal(poor.players[0].coins,399);
 assert.throws(()=>G.payBail(game()));const next=G.nextTurn(arrive());assert.throws(()=>G.payBail(next));
 let s=G.roll(backToA(arrive()),2);s=G.payBail(s);assert.equal(s.lastPrisonRoll,null);assert.ok(G.isValidSave(s));assert.equal(G.roll(backToA(s),1).players[0].position,12);
 const invalid=game();invalid.players[0].bailPaid=true;assert.equal(G.isValidSave(invalid),false);
});
test('bail preserves the existing duel bankruptcy rule and bots may choose the same optional release',()=>{
 const s=arrive();s.players[0].coins=400;const paid=G.payBail(s);assert.equal(paid.phase,'finished');assert.equal(paid.endReason.type,'bankruptcy');assert.ok(G.isValidSave(paid));
 const bot=arrive();bot.players[0].isBot=true;const choice=botDecision(bot,{},()=>0);assert.equal(choice.action,'payBail');const result=applyBotDecision(bot,choice);assert.equal(result.players[0].coins,800);assert.equal(botDecision(result,{},()=>0).action,'nextTurn');
});
test('room bail API authenticates the current prisoner and rejects stale or repeated payments',()=>{
 const rooms=new RoomService({backgroundTimers:false});try{
 const a=rooms.create('A'),b=rooms.join(a.code,'B'),room=rooms.get(a.code);room.state=arrive();rooms.broadcast(room);
 const revision=room.revision;assert.throws(()=>rooms.act(b.code,b.token,{action:'payBail',revision}));
 rooms.act(a.code,a.token,{action:'payBail',revision});assert.equal(room.state.players[0].coins,800);
 assert.throws(()=>rooms.act(a.code,a.token,{action:'payBail',revision}));assert.throws(()=>rooms.act(a.code,a.token,{action:'payBail',revision:room.revision}));
 assert.equal(room.state.players[0].coins,800);assert.equal(rooms.snapshot(room).activities.filter(a=>a.type==='bail-paid').length,1);
 }finally{rooms.close();}
});
