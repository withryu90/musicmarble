import test from 'node:test';
import assert from 'node:assert/strict';
import {QUIZZES} from '../src/data.js';
import * as G from '../src/engine.js';
const history=['q1','q2','q3','q4','q9',...Array.from({length:15},(_,i)=>`q${i+11}`)];
const retired=['q6','q7','q10','q26','q27','q28','q29','q30'];
const game=()=>G.createGame({names:['A','B']});
test('learning bank contains only ten sourced copyright and creators-rights questions',()=>{
 assert.equal(QUIZZES.length,10);assert.equal(new Set(QUIZZES.map(q=>q.id)).size,10);assert.equal(new Set(QUIZZES.map(q=>q.question)).size,10);
 for(const q of QUIZZES){assert.equal(q.kind,'copyright');assert.ok(!history.includes(q.id)&&!retired.includes(q.id));assert.ok(q.question&&q.explanation);assert.ok(q.sourceUrl.startsWith('https://easylaw.go.kr/'));assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3);}
});
test('every rights question can be drawn and answered, with +80 MC for correct and no deduction for wrong',()=>{
 for(const q of QUIZZES)for(const correct of [true,false]){
  let s=G.roll(game(),1);s.quizDeck=[q.id,...s.quizDeck.filter(id=>id!==q.id)];s=G.startQuiz(s);assert.equal(s.quiz,q.id);
  s=G.answerQuiz(s,correct?q.answer:(q.answer+1)%3);assert.equal(s.feedback.correct,correct);assert.equal(s.players[0].coins,correct?1280:1200);assert.equal(s.players[0].knowledge,correct?1:0);assert.ok(G.isValidSave(G.closeFeedback(s)));
 }
});
test('complete previous published banks resume using only rights questions and keep scores',()=>{
 for(const oldDeck of [history,[...history,'q7'],[...history,'q6','q7'],[...history,...retired],[...history,...QUIZZES.map(q=>q.id)]])for(const phase of ['roll','quiz','feedback']){
  const old=game();old.quizDeck=[...oldDeck];old.quizCursor=oldDeck.length+3;old.phase=phase;
  old.players[0].coins=1440;old.players[0].knowledge=3;old.players[0].attempts=4;
  if(phase!=='roll'){old.quiz='q25';old.quizUsed=true;}if(phase==='feedback')old.feedback={correct:true,index:2};
  const result=G.migrateRetiredQuiz(old);assert.ok(G.isValidSave(result));assert.equal(result.quizDeck.length,10);assert.ok(result.quizDeck.every(id=>QUIZZES.some(q=>q.id===id)));
  assert.deepEqual(result.players,old.players);assert.equal(old.quizDeck.length,oldDeck.length);assert.equal(G.migrateRetiredQuiz(result),result);
  if(phase==='quiz'){assert.equal(result.phase,'quiz');assert.ok(QUIZZES.some(q=>q.id===result.quiz));}
  if(phase==='feedback'){assert.equal(result.phase,'action');assert.equal(result.quiz,null);assert.equal(result.feedback,null);}
 }
});
test('an active rights question and its already-earned feedback survive history retirement',()=>{
 for(const phase of ['quiz','feedback']){
  const s=game();s.quizDeck=[...history,...s.quizDeck];s.quiz='q31';s.phase=phase;s.quizUsed=true;s.quizCursor=21;
  if(phase==='feedback'){s.feedback={correct:true,index:1};s.players[0].coins=1280;s.players[0].knowledge=1;s.players[0].attempts=1;}
  const result=G.migrateRetiredQuiz(s);assert.ok(G.isValidSave(result));assert.equal(result.phase,phase);assert.equal(result.quiz,'q31');assert.deepEqual(result.feedback,s.feedback);assert.deepEqual(result.players,s.players);assert.equal(result.quizCursor,1);
 }
});
test('old removed questions are replaced, while corrupt or incomplete banks remain rejected',()=>{
 for(const id of retired){const s=game();s.quizDeck=[...history,...retired];s.phase='quiz';s.quiz=id;s.quizUsed=true;s.quizCursor=22;const result=G.migrateRetiredQuiz(s);assert.ok(G.isValidSave(result));assert.ok(QUIZZES.some(q=>q.id===result.quiz));}
 const current=game();assert.equal(G.migrateRetiredQuiz(current),current);
 for(const deck of [[],history.slice(1),[...history,'q31'],[...history,'untrusted'],[...current.quizDeck,current.quizDeck[0]],current.quizDeck.slice(1)]){const s={...current,quizDeck:deck};assert.equal(G.migrateRetiredQuiz(s),s);assert.equal(G.isValidSave(s),false);}
});
