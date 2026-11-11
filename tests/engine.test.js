import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {buyQualified} from '../test-support/purchases.js';
import {BOARD,WORKS,QUIZZES} from '../src/data.js';
const game=()=>G.createGame({names:['A','B','C','D'],rounds:4,coins:1200});
test('four players, unique colors, input and dice validation',()=>{const s=game();assert.equal(s.players.length,4);assert.equal(new Set(s.players.map(p=>p.color)).size,4);assert.throws(()=>G.createGame({names:['A']}));assert.throws(()=>G.createGame({names:Array(5).fill('A')}));assert.throws(()=>G.roll(s,0));assert.throws(()=>G.roll(s,7));assert.equal(BOARD.length,28);assert.equal(WORKS.length,20);});
test('buy charges once without mutating previous state',()=>{const s=G.roll(game(),1),b=buyQualified(s);assert.equal(b.players[0].coins,1040);assert.equal(s.players[0].coins,1200);assert.equal(b.ownership['bach-air'].player,0);assert.throws(()=>buyQualified(b));assert.throws(()=>G.roll(b,2));});
test('insufficient funds and wrong phase reject purchase',()=>{const s=G.roll(game(),1);s.players[0].coins=100;assert.throws(()=>buyQualified(s));assert.throws(()=>buyQualified(game()));});
test('fees conserve coins and classroom mode never goes negative',()=>{let s=game();s.ownership['bach-air']={player:1,level:0};s.players[0].coins=10;const b=G.roll(s,1);assert.equal(b.players[0].coins,0);assert.equal(b.players[1].coins,1210);});
test('composer and era bonuses do not stack; upgrade adds before multiplying',()=>{let s=G.roll(game(),1);s.ownership['bach-air']={player:0,level:0};s.ownership['bach-brandenburg']={player:0,level:0};assert.equal(G.fee(s,WORKS[0]),45);s=G.upgrade(s,'bach-air');assert.equal(G.fee(s,WORKS[0]),75);assert.throws(()=>G.upgrade(s,'bach-air'));for(const w of WORKS.filter(w=>w.era==='baroque'))s.ownership[w.id]??={player:0,level:0};assert.equal(G.fee(s,WORKS[0]),100);});
test('bank return reimburses half the total investment',()=>{let s=G.upgrade(buyQualified(G.roll(game(),1)),'bach-air');s=G.sell(s,'bach-air');assert.equal(s.players[0].coins,1070);assert.equal(s.ownership['bach-air'],undefined);});
test('trade only transfers on acceptance and preserves upgrade',()=>{let s=G.upgrade(buyQualified(G.roll(game(),1)),'bach-air');const p={workId:'bach-air',to:1,price:300};let pending=G.proposeTrade(s,p);assert.equal(pending.ownership['bach-air'].player,0);assert.throws(()=>G.nextTurn(pending));let rejected=G.resolveTrade(pending,false);assert.equal(rejected.players[0].coins,s.players[0].coins);let accepted=G.resolveTrade(G.proposeTrade(rejected,p),true);assert.equal(accepted.ownership['bach-air'].player,1);assert.equal(accepted.ownership['bach-air'].level,1);assert.equal(accepted.players[1].coins,900);assert.equal(accepted.players[0].coins,1240);assert.throws(()=>G.proposeTrade(s,{...p,price:-1}));assert.throws(()=>G.proposeTrade(s,{...p,to:0}));assert.throws(()=>G.proposeTrade(s,{...p,price:2000}));});
test('quiz rewards once, requires explanation and enforces once per turn',()=>{let s=G.startQuiz(G.roll(game(),1));const q=QUIZZES.find(q=>q.id===s.quiz);assert.throws(()=>G.nextTurn(s));assert.throws(()=>G.answerQuiz(s,9));s=G.answerQuiz(s,q.answer);assert.equal(s.players[0].coins,1280);assert.equal(s.players[0].knowledge,1);assert.throws(()=>G.answerQuiz(s,q.answer));s=G.closeFeedback(s);assert.throws(()=>G.startQuiz(s));});
test('wrong learning quiz answers cost nothing',()=>{let s=game();s.players[0].position=6;s=G.roll(s,1);const q=QUIZZES.find(q=>q.id===s.quiz);s=G.answerQuiz(s,(q.answer+1)%3);assert.equal(s.players[0].coins,1200);assert.equal(s.players[0].attempts,1);assert.equal(s.players[0].knowledge,0);});
test('passing start and shared concert rewards',()=>{let s=game();s.players[0].position=27;s=G.roll(s,1);assert.equal(s.players[0].coins,1400);s=game();s.players[0].position=13;s=G.roll(s,1);assert.ok(s.players.every(p=>p.coins===1300));});
test('events draw one card and apply exactly once',()=>{let s=G.roll(game(),3);assert.equal(s.eventCursor,1);assert.equal(s.players[0].coins,1200+s.lastEvent.actual);assert.throws(()=>G.roll(s,3));});
test('full four-player game finishes after the configured leader laps',()=>{let s=game(),turns=0,seed=123;while(s.phase!=='finished'){assert.ok(turns<2000,'game must terminate');seed=(seed*1664525+1013904223)>>>0;s=G.roll(s,seed%6+1);if(s.phase==='quiz'){s=G.answerQuiz(s,0);s=G.closeFeedback(s);}if(BOARD[G.current(s).position].type==='work'&&!s.ownership[BOARD[G.current(s).position].id]&&G.current(s).coins>=BOARD[G.current(s).position].price)s=buyQualified(s);assert.ok(G.isValidSave(s));s=G.nextTurn(s);turns++;}assert.ok(turns>20);assert.equal(s.leaderLaps,4);assert.equal(s.turn,0);assert.equal(s.round,4);assert.throws(()=>G.roll(s,1));assert.ok(s.players.every(p=>G.score(s,p)>=p.coins));});

test('unowned works show their base fee without phantom collection bonuses',()=>{
 const s=game();assert.deepEqual(G.owned(s,undefined),[]);for(const w of WORKS)assert.equal(G.fee(s,w),w.fee);
});

test('turn cycles and other players laps do not increment the round',()=>{
 let s=game();
 for(let i=0;i<4;i++){if(i===1)s.players[i].position=27;s=G.nextTurn(G.roll(s,1));}
 assert.equal(s.turn,0);assert.equal(s.round,1);assert.equal(s.leaderLaps,0);assert.equal(s.turnNumber,4);
});
test('the leader passing or landing on start increments one round upon crossing start',()=>{
 for(const [position,dice,landing] of [[27,1,0],[26,6,4]]){
  let s=game();s.players[0].position=position;s=G.roll(s,dice);
  assert.equal(s.leaderLaps,1);assert.equal(s.players[0].position,landing);assert.equal(s.round,2);
  s=G.nextTurn(s);assert.equal(s.round,2);assert.equal(s.turn,1);assert.equal(s.phase,'roll');
 }
});
test('4, 8 and 12 laps end only after the final arrival quiz and activities',()=>{
 for(const rounds of [4,8,12]){
  let s=G.createGame({names:['A','B'],rounds});s.leaderLaps=rounds-1;s.round=rounds;s.players[0].position=27;
  // Cross start and reach a quiz through the normal rules, then finish that turn.
  s=G.roll(s,6);assert.equal(s.leaderLaps,rounds);assert.equal(s.phase,'action');
  s=G.startQuiz(s);assert.throws(()=>G.nextTurn(s));
  s=G.answerQuiz(s,0);assert.throws(()=>G.nextTurn(s));s=G.closeFeedback(s);
  s=G.nextTurn(s);assert.equal(s.phase,'finished');assert.equal(s.round,rounds);assert.equal(s.turn,0);assert.ok(G.isValidSave(s));
 }
});

test('learning quizzes award only coins; correct-answer records never add score',()=>{
 let s=G.startQuiz(G.roll(game(),1));const q=QUIZZES.find(q=>q.id===s.quiz);const initial=G.score(s,s.players[0]);s=G.answerQuiz(s,q.answer);
 assert.equal(G.score(s,s.players[0]),initial+80);assert.equal(s.players[0].coins,1280);
 const legacy=structuredClone(s);legacy.players[0].knowledge=20;assert.equal(G.score(legacy,legacy.players[0]),G.score(s,s.players[0]));
});
