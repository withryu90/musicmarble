import test from 'node:test';
import assert from 'node:assert/strict';
import {GameActions} from '../src/game-actions.js';
const who={code:'ABC234',token:'private'};
const initial=()=>({code:who.code,revision:1,state:{turn:0,turnNumber:0,phase:'purchase-quiz',purchaseChallenge:{questionId:'q1',response:null}}});
test('timer start and a rapid answer are serialized against the newest revision',async()=>{
 let latest=initial(),active=0,maxActive=0;const sent=[];
 const actions=new GameActions({latest:()=>latest,remember:s=>latest=s,refresh:async()=>latest,send:async body=>{
  maxActive=Math.max(maxActive,++active);sent.push([body.action,body.revision]);
  await new Promise(r=>setTimeout(r,5));active--;
  return {...latest,revision:latest.revision+1,state:{...latest.state,...(body.action==='answerPurchaseQuiz'?{phase:'purchase-feedback'}:{})}};
 }});
 const shown=initial();await Promise.all([actions.run({action:'beginQuizTimer'},who,shown),actions.run({action:'answerPurchaseQuiz',args:[true]},who,shown)]);
 assert.equal(maxActive,1);assert.deepEqual(sent,[['beginQuizTimer',1],['answerPurchaseQuiz',2]]);assert.equal(latest.state.phase,'purchase-feedback');
});
test('identical simultaneous clicks send a purchase or handoff only once',async()=>{
 let latest=initial(),calls=0;
 const actions=new GameActions({latest:()=>latest,remember:s=>latest=s,send:async()=>{calls++;return {...latest,revision:2};}});
 const a=actions.run({action:'purchaseAndNext'},who,latest),b=actions.run({action:'purchaseAndNext'},who,latest);
 assert.equal(a,b);await Promise.all([a,b]);assert.equal(calls,1);
});
test('stale revisions refresh and retry once only while the same question is active',async()=>{
 let latest=initial(),calls=0;
 const actions=new GameActions({latest:()=>latest,remember:s=>latest=s,refresh:async()=>({...latest,revision:8}),send:async body=>{
  if(++calls===1)throw Error('게임 상태가 갱신되었습니다.');assert.equal(body.revision,8);return {...latest,revision:9};
 }});
 await actions.run({action:'beginQuizTimer'},who,latest);assert.equal(calls,2);assert.equal(latest.revision,9);
});
test('timeout or next-turn updates never replay an old answer, payment or roll',async()=>{
 for(const action of ['answerPurchaseQuiz','purchaseAndNext','nextTurn','roll']){
  const shown=initial();let latest={...shown,revision:3,state:{...shown.state,turn:1,turnNumber:1,phase:'roll'}},calls=0;
  const actions=new GameActions({latest:()=>latest,remember:s=>latest=s,send:async()=>{calls++;}});
  assert.equal(await actions.run({action},who,shown),latest);assert.equal(calls,0);
 }
});
test('an expired question returned by refresh is accepted without retrying the answer',async()=>{
 let latest=initial(),calls=0;
 const actions=new GameActions({latest:()=>latest,remember:s=>latest=s,refresh:async()=>({...latest,revision:4,state:{...latest.state,phase:'purchase-feedback'}}),send:async()=>{calls++;throw Error('게임 상태가 갱신되었습니다.');}});
 const result=await actions.run({action:'answerPurchaseQuiz'},who,latest);assert.equal(calls,1);assert.equal(result.state.phase,'purchase-feedback');
});
test('a network error never retries a possibly committed payment and does not jam later requests',async()=>{
 let latest=initial(),calls=0;
 const actions=new GameActions({latest:()=>latest,remember:s=>latest=s,send:async()=>{if(++calls===1)throw Error('응답을 기다리는 중');return {...latest,revision:2};}});
 await assert.rejects(actions.run({action:'purchaseAndNext'},who,latest));
 await actions.run({action:'beginQuizTimer'},who,latest);assert.equal(calls,2);
});
