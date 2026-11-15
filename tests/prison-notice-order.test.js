import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleActivities,ActivityInbox} from '../src/activities.js';
import {RoomService} from '../src/room-service.js';
import * as G from '../src/engine.js';
import {BOARD} from '../src/data.js';
function setup(type){
 const service=new RoomService({backgroundTimers:false}),host=service.create('도착자'),guest=service.join(host.code,'친구'),room=service.get(host.code);
 service.act(host.code,host.token,{action:'start',revision:room.revision});
 room.state.players[0].position=BOARD.findIndex(c=>c.type===type)-1;room.publishedState=structuredClone(room.state);
 room.state=G.roll(room.state,1);service.broadcast(room);
 return {service,host,guest,room};
}
test('direct and transferred prison arrivals are offered to the prisoner before observers',()=>{
 for(const type of ['prison','go-to-prison']){
  const {service,host,guest,room}=setup(type);try{
   const journal=service.snapshot(room),arrival=journal.activities.find(n=>n.type==='prison-entry');
   assert.ok(arrival.actorFirst);assert.ok(visibleActivities(journal,host.playerId).includes(arrival));
   assert.ok(!visibleActivities(journal,guest.playerId).includes(arrival));
   const inbox=new ActivityInbox();inbox.accept(host.code,[]);inbox.accept(host.code,visibleActivities(journal,guest.playerId));
   const ids=journal.activities.filter(n=>n.actorFirst).map(n=>n.id);
   const before=structuredClone(room.state);
   for(const id of ids){
    assert.throws(()=>service.act(guest.code,guest.token,{action:'acknowledgePrisonNotice',args:[id]}));
    service.act(host.code,host.token,{action:'acknowledgePrisonNotice',args:[id],revision:-1});
   }
   assert.deepEqual(room.state,before);
   const next=service.snapshot(room);inbox.accept(host.code,visibleActivities(next,guest.playerId));
   assert.equal(inbox.pending.filter(n=>n.type==='prison-entry').length,1);
   const revision=room.revision;service.act(host.code,host.token,{action:'acknowledgePrisonNotice',args:[arrival.id]});assert.equal(room.revision,revision);
   inbox.accept(host.code,visibleActivities(service.snapshot(room),guest.playerId));assert.equal(inbox.pending.filter(n=>n.type==='prison-entry').length,1);
  }finally{service.close();}
 }
});
test('a blocked prison journal cannot skip ahead, and bots or a later turn never need a receipt',()=>{
 const item={id:1,type:'prison-entry',actorFirst:true,actorId:0,turnNumber:0};
 const s={activities:[item,{id:2,type:'bail-paid'}],state:{turn:0,turnNumber:0,players:[{id:0}]}};
 assert.deepEqual(visibleActivities(s,1),[]);
 assert.equal(visibleActivities({...s,state:{...s.state,turnNumber:2}},1).length,2);
 assert.equal(visibleActivities({...s,state:{...s.state,players:[{id:0,isBot:true}]}},1).length,2);
 assert.equal(visibleActivities({...s,activities:[{...item,actorSeen:true},{id:2}]},1).length,2);
});
