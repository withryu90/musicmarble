import test from 'node:test';
import assert from 'node:assert/strict';
import {QUIZZES} from '../src/data.js';
import * as G from '../src/engine.js';
test('twenty history and ten newly sourced copyright learning questions coexist',()=>{
 assert.equal(QUIZZES.length,30);assert.equal(new Set(QUIZZES.map(q=>q.id)).size,30);
 assert.ok(!QUIZZES.some(q=>['q5','q6','q7','q8','q10','q26','q27','q28','q29','q30'].includes(q.id)));
 for(const id of ['q1','q2','q3','q4','q9'])assert.ok(QUIZZES.some(q=>q.id===id));
 const added=QUIZZES.filter(q=>Number(q.id.slice(1))>=11);
 for(const era of ['baroque','classical','romantic'])assert.equal(added.filter(q=>q.era===era).length,5);
 assert.equal(QUIZZES.filter(q=>q.kind==='copyright').length,10);
 for(const q of QUIZZES){assert.ok(q.question&&q.explanation);assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3);}
 assert.equal(new Set(QUIZZES.map(q=>q.question)).size,30);
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
  assert.ok(G.isValidSave(migrated));assert.equal(migrated.quizDeck.length,30);assert.ok(!['q6','q7'].includes(migrated.quiz));
  assert.equal(migrated.quizCursor,31);
 }
});

test('all retired copyright questions migrate from every previous published bank',()=>{
 const copyright=['q10','q26','q27','q28','q29','q30'];
 for(const extra of [[],['q7'],['q6','q7']])for(const id of copyright){
  const s=G.createGame({names:['A','B']});s.quizDeck=[...copyright,...extra,...s.quizDeck];s.phase='quiz';s.quiz=id;s.quizUsed=true;s.quizCursor=copyright.indexOf(id)+1;
  const result=G.migrateRetiredQuiz(s);assert.ok(G.isValidSave(result));assert.equal(result.quizDeck.length,30);assert.ok(QUIZZES.some(q=>q.id===result.quiz));
 }
});

test('all added copyright questions carry the supplied source and wrong answers never deduct coins',()=>{
 const questions=QUIZZES.filter(q=>q.kind==='copyright');assert.equal(questions.length,10);
 for(const q of questions){
  assert.ok(q.sourceUrl.startsWith('https://easylaw.go.kr/'));assert.ok(Number(q.id.slice(1))>=31);
  let s=G.roll(G.createGame({names:['A','B']}),1);s.quizDeck=[q.id,...s.quizDeck.filter(id=>id!==q.id)];s=G.startQuiz(s);
  s=G.answerQuiz(s,(q.answer+1)%3);assert.equal(s.feedback.correct,false);assert.equal(s.players[0].coins,1200);assert.ok(G.isValidSave(G.closeFeedback(s)));
 }
});
test('published 20-question saves gain all ten new questions while keeping scores and active quiz or feedback',()=>{
 const ids=QUIZZES.filter(q=>q.kind==='history').map(q=>q.id);
 for(const phase of ['roll','quiz','feedback']){
  const old=G.createGame({names:['A','B']});old.quizDeck=[...ids].reverse();old.quizCursor=23;old.phase=phase;
  old.players[0].coins=1440;old.players[0].knowledge=3;old.players[0].attempts=4;
  if(phase!=='roll'){old.quiz='q25';old.quizUsed=true;}
  if(phase==='feedback')old.feedback={correct:true,index:2};
  const result=G.migrateRetiredQuiz(old);assert.ok(G.isValidSave(result));assert.equal(result.phase,phase);assert.equal(result.quiz,old.quiz);
  assert.deepEqual(result.quizDeck.slice(0,20),old.quizDeck);assert.equal(result.quizDeck.length,30);assert.equal(result.quizCursor,33);assert.deepEqual(result.players,old.players);assert.deepEqual(result.feedback,old.feedback);
  assert.equal(old.quizDeck.length,20);assert.equal(G.migrateRetiredQuiz(result),result);
 }
});
test('known historical banks migrate but incomplete or unknown decks stay rejected',()=>{
 const old=G.createGame({names:['A','B']});old.quizDeck=old.quizDeck.filter(id=>QUIZZES.some(q=>q.id===id&&q.kind==='history'));
 for(const retired of [[],['q6','q7'],['q10','q26','q27','q28','q29','q30'],['q6','q7','q10','q26','q27','q28','q29','q30']]){
  const s={...old,quizDeck:[...old.quizDeck,...retired]};assert.ok(G.isValidSave(G.migrateRetiredQuiz(s)));
 }
 for(const deck of [[...old.quizDeck,'q31'],[...old.quizDeck,'untrusted'],old.quizDeck.slice(1),[...old.quizDeck,old.quizDeck[0]]]){
  const invalid={...old,quizDeck:deck};assert.equal(G.migrateRetiredQuiz(invalid),invalid);assert.equal(G.isValidSave(invalid),false);
 }
});
