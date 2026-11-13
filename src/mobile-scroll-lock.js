// Contain touch scrolling inside the game instead of chaining to browser refresh.
export function canConsumeVerticalDrag(target,deltaY,body,getStyle){
 for(let el=target?.nodeType===3?target.parentElement:target;el&&el!==body;el=el.parentElement){
  if(!/^(auto|scroll)$/.test(getStyle(el).overflowY))continue;
  const max=el.scrollHeight-el.clientHeight;
  if(max>1&&(deltaY>0?el.scrollTop>0:el.scrollTop<max-1))return true;
 }
 return false;
}
export function canConsumeHorizontalDrag(target,deltaX,body,getStyle){
 for(let el=target?.nodeType===3?target.parentElement:target;el&&el!==body;el=el.parentElement){
  if(!/^(auto|scroll)$/.test(getStyle(el).overflowX))continue;
  const max=el.scrollWidth-el.clientWidth;
  if(max>1&&(deltaX>0?el.scrollLeft>0:el.scrollLeft<max-1))return true;
 }
 return false;
}
export function installMobileScrollLock(doc=document,view=window){
 let active=false,lastY=null,lastX=null,previousY=0;
 const start=e=>{lastY=e.touches.length===1?e.touches[0].clientY:null;lastX=e.touches.length===1?(e.touches[0].clientX||0):null;};
 const move=e=>{
  if(!active||e.touches.length!==1){lastY=null;return;}
  const y=e.touches[0].clientY,x=e.touches[0].clientX||0,delta=lastY===null?0:y-lastY,dx=lastX===null?0:x-lastX;lastY=y;lastX=x;
  if(Math.abs(dx)>Math.abs(delta)&&canConsumeHorizontalDrag(e.target,dx,doc.body,el=>view.getComputedStyle(el)))return;
  if(Math.abs(delta)<2)return;
  if(!canConsumeVerticalDrag(e.target,delta,doc.body,el=>view.getComputedStyle(el))&&e.cancelable)e.preventDefault();
 };
 const end=()=>{lastY=null;};
 doc.addEventListener('touchstart',start,{passive:true});
 doc.addEventListener('touchmove',move,{passive:false});
 doc.addEventListener('touchend',end,{passive:true});
 doc.addEventListener('touchcancel',end,{passive:true});
 return {
  setActive(next){
   next=Boolean(next);if(next===active)return;
   active=next;lastY=null;
   if(active){previousY=view.scrollY||0;view.scrollTo(0,0);}
   doc.documentElement.classList.toggle('mobile-game-scroll-lock',active);
   doc.body.classList.toggle('mobile-game-scroll-lock',active);
   if(!active)view.scrollTo(0,previousY);
  },
  destroy(){this.setActive(false);doc.removeEventListener('touchstart',start);doc.removeEventListener('touchmove',move);doc.removeEventListener('touchend',end);doc.removeEventListener('touchcancel',end);}
 };
}
