import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundEffects,activitySound,EFFECTS} from '../src/sound-effects.js';
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
function context(state='running'){
 const ctx={state,currentTime:10,sampleRate:8000,destination:{},voices:[],resumeCount:0,async resume(){this.resumeCount++;this.state='running';}};
 const node=()=>({connect(){},disconnect(){},gain:param(),frequency:param(),Q:param()});
 const voice=()=>{const n={...node(),start(at){this.startAt=at;},stop(at){this.endAt=at;}};ctx.voices.push(n);return n;};
 ctx.createGain=node;ctx.createBiquadFilter=node;ctx.createOscillator=voice;ctx.createBufferSource=voice;
 ctx.createBuffer=(channels,length)=>({getChannelData:()=>new Float32Array(length)});return ctx;
}
test('all five effects schedule short, finite sounds without any audio asset requests',async()=>{
 for(const name of EFFECTS){const ctx=context(),sfx=createSoundEffects({createContext:()=>ctx,random:()=>.5});assert.equal(await sfx.play(name),true);assert.ok(ctx.voices.length>0);for(const n of ctx.voices){assert.ok(n.startAt>=ctx.currentTime);assert.ok(n.endAt>n.startAt);assert.ok(n.endAt-ctx.currentTime<2.2);}sfx.stop();}
});
test('muting stops active sounds and blocks new playback; hidden tabs stay silent',async()=>{
 const ctx=context();let visible=true;const sfx=createSoundEffects({createContext:()=>ctx,isVisible:()=>visible});
 await sfx.play('prison');sfx.setEnabled(false);assert.ok(ctx.voices.every(n=>n.endAt===undefined));const count=ctx.voices.length;
 assert.equal(await sfx.play('applause'),false);assert.equal(ctx.voices.length,count);
 sfx.setEnabled(true);visible=false;assert.equal(await sfx.play('gain'),false);visible=true;assert.equal(await sfx.play('gain'),true);
});
test('repeated event notices and reopened results play once per event key',async()=>{
 const ctx=context(),sfx=createSoundEffects({createContext:()=>ctx});
 assert.equal(await sfx.play('applause','finished:one'),true);const count=ctx.voices.length;
 assert.equal(await sfx.play('applause','finished:one'),false);assert.equal(ctx.voices.length,count);
 assert.equal(await sfx.play('applause','finished:two'),true);
});
test('mobile suspended contexts resume; absent or blocked audio never interrupts the game',async()=>{
 const ctx=context('suspended'),sfx=createSoundEffects({createContext:()=>ctx});sfx.unlock();assert.equal(ctx.resumeCount,1);assert.equal(await sfx.play('dice'),true);
 assert.equal(await createSoundEffects({createContext:()=>null}).play('gain'),false);
 const blocked=context('suspended');blocked.resume=async()=>{throw Error('NotAllowedError');};assert.equal(await createSoundEffects({createContext:()=>blocked}).play('dice'),false);
});
test('muting while audio is unlocking cancels the pending sound',async()=>{
 const ctx=context('suspended');let resume;ctx.resume=()=>new Promise(resolve=>{resume=()=>{ctx.state='running';resolve();};});const sfx=createSoundEffects({createContext:()=>ctx});
 const pending=sfx.play('gain');sfx.setEnabled(false);resume();assert.equal(await pending,false);assert.equal(ctx.voices.length,0);
});
test('card rewards and prison arrivals choose the requested effects',()=>{
 assert.equal(activitySound({type:'history-event',card:{amount:200,actual:200}}),'gain');
 assert.equal(activitySound({type:'history-event',card:{amount:-150,actual:-100}}),'loss');
 assert.equal(activitySound({type:'history-event',card:{amount:-150,actual:0}}),'loss');
 for(const type of ['prison-entry','prison-transfer'])assert.equal(activitySound({type}),'prison');
 assert.equal(activitySound({type:'quiz-result'}),null);
});
