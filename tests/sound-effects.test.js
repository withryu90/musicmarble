import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundEffects,activitySound,EFFECTS,RECORDED_EFFECTS} from '../src/sound-effects.js';
const fetchAudio=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
function context(state='running'){
 const ctx={state,currentTime:10,sampleRate:8000,destination:{},voices:[],resumeCount:0,async resume(){this.resumeCount++;this.state='running';}};
 const node=()=>({connect(){},disconnect(){},gain:param(),frequency:param(),Q:param()});
 const voice=()=>{const n={...node(),start(at){this.startAt=at;},stop(at){this.endAt=at;}};ctx.voices.push(n);return n;};
 ctx.decodeAudioData=async()=>({duration:4.8});ctx.createGain=node;ctx.createBiquadFilter=node;ctx.createOscillator=voice;ctx.createBufferSource=voice;
 ctx.createBuffer=(channels,length)=>({getChannelData:()=>new Float32Array(length)});return ctx;
}
test('all five effects schedule finite audio, with local recordings for crowd and fate motif',async()=>{
 for(const name of EFFECTS){const ctx=context(),sfx=createSoundEffects({fetchAudio,createContext:()=>ctx,random:()=>.5});assert.equal(await sfx.play(name),true);assert.ok(ctx.voices.length>0);for(const n of ctx.voices){assert.ok(n.startAt>=ctx.currentTime);assert.ok(n.endAt>n.startAt);assert.ok(n.endAt-ctx.currentTime<(RECORDED_EFFECTS[name]?5:2.2));}sfx.stop();}
});
test('muting stops active sounds and blocks new playback; hidden tabs stay silent',async()=>{
 const ctx=context();let visible=true;const sfx=createSoundEffects({fetchAudio,createContext:()=>ctx,isVisible:()=>visible});
 await sfx.play('prison');sfx.setEnabled(false);assert.ok(ctx.voices.every(n=>n.endAt===undefined));const count=ctx.voices.length;
 assert.equal(await sfx.play('applause'),false);assert.equal(ctx.voices.length,count);
 sfx.setEnabled(true);visible=false;assert.equal(await sfx.play('gain'),false);visible=true;assert.equal(await sfx.play('gain'),true);
});
test('repeated event notices and reopened results play once per event key',async()=>{
 const ctx=context(),sfx=createSoundEffects({fetchAudio,createContext:()=>ctx});
 assert.equal(await sfx.play('applause','finished:one'),true);const count=ctx.voices.length;
 assert.equal(await sfx.play('applause','finished:one'),false);assert.equal(ctx.voices.length,count);
 assert.equal(await sfx.play('applause','finished:two'),true);
});
test('mobile suspended contexts resume; absent or blocked audio never interrupts the game',async()=>{
 const ctx=context('suspended'),sfx=createSoundEffects({fetchAudio,createContext:()=>ctx});sfx.unlock();assert.equal(ctx.resumeCount,1);assert.equal(await sfx.play('dice'),true);
 assert.equal(await createSoundEffects({fetchAudio,createContext:()=>null}).play('gain'),false);
 const blocked=context('suspended');blocked.resume=async()=>{throw Error('NotAllowedError');};assert.equal(await createSoundEffects({fetchAudio,createContext:()=>blocked}).play('dice'),false);
});
test('muting while audio is unlocking cancels the pending sound',async()=>{
 const ctx=context('suspended');let resume;ctx.resume=()=>new Promise(resolve=>{resume=()=>{ctx.state='running';resolve();};});const sfx=createSoundEffects({fetchAudio,createContext:()=>ctx});
 const pending=sfx.play('gain');sfx.setEnabled(false);resume();assert.equal(await pending,false);assert.equal(ctx.voices.length,0);
});
test('card rewards and prison arrivals choose the requested effects',()=>{
 assert.equal(activitySound({type:'history-event',card:{amount:200,actual:200}}),'gain');
 assert.equal(activitySound({type:'history-event',card:{amount:-150,actual:-100}}),'loss');
 assert.equal(activitySound({type:'history-event',card:{amount:-150,actual:0}}),'loss');
 for(const type of ['prison-entry','prison-transfer'])assert.equal(activitySound({type}),'prison');
 assert.equal(activitySound({type:'quiz-result'}),null);
});

test('recordings are loaded once, cancelled on mute, and failures can retry',async()=>{
 const ctx=context();let calls=0,resolve;const fetchSlow=()=>{calls++;return new Promise(r=>resolve=r);};
 const sfx=createSoundEffects({createContext:()=>ctx,fetchAudio:fetchSlow});
 const pending=sfx.play('applause','end');sfx.setEnabled(false);resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
 assert.equal(await pending,false);assert.equal(ctx.voices.length,0);sfx.setEnabled(true);assert.equal(await sfx.play('applause','end'),true);assert.equal(calls,1);
 let failed=true;const retry=createSoundEffects({createContext:()=>ctx,fetchAudio:async()=>{if(failed)throw Error('offline');return fetchAudio();}});
 assert.equal(await retry.play('prison'),false);failed=false;assert.equal(await retry.play('prison'),true);
});
test('bundled crowd applause and fate motif are valid short stereo recordings',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const url of Object.values(RECORDED_EFFECTS)){const data=await readFile(new URL(url));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');assert.equal(data.readUInt16LE(22),2);assert.ok(data.length>100000);}
});
test('real prison excerpt contains both opening motifs in the requested pitch order',async()=>{
 const {readFile}=await import('node:fs/promises'),data=await readFile(new URL(RECORDED_EFFECTS.prison));
 const rate=data.readUInt32LE(24),frames=(data.length-44)/4;
 assert.ok(frames/rate>6.9&&frames/rate<7.1);
 const pitches={G:392,Eb:311.127,F:349.228,D:293.665};
 // Inspect sustained pitches after each attack, across three orchestral octaves.
 const phrases=[[.11,'G'],[.26,'G'],[.42,'G'],[1.18,'Eb'],[3.56,'F'],[3.72,'F'],[3.88,'F'],[4.68,'D']];
 for(const [time,expected] of phrases){
  const samples=[];for(let frame=Math.round(time*rate);frame<Math.round((time+.09)*rate);frame+=5)samples.push((data.readInt16LE(44+frame*4)+data.readInt16LE(46+frame*4))/65536);
  const scores=Object.entries(pitches).map(([name,hz])=>{let energy=0;for(const octave of [.5,1,2]){let re=0,im=0;for(let i=0;i<samples.length;i++){const phase=2*Math.PI*hz*octave*i/(rate/5);re+=samples[i]*Math.cos(phase);im+=samples[i]*Math.sin(phase);}energy+=re*re+im*im;}return [name,energy];});
  scores.sort((a,b)=>b[1]-a[1]);assert.equal(scores[0][0],expected,`pitch at ${time}s`);
 }
});

test('interrupted mobile sound effects recover when the user returns and interacts',async()=>{
 const ctx=context('interrupted'),sfx=createSoundEffects({createContext:()=>ctx,fetchAudio});
 assert.equal(await sfx.play('dice'),true);assert.equal(ctx.resumeCount,1);ctx.state='interrupted';sfx.unlock();assert.equal(ctx.resumeCount,2);
});

test('both learning and purchase OX quiz outcomes select positive or negative effects',()=>{
 for(const type of ['quiz-result','purchase-quiz-result']){
  assert.equal(activitySound({type,correct:true}),'gain');
  assert.equal(activitySound({type,correct:false}),'loss');
  assert.equal(activitySound({type}),null);
 }
});
test('Safari unlock selects playback audio and starts a one-frame source within the gesture',()=>{
 const ctx=context(),lengths=[],original=ctx.createBuffer;ctx.createBuffer=(channels,length,rate)=>{lengths.push(length);return original(channels,length,rate);};let configured=0;
 const sfx=createSoundEffects({createContext:()=>ctx,fetchAudio,configureSession:()=>configured++});
 sfx.unlock();assert.equal(configured,1);assert.ok(lengths.includes(1));assert.equal(ctx.voices[0].startAt,0);assert.ok(ctx.voices[0].endAt>ctx.currentTime);
 const count=ctx.voices.length;sfx.unlock();assert.equal(ctx.voices.length,count);
});
