import test from 'node:test';
import assert from 'node:assert/strict';
import {flatStepFrames,animateFlatStep,animateProjectedStep} from '../src/pawn-motion.js';
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

test('upright 3D pawns glide between projected tile centres instead of outside-edge positions',()=>{
 let animation;
 const pawn={animate:(frames,options)=>(animation={frames,options})};
 const cells={0:{getBoundingClientRect:()=>({left:20,top:30,width:70,height:40})},1:{getBoundingClientRect:()=>({left:65,top:65,width:90,height:50})}};
 const scene={querySelector:selector=>selector.includes('board-pawn-group')?pawn:cells[Number(selector.match(/index="(\d+)"/)[1])]};
 animateProjectedStep(scene,0,1,2);
 assert.equal(animation.frames[0].transform,'translate(-55px, -40px)');
 assert.equal(animation.options.duration,650);
 animation=null;animateProjectedStep(scene,0,1,2,{reducedMotion:true});assert.equal(animation,null);
 assert.equal(animateProjectedStep(null,0,1,2),null);
});
test('zoomed pawns compensate for camera scale without changing desktop movement',()=>{
 assert.equal(flatStepFrames({left:20,top:30},{left:100,top:70},2)[0].transform,'translate(-40px, -20px)');
});
