import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PeerTransport,roomPeerId,peerError} from '../src/peer-transport.js';
class Wire extends EventEmitter{
 constructor(peer){super();this.peer=peer;this.open=false;}
 send(data){if(!this.open)throw Error('closed');queueMicrotask(()=>{if(this.other.open)this.other.emit('data',structuredClone(data));});}
 close(){if(!this.open)return;this.open=false;this.emit('close');if(this.other.open){this.other.open=false;this.other.emit('close');}}
}
class FakePeer extends EventEmitter{
 static peers=new Map();static seq=0;
 constructor(id){super();this.id=typeof id==='string'?id:`guest-${++FakePeer.seq}`;this.destroyed=false;this.wires=[];queueMicrotask(()=>{if(FakePeer.peers.has(this.id))this.emit('error',Object.assign(Error('taken'),{type:'unavailable-id'}));else{FakePeer.peers.set(this.id,this);this.emit('open',this.id);}});}
 connect(id){const local=new Wire(id);this.wires.push(local);queueMicrotask(()=>{const peer=FakePeer.peers.get(id);if(!peer){this.emit('error',Object.assign(Error('missing'),{type:'peer-unavailable'}));return;}const remote=new Wire(this.id);peer.wires.push(remote);local.other=remote;remote.other=local;peer.emit('connection',remote);local.open=remote.open=true;remote.emit('open');local.emit('open');});return local;}
 reconnect(){}
 destroy(){this.destroyed=true;if(FakePeer.peers.get(this.id)===this)FakePeer.peers.delete(this.id);this.wires.forEach(w=>w.close());}
}
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
const transport=(store=storage())=>new PeerTransport({PeerClass:FakePeer,storage:store,timeout:300,botDelay:5});
const tick=()=>new Promise(r=>setTimeout(r,10));
test('Peer IDs are safe ASCII and pattern errors become a clear connection message',()=>{
 assert.equal(roomPeerId('ABC234'),'musicmarble-rtc-v1-ABC234');for(const code of ['abc234','ABC','ABC/23','ABC 23'])assert.throws(()=>roomPeerId(code));assert.doesNotMatch(peerError(Error('The string did not match the expected pattern.')),/string did not match/);
});
test('four peers share start, authorized rolls and chat while another room stays isolated',async()=>{
 const peers=Array.from({length:5},()=>transport());let owner,others=[],hostSnapshot,guestSnapshot,foreignSnapshot,chat;
 try{
  owner=await peers[0].request('create',{nickname:'Host',characterId:'bach'});peers[0].subscribe(owner,{onSnapshot:s=>hostSnapshot=s});
  for(let i=1;i<4;i++){const s=await peers[i].request('join',{code:owner.code,nickname:`P${i}`});others.push(s);peers[i].subscribe(s,{onSnapshot:s=>{if(i===1)guestSnapshot=s;},onChat:c=>chat=c});}
  const foreign=await peers[4].request('create',{nickname:'Other'});peers[4].subscribe(foreign,{onSnapshot:s=>foreignSnapshot=s});await tick();
  assert.equal(hostSnapshot.members.length,4);assert.equal(guestSnapshot.members.length,4);assert.equal(foreignSnapshot.members.length,1);
  await peers[0].request('action',{action:'start',revision:hostSnapshot.revision},owner);await tick();assert.equal(guestSnapshot.state.players.length,4);
  await assert.rejects(peers[1].request('action',{action:'roll',revision:guestSnapshot.revision},others[0]));
  await peers[0].request('action',{action:'roll',revision:hostSnapshot.revision},owner);await tick();assert.equal(guestSnapshot.state.dice,hostSnapshot.state.dice);
  await peers[1].request('chat',{message:'음악 정보'},others[0]);await tick();assert.equal(chat.messages.at(-1).text,'음악 정보');assert.equal(foreignSnapshot.state,null);
  assert.ok(!JSON.stringify(guestSnapshot).includes(owner.token));
 }finally{peers.forEach(p=>p.close());}
});
test('solo requires no PeerServer and owner refresh restores progress and guest credentials',async()=>{
 const saved=storage(),a=transport(saved);const session=await a.request('create-solo',{nickname:'Solo',config:{botCount:1}});let snapshot;a.subscribe(session,{onSnapshot:s=>snapshot=s});
 assert.equal(a.peer,null);await a.request('action',{action:'roll',revision:snapshot.revision},session);const position=snapshot.state.players[0].position;a.close();
 const b=transport(saved);try{const resumed=await b.request('resume',{},session);assert.equal(resumed.state.players[0].position,position);assert.equal(b.peer,null);}finally{b.close();}
});
test('a guest reconnects and continues the same seat after host restoration',async()=>{
 const saved=storage(),host=transport(saved),guest=transport();let restored;
 try{
  const h=await host.request('create',{nickname:'Host'});const g=await guest.request('join',{code:h.code,nickname:'Guest'});host.close();
  restored=transport(saved);await restored.request('resume',{},h);
  const resumed=await guest.request('resume',{},g);assert.equal(resumed.playerId,1);assert.equal(resumed.members.length,2);
 }finally{host.close();guest.close();restored?.close();}
});
