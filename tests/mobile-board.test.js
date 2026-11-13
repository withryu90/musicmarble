import test from 'node:test';
import assert from 'node:assert/strict';
import {isMobileGameEnvironment,unzoomedViewportHeight,zoomAt,constrainedCamera,MobileBoardCamera} from '../src/mobile-board.js';
const view={innerWidth:844,innerHeight:390,matchMedia:()=>({matches:false})};
test('mobile default is limited to mobile/touch devices; a narrow desktop remains desktop',()=>{
 assert.equal(isMobileGameEnvironment(view,{userAgent:'iPhone Safari'}),true);
 assert.equal(isMobileGameEnvironment(view,{userAgent:'Android Chrome'}),true);
 assert.equal(isMobileGameEnvironment(view,{userAgent:'Macintosh Safari',platform:'MacIntel',maxTouchPoints:5}),true);
 assert.equal(isMobileGameEnvironment(view,{userAgent:'Macintosh Safari',platform:'MacIntel',maxTouchPoints:0}),false);
 assert.equal(isMobileGameEnvironment({...view,innerWidth:667},{userAgent:'Windows Chrome'}),false);
});
test('native pinch keeps game height stable instead of rebuilding a smaller board',()=>{
 assert.equal(unzoomedViewportHeight(390,1),390);
 assert.equal(unzoomedViewportHeight(195,2),390);
 assert.equal(unzoomedViewportHeight(130,3),390);
});
test('pinch zoom preserves the touched point and clamps the scale and pan',()=>{
 const start={scale:1,x:0,y:0},focus={x:40,y:-20},next=zoomAt(start,2,focus);
 assert.deepEqual(next,{scale:2,x:-40,y:20});
 assert.equal(next.x+40*next.scale,focus.x);assert.equal(next.y-20*next.scale,focus.y);
 assert.equal(zoomAt(start,10,focus).scale,3);
 assert.deepEqual(constrainedCamera({scale:1,x:900,y:-900},200,200),{scale:1,x:0,y:-0});
 assert.deepEqual(constrainedCamera({scale:2,x:900,y:-900},200,150),{scale:2,x:100,y:-75});
});
test('two-finger zoom and one-finger pan change only camera transform and preserve tap clicks',()=>{
 const handlers=new Map(),props=new Map();
 const scene={offsetWidth:200,offsetHeight:200,style:{setProperty:(k,v)=>props.set(k,v)},parentElement:{getBoundingClientRect:()=>({left:0,top:0,width:400,height:300})},addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:k=>handlers.delete(k),setPointerCapture:()=>{}};
 const camera=new MobileBoardCamera();camera.bind(scene);
 const fire=(type,id,x,y)=>handlers.get(type)({pointerId:id,button:0,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
 fire('pointerdown',1,150,150);fire('pointerdown',2,250,150);
 fire('pointermove',1,100,150);fire('pointermove',2,300,150);
 assert.equal(camera.state.scale,2);assert.equal(camera.state.x,0);assert.equal(props.get('--board-zoom'),2);
 fire('pointerup',1,100,150);fire('pointerup',2,300,150);
 fire('pointerdown',3,200,150);fire('pointermove',3,230,180);fire('pointerup',3,230,180);
 assert.equal(camera.state.x,30);assert.equal(camera.state.y,30);
 let cancelled=false;handlers.get('click')({preventDefault(){cancelled=true},stopPropagation(){}});assert.equal(cancelled,true);
 fire('pointerdown',4,200,150);fire('pointerup',4,200,150);cancelled=false;handlers.get('click')({preventDefault(){cancelled=true},stopPropagation(){}});assert.equal(cancelled,false);
 camera.reset();assert.equal(camera.state.scale,1);camera.bind(null);assert.equal(handlers.size,0);
});

test('explicit mobile links select the mobile layout even with desktop-mode browser identification',()=>{
 const desktop={userAgent:'Macintosh Safari',platform:'MacIntel',maxTouchPoints:0};
 assert.equal(isMobileGameEnvironment({...view,location:{search:'?v=latest&layout=mobile'}},desktop),true);
 assert.equal(isMobileGameEnvironment({...view,location:{search:'?v=latest'}},desktop),false);
 assert.equal(isMobileGameEnvironment(view,{userAgent:'Macintosh Safari',platform:'MacIntel',maxTouchPoints:1}),true);
});

test('scrollable zoom creates native overflow and keeps the scrolled position across rebinding',()=>{
 const handlers=new Map(),props=new Map(),space={style:{}};
 const viewport={clientWidth:450,clientHeight:300,scrollLeft:0,scrollTop:0,get scrollWidth(){return Number.parseFloat(space.style.width)||450;},get scrollHeight(){return Number.parseFloat(space.style.height)||300;},addEventListener:(k,fn)=>handlers.set(k,fn),removeEventListener:k=>handlers.delete(k),getBoundingClientRect:()=>({left:0,top:0,width:450,height:300})};
 const scene={offsetWidth:300,offsetHeight:300,parentElement:space,closest:()=>viewport,style:{setProperty:(k,v)=>props.set(k,v)}};
 const camera=new MobileBoardCamera();camera.bind(scene);camera.zoom(2);
 assert.equal(viewport.scrollWidth,600);assert.equal(viewport.scrollHeight,600);
 assert.equal(viewport.scrollLeft,75);assert.equal(viewport.scrollTop,150);
 viewport.scrollLeft=150;viewport.scrollTop=300;handlers.get('scroll')();
 camera.bind(scene);assert.equal(viewport.scrollLeft,150);assert.equal(viewport.scrollTop,300);
 camera.reset();assert.equal(viewport.scrollWidth,450);assert.equal(viewport.scrollHeight,300);assert.equal(viewport.scrollLeft,0);assert.equal(viewport.scrollTop,0);
 camera.bind(null);assert.equal(handlers.size,0);
});
