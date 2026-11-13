// One unlocked media element handles both scenes. Only prison recordings suspend it.
export function createMusicDirector({bgm,lobbySource,gameSource,isVisible=()=>true,lobbyVolume=.25,gameVolume=.1}){
 let game=false,enabled=true;const prison=new Set();
 function sync(options={}){
  if(options.game!==undefined)game=Boolean(options.game);
  if(options.enabled!==undefined)enabled=Boolean(options.enabled);
  const source=game?gameSource:lobbySource,volume=game?gameVolume:lobbyVolume;
  if(bgm.status().source!==source)bgm.setSource(source);
  if(bgm.status().volume!==volume)bgm.setVolume(volume);
  if(!enabled||!isVisible()||(game&&prison.size)){bgm.pause();return;}
  if(!bgm.status().playing)void bgm.play({gesture:Boolean(options.gesture)});
 }
 function effectStarted(name,id){if(name!=='prison')return;prison.add(id);sync();}
 function effectEnded(name,id){if(name!=='prison')return;prison.delete(id);sync();}
 return {sync,effectStarted,effectEnded};
}
