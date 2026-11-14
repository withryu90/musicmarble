import {LISTENING_HINTS} from './listening-hints.js?v=1680421d01b6';
export function createListeningPlayer({hints=LISTENING_HINTS,fetchFn=globalThis.fetch.bind(globalThis),createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),onChange=()=>{},onStart=()=>{},onEnd=()=>{}}={}){
 let context=null,source=null,playing=null,finish=null;const cache=new Map();
 const ctx=()=>context||(context=createContext());
 function status(id){return {state:cache.get(id)?.state||'idle',playing:playing===id,paused:!!cache.get(id)?.paused,offset:cache.get(id)?.offset||0};}
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
 function halt(reason){if(source){const node=source;finish?.(reason);try{node.stop();}catch{}}}
 function pause(){halt('pause');}
 function stop(){halt('stop');for(const entry of cache.values()){entry.offset=0;entry.paused=false;}}
 function play(id,{resume=false,offset=0}={}){
  if(cache.get(id)?.state!=='ready'||context?.state!=='running')throw Error('음원을 재생하지 못했어요.');
  const entry=cache.get(id),from=resume?(entry.paused?entry.offset:offset):0;
  if(!Number.isFinite(from)||from<0||from>=entry.buffer.duration)throw Error('재생할 구간이 남아 있지 않아요.');
  stop();const node=context.createBufferSource(),gain=context.createGain();node.buffer=entry.buffer;gain.gain.value=hints[id].original?1:.65;node.connect(gain);gain.connect(context.destination);
  const started=context.currentTime||0;entry.offset=from;entry.paused=false;
  source=node;playing=id;let ended=false;
  const done=(reason='ended')=>{if(ended)return;ended=true;node.disconnect();gain.disconnect();if(source===node){entry.offset=reason==='pause'?Math.min(entry.buffer.duration,from+Math.max(0,(context.currentTime||0)-started)):reason==='ended'?entry.buffer.duration:0;entry.paused=reason==='pause'&&entry.offset<entry.buffer.duration;source=null;playing=null;finish=null;onEnd(id);onChange();}};
  finish=done;node.onended=()=>done();
  try{onStart(id);onChange();if(from)node.start(0,from);else node.start(0);}catch(error){done('stop');throw error;}
 }
 return {prepare,status,unlock,play,pause,stop};
}
