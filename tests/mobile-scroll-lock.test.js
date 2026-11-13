import test from 'node:test';
import assert from 'node:assert/strict';
import {canConsumeVerticalDrag,installMobileScrollLock} from '../src/mobile-scroll-lock.js';
const body={};
const style=e=>({overflowY:e.overflow||'visible'});
const panel=(top=0,parent=body)=>({nodeType:1,overflow:'auto',scrollTop:top,scrollHeight:400,clientHeight:100,parentElement:parent});
test('popup scrolling works inside its bounds but cannot pull the page past either edge',()=>{
 const p=panel();assert.equal(canConsumeVerticalDrag(p,12,body,style),false);
 assert.equal(canConsumeVerticalDrag(p,-12,body,style),true);
 p.scrollTop=80;assert.equal(canConsumeVerticalDrag(p,12,body,style),true);
 p.scrollTop=300;assert.equal(canConsumeVerticalDrag(p,-12,body,style),false);
 const outer=panel(40);p.parentElement=outer;assert.equal(canConsumeVerticalDrag(p,-12,body,style),true);
});
test('refresh prevention is active only in a mobile game and leaves pinch gestures alone',()=>{
 const handlers=new Map(),classes=new Set(),rootClasses=new Set();let prevented=0;
 const list=set=>({toggle:(k,on)=>on?set.add(k):set.delete(k)});
 const gameBody={classList:list(classes)};
 const doc={body:gameBody,documentElement:{classList:list(rootClasses)},addEventListener:(k,fn)=>handlers.set(k,fn),removeEventListener:k=>handlers.delete(k)};
 const moves=[],view={scrollY:100,scrollTo:(...args)=>moves.push(args),getComputedStyle:style};
 const lock=installMobileScrollLock(doc,view);
 const touch=(y,count=1)=>({target:gameBody,touches:Array.from({length:count},()=>({clientY:y})),cancelable:true,preventDefault:()=>prevented++});
 handlers.get('touchstart')(touch(10));handlers.get('touchmove')(touch(40));assert.equal(prevented,0);
 lock.setActive(true);assert.equal(classes.has('mobile-game-scroll-lock'),true);assert.equal(rootClasses.has('mobile-game-scroll-lock'),true);
 handlers.get('touchstart')(touch(10));handlers.get('touchmove')(touch(40));assert.equal(prevented,1);
 handlers.get('touchmove')(touch(60,2));assert.equal(prevented,1);
 const scroll=panel(50,gameBody),event=touch(80);event.target=scroll;
 handlers.get('touchstart')({...event,touches:[{clientY:60}]});handlers.get('touchmove')(event);assert.equal(prevented,1);
 lock.setActive(false);assert.equal(classes.size,0);assert.deepEqual(moves.at(-1),[0,100]);
 lock.destroy();assert.equal(handlers.size,0);
});

test('horizontal board scrolling can consume a diagonal drag without unlocking page refresh',async()=>{
 const {canConsumeHorizontalDrag}=await import('../src/mobile-scroll-lock.js');
 const viewport={scrollWidth:600,clientWidth:300,scrollLeft:100,parentElement:body};
 const getStyle=()=>({overflowX:'auto'});
 assert.equal(canConsumeHorizontalDrag(viewport,15,body,getStyle),true);
 viewport.scrollLeft=0;assert.equal(canConsumeHorizontalDrag(viewport,15,body,getStyle),false);
 assert.equal(canConsumeHorizontalDrag(viewport,-15,body,getStyle),true);
});
