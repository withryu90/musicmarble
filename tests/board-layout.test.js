import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_SIDE,BOARD_SPACES,boardCoordinates,ownershipDirection} from '../src/board-layout.js';
import {BOARD,WORKS} from '../src/data.js';
import {PURCHASE_QUIZZES} from '../src/purchase-quizzes.js';
import * as G from '../src/engine.js';
test('8 by 8 board has 28 unique perimeter cells with clockwise adjacent movement',()=>{
 assert.equal(BOARD_SIDE,8);assert.equal(BOARD_SPACES,28);assert.equal(BOARD.length,BOARD_SPACES);const cells=BOARD.map((_,i)=>boardCoordinates(i));assert.equal(new Set(cells.map(p=>p.join(','))).size,28);
 cells.forEach(([r,c],i)=>{assert.ok(r>=1&&r<=8&&c>=1&&c<=8);assert.ok(r===1||r===8||c===1||c===8);const next=cells[(i+1)%cells.length];assert.equal(Math.abs(r-next[0])+Math.abs(c-next[1]),1);});
 assert.deepEqual([0,7,14,21].map(boardCoordinates),[[1,1],[1,8],[8,8],[8,1]]);assert.throws(()=>boardCoordinates(28));assert.throws(()=>boardCoordinates(-1));
});
test('all four era edges have five works and new works have valid purchase quizzes',()=>{
 assert.equal(WORKS.length,20);assert.equal(new Set(BOARD.map(c=>c.id)).size,28);for(const era of ['baroque','classical','romantic','modern'])assert.equal(WORKS.filter(w=>w.era===era).length,5);
 for(const id of ['handel-water','haydn-surprise','brahms-hungarian-5','ravel-bolero']){const i=BOARD.findIndex(w=>w.id===id);let s=G.createGame({names:['A','B']});s.players[0].position=i-1;s=G.roll(s,1);s=G.startPurchaseQuiz(s);const q=PURCHASE_QUIZZES.find(q=>q.id===s.purchaseChallenge.questionId);s=G.answerPurchaseQuiz(s,q.answer);s=G.purchaseAndNext(s);assert.equal(s.ownership[id].player,0);assert.ok(G.isValidSave(s));}
});
test('owning a fifth work retains the four-work era collection bonus',()=>{
 const s=G.createGame({names:['A','B']}),works=WORKS.filter(w=>w.era==='baroque');for(const w of works)s.ownership[w.id]={player:0,level:0};assert.equal(G.collection(s,works[0],0).multiplier,2);assert.ok(G.isValidSave(s));s.players[0].position=27;assert.ok(G.isValidSave(s));s.players[0].position=28;assert.equal(G.isValidSave(s),false);
});

test('ownership colour fills the outward half on all four board edges',()=>{
 for(const [indices,direction] of [[[1,3,6],'bottom'],[[8,10,13],'left'],[[15,17,20],'top'],[[22,24,27],'right']])
  for(const index of indices)assert.equal(ownershipDirection(index),direction);
 assert.throws(()=>ownershipDirection(28));
});
