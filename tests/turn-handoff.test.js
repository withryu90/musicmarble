import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {BOARD} from '../src/data.js';
import {canOfferTurnHandoff} from '../src/turn-handoff.js';
function landed(type){const s=G.createGame();s.phase='action';s.dice=3;s.players[0].position=BOARD.findIndex(c=>c.type===type);return s;}
test('resolved events, fees, concerts and prison can offer a handoff only to the active participant',()=>{
 for(const type of ['event','concert','transfer','prison']){const s=landed(type);if(type==='prison')s.phase='jailed';assert.equal(canOfferTurnHandoff(s,0),true);assert.equal(canOfferTurnHandoff(s,1),false);}
 const rent=landed('work');rent.ownership[BOARD[rent.players[0].position].id]={player:1,level:0};assert.equal(canOfferTurnHandoff(rent,0),true);
});
test('mandatory quizzes, purchase decisions and trades stay ahead of handoff',()=>{
 for(const phase of ['roll','quiz','feedback','purchase-quiz','purchase-feedback','finished']){const s=landed('event');s.phase=phase;assert.equal(canOfferTurnHandoff(s,0),false);}
 const s=landed('work');assert.equal(canOfferTurnHandoff(s,0),false);s.purchaseChallenge={correct:true};assert.equal(canOfferTurnHandoff(s,0),false);s.purchaseChallenge={correct:false};assert.equal(canOfferTurnHandoff(s,0),true);s.trade={from:0,to:1};assert.equal(canOfferTurnHandoff(s,0),false);
});
test('unaffordable works allow passing without a purchase quiz and next turn starts at roll',()=>{
 const s=landed('work');s.players[0].coins=0;assert.equal(canOfferTurnHandoff(s,0),true);const next=G.nextTurn(s);assert.equal(next.turn,1);assert.equal(next.phase,'roll');assert.equal(canOfferTurnHandoff(next,0),false);
});
