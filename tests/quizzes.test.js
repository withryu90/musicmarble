import test from 'node:test';
import assert from 'node:assert/strict';
import {QUIZZES} from '../src/data.js';
import * as G from '../src/engine.js';
test('requested two questions removed and twenty additions form a 28-question bank',()=>{
 assert.equal(QUIZZES.length,28);assert.equal(new Set(QUIZZES.map(q=>q.id)).size,28);
 assert.ok(!QUIZZES.some(q=>['q5','q8'].includes(q.id)));
 for(const id of ['q1','q2','q3','q4','q6','q7','q9','q10'])assert.ok(QUIZZES.some(q=>q.id===id));
 const added=QUIZZES.filter(q=>Number(q.id.slice(1))>=11);
 for(const era of ['baroque','classical','romantic'])assert.equal(added.filter(q=>q.era===era).length,5);
 assert.equal(added.filter(q=>q.kind==='copyright').length,5);
 for(const q of QUIZZES){assert.ok(q.question&&q.explanation);assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3);}
 assert.equal(new Set(QUIZZES.map(q=>q.question)).size,28);
});
test('all new questions load into games and award the expected quiz result',()=>{
 for(const q of QUIZZES){let s=G.roll(G.createGame({names:['A','B']}),1);s.quizDeck=[q.id,...s.quizDeck.filter(id=>id!==q.id)];s=G.startQuiz(s);assert.equal(s.quiz,q.id);s=G.answerQuiz(s,q.answer);assert.equal(s.players[0].knowledge,1);assert.equal(s.players[0].coins,1280);assert.ok(G.isValidSave(G.closeFeedback(s)));}
});
