import test from 'node:test';
import assert from 'node:assert/strict';
import {HttpTransport} from '../src/http-transport.js';
import {GameTransport} from '../src/game-transport.js';
const tick=()=>new Promise(r=>setTimeout(r,12));
test('HTTPS sends authenticated room actions without browser-to-browser connections',async()=>{
 const calls=[];const http=new HttpTransport({fetchFn:async(url,options)=>{calls.push({url,options});return Response.json({code:'012345',revision:2});}});
 await http.request('action',{action:'roll',revision:1},{code:'012345',token:'private'});
 assert.equal(calls[0].url.endsWith('/api/game/action'),true);assert.equal(calls[0].options.credentials,'omit');assert.equal(JSON.parse(calls[0].options.body).token,'private');
});
test('lost create response retries the same ticket, but an explicit new room gets a new ticket',async()=>{
 const tickets=[];let calls=0;const http=new HttpTransport({fetchFn:async(url,options)=>{tickets.push(JSON.parse(options.body).requestId);if(++calls===1)throw Error('temporary network failure');return Response.json({code:'012345',transport:'https'});}});
 await http.request('create',{nickname:'선율'});assert.equal(tickets[0],tickets[1]);assert.match(tickets[0],/^[a-f0-9]{64}$/);
 http.close();await http.request('create',{nickname:'선율'});assert.notEqual(tickets[1],tickets[2]);
});
test('concurrent room refreshes share one request and mutations are never retried ambiguously',async()=>{
 let calls=0,release;const http=new HttpTransport({fetchFn:async()=>{calls++;await new Promise(r=>release=r);return Response.json({revision:2});}});
 const session={code:'012345',token:'private'};const one=http.request('resume',{},session),two=http.request('resume',{},session);release();await Promise.all([one,two]);assert.equal(calls,1);
 let payments=0;http.fetchFn=async()=>{payments++;throw Error('lost response');};
 await assert.rejects(http.request('action',{action:'purchaseAndNext'},session));assert.equal(payments,1);
});
test('polling delivers new snapshots and chats, recovers a network interruption and stops on unsubscribe',async()=>{
 let calls=0;const updates=[],chats=[],errors=[];const http=new HttpTransport({interval:1,fetchFn:async()=>{calls++;if(calls===2||calls===3)throw Error('offline');return Response.json({code:'012345',revision:1,chatSeq:1,messages:[{text:'음악 정보'}]});}});
 const sub=http.subscribe({code:'012345',token:'private'},{onSnapshot:s=>updates.push(s),onChat:s=>chats.push(s),onDisconnect:e=>errors.push(e)});
 await tick();sub.close();const count=calls;await tick();assert.equal(calls,count);assert.ok(updates.length>=2);assert.equal(chats.length,1);assert.equal(errors.length,1);
});
test('new shared games use HTTPS, solo and existing saved games keep their transport',async()=>{
 const calls=[];const fake=name=>({connection:null,close(){},request:async(path)=>{calls.push(`${name}:${path}`);return {transport:name==='http'?'https':undefined};},subscribe(){calls.push(`${name}:subscribe`);return {close(){}};}});
 const transport=new GameTransport({peer:fake('peer'),http:fake('http')});
 await transport.request('create');await transport.request('join',{code:'012345'});await transport.request('create-solo');
 await transport.request('resume',{}, {transport:'https'});await transport.request('resume',{},{});
 assert.deepEqual(calls,['http:create','http:join','peer:create-solo','http:resume','peer:resume']);
});
test('only a missing server room falls back to an old PeerJS room',async()=>{
 let peers=0;const peer={close(){},request:async()=>{peers++;return {};}};const http={close(){},request:async()=>{throw Object.assign(Error('not found'),{status:404});}};
 const transport=new GameTransport({peer,http});await transport.request('join',{code:'012345'});assert.equal(peers,1);
 http.request=async()=>{throw Object.assign(Error('정원 초과'),{status:400});};await assert.rejects(transport.request('join',{code:'012345'}));assert.equal(peers,1);
});

test('default fetch is bound to the browser global for Safari compatibility',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async function(){assert.equal(this,globalThis);return Response.json({code:'012345'});};
  const http=new HttpTransport();await http.request('create',{nickname:'브라우저 확인'});
 }finally{globalThis.fetch=original;}
});
