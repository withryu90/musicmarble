// Original, short synthesized effects; no recordings or external audio requests.
export const EFFECTS=['dice','gain','loss','applause','prison'];
export function createSoundEffects({createContext=()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;return C?new C():null;},isVisible=()=>typeof document==='undefined'||!document.hidden,random=Math.random}={}){
 let context=null,enabled=true,generation=0;const nodes=new Set(),seen=new Set();
 function prepare(){if(!enabled)return null;try{context??=createContext();return context;}catch{return null;}}
 function unlock(){const ctx=prepare();if(ctx?.state==='suspended')void ctx.resume().catch(()=>{});}
 function stop(){generation++;for(const node of nodes){try{node.stop();node.disconnect();}catch{}}nodes.clear();}
 function track(node,end,chain=[]){nodes.add(node);node.onended=()=>{nodes.delete(node);node.disconnect();chain.forEach(n=>n.disconnect());};node.stop(end);}
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
  if(name==='prison')[146.83,110,55].forEach((hz,i)=>{const at=t+i*.25;tone(ctx,at,hz,i===2?.65:.24,.2,'sine',hz*.55);tone(ctx,at,hz*1.49,.22,.05,'triangle',hz*.8);noise(ctx,at,.13,.14,180);});
  if(name==='applause')for(let i=0;i<34;i++){const offset=i*.045+random()*.055,fade=Math.min(1,(1.8-offset)/.45);noise(ctx,t+offset,.065+random()*.07,(.12+random()*.1)*fade,1000+random()*1600);}
 }
 async function play(name,key){
  if(!EFFECTS.includes(name)||!enabled||!isVisible()||(key&&seen.has(key)))return false;
  const ctx=prepare();if(!ctx)return false;const stamp=generation;
  try{
   if(ctx.state==='suspended')await ctx.resume();
   if(ctx.state!=='running'||!enabled||!isVisible()||stamp!==generation||(key&&seen.has(key)))return false;
   if(key){seen.add(key);if(seen.size>200)seen.delete(seen.values().next().value);}
   synthesize(ctx,name);return true;
  }catch{return false;}
 }
 function setEnabled(value){enabled=Boolean(value);if(!enabled)stop();}
 return {play,unlock,stop,setEnabled};
}
export function activitySound(item){
 if(item.type==='history-event')return item.card.amount>=0?'gain':'loss';
 if(['prison-entry','prison-transfer'].includes(item.type))return 'prison';
 return null;
}
