import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {RankingClient} from '../src/ranking.js';
import {activityChanges} from '../src/activities.js';
import {movementPath} from '../src/movement.js';
const game=()=>G.createGame({names:['A','B','C','D'],rounds:4});
test('any seat can finish first in 2, 3 or 4 player games at every configured length',()=>{
 for(const count of [2,3,4])for(const rounds of [4,8,12])for(let id=0;id<count;id++){
  const initial=G.createGame({names:['A','B','C','D'].slice(0,count),rounds});initial.turn=id;initial.players[id].laps=rounds-1;initial.players[id].position=27;
  const s=G.roll(initial,6);assert.equal(s.phase,'finished');assert.equal(s.endReason.playerId,id);assert.equal(s.endReason.type,'laps');assert.equal(s.players[id].position,0);assert.equal(s.players[id].coins,1400);assert.equal(s.endReason.moveSteps,1);assert.equal(s.players.filter(p=>G.hasFinished(s,p)).length,1);assert.ok(G.isValidSave(s));assert.equal(initial.phase,'roll');assert.throws(()=>G.nextTurn(s));
 }
});
test('final travel stops exactly at START and does not charge rent, buy or draw another event',()=>{
 const initial=game();initial.turn=2;initial.players[2].laps=3;initial.players[2].position=26;initial.ownership['vivaldi-spring']={player:0,level:0};
 const s=G.roll(initial,6);assert.deepEqual(movementPath(initial.players[2].position,s.endReason.moveSteps,28),[27,0]);assert.equal(s.lastRent,null);assert.equal(s.lastEvent,null);assert.equal(s.eventCursor,0);assert.equal(s.quiz,null);assert.equal(s.purchaseChallenge,null);assert.equal(s.players[0].coins,1200);assert.deepEqual(activityChanges(initial,s).map(n=>n.type),['start-bonus','first-finish']);
 const invalid=structuredClone(s);invalid.endReason.moveSteps=7;assert.equal(G.isValidSave(invalid),false);
});
test('the shared leaderboard records immediately on first completion and never twice',async()=>{
 const calls=[];const client=new RankingClient({origin:'https://ranking.test',storage:null,secret:()=> 'b'.repeat(64),fetchFn:async(url)=>{calls.push(url.split('/').pop());return {ok:true,json:async()=>({entries:[]})};}});
 const session={playerId:0},snapshot=state=>({gameId:'first-finish-ranking-game-0000',state});
 let s=game();s.turn=3;s.players[3].laps=3;s.players[3].position=27;
 client.observe(snapshot(s),session,G.score);await client.retryPending();assert.equal(calls.includes('submit'),false);
 s=G.roll(s,1);client.observe(snapshot(s),session,G.score);await client.retryPending();await new Promise(r=>setTimeout(r,0));client.observe(snapshot(s),session,G.score);await client.retryPending();assert.equal(calls.filter(c=>c==='submit').length,1);assert.equal(s.players[0].laps,0);
});
test('personal progress survives saves, rejects invalid laps and preserves known legacy leader laps',()=>{
 let s=game();s.players[1].laps=2;assert.ok(G.isValidSave(JSON.parse(JSON.stringify(s))));
 for(const laps of [-1,5,1.5,'2']){const invalid=structuredClone(s);invalid.players[1].laps=laps;assert.equal(G.isValidSave(invalid),false);}
 s.players.forEach(p=>delete p.laps);s.leaderLaps=2;s.players[0].position=27;
 assert.equal(G.completedLaps(s,s.players[0]),2);assert.equal(G.completedLaps(s,s.players[1]),0);
 s=G.roll(s,1);assert.equal(s.players[0].laps,3);assert.equal(s.round,1);assert.ok(G.isValidSave(s));
});
test('a bot finishing first also ends the game immediately',async()=>{
 const {botDecision,applyBotDecision}=await import('../src/bots.js');let s=game();s.turn=1;s.players[1].isBot=true;s.players[1].laps=3;s.players[1].position=27;const decision=botDecision(s);assert.equal(decision.action,'roll');s=applyBotDecision(s,decision,6);assert.equal(s.phase,'finished');assert.equal(s.endReason.playerId,1);assert.equal(s.endReason.type,'laps');assert.equal(botDecision(s),null);
});
