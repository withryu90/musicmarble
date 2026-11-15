import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {BOARD,WORKS,QUIZZES} from '../src/data.js';
import {purchaseQuizById} from '../src/purchase-quizzes.js';
const game=()=>G.createGame({names:['A','B','C','D'],coins:1600});
function purchase(s,work,player=0){const next=structuredClone(s);next.turn=player;next.phase='action';next.purchaseChallenge=null;next.players[player].position=BOARD.findIndex(c=>c.id===work);return G.startPurchaseQuiz(next,()=>0);}
function learning(s,player=0){const next=structuredClone(s);next.turn=player;next.phase='action';next.purchaseChallenge=null;next.quiz=null;next.feedback=null;next.quizUsed=false;next.players[player].position=1;return G.startQuiz(next);}
test('every player gets all five work questions before a repeat, even with a constant random source',()=>{
 for(const work of WORKS){let s=game();const seen=Array.from({length:4},()=>[]);
 for(let cycle=0;cycle<3;cycle++)for(let visit=0;visit<5;visit++)for(let p=0;p<4;p++){
 s=purchase(s,work.id,p);
 seen[p].push(s.purchaseChallenge.questionId);assert.ok(G.isValidSave(s));
 }
 for(const ids of seen){for(let i=0;i<3;i++)assert.equal(new Set(ids.slice(i*5,i*5+5)).size,5);for(let i=1;i<ids.length;i++)assert.notEqual(ids[i],ids[i-1]);}
 }
});
test('learning questions cover the full bank for each player despite uneven turn distribution',()=>{
 let s=game();const seen=Array.from({length:4},()=>[]);
 for(const p of [0,0,0,1,2,0,3,1,3,2,1,0,2,3,3,0,1,2]){s=learning(s,p);seen[p].push(s.quiz);}
 for(let p=0;p<4;p++)while(seen[p].length<QUIZZES.length*3){s=learning(s,p);seen[p].push(s.quiz);assert.ok(G.isValidSave(s));}
 for(const ids of seen){for(let i=0;i<3;i++)assert.equal(new Set(ids.slice(i*QUIZZES.length,(i+1)*QUIZZES.length)).size,QUIZZES.length);for(let i=1;i<ids.length;i++)assert.notEqual(ids[i],ids[i-1]);}
});
test('equally new questions prefer those other participants have not seen; each work keeps its own pool',()=>{
 let s=game();const ids=[];for(let p=0;p<4;p++){s=purchase(s,WORKS[0].id,p);ids.push(s.purchaseChallenge.questionId);}assert.equal(new Set(ids).size,4);
 const next=purchase(s,WORKS[1].id,0);assert.equal(purchaseQuizById(next.purchaseChallenge.questionId).workId,WORKS[1].id);
 assert.equal(s.quizHistory[0].counts[next.purchaseChallenge.questionId],undefined);
});
test('wrong answers and timeouts count as seen, while reconnect preserves history and corrupt records are rejected',()=>{
 let s=purchase(game(),WORKS[0].id),first=s.purchaseChallenge.questionId;
 s=G.answerPurchaseQuiz(s,!purchaseQuizById(first).answer);s=JSON.parse(JSON.stringify(s));assert.ok(G.isValidSave(s));
 s=purchase(s,WORKS[0].id);assert.notEqual(s.purchaseChallenge.questionId,first);const second=s.purchaseChallenge.questionId;
 s=G.beginQuizTimer(s,1000);s=G.expireQuiz(s,11000);assert.equal(s.quizHistory[0].counts[second],1);
 s=purchase(s,WORKS[0].id);assert.notEqual(s.purchaseChallenge.questionId,first);assert.notEqual(s.purchaseChallenge.questionId,second);
 for(const history of [null,[],{9:{counts:{},last:{}}},{0:{counts:{bad:1},last:{}}},{0:{counts:{[first]:-1},last:{}}}])assert.equal(G.isValidSave({...s,quizHistory:history}),false);
});
test('old active saves retain the displayed question without changing coins or answers',()=>{
 let old=purchase(game(),WORKS[0].id);delete old.quizHistory;const id=old.purchaseChallenge.questionId;assert.ok(G.isValidSave(old));
 const next=G.beginQuizTimer(old,1000);assert.equal(next.quizHistory[0].counts[id],1);assert.deepEqual(next.players,old.players);assert.equal(old.quizHistory,undefined);
 const drawn=purchase(next,WORKS[0].id);assert.notEqual(drawn.purchaseChallenge.questionId,id);
});
