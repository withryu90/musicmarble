import test from 'node:test';
import assert from 'node:assert/strict';
import {QUIZZES} from '../src/data.js';
import * as G from '../src/engine.js';
test('requested removals and twenty additions form a 26-question bank',()=>{
 assert.equal(QUIZZES.length,26);assert.equal(new Set(QUIZZES.map(q=>q.id)).size,26);
 assert.ok(!QUIZZES.some(q=>['q5','q6','q7','q8'].includes(q.id)));
 for(const id of ['q1','q2','q3','q4','q9','q10'])assert.ok(QUIZZES.some(q=>q.id===id));
 const added=QUIZZES.filter(q=>Number(q.id.slice(1))>=11);
 for(const era of ['baroque','classical','romantic'])assert.equal(added.filter(q=>q.era===era).length,5);
 assert.equal(added.filter(q=>q.kind==='copyright').length,5);
 for(const q of QUIZZES){assert.ok(q.question&&q.explanation);assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3);}
 assert.equal(new Set(QUIZZES.map(q=>q.question)).size,26);
});
test('all new questions load into games and award the expected quiz result',()=>{
 for(const q of QUIZZES){let s=G.roll(G.createGame({names:['A','B']}),1);s.quizDeck=[q.id,...s.quizDeck.filter(id=>id!==q.id)];s=G.startQuiz(s);assert.equal(s.quiz,q.id);s=G.answerQuiz(s,q.answer);assert.equal(s.players[0].knowledge,1);assert.equal(s.players[0].coins,1280);assert.ok(G.isValidSave(G.closeFeedback(s)));}
});

test('old Q6 decks resume without losing scores and never draw the removed question',()=>{
 const current=G.createGame({names:['A','B']});
 const legacy={...current,quizDeck:['q6',...current.quizDeck],quizCursor:1,phase:'quiz',quiz:'q6',quizUsed:true};
 const migrated=G.migrateRetiredQuiz(legacy);
 assert.ok(G.isValidSave(migrated));assert.notEqual(migrated.quiz,'q6');assert.equal(migrated.quizDeck.includes('q6'),false);assert.equal(legacy.quiz,'q6');
 const feedback=G.migrateRetiredQuiz({...legacy,phase:'feedback',feedback:{correct:true,index:2},players:legacy.players.map((p,i)=>i? p:{...p,coins:1280,knowledge:1,attempts:1})});
 assert.equal(feedback.phase,'action');assert.equal(feedback.players[0].coins,1280);assert.ok(G.isValidSave(feedback));
 const malformed={...legacy,quizDeck:['q6',...current.quizDeck.slice(1),'unknown']};
 assert.equal(G.migrateRetiredQuiz(malformed),malformed);
});

test('both 27- and 28-question saved decks migrate after Q7 removal',()=>{
 for(const retired of [['q7'],['q6','q7']]){
  const state=G.createGame({names:['A','B']});
  state.quizDeck=[...retired,...state.quizDeck];state.quizCursor=state.quizDeck.length+retired.length;state.quiz='q7';state.phase='quiz';state.quizUsed=true;
  const migrated=G.migrateRetiredQuiz(state);
  assert.ok(G.isValidSave(migrated));assert.equal(migrated.quizDeck.length,26);assert.ok(!['q6','q7'].includes(migrated.quiz));
  assert.equal(migrated.quizCursor,27);
 }
});
