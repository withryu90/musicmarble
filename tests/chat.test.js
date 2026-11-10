import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomService} from '../server/rooms.js';
import {makeServer} from '../server/server.js';
test('room chat reaches every participant, isolates rooms and does not change game revision or state',()=>{
 const service=new RoomService();try{const a=service.create('가온'),b=service.join(a.code,'나래'),c=service.create('다른방'),room=service.get(a.code);service.act(a.code,a.token,{action:'start',revision:room.revision});const state=structuredClone(room.state),revision=room.revision,A=[],B=[],C=[];const stops=[service.subscribeChat(a.code,a.token,x=>A.push(x)),service.subscribeChat(b.code,b.token,x=>B.push(x)),service.subscribeChat(c.code,c.token,x=>C.push(x))];
 const result=service.chat(b.code,b.token,'  안녕하세요!  ');assert.equal(result.messages[0].name,'나래');assert.equal(result.messages[0].playerId,1);assert.equal(result.messages[0].text,'안녕하세요!');assert.deepEqual(A.at(-1),B.at(-1));assert.equal(C.length,1);assert.deepEqual(room.state,state);assert.equal(room.revision,revision);assert.ok(!JSON.stringify(result).includes(b.token));stops.forEach(fn=>fn());assert.equal(room.chatListeners.size,0);
 }finally{service.close();}
});
test('chat enforces authentication, bounded text and rate limits; reconnect receives recent 100',()=>{
 const service=new RoomService();try{const a=service.create('A'),room=service.get(a.code);for(const message of ['', ' ', null, 'a'.repeat(201),'bad\u0000'])assert.throws(()=>service.chat(a.code,a.token,message));assert.throws(()=>service.chat(a.code,'wrong','x'));
 for(let i=1;i<=105;i++){room.members[0].lastChatAt=0;service.chat(a.code,a.token,`메시지 ${i}`);}assert.throws(()=>service.chat(a.code,a.token,'too fast'));let latest;const stop=service.subscribeChat(a.code,a.token,x=>latest=x);assert.equal(latest.messages.length,100);assert.equal(latest.messages[0].id,6);assert.equal(latest.messages.at(-1).id,105);stop();assert.throws(()=>service.subscribeChat(a.code,'wrong',()=>{}));
 }finally{service.close();}
});
test('chat HTTP endpoint broadcasts named SSE messages, preserves literal markup and rejects impersonation',async()=>{
 const server=makeServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,abort=new AbortController();
 const post=async(path,body,token)=>{const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 try{const a=(await post('create',{nickname:'A'})).data,b=(await post('join',{code:a.code,nickname:'B'})).data;const response=await fetch(`${base}/api/events?code=${a.code}&token=${a.token}`,{signal:abort.signal}),reader=response.body.getReader();let content=new TextDecoder().decode((await reader.read()).value);
 const sent=await post('chat',{code:a.code,message:'<script>hello</script>',playerId:0,name:'A'},b.token);assert.equal(sent.status,200);assert.equal(sent.data.messages[0].name,'B');assert.equal(sent.data.messages[0].text,'<script>hello</script>');while(!content.includes('<script>hello</script>'))content+=new TextDecoder().decode((await reader.read()).value);assert.ok(content.includes('event: chat'));assert.equal((await post('chat',{code:a.code,message:'x'},'invalid')).status,400);assert.equal((await post('chat',{code:a.code,message:'x'.repeat(201)},a.token)).status,400);
 }finally{abort.abort();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
