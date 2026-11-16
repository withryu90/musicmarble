export function isInstalledWebApp(win){return Boolean(win.navigator?.standalone||win.matchMedia?.('(display-mode: standalone)').matches);}
export function isStandalone(win){return Boolean(win.navigator?.standalone||win.matchMedia?.('(display-mode: standalone)').matches||win.matchMedia?.('(display-mode: fullscreen)').matches);}
export function isFullscreen(doc){return Boolean(doc.fullscreenElement||doc.webkitFullscreenElement);}
export async function enterFullscreen(doc,win){
 if(isStandalone(win))return 'standalone';
 if(isFullscreen(doc))return 'entered';
 const element=doc.documentElement;
 try{
  if(element.requestFullscreen){await element.requestFullscreen({navigationUI:'hide'});return 'entered';}
  if(element.webkitRequestFullscreen){await element.webkitRequestFullscreen();return 'entered';}
  return 'unsupported';
 }catch{return 'blocked';}
}
export async function toggleFullscreen(doc,win){
 if(isFullscreen(doc)){
  try{if(doc.exitFullscreen)await doc.exitFullscreen();else if(doc.webkitExitFullscreen)await doc.webkitExitFullscreen();return 'exited';}catch{return 'blocked';}
 }
 return enterFullscreen(doc,win);
}

// Request native landscape only on a user gesture; unsupported webviews stay usable.
export async function requestLandscape(doc,win){
 if(win.innerWidth>win.innerHeight)return 'landscape';
 const orientation=win.screen?.orientation;
 if(typeof orientation?.lock!=='function')return 'unsupported';
 const fullscreen=await enterFullscreen(doc,win);
 if(fullscreen==='blocked'||fullscreen==='unsupported')return fullscreen;
 try{await orientation.lock('landscape');return 'requested';}catch{return 'blocked';}
}
