import test from 'node:test';
import assert from 'node:assert/strict';
import {EVENTS} from '../src/data.js';
import * as G from '../src/engine.js';
const game=()=>G.createGame({names:['A','B']});
test('24 event cards have three groups of eight and the requested amounts',()=>{
 assert.equal(EVENTS.length,24);assert.equal(new Set(EVENTS.map(e=>e.title)).size,24);assert.equal(new Set(EVENTS.map(e=>e.id)).size,24);
 assert.deepEqual(EVENTS.map(e=>e.amount),[200,200,150,150,200,150,100,100,-200,-150,-100,-100,-150,-100,-100,-100,100,150,100,100,150,150,-100,100]);
 for(const category of ['수익·기회 카드','손실·위험 카드','음악사·산업 변화 카드'])assert.equal(EVENTS.filter(e=>e.category===category).length,8);
 for(const e of EVENTS)assert.ok(e.text&&e.prompt&&e.period&&e.effect===`${e.amount>=0?'+':''}${e.amount} MC`);
});
test('each event changes only the drawing player coins once, even without works',()=>{
 for(let i=0;i<EVENTS.length;i++){
  let s=game();s.eventDeck=[i,...s.eventDeck.filter(n=>n!==i)];const next=G.roll(s,3);
  assert.equal(next.lastEvent.id,EVENTS[i].id);assert.equal(next.players[0].coins,1200+EVENTS[i].amount);assert.equal(next.players[1].coins,1200);
  assert.deepEqual(next.ownership,{});assert.equal(next.eventCursor,1);assert.ok(G.isValidSave(next));assert.equal(s.players[0].coins,1200);
  assert.throws(()=>G.roll(next,3));assert.equal(next.players[0].coins,1200+EVENTS[i].amount);
 }
});
test('each loss card respects the classroom balance floor',()=>{
 for(let i=0;i<EVENTS.length;i++)if(EVENTS[i].amount<0){const s=game();s.players[0].coins=50;s.eventDeck=[i,...s.eventDeck.filter(n=>n!==i)];const next=G.roll(s,3);assert.equal(next.players[0].coins,0);assert.equal(next.lastEvent.actual,-50);assert.ok(G.isValidSave(next));}
});
test('a complete shuffled deck contains every new event exactly once before cycling',()=>{
 let s=game();const seen=new Set();for(let i=0;i<24;i++){s.players[0].position=0;s.phase='roll';s=G.roll(s,3);assert.ok(!seen.has(s.lastEvent.id));seen.add(s.lastEvent.id);}
 assert.equal(seen.size,24);s.players[0].position=0;s.phase='roll';s=G.roll(s,3);assert.equal(s.eventCursor,25);assert.ok(seen.has(s.lastEvent.id));
});
