import test from 'node:test';
import assert from 'node:assert/strict';
import {fittedTitleSize} from '../src/board-type.js';
test('short titles keep their enlarged font size',()=>assert.equal(fittedTitleSize(19,80,40,[50,40],[19,19]),19));
test('long title lines shrink to fit their fixed width without splitting a word',()=>{const size=fittedTitleSize(19,80,40,[120,40],[19,19]);assert.ok(size<19);assert.ok(120*size/19<=80);});
test('three title lines also fit vertically and never enlarge the tile',()=>{const size=fittedTitleSize(19,80,40,[50,60,40],[20,20,20]);assert.ok(60*size/19<=40);assert.ok(size>0);});
test('projected titles also fit inside the sloping edges of a visible diamond',async()=>{
 const {fittedDiamondTitleSize}=await import('../src/board-type.js');
 for(const [widths,heights] of [[[90,60],[18,18]],[[110],[23]],[[40,70,35],[16,16,16]]]){
  const size=fittedDiamondTitleSize(20,90,48,widths,heights,100,76),scale=size/20;let y=-heights.reduce((a,b)=>a+b,0)/2;
  for(let i=0;i<widths.length;i++){const outer=Math.max(Math.abs(y),Math.abs(y+heights[i]));assert.ok((widths[i]/100+2*outer/76)*scale<=.94+.001);y+=heights[i];}
 }
});
