import {LISTENING_HINTS} from './listening-hints.js?v=e7c3587e1cc1';
export function createListeningPlayer({hints=LISTENING_HINTS,fetchFn=globalThis.fetch.bind(globalThis),createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),onChange=()=>{},onStart=()=>{},onEnd=()=>{}}={}){
 let context=null,source=null,playing=null,finish=null;const cache=new Map();
 const ctx=()=>context||(context=createContext());
 function status(id){return {state:cache.get(id)?.state||'idle',playing:playing===id};}
 async function prepare(id){
  const hint=hints[id];if(!hint)return false;
  if(cache.get(id)?.state==='ready')return true;
  if(cache.get(id)?.promise)return cache.get(id).promise;
  const entry={state:'loading'};cache.set(id,entry);onChange();
  entry.promise=(async()=>{try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   let response;try{response=await fetchFn(hint.src,{signal:controller.signal});if(!response.ok)throw Error('audio');entry.buffer=await ctx().decodeAudioData(await response.arrayBuffer());}finally{clearTimeout(timer);}
   if(!Number.isFinite(entry.buffer.duration)||entry.buffer.duration<=0||Math.abs(entry.buffer.duration-hint.duration)>.25)throw Error('audio duration mismatch');entry.state='ready';return true;
  }catch{entry.state='error';return false;}finally{delete entry.promise;onChange();}})();return entry.promise;
 }
 function unlock(){try{return ctx().resume();}catch{return Promise.reject(Error('소리를 준비하지 못했어요.'));}}
 function stop(){if(source){try{source.stop();}catch{}finish?.();}}
 function play(id){
  if(cache.get(id)?.state!=='ready'||context?.state!=='running')throw Error('음원을 재생하지 못했어요.');
  stop();const node=context.createBufferSource(),gain=context.createGain();node.buffer=cache.get(id).buffer;gain.gain.value=.65;node.connect(gain);gain.connect(context.destination);
  source=node;playing=id;let ended=false;
  const done=()=>{if(ended)return;ended=true;node.disconnect();gain.disconnect();if(source===node){source=null;playing=null;finish=null;onEnd(id);onChange();}};
  finish=done;node.onended=done;
  try{onStart(id);onChange();node.start(0);}catch(error){done();throw error;}
 }
 return {prepare,status,unlock,play,stop};
}
