import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {buyQualified} from '../test-support/purchases.js';
import {botDecision} from '../src/bots.js';
import {WORKS} from '../src/data.js';
const game=()=>G.createGame({names:['A','B'],rounds:4});
test('buying a work never allows an immediate concert, but landing on it on a later turn does',()=>{
 let s=buyQualified(G.roll(game(),1));const bought=structuredClone(s);
 assert.equal(G.concertWork(s),null);assert.equal(G.canUpgrade(s,'bach-air'),false);assert.throws(()=>G.upgrade(s,'bach-air'));
 s=G.nextTurn(s);s=G.nextTurn(G.roll(s,1));s.players[0].position=31;s=G.roll(s,2);
 assert.equal(G.concertWork(s).id,'bach-air');assert.equal(G.canUpgrade(s,'bach-air'),true);
 const before=s.players[0].coins;s=G.upgrade(s,'bach-air');assert.equal(s.players[0].coins,before-100);assert.equal(s.ownership['bach-air'].level,1);assert.equal(G.fee(s,WORKS.find(w=>w.id==='bach-air')),50);
 assert.throws(()=>G.upgrade(s,'bach-air'));assert.ok(G.isValidSave(s));assert.equal(bought.ownership['bach-air'].level,0);
});
test('other owned tiles, insufficient coins, trades and unresolved quizzes cannot bypass the arrival rule',()=>{
 let s=game();s.ownership['bach-air']={player:0,level:0};s.ownership['bach-brandenburg']={player:0,level:0};s=G.roll(s,1);
 assert.throws(()=>G.upgrade(s,'bach-brandenburg'));
 const poor=structuredClone(s);poor.players[0].coins=99;assert.throws(()=>G.upgrade(poor,'bach-air'));
 const trade=G.proposeTrade(s,{workId:'bach-air',to:1,price:100});assert.throws(()=>G.upgrade(trade,'bach-air'));
 const quiz=G.startQuiz(s);assert.throws(()=>G.upgrade(quiz,'bach-air'));
 s=G.nextTurn(s);assert.equal(s.concertWorkId,null);assert.equal(G.concertWork(s),null);
});
test('acquiring a work after arrival does not create a concert opportunity',()=>{
 let s=game();s.ownership['bach-air']={player:1,level:0};s=G.roll(s,1);
 s.ownership['bach-air'].player=0;assert.equal(G.concertWork(s),null);assert.throws(()=>G.upgrade(s,'bach-air'));
});
test('a backward move onto an already owned work offers only that work and bots follow the same condition',()=>{
 let s=game();s.players[0].isBot=true;s.players[0].position=7;s.ownership['vivaldi-spring']={player:0,level:0};s=G.roll(G.roll(s,1),4);
 assert.equal(s.lastBackwardMove.to,4);assert.equal(G.concertWork(s)?.id,'vivaldi-spring');
 assert.equal(botDecision(s,{},()=>.1).action,'upgrade');
 s.ownership['vivaldi-spring'].player=1;const decision=botDecision(s,{},()=>.1);assert.notEqual(decision.action,'upgrade');
});
test('the arrival opportunity survives a save but legacy or invalid opportunities do not enable concerts',()=>{
 let s=game();s.ownership['bach-air']={player:0,level:0};s=G.roll(s,1);
 const saved=JSON.parse(JSON.stringify(s));assert.ok(G.isValidSave(saved));assert.ok(G.canUpgrade(saved,'bach-air'));
 delete saved.concertWorkId;assert.ok(G.isValidSave(saved));assert.equal(G.concertWork(saved),null);
 saved.concertWorkId='bach-brandenburg';assert.equal(G.isValidSave(saved),false);
});
