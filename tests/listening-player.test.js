import test from 'node:test';
import assert from 'node:assert/strict';
import {createListeningPlayer,listeningFadeEnvelope} from '../src/listening-player.js';
function fixture({failedFetch=false,failedStart=false,duration=5,registeredDuration=duration,original=false}={}){
 const events=[],nodes=[],gains=[];let fetches=0;const context={state:'suspended',currentTime:0,destination:{},resume:async()=>context.state='running',decodeAudioData:async()=>({duration}),createGain:()=>{const automation=[],gain={automation,setValueAtTime:(value,time)=>automation.push(['set',value,time]),linearRampToValueAtTime:(value,time)=>automation.push(['ramp',value,time])};gains.push(gain);return {gain,connect(){},disconnect(){}};},createBufferSource:()=>{const n={connect(){},disconnect(){},start:(...args)=>{if(failedStart)throw Error('failed');events.push(args);},stop:()=>n.onended()};nodes.push(n);return n;}};
 const player=createListeningPlayer({hints:{'bach-air':{src:'./audio.wav',duration:registeredDuration,original}},createContext:()=>context,fetchFn:async()=>{fetches++;return {ok:!failedFetch,arrayBuffer:async()=>new ArrayBuffer(0)};},onStart:id=>events.push('start:'+id),onEnd:id=>events.push('end:'+id)});
 return {player,events,nodes,gains,context,fetches:()=>fetches};
}
test('mobile audio is unlocked by gesture and plays the complete cached recording without a duration cutoff',async()=>{
 const {player,events,nodes,fetches}=fixture();assert.equal(await player.prepare('bach-air'),true);assert.equal(fetches(),1);await player.prepare('bach-air');assert.equal(fetches(),1);
 assert.throws(()=>player.play('bach-air'));await player.unlock();player.play('bach-air');assert.equal(player.status('bach-air').playing,true);assert.deepEqual(events[1],[0]);nodes[0].onended();assert.equal(player.status('bach-air').playing,false);assert.equal(events.at(-1),'end:bach-air');
});
test('unavailable and failed downloads cannot play or trigger a paid playback',async()=>{
 const {player,events}=fixture({failedFetch:true});assert.equal(await player.prepare('stravinsky-firebird'),false);assert.equal(await player.prepare('bach-air'),false);assert.equal(player.status('bach-air').state,'error');await player.unlock();assert.throws(()=>player.play('bach-air'));assert.deepEqual(events,[]);
});
test('audio start failure releases the BGM interruption and stop ends playback',async()=>{
 const f=fixture({failedStart:true});await f.player.prepare('bach-air');await f.player.unlock();assert.throws(()=>f.player.play('bach-air'));assert.equal(f.events.at(-1),'end:bach-air');assert.equal(f.player.status('bach-air').playing,false);
 const g=fixture();await g.player.prepare('bach-air');await g.player.unlock();g.player.play('bach-air');g.player.stop();assert.equal(g.player.status('bach-air').playing,false);
});

test('short and long supplied recordings play intact; invalid duration metadata prevents charging',async()=>{
 for(const duration of [1.25,12.8,35.42]){
  const f=fixture({duration});assert.equal(await f.player.prepare('bach-air'),true);await f.player.unlock();f.player.play('bach-air');assert.deepEqual(f.events[1],[0]);f.nodes[0].onended();assert.equal(f.player.status('bach-air').playing,false);
 }
 const broken=fixture({duration:12,registeredDuration:5});assert.equal(await broken.player.prepare('bach-air'),false);assert.equal(broken.player.status('bach-air').state,'error');
});

test('pause preserves the exact audio position, resumes from it, and ignores stale ended callbacks',async()=>{
 const f=fixture({duration:12});await f.player.prepare('bach-air');await f.player.unlock();f.player.play('bach-air');
 f.context.currentTime=1.7;f.player.pause();assert.equal(f.player.status('bach-air').playing,false);assert.equal(f.player.status('bach-air').paused,true);assert.equal(f.player.status('bach-air').offset,1.7);
 f.context.currentTime=4;f.player.play('bach-air',{resume:true});assert.deepEqual(f.events.at(-1),[0,1.7]);assert.equal(f.player.status('bach-air').playing,true);
 f.nodes[0].onended();assert.equal(f.player.status('bach-air').playing,true);
 f.context.currentTime=5;f.player.pause();assert.equal(f.player.status('bach-air').offset,2.7);f.player.stop();assert.equal(f.player.status('bach-air').paused,false);
});

test('complete recordings fade smoothly to silence without a playback cutoff',async()=>{
 const f=fixture({duration:12,original:true});await f.player.prepare('bach-air');await f.player.unlock();f.player.play('bach-air');
 assert.deepEqual(f.gains[0].automation,[['set',1,0],['set',1,10.5],['ramp',0,12]]);
 assert.deepEqual(f.events.at(-1),[0]);
 f.context.currentTime=11;f.player.pause();f.context.currentTime=20;f.player.play('bach-air',{resume:true});
 assert.deepEqual(f.events.at(-1),[0,11]);
 assert.ok(Math.abs(f.gains[1].automation[0][1]-2/3)<1e-9);
 assert.deepEqual(f.gains[1].automation.at(-1),['ramp',0,21]);
});
test('very short recordings keep most of their original volume and fade only the end',()=>{
 const fade=listeningFadeEnvelope(1,0,.65);assert.equal(fade.hold,.7);assert.equal(fade.gain,.65);assert.equal(fade.remaining,1);
 const resumed=listeningFadeEnvelope(1,.85,.65);assert.equal(resumed.hold,0);assert.ok(resumed.gain>0&&resumed.gain<.65);
});
