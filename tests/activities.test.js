import test from 'node:test';
import assert from 'node:assert/strict';
import {activityChanges,ActivityInbox} from '../src/activities.js';
import * as G from '../src/engine.js';
import {buyQualified} from '../test-support/purchases.js';
import {EVENTS,QUIZZES} from '../src/data.js';
import {RoomService} from '../server/rooms.js';
import {purchaseQuizById} from '../src/purchase-quizzes.js';
const game=()=>G.createGame({names:['하나','둘','셋']});
test('purchase, project, sale and quiz notices describe exact public coin changes',()=>{
 const arrived=G.roll(game(),1),bought=buyQualified(arrived),returned=G.roll({...bought,phase:'roll',players:bought.players.map(p=>({...p,position:0}))},1),project=G.upgrade(returned,'bach-air'),sold=G.sell(project,'bach-air');
 assert.deepEqual(activityChanges(arrived,bought).map(n=>[n.type,n.changes]),[['purchase',[{playerId:0,amount:-160}]]]);
 assert.equal(activityChanges(returned,project)[0].type,'upgrade');assert.equal(activityChanges(project,sold)[0].changes[0].amount,130);
 for(const correct of [true,false]){const q=G.startQuiz(arrived),question=QUIZZES.find(x=>x.id===q.quiz),answered=G.answerQuiz(q,correct?question.answer:(question.answer+1)%3);const n=activityChanges(q,answered)[0];assert.equal(n.type,'quiz-result');assert.equal(n.changes[0].amount,correct?80:0);assert.equal(n.correct,correct);}
});
test('rent reports the payer, owner, actual amount and waived shortfall',()=>{
 const s=game();s.ownership['bach-air']={player:1,level:0};s.players[0].coins=10;
 const arrived=G.roll(s,1),n=activityChanges(s,arrived)[0];assert.equal(n.type,'rent');assert.equal(n.expected,30);assert.deepEqual(n.changes,[{playerId:0,amount:-10},{playerId:1,amount:10}]);
});
test('passing start, history cards and all-player concert awards are separate notices',()=>{
 const s=game();s.players[0].position=26;const arrived=G.roll(s,5),notices=activityChanges(s,arrived);
 assert.deepEqual(notices.map(n=>n.type),['start-bonus','history-event']);assert.equal(notices[0].changes[0].amount,200);assert.equal(notices[1].card.id,arrived.lastEvent.id);
 const c=game();c.players[0].position=13;const concert=activityChanges(c,G.roll(c,1))[0];assert.equal(concert.type,'concert');assert.deepEqual(concert.changes.map(c=>c.amount),[100,100,100]);
});
test('all 24 cards retain text, amount and category for public trading-card display',()=>{
 for(let i=0;i<EVENTS.length;i++){const s=game();s.eventDeck=[i,...s.eventDeck.filter(n=>n!==i)];const n=activityChanges(s,G.roll(s,3))[0];assert.equal(n.card.title,EVENTS[i].title);assert.equal(n.card.text,EVENTS[i].text);assert.equal(n.card.category,EVENTS[i].category);assert.equal(n.changes[0].amount,EVENTS[i].amount);}
});
test('trade offer, completion and cancellation are distinguished without phantom transfers',()=>{
 const s=buyQualified(G.roll(game(),1)),offer=G.proposeTrade(s,{workId:'bach-air',to:1,price:200});assert.equal(activityChanges(s,offer)[0].type,'trade-offer');
 const accepted=activityChanges(offer,G.resolveTrade(offer,true));assert.equal(accepted.length,1);assert.equal(accepted[0].type,'trade-complete');assert.deepEqual(accepted[0].changes,[{playerId:1,amount:-200},{playerId:0,amount:200}]);
 const declined=activityChanges(offer,G.resolveTrade(offer,false));assert.equal(declined[0].type,'trade-cancelled');assert.deepEqual(declined[0].changes,[]);
});
test('five independent participant inboxes see the same journal once; new rooms reset',()=>{
 const clients=Array.from({length:5},()=>new ActivityInbox());const first={id:1,type:'purchase'},second={id:2,type:'rent'};
 clients.forEach(c=>{c.accept('ROOM',[]);c.accept('ROOM',[first]);c.accept('ROOM',[first,second]);c.accept('ROOM',[first,second]);assert.deepEqual(c.pending.map(n=>n.id),[1,2]);assert.equal(c.take().id,1);assert.equal(c.take().id,2);assert.equal(c.take(),null);c.accept('OTHER',[{id:20}]);assert.equal(c.pending.length,0);c.accept('OTHER',[{id:20},{id:21}]);assert.equal(c.take().id,21);});
});
test('room broadcasts include ordered notices for both participants and isolate other rooms',()=>{
 const service=new RoomService();try{
  const a=service.create('A'),b=service.join(a.code,'B'),other=service.create('C'),room=service.get(a.code),messagesA=[],messagesB=[];
  const offA=service.subscribe(a.code,a.token,s=>messagesA.push(structuredClone(s))),offB=service.subscribe(b.code,b.token,s=>messagesB.push(structuredClone(s)));
  service.act(a.code,a.token,{action:'start',revision:room.revision});
  room.state=G.roll(room.state,1);service.broadcast(room);
  service.act(a.code,a.token,{action:'startPurchaseQuiz',revision:room.revision});
  const q=purchaseQuizById(room.state.purchaseChallenge.questionId);
  service.act(a.code,a.token,{action:'answerPurchaseQuiz',args:[q.answer],revision:room.revision});
  service.act(a.code,a.token,{action:'closePurchaseFeedback',revision:room.revision});
  service.act(a.code,a.token,{action:'buy',revision:room.revision});
  const journal=service.snapshot(room).activities;assert.equal(journal.at(-1).type,'purchase');assert.equal(journal.at(-1).id,2);assert.deepEqual(messagesA.at(-1).activities,messagesB.at(-1).activities);
  assert.equal(service.snapshot(service.get(other.code)).activities.length,0);assert.ok(!JSON.stringify(journal).includes(a.token));assert.ok(!JSON.stringify(journal).includes(b.token));
  service.broadcast(room);assert.equal(service.snapshot(room).activities.length,2);offA();offB();
 }finally{service.close();}
});
test('public quiz verdicts clearly distinguish wrong answers and include chosen and correct answers',()=>{
 const started=G.startQuiz(G.roll(game(),1)),q=QUIZZES.find(q=>q.id===started.quiz);
 for(const correct of [true,false]){const index=correct?q.answer:(q.answer+1)%q.options.length,answered=G.answerQuiz(started,index),notice=activityChanges(started,answered)[0];assert.equal(notice.correct,correct);assert.match(notice.title,correct?/정답/:/오답/);assert.equal(notice.selectedAnswer,`${index+1}. ${q.options[index]}`);assert.equal(notice.correctAnswer,`${q.answer+1}. ${q.options[q.answer]}`);}
 const challenge=G.startPurchaseQuiz(G.roll(game(),1),()=>0),purchase=purchaseQuizById(challenge.purchaseChallenge.questionId);
 for(const correct of [true,false]){const response=correct?purchase.answer:!purchase.answer,answered=G.answerPurchaseQuiz(challenge,response),notice=activityChanges(challenge,answered)[0];assert.equal(notice.correct,correct);assert.equal(Object.hasOwn(notice,'selectedAnswer'),false);assert.equal(Object.hasOwn(notice,'correctAnswer'),false);assert.equal(Object.hasOwn(notice,'explanation'),false);assert.equal(Object.hasOwn(notice,'questionId'),false);assert.equal(notice.text,correct?'구입 OX 퀴즈를 맞혔습니다.':'구입 OX 퀴즈를 틀렸습니다.');assert.match(notice.title,correct?/정답/:/오답/);}
});
