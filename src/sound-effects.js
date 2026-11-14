// Original synthesized effects plus locally bundled, credited audio recordings.
export const RECORDED_EFFECTS={concert:new URL('./assets/audio/beethoven-ode-concert-orchestra.wav?v=039638e6e41a',import.meta.url).href,applause:new URL('./assets/audio/crowd-cheers-applause.wav?v=039638e6e41a',import.meta.url).href,prison:new URL('./assets/audio/beethoven-fate-prison.wav?v=039638e6e41a',import.meta.url).href};
export const EFFECTS=['dice','gain','loss','applause','prison','concert'];
export function createSoundEffects({onPlaybackStart=()=>{},onPlaybackEnd=()=>{},createContext=()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;return C?new C():null;},isVisible=()=>typeof document==='undefined'||!document.hidden,random=Math.random,fetchAudio=(...args)=>fetch(...args),configureSession=()=>{try{if(globalThis.navigator?.audioSession)globalThis.navigator.audioSession.type='playback';}catch{}}}={}){
 let context=null,enabled=true,generation=0,primed=false,playbackId=0;const nodes=new Set(),seen=new Set(),buffers=new Map();
 function prepare(){if(!enabled)return null;try{configureSession();context??=createContext();return context;}catch{return null;}}
 function unlock(){
  const ctx=prepare();if(!ctx)return;
  if(['suspended','interrupted'].includes(ctx.state)){primed=false;void ctx.resume().catch(()=>{});}
  // iOS Safari needs a source started inside the gesture, not resume() alone.
  if(!primed){try{const source=ctx.createBufferSource();source.buffer=ctx.createBuffer(1,1,ctx.sampleRate);source.connect(ctx.destination);source.start(0);track(source,ctx.currentTime+.02);primed=true;}catch{}}
  for(const name of Object.keys(RECORDED_EFFECTS))void loadRecording(ctx,name).catch(()=>{});
 }
 function loadRecording(ctx,name){if(!buffers.has(name)){const pending=(async()=>{const response=await fetchAudio(RECORDED_EFFECTS[name]);if(!response.ok)throw Error('Sound unavailable');return ctx.decodeAudioData(await response.arrayBuffer());})();buffers.set(name,pending);pending.catch(()=>buffers.delete(name));}return buffers.get(name);}
 function stop(){generation++;for(const node of nodes){try{node.stop();node.onended?.();node.disconnect();}catch{}}nodes.clear();}
 function track(node,end,chain=[],onEnd=()=>{}){let ended=false;nodes.add(node);node.onended=()=>{if(ended)return;ended=true;nodes.delete(node);node.disconnect();chain.forEach(n=>n.disconnect());onEnd();};node.stop(end);}
 function tone(ctx,start,hz,duration,volume,type='sine',endHz=hz){
  const source=ctx.createOscillator(),gain=ctx.createGain();source.type=type;
  source.frequency.setValueAtTime(hz,start);source.frequency.exponentialRampToValueAtTime(endHz,start+duration);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.009);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  source.connect(gain);gain.connect(ctx.destination);source.start(start);track(source,start+duration+.02,[gain]);
 }
 function noise(ctx,start,duration,volume,frequency){
  const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(random()*2-1);
  source.buffer=buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.003);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(start);track(source,start+duration+.02,[filter,gain]);
 }
 function synthesize(ctx,name){
  const t=ctx.currentTime+.015;
  if(name==='dice')for(let i=0;i<11;i++){const at=t+i*.047+(i%3)*.006;noise(ctx,at,.045,.18-i*.009,750+random()*2000);tone(ctx,at,280+random()*450,.035,.045,'triangle',120);}
  if(name==='gain')[523.25,659.25,783.99,1046.5].forEach((hz,i)=>tone(ctx,t+i*.11,hz,.25,i===3?.13:.1,'triangle'));
  if(name==='loss')[311.13,261.63,207.65,155.56].forEach((hz,i)=>tone(ctx,t+i*.16,hz,.32,.12,'triangle',hz*.95));

 }
 async function play(name,key){
  if(!EFFECTS.includes(name)||!enabled||!isVisible()||(key&&seen.has(key)))return false;
  const ctx=prepare();if(!ctx)return false;const stamp=generation;
  try{
   if(['suspended','interrupted'].includes(ctx.state))await ctx.resume();
   const recording=RECORDED_EFFECTS[name]?await loadRecording(ctx,name):null;
   if(ctx.state!=='running'||!enabled||!isVisible()||stamp!==generation||(key&&seen.has(key)))return false;
   if(key){seen.add(key);if(seen.size>200)seen.delete(seen.values().next().value);}
   if(recording){const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=recording;gain.gain.value=.7;source.connect(gain);gain.connect(ctx.destination);const start=ctx.currentTime+.015,id=++playbackId;try{onPlaybackStart(name,id);}catch{}try{source.start(start);track(source,start+recording.duration+.02,[gain],()=>{try{onPlaybackEnd(name,id);}catch{}});}catch(error){try{onPlaybackEnd(name,id);}catch{}source.disconnect();gain.disconnect();throw error;}}
   else synthesize(ctx,name);return true;
  }catch{return false;}
 }
 function setEnabled(value){enabled=Boolean(value);if(!enabled)stop();}
 return {play,unlock,stop,setEnabled};
}
export function activitySound(item){
 if(['quiz-result','purchase-quiz-result'].includes(item.type)&&typeof item.correct==='boolean')return item.correct?'gain':'loss';
 if(item.type==='concert')return 'concert';
 if(item.type==='bankruptcy')return 'loss';
 if(item.type==='history-event')return item.card.amount>=0?'gain':'loss';
 if(['prison-entry','prison-transfer'].includes(item.type))return 'prison';
 return null;
}
