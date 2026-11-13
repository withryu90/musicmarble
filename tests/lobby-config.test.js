import test from 'node:test';
import assert from 'node:assert/strict';
import {LobbyConfig,roomConfig} from '../src/lobby-config.js';
import {RoomService} from '../src/room-service.js';
test('host draft survives member joins, redraws and delayed snapshots without returning to eight',()=>{
 const settings=new LobbyConfig(),before={code:'ABC234',config:{rounds:8,coins:1200}};
 assert.deepEqual(settings.update(before,{rounds:4}),{rounds:4,coins:1200});
 for(const update of [{...before,members:[1,2]},{...before,revision:20},{...before,config:{rounds:8,coins:1000}}])assert.equal(settings.read(update).rounds,4);
 assert.equal(new LobbyConfig().read({...before,config:{rounds:4,coins:1600}}).rounds,4);
 assert.equal(settings.read({code:'DEF567'}).rounds,8);
});
test('room persists four rounds through joins and character changes and starts with that setting',()=>{
 const service=new RoomService();try{
  const host=service.create('방장'),room=service.get(host.code);
  const act=(who,action,args=[])=>service.act(who.code,who.token,{action,args,revision:room.revision});
  act(host,'configure',[{rounds:4,coins:1600}]);
  const guest=service.join(host.code,'친구');act(guest,'rerollCharacter');
  assert.deepEqual(service.snapshot(room).config,{rounds:4,coins:1600});
  const result=act(host,'start');assert.equal(result.state.maxRounds,4);assert.equal(result.state.players[0].coins,1600);
  assert.throws(()=>act(host,'configure',[{rounds:8}]));
 }finally{service.close();}
});
test('only host can configure and invalid options do not corrupt the saved setting',()=>{
 const service=new RoomService();try{
  const host=service.create('방장'),guest=service.join(host.code,'친구'),room=service.get(host.code);
  assert.throws(()=>service.act(guest.code,guest.token,{action:'configure',args:[{rounds:4}],revision:room.revision}));
  for(const rounds of [0,5,'bad'])assert.throws(()=>service.act(host.code,host.token,{action:'configure',args:[{rounds}],revision:room.revision}));
  assert.deepEqual(room.config,{rounds:8,coins:1200});
  for(const rounds of [4,8,12])assert.equal(roomConfig({rounds}).rounds,rounds);
 }finally{service.close();}
});
