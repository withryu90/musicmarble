import test from 'node:test';
import assert from 'node:assert/strict';
import {createListeningPlayer} from '../src/listening-player.js';
function fixture({failedFetch=false,failedStart=false}={}){
 const events=[],nodes=[];let fetches=0;const context={state:'suspended',destination:{},resume:async()=>context.state='running',decodeAudioData:async()=>({duration:5}),createGain:()=>({gain:{},connect(){},disconnect(){}}),createBufferSource:()=>{const n={connect(){},disconnect(){},start:(...args)=>{if(failedStart)throw Error('failed');events.push(args);},stop:()=>n.onended()};nodes.push(n);return n;}};
 const player=createListeningPlayer({createContext:()=>context,fetchFn:async()=>{fetches++;return {ok:!failedFetch,arrayBuffer:async()=>new ArrayBuffer(0)};},onStart:id=>events.push('start:'+id),onEnd:id=>events.push('end:'+id)});
 return {player,events,nodes,fetches:()=>fetches};
}
test('mobile audio is unlocked by gesture and plays exactly five seconds from a cached local recording',async()=>{
 const {player,events,nodes,fetches}=fixture();assert.equal(await player.prepare('bach-air'),true);assert.equal(fetches(),1);await player.prepare('bach-air');assert.equal(fetches(),1);
 assert.throws(()=>player.play('bach-air'));await player.unlock();player.play('bach-air');assert.equal(player.status('bach-air').playing,true);assert.deepEqual(events[1],[0,0,5]);nodes[0].onended();assert.equal(player.status('bach-air').playing,false);assert.equal(events.at(-1),'end:bach-air');
});
test('unavailable and failed downloads cannot play or trigger a paid playback',async()=>{
 const {player,events}=fixture({failedFetch:true});assert.equal(await player.prepare('stravinsky-firebird'),false);assert.equal(await player.prepare('bach-air'),false);assert.equal(player.status('bach-air').state,'error');await player.unlock();assert.throws(()=>player.play('bach-air'));assert.deepEqual(events,[]);
});
test('audio start failure releases the BGM interruption and stop ends playback',async()=>{
 const f=fixture({failedStart:true});await f.player.prepare('bach-air');await f.player.unlock();assert.throws(()=>f.player.play('bach-air'));assert.equal(f.events.at(-1),'end:bach-air');assert.equal(f.player.status('bach-air').playing,false);
 const g=fixture();await g.player.prepare('bach-air');await g.player.unlock();g.player.play('bach-air');g.player.stop();assert.equal(g.player.status('bach-air').playing,false);
});
