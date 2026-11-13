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

test('upright pawn anchors follow the projected tile centre and outward edges',async()=>{
 const {projectedPawnAnchor}=await import('../src/board-type.js'),rect={left:20,top:30,width:100,height:76};
 assert.deepEqual(projectedPawnAnchor(rect,70,70,50,50),{x:70,y:68});
 const left=projectedPawnAnchor(rect,70,70,-60,50),right=projectedPawnAnchor(rect,70,70,160,50);
 assert.ok(left.x<70&&left.y<68);assert.ok(right.x>70&&right.y>68);
 assert.ok(Math.abs(left.x+right.x-140)<.001);assert.ok(Math.abs(left.y+right.y-136)<.001);
});


test('seat packing uses empty diamond corners while keeping the bubble clear of sloping edges',async()=>{
 const {diamondSeatOverlap}=await import('../src/board-type.js');
 const scene={left:0,top:0,right:1200,bottom:820},board={left:60,top:10,right:1140,bottom:810,width:1080,height:800};
 const seats=[{left:0,right:242},{left:958,right:1200}];
 assert.equal(diamondSeatOverlap(board,scene,seats,200,'top'),200);
 assert.equal(diamondSeatOverlap(board,scene,seats,160,'bottom'),160);
 const tight=diamondSeatOverlap(board,scene,[{left:0,right:510}],200,'top');
 assert.ok(tight>0&&tight<40);
 assert.equal(diamondSeatOverlap(board,scene,[{left:350,right:850}],200,'top'),0);
 assert.equal(diamondSeatOverlap(board,scene,[],0,'bottom'),0);
});
test('narrow landscape seats cannot be pushed across the diamond tip',async()=>{
 const {diamondSeatOverlap}=await import('../src/board-type.js');
 const scene={top:0,bottom:450},board={left:40,top:10,right:627,bottom:440,width:587,height:430};
 assert.equal(diamondSeatOverlap(board,scene,[{left:0,right:327},{left:339,right:667}],150,'top'),0);
});

test('horizontal seat packing approaches the diamond without entering its sloped edge',async()=>{
 const {diamondSeatInset}=await import('../src/board-type.js');
 const board={left:60,top:10,right:1140,bottom:810,width:1080,height:800};
 const left={left:0,right:242,top:0,bottom:200},right={left:958,right:1200,top:0,bottom:200};
 const inset=diamondSeatInset(board,left,'top');
 assert.ok(inset>0);assert.equal(diamondSeatInset(board,right,'top'),-inset);
 assert.equal(diamondSeatInset(board,{...left,left:350,right:850},'top'),0);
 assert.equal(diamondSeatInset(board,{...left,bottom:390},'top'),0);
});

test('paired web seats stay symmetric when one card or chat bubble is taller',async()=>{
 const {balancedDiamondInsets,diamondSeatInset}=await import('../src/board-type.js');
 const board={left:80,right:920,top:100,bottom:700,width:840,height:600};
 const seats=[{left:0,right:180,top:0,bottom:200},{left:820,right:1000,top:0,bottom:120}];
 const [left,right]=balancedDiamondInsets(board,seats,'top');
 assert.equal(left,-right);
 assert.ok(left<=diamondSeatInset(board,seats[0],'top'));
 assert.ok(-right<=-diamondSeatInset(board,seats[1],'top'));
 assert.deepEqual(balancedDiamondInsets(board,[], 'top'),[]);
});
