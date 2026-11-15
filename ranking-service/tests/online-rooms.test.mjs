import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onlineRoomRequest} from '../lib/online-rooms.mjs';
import {QUIZZES} from '../../src/data.js';
import {purchaseQuizById} from '../../src/purchase-quizzes.js';
function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../migrations/0003_online_rooms.sql',import.meta.url),'utf8'));
 return {sqlite,prepare(sql){const statement=sqlite.prepare(sql);let args=[];return {bind(...values){args=values;return this;},async run(){return statement.run(...args);},async first(){return statement.get(...args)||null;}};},close:()=>sqlite.close()};
}
const ticket=n=>String(n).padStart(64,'0');
async function setup(db){const host=await onlineRoomRequest(db,'create',{nickname:'서버 방장',requestId:ticket(1)}),guest=await onlineRoomRequest(db,'join',{code:host.code,nickname:'휴대폰 친구',requestId:ticket(2)});return {host,guest};}
const read=(db,s)=>onlineRoomRequest(db,'resume',s);
async function act(db,s,action,args=[]){const snapshot=await read(db,s);return onlineRoomRequest(db,'action',{...s,action,args,revision:snapshot.revision});}
test('HTTPS shared rooms create/join idempotently and never expose another player token',async()=>{
 const db=database();try{
  const {host,guest}=await setup(db);assert.match(host.code,/^\d{6}$/);assert.equal(host.transport,'https');
  assert.deepEqual(await onlineRoomRequest(db,'create',{nickname:'서버 방장',requestId:ticket(1)}),host);
  assert.deepEqual(await onlineRoomRequest(db,'join',{code:host.code,nickname:'휴대폰 친구',requestId:ticket(2)}),guest);
  const snapshot=await read(db,guest);assert.equal(snapshot.members.length,2);assert.ok(!JSON.stringify(snapshot).includes(host.token));assert.ok(!JSON.stringify(snapshot).includes(ticket(1)));
  await assert.rejects(read(db,{...guest,token:'wrong'}),e=>e.status===403);
 }finally{db.close();}
});
test('server owns the configured game; guests keep playing if the host browser is absent',async()=>{
 const db=database();try{
  const {host,guest}=await setup(db);await act(db,host,'configure',[{rounds:4}]);
  await assert.rejects(act(db,guest,'start'));
  let s=await act(db,host,'start');assert.equal(s.state.maxRounds,4);
  await act(db,host,'roll');s=await read(db,host);
  if(s.state.phase==='quiz'){await act(db,host,'answerQuiz',[0]);await act(db,host,'closeFeedback');}
  while((await read(db,host)).state.phase==='backward-roll')await act(db,host,'roll');
  s=await read(db,host);if(s.state.phase==='quiz'){await act(db,host,'answerQuiz',[0]);await act(db,host,'closeFeedback');}
  await act(db,host,'nextTurn');const guestTurn=await read(db,guest);assert.equal(guestTurn.state.turn,1);
  await act(db,guest,'roll');assert.notEqual((await read(db,guest)).state.phase,'roll');
 }finally{db.close();}
});
test('four phones receive the same board, chat and turn; room codes stay isolated',async()=>{
 const db=database();try{
  const {host,guest}=await setup(db);const players=[host,guest];
  for(let i=3;i<=4;i++)players.push(await onlineRoomRequest(db,'join',{code:host.code,nickname:`친구${i}`,requestId:ticket(i)}));
  await assert.rejects(onlineRoomRequest(db,'join',{code:host.code,nickname:'정원초과',requestId:ticket(5)}));
  const other=await onlineRoomRequest(db,'create',{nickname:'다른방',requestId:ticket(8)});
  await act(db,host,'start');await onlineRoomRequest(db,'chat',{...guest,message:'서로 다른 데이터에서도 음악 정보 나누기'});
  for(const p of players){const s=await read(db,p);assert.equal(s.state.players.length,4);assert.equal(s.messages.at(-1).playerId,1);}
  assert.equal((await read(db,other)).state,null);
 }finally{db.close();}
});
test('quiz expiration is processed on server reads without a host timer or duplicate reward',async()=>{
 const db=database();try{
  const {host}=await setup(db);await act(db,host,'start');await act(db,host,'roll');
  let row=db.sqlite.prepare('SELECT * FROM online_rooms WHERE code = ?').get(host.code),room=JSON.parse(row.payload);
  room.state.phase='action';room.state.quizUsed=false;db.sqlite.prepare('UPDATE online_rooms SET payload = ? WHERE code = ?').run(JSON.stringify(room),host.code);
  await act(db,host,'startQuiz');await act(db,host,'beginQuizTimer');
  row=db.sqlite.prepare('SELECT * FROM online_rooms WHERE code = ?').get(host.code);room=JSON.parse(row.payload);room.state.quizDeadline=Date.now()-1;
  db.sqlite.prepare('UPDATE online_rooms SET payload = ? WHERE code = ?').run(JSON.stringify(room),host.code);
  let s=await read(db,host);assert.equal(s.state.feedback.timedOut,true);const attempts=s.state.players[0].attempts;
  s=await read(db,host);assert.equal(s.state.players[0].attempts,attempts);await act(db,host,'closeFeedback');
 }finally{db.close();}
});
test('unchanged polling does not write the database; stale actions cannot overwrite turns',async()=>{
 const db=database();try{
  const {host}=await setup(db);await act(db,host,'start');const before=db.sqlite.prepare('SELECT version FROM online_rooms WHERE code = ?').get(host.code).version;
  const old=await read(db,host);await read(db,host);assert.equal(db.sqlite.prepare('SELECT version FROM online_rooms WHERE code = ?').get(host.code).version,before);
  await act(db,host,'roll');await assert.rejects(onlineRoomRequest(db,'action',{...host,action:'roll',revision:old.revision}),/갱신/);
 }finally{db.close();}
});
test('expired rooms are inaccessible and invalid creation keys cannot be used',async()=>{
 const db=database();try{
  const {host}=await setup(db);db.sqlite.prepare('UPDATE online_rooms SET expires_at = 0 WHERE code = ?').run(host.code);
  await assert.rejects(read(db,host),e=>e.status===404);
  await assert.rejects(onlineRoomRequest(db,'create',{nickname:'확인',requestId:'predictable'}));
 }finally{db.close();}
});

test('typing crosses HTTPS devices without a game revision change, and clears on sending',async()=>{
 const db=database();try{
 const {host,guest}=await setup(db);await act(db,host,'start');const before=await read(db,host);
 await onlineRoomRequest(db,'typing',{...guest,active:true});
 const received=await read(db,host);assert.ok(received.typing[guest.playerId]>Date.now());
 assert.equal(received.revision,before.revision);assert.deepEqual(received.state,before.state);
 await onlineRoomRequest(db,'chat',{...guest,message:'음악 정보'});
 assert.equal((await read(db,host)).typing[guest.playerId],0);
 await assert.rejects(onlineRoomRequest(db,'typing',{...guest,token:'wrong',active:true}),e=>e.status===403);
 }finally{db.close();}
});

test('a concurrent typing write retries an uncommitted game action without losing either update',async()=>{
 const db=database();try{
 const {host,guest}=await setup(db);await act(db,host,'start');const before=await read(db,host);
 const original=db.prepare.bind(db);let conflict=true;
 db.prepare=sql=>{const query=original(sql);if(sql.startsWith('UPDATE online_rooms SET payload')){
 const run=query.run.bind(query);query.run=async()=>{if(conflict){conflict=false;await onlineRoomRequest(db,'typing',{...guest,active:true});return {changes:0};}return run();};}return query;};
 const next=await onlineRoomRequest(db,'action',{...host,action:'roll',args:[],revision:before.revision});
 assert.equal(next.revision,before.revision+1);assert.ok((await read(db,guest)).typing[guest.playerId]>Date.now());
 }finally{db.close();}
});

test('HTTPS room rehydration preserves question history across repeat visits',async()=>{
 const db=database();try{
 const {host}=await setup(db);await act(db,host,'start');const seen=[];
 for(let visit=0;visit<5;visit++){
 const row=db.sqlite.prepare('SELECT * FROM online_rooms WHERE code = ?').get(host.code),room=JSON.parse(row.payload);
 room.state.turn=0;room.state.phase='action';room.state.players[0].position=1;room.state.purchaseChallenge=null;
 db.sqlite.prepare('UPDATE online_rooms SET payload = ? WHERE code = ?').run(JSON.stringify(room),host.code);
 const drawn=await act(db,host,'startPurchaseQuiz');seen.push(drawn.state.purchaseChallenge.questionId);
 const resumed=await read(db,host);assert.deepEqual(resumed.state.quizHistory,drawn.state.quizHistory);
 }
 assert.equal(new Set(seen).size,5);
 }finally{db.close();}
});

test('HTTPS player can answer the music quiz while the paid recording is still playing',async()=>{
 const db=database();try{
 const {host,guest}=await setup(db);await act(db,host,'start');
 const row=db.sqlite.prepare('SELECT * FROM online_rooms WHERE code = ?').get(host.code),room=JSON.parse(row.payload);
 room.state.phase='action';room.state.players[0].position=1;
 db.sqlite.prepare('UPDATE online_rooms SET payload = ? WHERE code = ?').run(JSON.stringify(room),host.code);
 await act(db,host,'startPurchaseQuiz');await act(db,host,'beginQuizTimer');
 const paid=await act(db,host,'buyListeningHint');assert.ok(paid.state.purchaseChallenge.hint.until>Date.now());
 await assert.rejects(act(db,guest,'answerPurchaseQuiz',[true]));
 const answer=purchaseQuizById(paid.state.purchaseChallenge.questionId).answer;
 const result=await act(db,host,'answerPurchaseQuiz',[answer]);assert.equal(result.state.purchaseChallenge.correct,true);assert.equal(result.state.phase,'purchase-feedback');assert.equal(result.state.players[0].coins,1480);
 }finally{db.close();}
});

test('HTTPS bail payment persists across devices and authorizes one next-turn normal roll',async()=>{
 const db=database();try{
 const {host,guest}=await setup(db);await act(db,host,'start');
 const row=db.sqlite.prepare('SELECT * FROM online_rooms WHERE code = ?').get(host.code),room=JSON.parse(row.payload);
 room.state.phase='jailed';room.state.players[0].position=11;room.state.players[0].skipTurns=3;
 db.sqlite.prepare('UPDATE online_rooms SET payload = ? WHERE code = ?').run(JSON.stringify(room),host.code);
 await assert.rejects(act(db,guest,'payBail'));
 const paid=await act(db,host,'payBail');assert.equal(paid.state.players[0].coins,1100);assert.equal(paid.state.phase,'jailed');
 const remote=await read(db,guest);assert.equal(remote.state.players[0].bailPaid,true);assert.equal(remote.activities.filter(a=>a.type==='bail-paid').length,1);
 await assert.rejects(act(db,host,'payBail'));assert.equal((await read(db,host)).state.players[0].coins,1100);
 await act(db,host,'nextTurn');await act(db,guest,'roll');await act(db,guest,'nextTurn');
 const moved=await act(db,host,'roll');assert.equal(moved.state.players[0].position,11+moved.state.dice);assert.equal(moved.state.players[0].bailPaid,false);assert.equal(moved.state.lastPrisonRoll,null);
 }finally{db.close();}
});

test('HTTPS learning quiz pays 30 MC once and shares the same amount with the room',async()=>{
 const db=database();try{
 const {host}=await setup(db);await act(db,host,'start');await act(db,host,'roll');
 const row=db.sqlite.prepare('SELECT payload FROM online_rooms WHERE code=?').get(host.code),room=JSON.parse(row.payload);room.state.players[0].position=1;
 db.sqlite.prepare('UPDATE online_rooms SET payload=? WHERE code=?').run(JSON.stringify(room),host.code);
 const shown=await act(db,host,'startQuiz'),before=shown.state.players[0].coins;
 const answer=QUIZZES.find(q=>q.id===shown.state.quiz).answer,result=await act(db,host,'answerQuiz',[answer]);
 assert.equal(result.state.players[0].coins,before+30);assert.equal(result.activities.at(-1).changes[0].amount,30);
 await assert.rejects(act(db,host,'answerQuiz',[answer]));assert.equal((await read(db,host)).state.players[0].coins,before+30);
 }finally{db.close();}
});

test('persisted ten-question rooms expand on resume without losing the active question or money',async()=>{
 const db=database();try{
  const {host,guest}=await setup(db);await act(db,host,'start');
  const row=db.sqlite.prepare('SELECT payload FROM online_rooms WHERE code=?').get(host.code),room=JSON.parse(row.payload);
  room.state.quizDeck=Array.from({length:10},(_,i)=>`q${i+31}`);room.state.quizCursor=1;
  room.state.quiz='q31';room.state.phase='quiz';room.state.quizUsed=true;room.state.players[0].coins=1370;
  db.sqlite.prepare('UPDATE online_rooms SET payload=? WHERE code=?').run(JSON.stringify(room),host.code);
  const resumed=await read(db,host);assert.equal(resumed.state.quizDeck.length,30);assert.equal(resumed.state.quiz,'q31');assert.equal(resumed.state.players[0].coins,1370);
  assert.equal((await read(db,guest)).state.quizDeck.length,30);
 }finally{db.close();}
});

test('prison arrival receipts persist and are restricted to the imprisoned participant',async()=>{
 const db=database();try{
  const {host,guest}=await setup(db);await act(db,host,'start');
  const row=db.sqlite.prepare('SELECT payload FROM online_rooms WHERE code=?').get(host.code),room=JSON.parse(row.payload);
  room.state.phase='jailed';room.state.players[0].position=11;room.state.players[0].skipTurns=3;
  room.activities=[{id:1,type:'prison-entry',actorFirst:true,actorId:0,turnNumber:0}];room.activitySeq=1;
  db.sqlite.prepare('UPDATE online_rooms SET payload=? WHERE code=?').run(JSON.stringify(room),host.code);
  await assert.rejects(onlineRoomRequest(db,'action',{...guest,action:'acknowledgePrisonNotice',args:[1]}));
  const acknowledged=await onlineRoomRequest(db,'action',{...host,action:'acknowledgePrisonNotice',args:[1]});
  assert.equal(acknowledged.activities[0].actorSeen,true);assert.equal(acknowledged.state.phase,'jailed');
  assert.equal((await read(db,guest)).activities[0].actorSeen,true);
 }finally{db.close();}
});

test('shared roll schedules persist across separate participant polls and block premature follow-up actions',async()=>{
 const db=database();try{
  const {host,guest}=await setup(db);await act(db,host,'start');
  const current=await read(db,host);
  const rolled=await onlineRoomRequest(db,'action',{...host,action:'roll',synchronize:true,revision:current.revision});
  const joined=await read(db,guest);assert.deepEqual(joined.rollPresentation,rolled.rollPresentation);
  assert.equal(joined.rollPresentation.before.phase,'roll');assert.equal(joined.rollPresentation.dice,joined.state.dice);
  assert.ok(joined.rollPresentation.finishAt>joined.serverNow);
  await assert.rejects(act(db,host,'nextTurn'),/연출/);
  assert.deepEqual((await read(db,host)).rollPresentation,rolled.rollPresentation);
 }finally{db.close();}
});

test('a missing host is evicted from a four-player HTTPS room and the remaining host can continue and finish',async()=>{
 const db=database();db.sqlite.exec(readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));db.batch=rows=>Promise.all(rows.map(row=>row.run()));
 try{
  const {host,guest}=await setup(db);const third=await onlineRoomRequest(db,'join',{code:host.code,nickname:'세번째',requestId:ticket(3)});await onlineRoomRequest(db,'join',{code:host.code,nickname:'네번째',requestId:ticket(4)});await act(db,host,'start');
  const now=Date.now(),row=db.sqlite.prepare('SELECT payload FROM online_rooms WHERE code=?').get(host.code),room=JSON.parse(row.payload);
  room.connectionTrackingAt=now-61000;room.members.forEach(m=>m.lastSeenAt=m.id===0?now-61000:now);
  room.state.phase='quiz';room.state.quiz='q31';room.state.quizUsed=true;room.state.ownership['bach-air']={player:0,level:1};
  db.sqlite.prepare('UPDATE online_rooms SET payload=? WHERE code=?').run(JSON.stringify(room),host.code);
  let next=await read(db,guest);assert.equal(next.state.players[0].withdrawn,true);assert.equal(next.hostId,1);assert.equal(next.state.turn,1);assert.equal(next.state.phase,'roll');assert.equal(next.state.ownership['bach-air'],undefined);
  await assert.rejects(read(db,host),e=>e.status===410);
  assert.equal((await read(db,third)).state.turn,1);
  next=await act(db,guest,'roll');assert.ok(next.state.dice>=1);
  next=await act(db,guest,'finishGame');assert.equal(next.state.phase,'finished');assert.equal(next.rankingRecorded,true);
  const scores=db.sqlite.prepare('SELECT player_id FROM ranking_scores ORDER BY player_id').all();assert.deepEqual(scores.map(r=>r.player_id),[1,2,3]);
 }finally{db.close();}
});

test('a three-player HTTPS room continues with two and awards the last active player if another disconnects',async()=>{
 const db=database();db.sqlite.exec(readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));db.batch=rows=>Promise.all(rows.map(row=>row.run()));
 try{
  const {host,guest}=await setup(db);await onlineRoomRequest(db,'join',{code:host.code,nickname:'세번째',requestId:ticket(3)});await act(db,host,'start');
  const edit=ids=>{const row=db.sqlite.prepare('SELECT payload FROM online_rooms WHERE code=?').get(host.code),room=JSON.parse(row.payload),now=Date.now();room.connectionTrackingAt=now-61000;for(const m of room.members)m.lastSeenAt=ids.includes(m.id)?now-61000:now;db.sqlite.prepare('UPDATE online_rooms SET payload=? WHERE code=?').run(JSON.stringify(room),host.code);};
  edit([2]);let next=await read(db,host);assert.equal(next.state.phase,'roll');assert.equal(next.state.players.filter(p=>!p.withdrawn).length,2);
  edit([1]);next=await read(db,host);assert.equal(next.state.phase,'finished');assert.equal(next.state.endReason.type,'disconnect');assert.equal(next.rankingRecorded,true);assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM ranking_scores').get().n,1);
  await assert.rejects(read(db,guest),e=>e.status===410);
 }finally{db.close();}
});
