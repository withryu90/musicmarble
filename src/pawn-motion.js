// Only animate the presentation: tile positions and turn results stay authoritative.
export function flatStepFrames(from,to){
 return [{transform:`translate(${from.left-to.left}px, ${from.top-to.top}px)`},{transform:'translate(0px, 0px)'}];
}
export function animateFlatStep(board,fromIndex,toIndex,playerId,{reducedMotion=false}={}){
 const from=board?.querySelector(`[data-index="${fromIndex}"]`),to=board?.querySelector(`[data-index="${toIndex}"]`);
 const pawn=to?.querySelector(`[data-player-id="${playerId}"]`);
 if(!from||!to||!pawn)return null;
 to.scrollIntoView({block:'nearest',inline:'nearest',behavior:reducedMotion?'auto':'smooth'});
 if(reducedMotion||fromIndex===toIndex||typeof pawn.animate!=='function')return null;
 return pawn.animate(flatStepFrames(from.getBoundingClientRect(),to.getBoundingClientRect()),{duration:650,easing:'cubic-bezier(.22,.65,.3,1)'});
}
