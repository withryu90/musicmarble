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

// Projected cells already expose screen-space rectangles, so the portrait stays upright.
export function animateProjectedStep(scene,fromIndex,toIndex,playerId,{reducedMotion=false}={}){
 if(reducedMotion||fromIndex===toIndex)return null;
 const from=scene?.querySelector(`.cell[data-index="${fromIndex}"]`),to=scene?.querySelector(`.cell[data-index="${toIndex}"]`);
 const pawn=scene?.querySelector(`.board-pawn-group[data-pawn-index="${toIndex}"] [data-player-id="${playerId}"]`);
 if(!from||!to||typeof pawn?.animate!=='function')return null;
 const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
 const center=r=>({left:r.left+r.width/2,top:r.top+r.height/2});
 return pawn.animate(flatStepFrames(center(a),center(b)),{duration:650,easing:'cubic-bezier(.22,.65,.3,1)'});
}
