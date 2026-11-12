import test from 'node:test';
import assert from 'node:assert/strict';
import {flatStepFrames,animateFlatStep} from '../src/pawn-motion.js';
test('flat steps animate from the previous cell in all four directions',()=>{
 for(const [left,top,expected] of [[-80,0,'translate(-80px, 0px)'],[80,0,'translate(80px, 0px)'],[0,-80,'translate(0px, -80px)'],[0,80,'translate(0px, 80px)']]){
  assert.deepEqual(flatStepFrames({left:100+left,top:100+top},{left:100,top:100}),[{transform:expected},{transform:'translate(0px, 0px)'}]);
 }
});
test('the moving pawn follows the cell delta and stays visible without changing game state',()=>{
 let animation,scroll;const pawn={animate:(frames,options)=>(animation={frames,options})};
 const from={getBoundingClientRect:()=>({left:10,top:20})},to={querySelector:s=>s==='[data-player-id="2"]'?pawn:null,getBoundingClientRect:()=>({left:90,top:20}),scrollIntoView:options=>scroll=options};
 const board={querySelector:s=>s==='[data-index="0"]'?from:s==='[data-index="1"]'?to:null};
 animateFlatStep(board,0,1,2);assert.equal(animation.frames[0].transform,'translate(-80px, 0px)');assert.equal(animation.options.duration,650);assert.equal(scroll.inline,'nearest');
 animation=null;animateFlatStep(board,0,1,2,{reducedMotion:true});assert.equal(animation,null);assert.equal(scroll.behavior,'auto');assert.equal(animateFlatStep(null,0,1,2),null);
});
