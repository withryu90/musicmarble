import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {RankingClient} from '../src/ranking.js';
const game=()=>G.createGame({names:['A','B','C','D'],rounds:4});
test('a finished leader waits and the next turns skip all finished players',()=>{
 let s=game();s.players[0].laps=3;s.players[0].position=27;
 s=G.roll(s,1);assert.equal(s.players[0].laps,4);assert.equal(s.phase,'action');
 s=G.nextTurn(s);assert.equal(s.phase,'roll');assert.equal(s.turn,1);assert.equal(s.round,1);
 s.players[2].laps=4;s=G.nextTurn(G.roll(s,1));assert.equal(s.turn,3);
 s=G.nextTurn(G.roll(s,1));assert.equal(s.turn,1);assert.equal(s.players[0].laps,4);
 const invalid=structuredClone(s);invalid.turn=0;assert.throws(()=>G.roll(invalid,6));assert.equal(G.isValidSave(invalid),false);
});
test('a non-leader finishing first also waits; the last player can take consecutive turns',()=>{
 let s=game();s.turn=2;s.players[2].laps=3;s.players[2].position=27;
 s=G.nextTurn(G.roll(s,1));assert.equal(s.turn,3);assert.equal(s.phase,'roll');
 s.players[0].laps=4;s.players[1].laps=4;s.players[3].laps=2;
 s=G.nextTurn(G.roll(s,1));assert.equal(s.turn,3);assert.equal(s.phase,'roll');assert.equal(s.round,3);
 assert.ok(G.isValidSave(s));
});
test('a round advances only when the last lagging player crosses START, even after prison delay',()=>{
 let s=game();s.players.forEach(p=>p.laps=1);s.players[3].laps=0;s.turn=3;s.players[3].position=10;s.players[3].skipTurns=2;
 s=G.roll(s,1);assert.equal(s.phase,'jailed');s=G.nextTurn(s);assert.equal(s.round,1);
 s.turn=3;s.players[3].skipTurns=0;s.players[3].position=27;s.phase='roll';
 s=G.roll(s,1);assert.equal(s.round,2);assert.equal(s.players[3].laps,1);assert.ok(G.isValidSave(s));
});
test('the leaderboard sees completion only after the final player finishes their activities',async()=>{
 const calls=[];const client=new RankingClient({origin:'https://ranking.test',storage:null,secret:()=> 'b'.repeat(64),fetchFn:async(url)=>{calls.push(url.split('/').pop());return {ok:true,json:async()=>({entries:[]})};}});
 const session={playerId:0};const snapshot=state=>({gameId:'all-finish-ranking-game-0000',state});
 let s=game();s.players.forEach(p=>p.laps=4);s.players[3].laps=3;s.players[3].position=27;s.turn=3;
 client.observe(snapshot(s),session,G.score);await client.retryPending();
 s=G.roll(s,1);client.observe(snapshot(s),session,G.score);await client.retryPending();assert.equal(calls.includes('submit'),false);
 s=G.nextTurn(s);assert.equal(s.phase,'finished');assert.ok(s.players.every(p=>G.hasFinished(s,p)));assert.ok(G.isValidSave(s));
 client.observe(snapshot(s),session,G.score);await client.retryPending();await new Promise(r=>setTimeout(r,0));assert.equal(calls.filter(c=>c==='submit').length,1);
});
test('personal progress survives saves, rejects invalid laps and preserves known legacy leader laps',()=>{
 let s=game();s.players[1].laps=2;assert.ok(G.isValidSave(JSON.parse(JSON.stringify(s))));
 for(const laps of [-1,5,1.5,'2']){const invalid=structuredClone(s);invalid.players[1].laps=laps;assert.equal(G.isValidSave(invalid),false);}
 s.players.forEach(p=>delete p.laps);s.leaderLaps=2;s.players[0].position=27;
 assert.equal(G.completedLaps(s,s.players[0]),2);assert.equal(G.completedLaps(s,s.players[1]),0);
 s=G.roll(s,1);assert.equal(s.players[0].laps,3);assert.equal(s.round,1);assert.ok(G.isValidSave(s));
});
