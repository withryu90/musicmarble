import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine.js';
import {BOARD,LEGACY_BOARD} from '../src/data.js';
import {STREAMING_APPS} from '../src/streaming.js';
import {activityChanges,ActivityInbox} from '../src/activities.js';
import {canOfferTurnHandoff} from '../src/turn-handoff.js';
import {RoomService} from '../src/room-service.js';
import {botDecision,applyBotDecision} from '../src/bots.js';
const game=(count=4)=>G.createGame({names:['A','B','C','D'].slice(0,count)});
const landing=(s,id,actor=0)=>{s=structuredClone(s);s.turn=actor;s.phase='roll';s.players[actor].position=BOARD.findIndex(c=>c.id===id)-1;return G.roll(s,1);};
const licensed=()=>{const s=game();s.platformOwners['youtube-music']=0;return s;};
test('9x9 board places exactly one correctly named platform on each chronological edge',()=>{
 assert.equal(BOARD.length,32);assert.deepEqual(BOARD.filter(c=>c.type==='streaming').map(c=>[BOARD.indexOf(c),c.id,c.era]),STREAMING_APPS.map((a,i)=>[7+8*i,a.id,a.era]));
 for(const app of STREAMING_APPS){const s=landing(game(),app.id);assert.equal(G.canBuyPlatform(s),true);assert.equal(canOfferTurnHandoff(s,0),false);const next=G.buyPlatform(s);assert.equal(next.platformOwners[app.id],0);assert.equal(next.players[0].coins,1000);assert.ok(G.isValidSave(next));assert.equal(G.score(next,next.players[0]),1200);assert.throws(()=>G.buyPlatform(next));}
});
test('platform purchase is optional, requires the current app tile and sufficient balance, and never charges a visitor',()=>{
 let s=landing(game(),'youtube-music');s=G.skipStreaming(s);assert.equal(s.players[0].coins,1200);assert.equal(s.platformOwners['youtube-music'],undefined);assert.equal(canOfferTurnHandoff(s,0),true);
 s=landing(game(),'youtube-music');s.players[0].coins=199;assert.equal(G.canBuyPlatform(s),false);assert.throws(()=>G.buyPlatform(s));
 s=licensed();const visited=landing(s,'youtube-music',1);assert.equal(G.canBuyPlatform(visited),false);assert.equal(visited.players[1].coins,1200);assert.equal(visited.platformOwners['youtube-music'],0);
 assert.throws(()=>G.buyPlatform(G.roll(game(),1)));
});
test('install on current own or opponent-owned works; original ownership and concert hall remain intact',()=>{
 for(const owner of [0,1]){
  const s=licensed();s.ownership['bach-air']={player:owner,level:1};const arrived=landing(s,'bach-air');const before=arrived.players[0].coins;
  assert.equal(G.streamingOptions(arrived)[0].id,'youtube-music');const installed=G.installStreaming(arrived,'youtube-music');
  assert.equal(installed.players[0].coins,before-50);assert.deepEqual(installed.ownership['bach-air'],{player:owner,level:1});assert.equal(installed.streamingInstallations['bach-air']['youtube-music'],0);assert.deepEqual(installed.lastStreamingRevenue,[]);assert.ok(G.isValidSave(installed));assert.throws(()=>G.installStreaming(installed,'youtube-music'));assert.equal(canOfferTurnHandoff(installed,0),true);
 }
});
test('installation cannot bypass licence, work ownership, location, money, trade or turn limits',()=>{
 let s=landing(licensed(),'bach-air');assert.deepEqual(G.streamingOptions(s),[]);assert.throws(()=>G.installStreaming(s,'youtube-music'));
 s.ownership['bach-air']={player:0,level:0};s.platformOwners={};assert.throws(()=>G.installStreaming(s,'youtube-music'));
 s.platformOwners={'youtube-music':0};s.players[0].coins=49;assert.throws(()=>G.installStreaming(s,'youtube-music'));
 s.players[0].coins=100;s.phase='quiz';assert.throws(()=>G.installStreaming(s,'youtube-music'));
 s.phase='action';s.trade={};assert.throws(()=>G.installStreaming(s,'youtube-music'));
});
test('every visitor, including the installer, triggers bank revenue separately from rent and only once',()=>{
 const base=licensed();base.ownership['bach-air']={player:1,level:0};base.streamingInstallations['bach-air']={'youtube-music':0};
 for(let visitor=0;visitor<4;visitor++){
  const next=landing(base,'bach-air',visitor),expected=base.players.map(p=>p.coins);expected[0]+=30;if(visitor!==1){expected[visitor]-=30;expected[1]+=30;}
  assert.deepEqual(next.players.map(p=>p.coins),expected);assert.equal(next.players.reduce((a,p)=>a+p.coins,0),4830);assert.equal(next.lastStreamingRevenue.length,1);assert.ok(G.isValidSave(next));
  const after=G.skipStreaming({...next,streamingHandled:false,platformOwners:{...next.platformOwners,'apple-music':visitor}});assert.equal(after.players.reduce((a,p)=>a+p.coins,0),4830);
  assert.throws(()=>G.roll(next,1));
 }
});
test('different apps can coexist, one installation choice per visit; repeated same app is rejected',()=>{
 const s=licensed();s.platformOwners['apple-music']=1;s.ownership['bach-air']={player:2,level:1};s.streamingInstallations['bach-air']={'youtube-music':0};
 const arrived=landing(s,'bach-air',1),next=G.installStreaming(arrived,'apple-music');assert.equal(Object.keys(next.streamingInstallations['bach-air']).length,2);assert.ok(G.isValidSave(next));
 const revisited=landing(next,'bach-air',3);assert.deepEqual(revisited.lastStreamingRevenue.map(r=>r.playerId),[0,1]);assert.ok(G.isValidSave(revisited));
 const again=landing(revisited,'bach-air',0);assert.equal(G.streamingOptions(again).length,0);
});
test('platform and installation purchases obey the existing duel bankruptcy rule',()=>{
 let s=landing(game(2),'spotify');s.players[0].coins=200;s=G.buyPlatform(s);assert.equal(s.phase,'finished');assert.equal(s.endReason.playerId,0);assert.ok(G.isValidSave(s));
 s=game(2);s.platformOwners['melon']=0;s.ownership['bach-air']={player:0,level:1};s=landing(s,'bach-air');s.players[0].coins=50;s=G.installStreaming(s,'melon');assert.equal(s.phase,'finished');assert.ok(G.isValidSave(s));
});
test('structured purchase, installation and income notices are shared once and never repeat on confirmation',()=>{
 const before=landing(game(),'melon'),bought=G.buyPlatform(before),notice=activityChanges(before,bought)[0];assert.equal(notice.type,'streaming-purchase');assert.equal(notice.changes[0].amount,-200);
 const base=licensed();base.ownership['bach-air']={player:0,level:0};const arrived=landing(base,'bach-air'),installed=G.installStreaming(arrived,'youtube-music');assert.equal(activityChanges(arrived,installed)[0].type,'streaming-install');
 const from=structuredClone(installed);from.phase='roll';from.players[0].position=0;const after=G.roll(from,1),events=activityChanges(from,after);assert.equal(events[0].type,'streaming-income');assert.equal(events[0].changes[0].amount,30);
 const inbox=new ActivityInbox();inbox.accept('ROOM',[]);inbox.accept('ROOM',events.map((n,i)=>({...n,id:i+1})));const count=inbox.pending.length;inbox.accept('ROOM',events.map((n,i)=>({...n,id:i+1})));assert.equal(inbox.pending.length,count);
});
test('new investment fields survive saves, reject malformed owners and installations, and clear per-turn income',()=>{
 let s=licensed();s.ownership['bach-air']={player:0,level:0};s=G.installStreaming(landing(s,'bach-air'),'youtube-music');assert.ok(G.isValidSave(JSON.parse(JSON.stringify(s))));
 for(const mutate of [s=>s.platformOwners.fake=0,s=>s.platformOwners['youtube-music']=9,s=>s.streamingInstallations['bach-air'].fake=0,s=>s.streamingInstallations['bach-air']['youtube-music']=1,s=>s.streamingInstallations['bach-air']=3]){const broken=structuredClone(s);mutate(broken);assert.equal(G.isValidSave(broken),false);}
 const next=G.nextTurn(s);assert.equal(next.streamingHandled,false);assert.deepEqual(next.lastStreamingRevenue,[]);
});
test('legacy 8x8 saves preserve tile identities, ownership, money and active purchase challenges',()=>{
 for(let i=0;i<LEGACY_BOARD.length;i++){
  const s=game();delete s.boardLayout;delete s.platformOwners;delete s.streamingInstallations;s.players[0].position=i;
  const converted=G.migrateBoardLayout(s);assert.equal(BOARD[converted.players[0].position].id,LEGACY_BOARD[i].id);assert.ok(G.isValidSave(converted));assert.equal(converted.players[0].coins,1200);assert.equal(s.players[0].position,i);assert.equal(G.migrateBoardLayout(converted),converted);
 }
 let purchase=G.startPurchaseQuiz(landing(game(),'mozart-serenade'));delete purchase.boardLayout;purchase.players[0].position=8;const restored=G.migrateBoardLayout(purchase);assert.ok(G.isValidSave(restored));assert.deepEqual(restored.purchaseChallenge,purchase.purchaseChallenge);
 const s=game();delete s.boardLayout;s.phase='jailed';s.players[0].position=10;s.players[0].skipTurns=2;s.lastPrisonTransfer={from:21,to:10};const migrated=G.migrateBoardLayout(s);assert.deepEqual(migrated.lastPrisonTransfer,{from:24,to:11});assert.ok(G.isValidSave(migrated));
});
test('room actions enforce actor and revision checks; bots use the same optional investments',()=>{
 const service=new RoomService();try{
  const a=service.create('A'),b=service.join(a.code,'B'),room=service.get(a.code);room.state=landing(game(2),'youtube-music');service.broadcast(room);const revision=room.revision;
  assert.throws(()=>service.act(b.code,b.token,{action:'buyPlatform',revision}));service.act(a.code,a.token,{action:'buyPlatform',revision});assert.equal(room.state.platformOwners['youtube-music'],0);assert.throws(()=>service.act(a.code,a.token,{action:'buyPlatform',revision}));
 }finally{service.close();}
 let s=landing(game(),'spotify');s.players[0].isBot=true;const decision=botDecision(s,{},()=>0);assert.equal(decision.action,'buyPlatform');s=applyBotDecision(s,decision);assert.equal(s.platformOwners.spotify,0);assert.ok(G.isValidSave(s));
});
