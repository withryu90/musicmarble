import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {BOARD} from '../src/data.js';
import {PURCHASE_QUIZZES} from '../src/purchase-quizzes.js';
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
 const s=landed('work');s.players[0].coins=1;assert.equal(canOfferTurnHandoff(s,0),true);const next=G.nextTurn(s);assert.equal(next.turn,1);assert.equal(next.phase,'roll');assert.equal(canOfferTurnHandoff(next,0),false);
});

test('learning is offered only on work and streaming tiles, including purchases and declines',()=>{
 for(const type of new Set(BOARD.map(c=>c.type))){
  const s=landed(type);
  assert.equal(G.canStartLearningQuiz(s),['work','streaming'].includes(type),type);
  if(!['work','streaming'].includes(type))assert.throws(()=>G.startQuiz(s));
 }
 let s=landed('work');s=G.startPurchaseQuiz(s);
 const question=s.purchaseChallenge.questionId;
 const q=PURCHASE_QUIZZES.find(q=>q.id===question);
 const correct=G.answerPurchaseQuiz(s,q.answer);
 for(const resolved of [G.purchaseAndNext(correct),G.skipPurchase(correct),G.closePurchaseFeedback(G.answerPurchaseQuiz(s,!q.answer))]){
  assert.equal(resolved.turn,0);assert.equal(canOfferTurnHandoff(resolved,0),true);
  const learning=G.startQuiz(resolved);assert.equal(learning.phase,'quiz');
  const feedback=G.answerQuiz(learning,0);const done=G.closeFeedback(feedback);
  assert.equal(G.canStartLearningQuiz(done),false);assert.throws(()=>G.startQuiz(done));
  assert.equal(G.nextTurn(done).turn,1);assert.ok(G.isValidSave(done));
 }
});
test('streaming purchase and decline both leave optional learning available',()=>{
 for(const choose of [G.buyPlatform,G.skipStreaming]){
  const s=choose(landed('streaming'));assert.equal(canOfferTurnHandoff(s,0),true);
  assert.equal(G.startQuiz(s).phase,'quiz');
 }
});
