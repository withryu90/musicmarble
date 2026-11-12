import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {EVENTS} from '../src/data.js';
import {buyQualified,qualifyPurchase} from '../test-support/purchases.js';
import {activityChanges} from '../src/activities.js';
import {RoomService} from '../src/room-service.js';
const duel=()=>G.createGame({names:['하나','둘'],rounds:4});
function ended(s,id){assert.equal(s.phase,'finished');assert.deepEqual(s.endReason,{type:'bankruptcy',playerId:id});assert.equal(s.players[id].coins,0);assert.ok(G.isValidSave(s));assert.throws(()=>G.roll(s,1));assert.throws(()=>G.nextTurn(s));}
test('two-player rent ends immediately at zero and transfers only the actual balance',()=>{
 for(const coins of [10,30]){const s=duel();s.players[0].coins=coins;s.ownership['bach-air']={player:1,level:0};const next=G.roll(s,1);ended(next,0);assert.equal(next.players[1].coins,1200+coins);assert.equal(next.turnNumber,0);assert.deepEqual(activityChanges(s,next).map(n=>n.type),['rent','bankruptcy']);assert.equal(s.players[0].coins,coins);}
});
test('a loss card can end a duel but a remaining positive balance does not',()=>{
 const s=duel();s.eventDeck.splice(s.eventDeck.indexOf(EVENTS.findIndex(e=>e.amount<0)),1);s.eventDeck.unshift(EVENTS.findIndex(e=>e.amount<0));s.players[0].coins=1;const next=G.roll(s,3);ended(next,0);assert.equal(next.eventCursor,1);assert.deepEqual(activityChanges(s,next).map(n=>n.type),['history-event','bankruptcy']);
 const safe=duel();safe.players[0].coins=31;safe.ownership['bach-air']={player:1,level:0};assert.equal(G.roll(safe,1).phase,'action');
});
test('paying the last coins for a purchase records the work and finishes without advancing the turn',()=>{
 let s=duel();s.players[0].coins=160;s=qualifyPurchase(G.roll(s,1));const next=G.purchaseAndNext(s);ended(next,0);assert.equal(next.ownership['bach-air'].player,0);assert.equal(next.turn,0);assert.equal(next.turnNumber,0);assert.equal(next.purchaseChallenge,null);assert.deepEqual(activityChanges(s,next).map(n=>n.type),['purchase','bankruptcy']);
});
test('concert planning at exactly 100 MC installs the building before ending a duel',()=>{
 let s=duel();s.players[0].coins=100;s.ownership['bach-air']={player:0,level:0};s=G.roll(s,1);const next=G.upgrade(s,'bach-air');ended(next,0);assert.equal(next.ownership['bach-air'].level,1);
});
test('a trade that spends the buyer balance ends the game even on the seller turn',()=>{
 let s=buyQualified(G.roll(duel(),1));s.players[1].coins=200;s=G.proposeTrade(s,{workId:'bach-air',to:1,price:200});const next=G.resolveTrade(s,true);ended(next,1);assert.equal(next.ownership['bach-air'].player,1);assert.equal(next.trade,null);assert.deepEqual(activityChanges(s,next).map(n=>n.type),['trade-complete','bankruptcy']);
});
test('three and four-player classroom games continue at zero coins',()=>{
 for(const count of [3,4]){const s=G.createGame({names:['A','B','C','D'].slice(0,count)});s.players[0].coins=10;s.ownership['bach-air']={player:1,level:0};const next=G.nextTurn(G.roll(s,1));assert.equal(next.phase,'roll');assert.equal(next.turn,1);assert.equal(next.endReason,null);assert.ok(G.isValidSave(next));}
});
test('solo duels use the same bankruptcy rule, broadcast the final state and reject further actions',()=>{
 const service=new RoomService();try{const session=service.createSolo('나',{botCount:1,rounds:4}),room=service.get(session.code);room.state.players[0].coins=160;room.state=qualifyPurchase(G.roll(room.state,1));service.act(session.code,session.token,{action:'purchaseAndNext',revision:room.revision});ended(room.state,0);assert.equal(service.snapshot(room).state.phase,'finished');assert.throws(()=>service.act(session.code,session.token,{action:'nextTurn',revision:room.revision}));const invalid=structuredClone(room.state);invalid.endReason.playerId=3;assert.equal(G.isValidSave(invalid),false);}finally{service.close();}
});
