export const BGM_SOURCE='./src/assets/audio/mozart-k525-chiptune.m4a?v=a3481377cc87';
export function createBgm({AudioClass=Audio,createContext=()=>{const C=window.AudioContext||window.webkitAudioContext;return C?new C():null;},onChange=()=>{},volume=.25}={}){
 let audio=null,context=null,gain=null,currentVolume=Math.min(1,Math.max(0,volume)),error=false,blocked=false,wanted=false;
 const status=()=>({playing:Boolean(audio&&!audio.paused&&!error&&(!context||context.state==='running')),volume:currentVolume,error,blocked});
 const update=()=>onChange(status());
 function prepare(){
  if(audio)return;
  audio=new AudioClass(BGM_SOURCE);audio.loop=true;audio.preload='none';
  if(typeof document!=='undefined'){audio.id='lobby-bgm-audio';audio.hidden=true;document.body.appendChild(audio);}
  for(const name of ['play','pause','error'])audio.addEventListener(name,()=>{if(name==='error')error=true;update();});
  setVolume(currentVolume);
 }
 function prepareContext(){
  if(context)return;
  try{context=createContext();if(context){gain=context.createGain();context.createMediaElementSource(audio).connect(gain);gain.connect(context.destination);audio.volume=1;setVolume(currentVolume);}}catch{context=null;gain=null;}
 }
 function setVolume(value){currentVolume=Math.min(1,Math.max(0,Number(value)||0));if(gain)gain.gain.value=currentVolume;else if(audio)audio.volume=currentVolume;update();}
 async function play({gesture=true}={}){
  prepare();wanted=true;error=false;blocked=false;
  if(gesture)prepareContext();
  try{
   // Invoke both APIs inside the user gesture, before awaiting either promise.
   const resume=['suspended','interrupted'].includes(context?.state)?context.resume():Promise.resolve();
   await Promise.all([resume,audio.play()]);
   if(!wanted)audio.pause();
   update();return wanted;
  }catch(e){blocked=e?.name==='NotAllowedError';error=!blocked;update();return false;}
 }
 function pause(){wanted=false;audio?.pause();update();}
 async function toggle(){if(status().playing){pause();return;}await play();}
 return {toggle,play,pause,setVolume,status};
}
