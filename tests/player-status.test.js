import test from 'node:test';
import assert from 'node:assert/strict';
import {playerStatus} from '../src/player-status.js';
import {RoomService} from '../src/room-service.js';
const state={phase:'roll',turn:0,players:[{id:0},{id:1}]};
test('player badges distinguish waiting, quizzes, feedback, listening, moving and typing',()=>{
 assert.equal(playerStatus(state,0),'주사위 준비 중');assert.equal(playerStatus(state,1),'대기 중');
 assert.equal(playerStatus({...state,phase:'quiz'},0),'배움 퀴즈 푸는 중');
 assert.equal(playerStatus({...state,phase:'purchase-quiz'},0),'음악 퀴즈 푸는 중');
 assert.equal(playerStatus({...state,phase:'purchase-quiz',purchaseChallenge:{hint:{until:2000}}},0,{now:1000}),'대표 선율 듣는 중');
 assert.equal(playerStatus({...state,phase:'feedback'},0),'퀴즈 결과 확인 중');
 assert.equal(playerStatus(state,0,{presentation:{playerId:0,moving:true}}),'이동 중');
 assert.equal(playerStatus(state,1,{typingUntil:2000,now:1000}),'채팅 중');
 assert.equal(playerStatus(state,1,{typingUntil:999,now:1000}),'대기 중');
 assert.equal(playerStatus({...state,phase:'finished'},1,{typingUntil:2000,now:1000}),'게임 종료');
});
test('authenticated typing is room scoped, expires and never changes the game revision or content',()=>{
 const service=new RoomService({backgroundTimers:false});try{
 const a=service.create('가온'),b=service.join(a.code,'나래'),c=service.create('다른방');
 const room=service.get(a.code),revision=room.revision,events=[],other=[];
 service.subscribeChat(a.code,a.token,p=>events.push(p));service.subscribeChat(c.code,c.token,p=>other.push(p));
 const result=service.typing(a.code,b.token,true);
 assert.ok(result.typing[1]>Date.now());assert.ok(result.typing[1]<=Date.now()+7000);
 assert.equal(result.messages.length,0);assert.equal(room.revision,revision);assert.equal(other.length,1);
 assert.equal(events.at(-1).typing[1],result.typing[1]);assert.ok(!JSON.stringify(result).includes(b.token));
 assert.throws(()=>service.typing(a.code,c.token,true));assert.throws(()=>service.typing(a.code,a.token,'yes'));
 const sent=service.chat(a.code,b.token,'안녕');assert.equal(sent.typing[1],0);assert.equal(sent.messages.length,1);
 service.typing(a.code,a.token,true);assert.equal(service.typing(a.code,a.token,false).typing[0],0);
 }finally{service.close();}
});
