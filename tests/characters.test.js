import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERS,characterById,characterFor,drawCharacterIds} from '../src/characters.js';
import * as G from '../src/engine.js';
import {RoomService} from '../server/rooms.js';
const assertUnique=members=>{assert.equal(new Set(members.map(p=>p.characterId)).size,members.length);assert.ok(members.every(p=>characterById(p.characterId)));};
test('33 named characters have unique IDs; original atlases and teacher image have distinct layouts',()=>{
 assert.equal(CHARACTERS.length,33);assert.equal(new Set(CHARACTERS.map(c=>c.id)).size,33);assert.equal(new Set(CHARACTERS.map(c=>c.name)).size,33);
 for(const sheet of new Set(CHARACTERS.filter(c=>c.layout!=='single').map(c=>c.sheet)))assert.deepEqual(CHARACTERS.filter(c=>c.sheet===sheet).map(c=>c.slot),[0,1,2,3,4,5]);assert.equal(characterById('teacher-yu-jiyoung').name,'유지영 선생님');
});
test('drawing characters never repeats a used or newly drawn ID',()=>{
 const first=drawCharacterIds(15,[],()=>.3);assert.equal(new Set(first).size,15);const next=drawCharacterIds(18,first,()=>.7);assert.equal(new Set([...first,...next]).size,33);assert.throws(()=>drawCharacterIds(19,first));assert.throws(()=>drawCharacterIds(-1));
});
test('new games reserve unique characters and reject unknown or duplicate selections',()=>{
 const names=['A','B','C','D'];for(let i=0;i<50;i++)assertUnique(G.createGame({names}).players);
 const ids=CHARACTERS.slice(0,4).map(c=>c.id);assert.deepEqual(G.createGame({names,characterIds:ids}).players.map(p=>p.characterId),ids);
 assert.throws(()=>G.createGame({names,characterIds:Array(4).fill('bach')}));assert.throws(()=>G.createGame({names,characterIds:['fake',...ids.slice(1)]}));assert.throws(()=>G.createGame({names,characterIds:ids.slice(1)}));
});
test('joining and repeated redraws reserve character slots atomically',()=>{
 const service=new RoomService();try{const sessions=[service.create('A')];for(const name of ['B','C','D'])sessions.push(service.join(sessions[0].code,name));const room=service.get(sessions[0].code);assertUnique(room.members);
  for(let n=0;n<100;n++){const actor=sessions[n%4],before=room.members.map(m=>m.characterId);service.act(actor.code,actor.token,{action:'rerollCharacter',args:[],revision:room.revision});assertUnique(room.members);assert.notEqual(room.members[actor.playerId].characterId,before[actor.playerId]);room.members.forEach((m,i)=>{if(i!==actor.playerId)assert.equal(m.characterId,before[i]);});}
 }finally{service.close();}
});
test('game start preserves lobby characters and reconnecting preserves the same character',()=>{
 const service=new RoomService();try{const a=service.create('A'),b=service.join(a.code,'B'),room=service.get(a.code),before=room.members.map(m=>m.characterId);service.act(a.code,a.token,{action:'start',revision:room.revision});assert.deepEqual(room.state.players.map(p=>p.characterId),before);
  assert.equal(service.authenticate(b.code,b.token).member.characterId,before[1]);service.act(a.code,a.token,{action:'roll',revision:room.revision});assert.deepEqual(room.state.players.map(p=>p.characterId),before);assert.throws(()=>service.act(a.code,a.token,{action:'rerollCharacter',revision:room.revision}));
 }finally{service.close();}
});
test('a stale redraw request cannot overwrite another assignment',()=>{
 const service=new RoomService();try{const a=service.create('A'),b=service.join(a.code,'B'),room=service.get(a.code),revision=room.revision;service.act(a.code,a.token,{action:'rerollCharacter',revision});assert.throws(()=>service.act(b.code,b.token,{action:'rerollCharacter',revision}));assertUnique(room.members);}finally{service.close();}
});
test('solo mode shares a unique character pool with all three bots and allows redraw before rolling',()=>{
 const service=new RoomService();try{const a=service.createSolo('A',{botCount:3}),room=service.get(a.code);assertUnique(room.members);assertUnique(room.state.players);const bots=room.state.players.slice(1).map(p=>p.characterId),old=room.state.players[0].characterId;
  service.act(a.code,a.token,{action:'rerollCharacter',revision:room.revision});assert.notEqual(room.state.players[0].characterId,old);assertUnique(room.state.players);assert.deepEqual(room.state.players.slice(1).map(p=>p.characterId),bots);assert.equal(room.state.players[0].coins,1200);
  service.act(a.code,a.token,{action:'roll',revision:room.revision});assert.throws(()=>service.act(a.code,a.token,{action:'rerollCharacter',revision:room.revision}));
 }finally{service.close();}
});
test('rooms reserve independently and public snapshots contain no credentials',()=>{
 const service=new RoomService();try{const a=service.create('A'),b=service.create('B');const aa=service.get(a.code),bb=service.get(b.code);assert.equal(aa.members.length,1);assert.equal(bb.members.length,1);assert.ok(service.snapshot(aa).members[0].characterId);assert.ok(!JSON.stringify(service.snapshot(aa)).includes(a.token));assert.throws(()=>service.act(a.code,b.token,{action:'rerollCharacter',revision:aa.revision}));}finally{service.close();}
});
test('save validation rejects duplicate or unknown character IDs; legacy display stays stable',()=>{
 const s=G.createGame();assert.ok(G.isValidSave(s));s.players[1].characterId=s.players[0].characterId;assert.equal(G.isValidSave(s),false);s.players.forEach(p=>delete p.characterId);assert.ok(G.isValidSave(s));assert.notEqual(characterFor(s.players[0]).id,characterFor(s.players[1]).id);s.players[0].characterId='unknown';assert.equal(G.isValidSave(s),false);
});

test('every portrait atlas exists and matches the 3 × 2 transparent sprite layout',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const sheet of new Set(CHARACTERS.filter(c=>c.layout!=='single').map(c=>c.sheet))){
  const bytes=await readFile(new URL(`../src/assets/characters/${sheet}.png`,import.meta.url));
  assert.equal(bytes.subarray(1,4).toString(),'PNG');const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  assert.equal(width/height,1.5);assert.equal(width%3,0);assert.equal(height%2,0);assert.equal(bytes[25],6);
 }
});

test('explicit character choices persist across create, join, start and solo bots',()=>{
 const service=new RoomService();try{
  const a=service.create('방장','mozart'),room=service.get(a.code);
  assert.equal(room.members[0].characterId,'mozart');
  assert.throws(()=>service.join(a.code,'중복','mozart'),/이미 다른 참가자/);
  assert.equal(room.members.length,1);
  assert.throws(()=>service.join(a.code,'잘못된 선택','unknown'),/다시 선택/);
  service.join(a.code,'친구','bach');
  service.act(a.code,a.token,{action:'start',revision:room.revision});
  assert.deepEqual(room.state.players.map(p=>p.characterId),['mozart','bach']);
  const solo=service.createSolo('혼자',{botCount:3},'beethoven'),soloRoom=service.get(solo.code);
  assert.equal(soloRoom.state.players[0].characterId,'beethoven');assertUnique(soloRoom.members);
  const before=service.rooms.size;assert.throws(()=>service.create('잘못된 방','unknown'));assert.equal(service.rooms.size,before);
 }finally{service.close();}
});

test('teacher character can be selected, stays unique and uses a transparent standalone PNG',async()=>{
 const c=characterById('teacher-yu-jiyoung');assert.equal(c.layout,'single');const {readFile}=await import('node:fs/promises');const bytes=await readFile(new URL('../'+c.asset.replace('./',''),import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes[25],6);
 const service=new RoomService();try{const a=service.createSolo('선생님',{botCount:3},c.id),room=service.get(a.code);assert.equal(room.state.players[0].characterId,c.id);assertUnique(room.state.players);const b=service.create('방장',c.id);assert.throws(()=>service.join(b.code,'중복',c.id));}finally{service.close();}
});

test('Lee Hwayoung is selectable as a unique bust character in solo and shared rooms',async()=>{
 const c=characterById('teacher-lee-hwayoung');assert.equal(c.name,'이화영 선생님');assert.equal(c.fullName,'Korean Teacher');assert.equal(c.portrait,true);
 const {readFile}=await import('node:fs/promises'),bytes=await readFile(new URL('../'+c.asset.replace('./',''),import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes[25],6);
 const service=new RoomService();try{const a=service.createSolo('새 선생님',{botCount:3},c.id),room=service.get(a.code);assert.equal(room.state.players[0].characterId,c.id);assertUnique(room.state.players);const b=service.create('방장',c.id);assert.throws(()=>service.join(b.code,'중복',c.id));}finally{service.close();}
});

test('Shin Songi is selectable as a unique bust character in solo and shared rooms',async()=>{
 const c=characterById('teacher-shin-songi');assert.equal(c.name,'신송이 선생님');assert.equal(c.fullName,'Korean Teacher');assert.equal(c.portrait,true);
 const {readFile}=await import('node:fs/promises'),bytes=await readFile(new URL('../'+c.asset.replace('./',''),import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes[25],6);
 const service=new RoomService();try{const a=service.createSolo('새 선생님',{botCount:3},c.id),room=service.get(a.code);assert.equal(room.state.players[0].characterId,c.id);assertUnique(room.state.players);const b=service.create('방장',c.id);assert.throws(()=>service.join(b.code,'중복',c.id));}finally{service.close();}
});

test('only the three teacher characters are labelled as bonus characters',()=>{
 assert.deepEqual(CHARACTERS.filter(c=>c.bonus).map(c=>c.id).sort(),['teacher-lee-hwayoung','teacher-shin-songi','teacher-yu-jiyoung']);
});
