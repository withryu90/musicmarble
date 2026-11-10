import test from 'node:test';
import assert from 'node:assert/strict';
import {makeServer} from '../server/server.js';
const buffers=new WeakMap();
async function readGame(reader){let buffer=buffers.get(reader)||'';for(;;){const end=buffer.indexOf('\n\n');if(end>=0){const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);buffers.set(reader,buffer);if(frame.startsWith('data: '))return frame;continue;}const {value,done}=await reader.read();if(done)throw Error('SSE ended');buffer+=new TextDecoder().decode(value);}}
test('HTTP room APIs, authorization, SSE, and private-file restrictions',async()=>{
 const server=makeServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const post=async(path,body,token)=>{const res=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});return {status:res.status,data:await res.json()};};
 try{
  assert.equal((await fetch(base)).status,200);assert.equal((await fetch(base+'/server/rooms.js')).status,404);assert.equal((await fetch(base+'/.git/config')).status,404);assert.equal((await fetch(base+'/src/app.js')).status,200);
  const a=(await post('/api/create',{nickname:'하나'})).data,b=(await post('/api/join',{code:a.code,nickname:'둘'})).data;
  const resumed=await post('/api/resume',{code:a.code},a.token);assert.equal(resumed.data.playerId,0);assert.equal((await post('/api/resume',{code:a.code},b.token+'bad')).status,400);
  const abort=new AbortController();const stream=await fetch(`${base}/api/events?code=${a.code}&token=${a.token}`,{signal:abort.signal});assert.equal(stream.headers.get('content-type'),'text/event-stream');const reader=stream.body.getReader();const first=await readGame(reader);assert.ok(first.includes('"members"'));assert.ok(!first.includes(a.token));
  const started=await post('/api/action',{code:a.code,action:'start',args:[{rounds:4,coins:1200}],revision:resumed.data.revision},a.token);assert.equal(started.status,200);const update=await readGame(reader);assert.ok(update.includes('"phase":"roll"'));abort.abort();
  assert.equal((await post('/api/action',{code:a.code,action:'roll',revision:started.data.revision},b.token)).status,400);
  const foreign=await fetch(base+'/api/create',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{"nickname":"x"}'});assert.equal(foreign.status,403);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('100 live SSE connections across 25 rooms receive isolated updates',async()=>{
 const server=makeServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,abort=new AbortController();
 const post=async(path,body,token)=>{const response=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});assert.ok(response.ok);return response.json();};
 const read=readGame;
 try{
  const rooms=await Promise.all(Array.from({length:25},async(_,i)=>{
   const host=await post('create',{nickname:`host${i}`}),members=[host];
   for(let p=1;p<4;p++)members.push(await post('join',{code:host.code,nickname:`guest${p}`}));
   const connections=await Promise.all(members.map(async member=>{const response=await fetch(`${base}/api/events?code=${host.code}&token=${member.token}`,{signal:abort.signal});const reader=response.body.getReader();const initial=await read(reader);assert.ok(initial.includes(`"code":"${host.code}"`));return reader;}));
   const snapshot=await post('resume',{code:host.code},host.token);return {host,connections,revision:snapshot.revision};
  }));
  await Promise.all(rooms.map(async room=>{await post('action',{code:room.host.code,action:'start',revision:room.revision},room.host.token);await Promise.all(room.connections.map(async reader=>{const message=await read(reader);assert.ok(message.includes(`"code":"${room.host.code}"`));assert.ok(message.includes('"phase":"roll"'));}));}));
  assert.equal(rooms.reduce((n,r)=>n+r.connections.length,0),100);
 }finally{abort.abort();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('solo endpoint starts a bot game and rejects invalid configuration',async()=>{
 const server=makeServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const post=async(path,body,token)=>{const res=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});return {status:res.status,data:await res.json()};};
 try{
  assert.equal((await post('create-solo',{nickname:'나',config:{botCount:4}})).status,400);
  const created=await post('create-solo',{nickname:'여행자',config:{botCount:3,rounds:4}});assert.equal(created.status,201);
  const {code,token}=created.data;const resumed=await post('resume',{code},token);assert.equal(resumed.data.mode,'solo');assert.equal(resumed.data.members.length,4);assert.equal(resumed.data.state.turn,0);assert.equal(resumed.data.state.maxRounds,4);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
