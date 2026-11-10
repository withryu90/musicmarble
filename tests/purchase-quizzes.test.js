import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {WORKS} from '../src/data.js';
import {PURCHASE_QUIZZES,purchaseQuizById} from '../src/purchase-quizzes.js';
import {botDecision,applyBotDecision} from '../server/bots.js';
const arrival=()=>G.roll(G.createGame({names:['가온','나래'],coins:1200}),1);
const challenge=()=>G.startPurchaseQuiz(arrival(),()=>0);
const answer=(s,correct=true)=>G.answerPurchaseQuiz(s,correct?purchaseQuizById(s.purchaseChallenge.questionId).answer:!purchaseQuizById(s.purchaseChallenge.questionId).answer);
test('every purchasable work has both O and X questions with explanations',()=>{
 assert.equal(PURCHASE_QUIZZES.length,32);assert.equal(new Set(PURCHASE_QUIZZES.map(q=>q.id)).size,32);
 for(const w of WORKS){const qs=PURCHASE_QUIZZES.filter(q=>q.workId===w.id);assert.deepEqual(qs.map(q=>q.answer),[true,false]);assert.ok(qs.every(q=>q.question&&q.explanation));}
});
test('purchase is rejected until a correct OX answer has been acknowledged',()=>{
 const initial=arrival();assert.throws(()=>G.buy(initial));let s=challenge();assert.throws(()=>G.buy(s));s=answer(s);assert.throws(()=>G.buy(s));
 assert.equal(s.players[0].coins,1200);assert.equal(s.players[0].knowledge,0);assert.equal(s.players[0].attempts,0);
 s=G.closePurchaseFeedback(s);assert.equal(s.phase,'action');assert.equal(s.turn,0);assert.throws(()=>G.startPurchaseQuiz(s));
 const bought=G.buy(s);assert.equal(bought.players[0].coins,1040);assert.equal(bought.ownership['bach-air'].player,0);assert.throws(()=>G.buy(bought));assert.equal(initial.players[0].coins,1200);
});
test('wrong OX answer costs nothing, cannot buy or retry, and passes the turn',()=>{
 let s=answer(challenge(),false);assert.throws(()=>G.buy(s));assert.throws(()=>G.startPurchaseQuiz(s));assert.throws(()=>G.nextTurn(s));
 assert.equal(s.players[0].coins,1200);assert.equal(s.players[0].knowledge,0);assert.deepEqual(s.ownership,{});
 s=G.closePurchaseFeedback(s);assert.equal(s.turn,1);assert.equal(s.phase,'roll');assert.equal(s.purchaseChallenge,null);assert.equal(s.players[0].coins,1200);assert.throws(()=>G.buy(s));
 s=G.roll(s,1);assert.throws(()=>G.buy(s));assert.equal(G.startPurchaseQuiz(s).phase,'purchase-quiz');
});
test('only one boolean answer is accepted and invalid purchase contexts are rejected',()=>{
 let s=challenge();assert.ok(G.isValidSave(s));assert.throws(()=>G.answerPurchaseQuiz(s,'true'));assert.throws(()=>G.closePurchaseFeedback(s));assert.throws(()=>G.startPurchaseQuiz(s));
 s=answer(s);assert.ok(G.isValidSave(s));assert.throws(()=>answer(s));s=G.closePurchaseFeedback(s);assert.ok(G.isValidSave(s));
 assert.throws(()=>G.startPurchaseQuiz(G.createGame({names:['A','B']})));
 const poor=arrival();poor.players[0].coins=0;assert.throws(()=>G.startPurchaseQuiz(poor));
 const owned=arrival();owned.ownership['bach-air']={player:1,level:0};assert.throws(()=>G.startPurchaseQuiz(owned));
 const forged=challenge();forged.purchaseChallenge.correct=true;assert.equal(G.isValidSave(forged),false);
 const moved=structuredClone(s);moved.players[0].position=2;assert.throws(()=>G.buy(moved));assert.equal(G.isValidSave(moved),false);
});
test('bots must take the OX gate and wrong answers never buy or lose coins',()=>{
 for(const correct of [true,false]){
  let s=arrival();s.players[0].isBot=true;let d=botDecision(s,{},()=>.1);assert.equal(d.action,'startPurchaseQuiz');s=applyBotDecision(s,d);
  d=botDecision(s,d.memory,()=>correct?.1:.9);assert.equal(d.action,'answerPurchaseQuiz');s=applyBotDecision(s,d);
  assert.equal(s.purchaseChallenge.correct,correct);assert.equal(s.players[0].coins,1200);
  d=botDecision(s,d.memory);assert.equal(d.action,'closePurchaseFeedback');s=applyBotDecision(s,d);
  if(correct){d=botDecision(s,d.memory);assert.equal(d.action,'buy');s=applyBotDecision(s,d);assert.equal(s.players[0].coins,1040);}else{assert.equal(s.turn,1);assert.deepEqual(s.ownership,{});assert.equal(s.players[0].coins,1200);}
 }
});
