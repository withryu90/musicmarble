import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {registration,finalScores,registerGame,submitGame,topRanking,nicknameAvailability} from '../lib/ranking-core.mjs';
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));sqlite.exec(readFileSync(new URL('../migrations/0002_unique_nicknames.sql',import.meta.url),'utf8'));return {prepare(sql){const statement=sqlite.prepare(sql);let args=[];return {bind(...values){args=values;return this;},async run(){return statement.run(...args);},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};}};},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close(){sqlite.close();}};}
const secret='a'.repeat(64),roster=[{id:0,name:'선율'},{id:2,name:'리듬'}];
test('ranked nicknames cannot be reused and scores are never added together',async()=>{const db=database(),id='finished-game-0000000000000000';try{
 await registerGame(db,{gameId:id,secret,players:roster});await registerGame(db,{gameId:id,secret,players:roster});
 await submitGame(db,id,secret,{scores:[{id:0,score:1200},{id:2,score:1500}]});assert.equal((await submitGame(db,id,secret,{scores:[{id:0,score:9999},{id:2,score:9999}]})).duplicate,true);
 await assert.rejects(registerGame(db,{gameId:'another-game-00000000000000',secret,players:roster}),/이미 등록된 닉네임입니다/);
 assert.deepEqual((await topRanking(db)).entries.map(p=>[p.nickname,p.score,p.games]),[['리듬',1500,1],['선율',1200,1]]);
 assert.equal((await nicknameAvailability(db,' 선율 ')).available,false);assert.equal((await nicknameAvailability(db,'새 이름')).available,true);
}finally{db.close();}});
test('only the registered game capability can submit, and the original roster cannot be replaced',async()=>{const db=database(),id='authorised-game-000000000000';try{await registerGame(db,{gameId:id,secret,players:roster});await assert.rejects(registerGame(db,{gameId:id,secret:'b'.repeat(64),players:roster}),/등록된/);await assert.rejects(submitGame(db,id,'b'.repeat(64),{scores:[]}),/권한/);await assert.rejects(submitGame(db,id,secret,{scores:[{id:0,score:1},{id:3,score:1000}]}),/최종 점수/);assert.equal((await topRanking(db)).entries.length,0);}finally{db.close();}});
test('global leaderboard returns at most ten players in descending final score',async()=>{const db=database();try{for(let i=0;i<12;i++){const id=`top-ten-game-${String(i).padStart(20,'0')}`;await registerGame(db,{gameId:id,secret,players:[{id:0,name:`참가자${i}`}]});await submitGame(db,id,secret,{scores:[{id:0,score:100+i}]});}const rows=(await topRanking(db)).entries;assert.equal(rows.length,10);assert.deepEqual(rows.map(p=>p.rank),[1,2,3,4,5,6,7,8,9,10]);assert.equal(rows[0].score,111);assert.equal(rows[9].score,102);}finally{db.close();}});
test('invalid nicknames, repeated participants, negative scores and missing participants are rejected',()=>{assert.throws(()=>registration({gameId:'short',secret,players:roster}));assert.throws(()=>registration({gameId:'valid-game-000000000000',secret,players:[{id:0,name:'선율'},{id:1,name:'선율'}]}));for(const score of [-1,1.5,1000001])assert.throws(()=>finalScores({scores:[{id:0,score},{id:2,score:2}]},roster));assert.throws(()=>finalScores({scores:[{id:0,score:2}]},roster));});

test('ranked names reject a new roster without reserving its other names',async()=>{const db=database();try{
 await registerGame(db,{gameId:'first-owner-000000000000000',secret,players:[{id:0,name:'사용중'}]});
 await submitGame(db,'first-owner-000000000000000',secret,{scores:[{id:0,score:500}]});
 await assert.rejects(registerGame(db,{gameId:'failed-roster-00000000000000',secret,players:[{id:0,name:'아직사용가능'},{id:1,name:'사용중'}]}),/이미 등록된 닉네임입니다/);
 assert.equal((await nicknameAvailability(db,'아직사용가능')).available,true);
}finally{db.close();}});
test('legacy duplicate scores remain stored but the leaderboard shows only the best record',async()=>{const db=database();try{
 for(let i=0;i<2;i++){const id=`legacy-game-${String(i).padStart(20,'0')}`;await db.prepare('INSERT INTO ranking_games (id,token_hash,roster,created_at,completed_at) VALUES (?,?,?,?,?)').bind(id,'old','[]',1,2+i).run();await db.prepare('INSERT INTO ranking_scores (game_id,player_id,nickname,score,completed_at) VALUES (?,?,?,?,?)').bind(id,0,'과거 이름',100+i*50,2+i).run();}
 const rows=(await topRanking(db)).entries;assert.equal(rows.length,1);assert.equal(rows[0].score,150);assert.equal(rows[0].games,1);
}finally{db.close();}});

test('unranked names may be reused across active games and both games can finish',async()=>{const db=database();try{
 const players=[{id:0,name:'함께 쓰는 이름'}],first='shared-first-000000000000000',second='shared-second-00000000000000';
 await registerGame(db,{gameId:first,secret,players});
 assert.equal((await nicknameAvailability(db,players[0].name)).available,true);
 await registerGame(db,{gameId:second,secret,players});
 await submitGame(db,first,secret,{scores:[{id:0,score:500}]});
 await submitGame(db,second,secret,{scores:[{id:0,score:700}]});
 assert.equal((await topRanking(db)).entries[0].score,700);
}finally{db.close();}});
test('names below the visible top ten become available again despite historical reservations',async()=>{const db=database();try{
 for(let i=0;i<11;i++){const id=`reuse-rank-${String(i).padStart(20,'0')}`;await registerGame(db,{gameId:id,secret,players:[{id:0,name:`순위${i}`}]});await submitGame(db,id,secret,{scores:[{id:0,score:100+i}]});}
 await db.prepare('INSERT INTO ranking_nicknames (nickname,game_id,player_id,registered_at) VALUES (?,?,?,?)').bind('순위0',`reuse-rank-${String(0).padStart(20,'0')}`,0,1).run();
 assert.equal((await nicknameAvailability(db,'순위0')).available,true);
 assert.equal((await nicknameAvailability(db,'순위1')).available,false);
 await registerGame(db,{gameId:'reuse-outside-top-ten-000000',secret,players:[{id:0,name:'순위0'}]});
}finally{db.close();}});
