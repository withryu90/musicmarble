import test from 'node:test';
import assert from 'node:assert/strict';
import {createBgm,BGM_SOURCE} from '../src/bgm.js';
import {makeServer} from '../server/server.js';
class FakeAudio extends EventTarget{
 static instances=[];
 constructor(src){super();this.src=src;this.paused=true;FakeAudio.instances.push(this);}
 async play(){this.paused=false;this.dispatchEvent(new Event('play'));}
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
}
test('BGM loads only on request, loops, changes volume and pauses without losing its place',async()=>{
 FakeAudio.instances=[];const bgm=createBgm({AudioClass:FakeAudio,createContext:()=>null});assert.equal(FakeAudio.instances.length,0);
 await bgm.toggle();const audio=FakeAudio.instances[0];assert.equal(audio.src,BGM_SOURCE);assert.equal(audio.loop,true);assert.equal(bgm.status().playing,true);
 bgm.setVolume(.4);assert.equal(audio.volume,.4);await bgm.toggle();assert.equal(bgm.status().playing,false);
 await bgm.toggle();bgm.pause();assert.equal(bgm.status().playing,false);assert.equal(FakeAudio.instances.length,1);
});
test('Web Audio gain controls volume and resumes a suspended context',async()=>{
 const gain={gain:{value:1},connect(){}},ctx={state:'suspended',destination:{},createGain:()=>gain,createMediaElementSource:()=>({connect(){}}),async resume(){this.state='running';}};
 const bgm=createBgm({AudioClass:FakeAudio,createContext:()=>ctx});await bgm.toggle();assert.equal(ctx.state,'running');bgm.setVolume(.15);assert.equal(gain.gain.value,.15);
});
test('blocked playback reports an error so the user can retry',async()=>{
 class BlockedAudio extends FakeAudio{async play(){throw Error('blocked');}}
 const bgm=createBgm({AudioClass:BlockedAudio,createContext:()=>null});await bgm.toggle();assert.equal(bgm.status().playing,false);assert.equal(bgm.status().error,true);
});
test('audio serves chiptune metadata and byte ranges for Safari seeking',async()=>{
 const server=makeServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/src/assets/audio/mozart-k525-chiptune.m4a`;
 try{
  const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('Content-Type'),'audio/mp4');assert.equal(head.headers.get('Accept-Ranges'),'bytes');const size=Number(head.headers.get('Content-Length'));assert.ok(size>100000);
  const partial=await fetch(url,{headers:{Range:'bytes=0-15'}});assert.equal(partial.status,206);assert.equal(partial.headers.get('Content-Range'),`bytes 0-15/${size}`);assert.equal((await partial.arrayBuffer()).byteLength,16);
  const suffix=await fetch(url,{headers:{Range:'bytes=-10'}});assert.equal(suffix.status,206);assert.equal((await suffix.arrayBuffer()).byteLength,10);
  assert.equal((await fetch(url,{headers:{Range:`bytes=${size}-`}})).status,416);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('autoplay does not create a suspended AudioContext and a blocked attempt can retry on gesture',async()=>{
 let contexts=0,allowed=false;
 class GestureAudio extends FakeAudio{async play(){if(!allowed){const e=Error('gesture needed');e.name='NotAllowedError';throw e;}return super.play();}}
 const bgm=createBgm({AudioClass:GestureAudio,createContext:()=>{contexts++;return null;}});
 assert.equal(await bgm.play({gesture:false}),false);assert.equal(contexts,0);assert.equal(bgm.status().blocked,true);assert.equal(bgm.status().error,false);
 allowed=true;await bgm.play({gesture:true});assert.equal(contexts,1);assert.equal(bgm.status().playing,true);assert.equal(bgm.status().blocked,false);
});
test('muting while playback is loading cannot start sound later',async()=>{
 let ready;
 class SlowAudio extends FakeAudio{async play(){await new Promise(r=>{ready=r;});return super.play();}}
 const bgm=createBgm({AudioClass:SlowAudio,createContext:()=>null});const loading=bgm.play({gesture:false});bgm.pause();ready();await loading;assert.equal(bgm.status().playing,false);
});

test('interrupted mobile audio is not reported as playing and resumes on the next gesture',async()=>{
 const gain={gain:{value:1},connect(){}},ctx={state:'running',destination:{},createGain:()=>gain,createMediaElementSource:()=>({connect(){}}),resumes:0,async resume(){this.resumes++;this.state='running';}};
 const bgm=createBgm({AudioClass:FakeAudio,createContext:()=>ctx});await bgm.play();ctx.state='interrupted';assert.equal(bgm.status().playing,false);await bgm.play();assert.equal(ctx.resumes,1);assert.equal(bgm.status().playing,true);
});
