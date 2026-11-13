import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD} from '../src/data.js';
import * as G from '../src/engine.js';
import {activityChanges} from '../src/activities.js';
const game=()=>G.createGame({names:['A','B','C','D']});
const beforeTile=()=>{const s=game();s.players[0].position=26;return s;};
test('only the last history tile is replaced and board remains 32 spaces',()=>{
 assert.equal(BOARD.length,32);assert.equal(BOARD[0].type,'start');assert.equal(BOARD[27].type,'transfer');assert.equal(BOARD[27].title,'저작권 양도');assert.equal(BOARD.filter(c=>c.type==='event').length,2);
});
test('the highest base-price work is assigned with project level and no coin changes',()=>{
 const s=beforeTile();s.ownership={'bach-air':{player:0,level:1},'beethoven-9':{player:0,level:0},'stravinsky-spring':{player:0,level:1},'debussy-sea':{player:2,level:1}};
 const beforeCoins=s.players.map(p=>p.coins),next=G.roll(s,1,()=>0);
 assert.deepEqual(next.lastAssignment,{from:0,to:1,workId:'stravinsky-spring',price:340,skipped:false});assert.deepEqual(next.ownership['stravinsky-spring'],{player:1,level:1});
 assert.deepEqual(next.players.map(p=>p.coins),beforeCoins);assert.deepEqual(next.ownership['bach-air'],s.ownership['bach-air']);assert.deepEqual(next.ownership['debussy-sea'],s.ownership['debussy-sea']);assert.equal(s.ownership['stravinsky-spring'].player,0);assert.equal(next.eventCursor,0);assert.equal(next.phase,'action');assert.ok(G.isValidSave(next));
 const notices=activityChanges(s,next);assert.equal(notices.length,1);assert.equal(notices[0].type,'copyright-transfer');assert.equal(notices[0].otherId,1);assert.deepEqual(notices[0].changes,[]);
});
test('a cheaper upgraded work never outranks a more expensive base work',()=>{
 const s=beforeTile();s.ownership={'bach-air':{player:0,level:1},'bach-brandenburg':{player:0,level:0}};
 assert.equal(G.roll(s,1,()=>0).lastAssignment.workId,'bach-brandenburg');
});
test('ties and recipients use the random draw and never assign back to the actor',()=>{
 const s=beforeTile();s.ownership={'beethoven-5':{player:0,level:0},'chopin-polonaises':{player:0,level:1}};
 const low=G.roll(s,1,()=>0),high=G.roll(s,1,()=>.999999);assert.equal(low.lastAssignment.workId,'beethoven-5');assert.equal(high.lastAssignment.workId,'chopin-polonaises');assert.equal(low.lastAssignment.to,1);assert.equal(high.lastAssignment.to,3);
 for(let turn=0;turn<4;turn++){const s=game();s.turn=turn;s.players[turn].position=26;s.ownership['bach-air']={player:turn,level:0};for(const rng of [()=>0,()=>.999])assert.notEqual(G.roll(s,1,rng).lastAssignment.to,turn);}
});
test('players without works pass the tile without losing coins or drawing an event',()=>{
 const s=beforeTile(),next=G.roll(s,1);assert.deepEqual(next.ownership,{});assert.deepEqual(next.players.map(p=>p.coins),s.players.map(p=>p.coins));assert.equal(next.eventCursor,0);assert.equal(next.quiz,null);assert.deepEqual(next.lastAssignment,{from:0,skipped:true});assert.equal(activityChanges(s,next)[0].type,'copyright-transfer-skipped');assert.ok(G.isValidSave(next));
});
test('assignment is not repeated by later actions and next turn clears its result',()=>{
 const s=beforeTile();s.ownership['bach-air']={player:0,level:1};const next=G.roll(s,1,()=>0),following=G.nextTurn(next);assert.equal(following.lastAssignment,null);assert.equal(following.ownership['bach-air'].player,1);assert.equal(activityChanges(next,following).length,0);
 assert.throws(()=>G.roll(next,1));const invalid=structuredClone(next);invalid.lastAssignment.to=0;assert.equal(G.isValidSave(invalid),false);
});
