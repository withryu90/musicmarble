import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomService} from '../server/rooms.js';
const setup=()=>{const service=new RoomService(),a=service.create('바흐'),b=service.join(a.code,'쇼팽');return {service,a,b,room:service.get(a.code)};};
const act=(s,who,action,args=[])=>s.service.act(who.code,who.token,{action,args,revision:s.room.revision});
test('shared code joins same room; codes isolate boards and tokens stay private',()=>{const s=setup(),other=s.service.create('모차르트');assert.notEqual(s.a.code,other.code);assert.equal(s.room.members.length,2);assert.equal(s.service.get(other.code).members.length,1);assert.ok(!JSON.stringify(s.service.snapshot(s.room)).includes(s.a.token));assert.throws(()=>s.service.authenticate(s.a.code,other.token));});
test('max four, duplicate names, blank names, unknown code',()=>{const s=setup();for(let i=2;i<4;i++)s.service.join(s.a.code,`친구${i}`);assert.throws(()=>s.service.join(s.a.code,'다섯째'));assert.throws(()=>s.service.create(' '));assert.throws(()=>s.service.join('000000','친구'));const t=setup();assert.throws(()=>t.service.join(t.a.code,'바흐'));});
test('host starts, late joins rejected, participants cannot impersonate or force a roll',()=>{const s=setup();assert.throws(()=>act(s,s.b,'start'));act(s,s.a,'start');assert.throws(()=>s.service.join(s.a.code,'새친구'));assert.throws(()=>act(s,s.b,'roll'));const next=act(s,s.a,'roll',[100]);assert.ok(next.state.dice>=1&&next.state.dice<=6);assert.equal(next.state.turn,0);assert.throws(()=>act(s,s.a,'roll'));assert.throws(()=>act(s,s.b,'finishGame'));});
test('stale revision protects against duplicate in-flight actions',()=>{const s=setup();act(s,s.a,'start');const rev=s.room.revision;act(s,s.a,'roll');assert.throws(()=>s.service.act(s.a.code,s.a.token,{action:'nextTurn',args:[],revision:rev}));});
test('trade acceptance is authorized by receiver and blocks unrelated actions',()=>{const s=setup();act(s,s.a,'start');s.room.state.phase='action';s.room.state.ownership['bach-air']={player:0,level:0};act(s,s.a,'proposeTrade',[{workId:'bach-air',to:1,price:100}]);assert.throws(()=>act(s,s.a,'resolveTrade',[true]));assert.throws(()=>act(s,s.a,'startQuiz'));act(s,s.b,'resolveTrade',[true]);assert.equal(s.room.state.ownership['bach-air'].player,1);assert.equal(s.room.state.players[1].coins,1100);});
test('SSE subscriptions receive updates, unsubscribe and reconnect retain seat',()=>{const s=setup(),updates=[];const stop=s.service.subscribe(s.a.code,s.a.token,x=>updates.push(x.revision));act(s,s.a,'start');assert.equal(updates.length,2);stop();act(s,s.a,'roll');assert.equal(updates.length,2);assert.equal(s.service.authenticate(s.a.code,s.a.token).member.id,0);});
test('25 independent rooms / 100 players update without cross-room state leakage',()=>{const service=new RoomService(),rooms=[];for(let r=0;r<25;r++){const host=service.create(`host${r}`);for(let p=1;p<4;p++)service.join(host.code,`p${p}`);const room=service.get(host.code);service.act(host.code,host.token,{action:'start',revision:room.revision});rooms.push({host,room});}const original=rooms[1].room.state;const first=rooms[0];service.act(first.host.code,first.host.token,{action:'roll',revision:first.room.revision});assert.equal(service.rooms.size,25);assert.equal(rooms.reduce((sum,x)=>sum+x.room.members.length,0),100);assert.equal(rooms[1].room.state,original);assert.equal(rooms[1].room.state.dice,null);assert.ok(rooms[0].room.state.dice);});
test('inactive rooms expire after 24h but active rooms survive',()=>{const s=setup();s.room.updatedAt=0;const stop=s.service.subscribe(s.a.code,s.a.token,()=>{});s.service.cleanup(100000000);assert.equal(s.service.rooms.size,1);stop();s.service.cleanup(100000000);assert.equal(s.service.rooms.size,0);});

test('new shared codes have exactly six digits, remain strings and isolate rooms',()=>{
 const service=new RoomService();try{
  const codes=[];for(let i=0;i<100;i++){const session=service.create(`참가자${i}`);assert.match(session.code,/^[0-9]{6}$/);codes.push(session.code);}
  assert.equal(new Set(codes).size,100);
  const room=service.get(codes[0]);const guest=service.join(codes[0],'코드참가자');assert.equal(guest.code,codes[0]);assert.equal(room.members.length,2);
  assert.equal(service.get(codes[1]).members.length,1);
 }finally{service.close();}
});
