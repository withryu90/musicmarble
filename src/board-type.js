// Keep the largest possible title within its own fixed, centred title box.
export function fittedTitleSize(fontSize,width,height,lineWidths,lineHeights){
 const widest=Math.max(1,...lineWidths),tallest=Math.max(1,lineHeights.reduce((n,h)=>n+h,0));
 const ratio=Math.min(1,width/widest,height/tallest);
 return ratio<1?Math.floor(fontSize*ratio*.96*100)/100:fontSize;
}
export function fittedDiamondTitleSize(fontSize,width,height,lineWidths,lineHeights,surfaceWidth,surfaceHeight){
 let ratio=fittedTitleSize(fontSize,width,height,lineWidths,lineHeights)/fontSize;
 let y=-lineHeights.reduce((sum,h)=>sum+h,0)/2;
 for(let i=0;i<lineWidths.length;i++){
  const h=lineHeights[i],outerY=Math.max(Math.abs(y),Math.abs(y+h));
  const extent=lineWidths[i]/surfaceWidth+2*outerY/surfaceHeight;
  if(extent>.94)ratio=Math.min(ratio,.94/extent*.97);
  y+=h;
 }
 return Math.floor(fontSize*ratio*100)/100;
}
function fitTitle(title,surface){
 title.style.removeProperty('--fit-title-size');
 const lines=[...title.querySelectorAll('.tile-title-line')];if(!lines.length||!title.clientWidth||!title.clientHeight)return;
 const font=parseFloat(getComputedStyle(title).fontSize),widths=lines.map(l=>l.scrollWidth),heights=lines.map(l=>l.scrollHeight);
 const size=surface?fittedDiamondTitleSize(font,title.clientWidth,title.clientHeight,widths,heights,surface.width,surface.height):fittedTitleSize(font,title.clientWidth,title.clientHeight,widths,heights);
 if(size<font)title.style.setProperty('--fit-title-size',`${size}px`);
}
// Project a board anchor, while keeping the portrait in an untransformed layer.
export function projectedPawnAnchor(rect,width,height,x,y){
 const dx=(x-50)/100*width,dy=(y-50)/100*height,diagonal=Math.SQRT1_2;
 return {x:rect.left+rect.width/2+(dx-dy)*diagonal,y:rect.top+rect.height/2+(dx+dy)*diagonal*Math.cos(40*Math.PI/180)};
}
// The nearest corner of each seat must remain outside the diamond, including its bubble.
export function diamondSeatOverlap(board,scene,seats,rowHeight,side,clearance=24){
 if(!seats.length||!board.width||!board.height)return 0;
 const center=board.left+board.width/2;
 const available=seats.map(seat=>{
  const left=seat.left-clearance,right=seat.right+clearance;
  if(right<board.left||left>board.right)return rowHeight;
  const nearest=Math.max(left,Math.min(center,right));
  const slope=board.height*Math.abs(nearest-center)/board.width;
  return side==='top'?board.top-scene.top+slope-clearance:scene.bottom-board.bottom+slope-clearance;
 });
 return Math.max(0,Math.min(rowHeight,...available));
}
export function diamondSeatInset(board,seat,side,clearance=24){
 if(!board.width||!board.height)return 0;
 const center=board.left+board.width/2;
 const depth=side==='top'?seat.bottom+clearance-board.top:board.bottom-seat.top+clearance;
 if(depth<0||depth>=board.height/2)return 0;
 const half=depth*board.width/board.height;
 if(seat.right<center)return Math.max(0,center-half-clearance-seat.right);
 if(seat.left>center)return -Math.max(0,seat.left-center-half-clearance);
 return 0;
}
function packBoardSeats(root){
 const area=root.querySelector('.board-area.is-3d');if(!area)return;
 const scene=area.querySelector('.board-scene'),frame=area.querySelector('.board-grid-frame');
 if(!scene||!frame)return;
 for(const seat of area.querySelectorAll('.board-seat'))seat.style.removeProperty('--seat-inset');
 const sceneRect=scene.getBoundingClientRect(),boardRect=frame.getBoundingClientRect();
 for(const side of ['top','bottom']){
  const row=area.querySelector(`.players-${side}`);if(!row)continue;
  const seats=[...row.querySelectorAll('.board-seat')].map(seat=>seat.getBoundingClientRect());
  const overlap=diamondSeatOverlap(boardRect,sceneRect,seats,row.getBoundingClientRect().height,side);
  area.style.setProperty(`--seat-overlap-${side}`,`${Math.floor(overlap)}px`);
 }
 const packedBoard=frame.getBoundingClientRect();
 for(const side of ['top','bottom'])for(const seat of area.querySelectorAll(`.players-${side} .board-seat`)){
  const inset=diamondSeatInset(packedBoard,seat.getBoundingClientRect(),side);
  seat.style.setProperty('--seat-inset',`${Math.trunc(inset)}px`);
 }
}
export function fitBoardTitles(root=document){
 packBoardSeats(root);
 const layer=root.querySelector('.board-labels');
 if(layer){
  const origin=layer.getBoundingClientRect();
  for(const label of layer.querySelectorAll('.board-label')){
   const cell=root.querySelector(`.board>.cell[data-index="${label.dataset.labelIndex}"]`);if(!cell)continue;
   const r=cell.getBoundingClientRect(),title=label.querySelector('strong'),lines=title.querySelectorAll('.tile-title-line');
   label.style.left=`${r.left+r.width/2-origin.left}px`;label.style.top=`${r.top+r.height/2-origin.top}px`;
   label.style.setProperty('--label-width',`${r.width}px`);label.style.setProperty('--label-height',`${r.height}px`);
   label.style.setProperty('--title-base',`${r.height*(lines.length===1?.28:.22)}px`);
   fitTitle(title,r);
   for(const meta of label.querySelectorAll('.cell-top,.cell-price')){
    meta.style.fontSize='';const font=parseFloat(getComputedStyle(meta).fontSize),textWidth=meta.scrollWidth;
    const maxWidth=r.width*.7;let ratio=Math.min(1,maxWidth/Math.max(1,textWidth));
    // Metadata sits 30% above/below the title, within the same visible diamond.
    ratio=Math.min(ratio,.35/Math.max(.001,textWidth/r.width+meta.scrollHeight/r.height));
    if(ratio<1)meta.style.fontSize=`${font*ratio*.97}px`;
   }
  }
  layer.dataset.ready='true';
 }
 const pawns=root.querySelector('.board-pawns');
 if(pawns){
  const origin=pawns.getBoundingClientRect();
  for(const group of pawns.querySelectorAll('.board-pawn-group')){
   const cell=root.querySelector(`.board>.cell[data-index="${group.dataset.pawnIndex}"]`);if(!cell)continue;
   const anchor=projectedPawnAnchor(cell.getBoundingClientRect(),cell.offsetWidth,cell.offsetHeight,Number(group.dataset.anchorX),Number(group.dataset.anchorY));
   group.style.left=`${anchor.x-origin.left}px`;group.style.top=`${anchor.y-origin.top}px`;
  }
  pawns.dataset.ready='true';
 }
 for(const title of root.querySelectorAll('.board-area.is-flat .board .tile-copy strong'))fitTitle(title);
}
