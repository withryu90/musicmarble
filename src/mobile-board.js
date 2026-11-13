export function isMobileGameEnvironment(view=window,nav=navigator){
 // An explicit mobile link also works when Safari requests a desktop user agent.
 if(new URLSearchParams(view.location?.search||'').get('layout')==='mobile')return true;
 if(nav.userAgentData?.mobile||/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent||''))return true;
 if(/^Mac/.test(nav.platform||'')&&nav.maxTouchPoints>0)return true;
 return Boolean(view.matchMedia?.('(any-pointer:coarse)').matches&&Math.max(view.innerWidth,view.innerHeight)<=1100);
}
// Native pinch zoom changes the visual viewport, not the intended game layout.
export function unzoomedViewportHeight(height,scale=1){return Math.round(height*Math.max(1,scale||1));}
export function zoomAt(state,nextScale,point){
 const scale=Math.max(1,Math.min(3,nextScale)),ratio=scale/state.scale;
 return {scale,x:point.x-(point.x-state.x)*ratio,y:point.y-(point.y-state.y)*ratio};
}
export function constrainedCamera(state,width,height){
 const x=width*(state.scale-1)/2,y=height*(state.scale-1)/2;
 return {...state,x:Math.max(-x,Math.min(x,state.x)),y:Math.max(-y,Math.min(y,state.y))};
}
export class MobileBoardCamera{
 constructor(onChange=()=>{}){this.state={scale:1,x:0,y:0};this.onChange=onChange;this.cleanup=()=>{};}
 bind(scene){
  this.cleanup();this.scene=scene;if(!scene)return;
  const pointers=new Map();let gesture=null,moved=false,origin=null;
  const point=e=>({x:e.clientX,y:e.clientY}),pair=()=>{const [a,b]=[...pointers.values()];return {distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};};
  const local=p=>{const r=scene.parentElement.getBoundingClientRect();return {x:p.x-r.left-r.width/2,y:p.y-r.top-r.height/2};};
  const down=e=>{
   if(e.button!==undefined&&e.button!==0)return;
   if(!pointers.size)moved=false;
   pointers.set(e.pointerId,point(e));
   if(pointers.size===2){const p=pair();gesture={...p,start:{...this.state},focus:local(p.mid)};moved=true;e.preventDefault();}
   else origin={point:point(e),start:{...this.state}};
  };
  const move=e=>{
   if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,point(e));
   if(pointers.size>=2&&gesture){
    const p=pair(),next=zoomAt(gesture.start,gesture.start.scale*p.distance/gesture.distance,gesture.focus);
    next.x+=p.mid.x-gesture.mid.x;next.y+=p.mid.y-gesture.mid.y;this.set(next);moved=true;e.preventDefault();
   }else if(origin&&this.state.scale>1){
    const dx=e.clientX-origin.point.x,dy=e.clientY-origin.point.y;
    if(moved||Math.hypot(dx,dy)>5){moved=true;scene.setPointerCapture?.(e.pointerId);this.set({...origin.start,x:origin.start.x+dx,y:origin.start.y+dy});e.preventDefault();}
   }
  };
  const up=e=>{pointers.delete(e.pointerId);gesture=null;if(pointers.size===1)origin={point:[...pointers.values()][0],start:{...this.state}};else origin=null;};
  const click=e=>{if(moved){e.preventDefault();e.stopPropagation();}};
  scene.addEventListener('pointerdown',down);scene.addEventListener('pointermove',move,{passive:false});
  scene.addEventListener('pointerup',up);scene.addEventListener('pointercancel',up);scene.addEventListener('click',click,true);
  this.cleanup=()=>{scene.removeEventListener('pointerdown',down);scene.removeEventListener('pointermove',move);scene.removeEventListener('pointerup',up);scene.removeEventListener('pointercancel',up);scene.removeEventListener('click',click,true);};
  this.apply();
 }
 set(state){this.state=constrainedCamera(state,this.scene?.offsetWidth||1,this.scene?.offsetHeight||1);this.apply();}
 zoom(factor){this.set(zoomAt(this.state,this.state.scale*factor,{x:0,y:0}));}
 reset(){this.state={scale:1,x:0,y:0};this.apply();}
 apply(){
  if(this.scene){this.state=constrainedCamera(this.state,this.scene.offsetWidth,this.scene.offsetHeight);this.scene.style.setProperty('--board-zoom',this.state.scale);this.scene.style.setProperty('--board-pan-x',`${this.state.x}px`);this.scene.style.setProperty('--board-pan-y',`${this.state.y}px`);}
  this.onChange(this.state);
 }
}
