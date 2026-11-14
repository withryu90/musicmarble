import test from 'node:test';
import assert from 'node:assert/strict';
import {createListeningPlayer} from '../src/listening-player.js';
function fixture({failedFetch=false,failedStart=false,duration=5,registeredDuration=duration}={}){
 const events=[],nodes=[];let fetches=0;const context={state:'suspended',currentTime:0,destination:{},resume:async()=>context.state='running',decodeAudioData:async()=>({duration}),createGain:()=>({gain:{},connect(){},disconnect(){}}),createBufferSource:()=>{const n={connect(){},disconnect(){},start:(...args)=>{if(failedStart)throw Error('failed');events.push(args);},stop:()=>n.onended()};nodes.push(n);return n;}};
 const player=createListeningPlayer({hints:{'bach-air':{src:'./audio.wav',duration:registeredDuration}},createContext:()=>context,fetchFn:async()=>{fetches++;return {ok:!failedFetch,arrayBuffer:async()=>new ArrayBuffer(0)};},onStart:id=>events.push('start:'+id),onEnd:id=>events.push('end:'+id)});
 return {player,events,nodes,context,fetches:()=>fetches};
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
