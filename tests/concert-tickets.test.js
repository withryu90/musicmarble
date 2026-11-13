import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {BOARD,CONCERT_SEATS} from '../src/data.js';
import {activityChanges,ActivityInbox} from '../src/activities.js';
const game=(names=['개최자','관객1','관객2','관객3'])=>{const s=G.createGame({names});s.players[0].position=13;return s;};
test('concert tile draws each attendee tier once and transfers coins to host without minting money',()=>{
 const before=game(),draws=[0,.5,.999999];let calls=0;
 const after=G.roll(before,1,()=>draws[calls++]);
 assert.equal(BOARD[14].title,'음악회 개최');assert.equal(calls,3);assert.deepEqual(after.lastConcert.tickets.map(t=>t.seatId),['s','r','vip']);
 assert.deepEqual(after.players.map(p=>p.coins),[1500,1150,1100,1050]);assert.equal(after.lastConcert.total,300);
 assert.equal(after.players.reduce((sum,p)=>sum+p.coins,0),4800);assert.deepEqual(before.players.map(p=>p.coins),[1200,1200,1200,1200]);assert.ok(G.isValidSave(after));
});
test('each tier has its own price; grades may repeat and the host never pays',()=>{
 for(let i=0;i<CONCERT_SEATS.length;i++){
  const s=game();s.turn=2;s.players[2].position=13;const after=G.roll(s,1,()=>(i+.1)/3);
  assert.equal(after.lastConcert.hostId,2);assert.ok(after.lastConcert.tickets.every(t=>t.playerId!==2&&t.seatId===CONCERT_SEATS[i].id&&t.amount===CONCERT_SEATS[i].price));
  assert.equal(after.players[2].coins,1200+3*CONCERT_SEATS[i].price);assert.ok(G.isValidSave(after));
 }
});
test('insufficient balances pay only what remains and preserve multiplayer classroom rules',()=>{
 const s=game();s.players[1].coins=20;s.players[2].coins=0;
 const after=G.roll(s,1,()=>.99);assert.equal(after.phase,'action');assert.deepEqual(after.lastConcert.tickets.map(t=>t.amount),[20,0,150]);
 assert.deepEqual(after.players.map(p=>p.coins),[1370,0,0,1050]);assert.ok(G.isValidSave(after));
});
test('a ticket payment at or below the remaining balance ends a duel with spectator bankruptcy',()=>{
 for(const balance of [20,150]){
  const s=game(['개최자','관객']);s.players[1].coins=balance;const after=G.roll(s,1,()=>.99);
  assert.equal(after.phase,'finished');assert.deepEqual(after.endReason,{type:'bankruptcy',playerId:1});assert.equal(after.players[0].coins,1200+balance);
  assert.deepEqual(activityChanges(s,after).map(n=>n.type),['concert','bankruptcy']);assert.ok(G.isValidSave(after));
 }
});
test('settlement is persisted and shared as one immutable event; duplicate snapshots do not redraw or replay',()=>{
 const before=game(),after=G.roll(before,1,()=>.5),notice=activityChanges(before,after)[0];assert.equal(notice.type,'concert');assert.equal(notice.changes.reduce((sum,c)=>sum+c.amount,0),0);
 assert.deepEqual(notice.concert,after.lastConcert);notice.concert.tickets[0].amount=9;assert.equal(after.lastConcert.tickets[0].amount,100);
 const saved=JSON.parse(JSON.stringify(after));assert.ok(G.isValidSave(saved));assert.deepEqual(saved.lastConcert,after.lastConcert);
 const inbox=new ActivityInbox();inbox.accept('ROOM',[]);const events=[{...notice,id:1}];inbox.accept('ROOM',events);inbox.accept('ROOM',events);assert.equal(inbox.pending.length,1);
 const next=G.nextTurn(saved);assert.equal(next.lastConcert,null);assert.ok(G.isValidSave(next));assert.equal(activityChanges(after,next).filter(n=>n.type==='concert').length,0);
 const legacy=game();delete legacy.lastConcert;assert.ok(G.isValidSave(legacy));
});
test('invalid ticket settlements cannot be restored',()=>{
 const good=G.roll(game(),1,()=>.5);
 for(const mutate of [s=>s.lastConcert.hostId=1,s=>s.lastConcert.total++,s=>s.lastConcert.tickets[0].seatId='fake',s=>s.lastConcert.tickets[0].price=999,s=>s.lastConcert.tickets[0].amount=101,s=>s.lastConcert.tickets[0].playerId=0,s=>s.lastConcert.tickets[1].playerId=1]){const s=structuredClone(good);mutate(s);assert.equal(G.isValidSave(s),false);}
});
