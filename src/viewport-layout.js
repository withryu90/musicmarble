import {unzoomedViewportHeight} from './mobile-board.js?v=9017ee1bf9e5';
// Keep the square/diamond proportions while sharing one viewport with controls and chat.
export function viewportSceneSize(width,height,seatWidth,flat=false){
 const availableHeight=Math.max(1,height-8);
 const availableWidth=Math.max(1,width-2*seatWidth-20);
 const sceneWidth=Math.max(1,Math.min(flat?availableWidth:width,availableHeight/(flat?1:.672)));
 return {width:sceneWidth,height:sceneWidth*(flat?1:.672)};
}
// A mobile rail occupies only the left side; all remaining space belongs to the board.
export function mobileSceneSize(width,height,railWidth,flat=false){
 const ratio=flat?1:.672;
 const sceneWidth=Math.max(1,Math.min(width-railWidth-8,(height-4)/ratio));
 return {width:sceneWidth,height:sceneWidth*ratio};
}
export function fitViewportBoard(root=document){
 const shell=root.querySelector('.game-shell[data-tab="board"]');if(!shell)return;
 const view=root.defaultView,mobile=shell.dataset.mobile==='true';if(view){const height=mobile?unzoomedViewportHeight(view.visualViewport?.height||view.innerHeight,view.visualViewport?.scale):view.visualViewport?.height||view.innerHeight;shell.style.height=`${height}px`;shell.style.setProperty('--game-viewport-height',`${height}px`);}
 const area=shell.querySelector('.board-area'),surround=area?.querySelector('.board-surround'),seat=area?.querySelector('.board-seat');
 if(!area||!surround)return;
 const rail=mobile?area.querySelector('.players-all')?.offsetWidth||0:0;
 const size=mobile?mobileSceneSize(surround.clientWidth,surround.clientHeight,rail,area.classList.contains('is-flat')):viewportSceneSize(surround.clientWidth,surround.clientHeight,seat?.offsetWidth||140,area.classList.contains('is-flat'));
 if(mobile){
  area.style.setProperty('--mobile-rail-width',`${rail}px`);
  // The composer floats below the left rail, never across the bottom-left tile.
  shell.style.setProperty('--mobile-composer-max',`${Math.max(100,(surround.clientWidth+rail-size.width)/2-8)}px`);
 }
 area.style.setProperty('--viewport-scene-width',`${size.width}px`);
 area.style.setProperty('--viewport-scene-height',`${size.height}px`);
 for(const item of area.querySelectorAll('.board-seat')){
  const card=item.querySelector('.board-player');
  if(mobile){item.style.setProperty('--mobile-bubble-max',`${Math.max(36,Math.min(96,(card?.offsetHeight||80)-16))}px`);}
  else{
   const available=Math.max(36,Math.floor(surround.clientHeight/2-(card?.offsetHeight||80)-16));
   item.style.setProperty('--desktop-bubble-max',`${Math.min(280,available)}px`);
  }
 }
 if(area.classList.contains('is-flat')){
  const board=area.querySelector('.board-scene').getBoundingClientRect();
  for(const item of area.querySelectorAll('.board-seat')){
   item.style.removeProperty('--flat-seat-inset');const r=item.getBoundingClientRect();
   const inset=mobile?0:item.className.includes('left')?Math.max(0,board.left-r.right-12):-Math.max(0,r.left-board.right-12);
   item.style.setProperty('--flat-seat-inset',`${Math.trunc(inset)}px`);
  }
 }
}

export function fitViewportDialog(root=document){
 const dialog=root.querySelector('#modal[open]');if(!dialog)return;
 const view=root.defaultView,body=dialog.querySelector('.modal-body');if(!view||!body)return;
 const mobile=root.querySelector('.game-shell[data-mobile="true"]');
 const visibleHeight=mobile?unzoomedViewportHeight(view.visualViewport?.height||view.innerHeight,view.visualViewport?.scale):view.visualViewport?.height||view.innerHeight;
 const height=Math.max(180,visibleHeight-16);
 dialog.style.setProperty('--modal-center-y',`${(view.visualViewport?.offsetTop||0)+visibleHeight/2}px`);
 dialog.style.setProperty('--modal-scale','1');body.style.maxHeight='none';body.style.overflow='visible';
 const natural=dialog.scrollHeight+4;
 // Short game dialogs fit as a whole; long reference lists retain readable text inside the dialog.
 if(natural<=height*1.55){dialog.style.setProperty('--modal-scale',String(Math.min(1,height/natural)));}
 else{
  const chrome=natural-body.scrollHeight;
  body.style.maxHeight=`${Math.max(80,height-chrome)}px`;body.style.overflow='auto';
 }
}
