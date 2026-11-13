import test from 'node:test';
import assert from 'node:assert/strict';
import {viewportSceneSize} from '../src/viewport-layout.js';
test('flat and diamond scenes fit their viewport without changing board proportions',()=>{
 for(const [width,height,seat] of [[1260,540,180],[824,200,168],[647,185,133]])for(const flat of [false,true]){
  const s=viewportSceneSize(width,height,seat,flat);
  assert.ok(s.height<=height-8+.001);assert.ok(s.width<=width);
  if(flat)assert.ok(s.width<=width-2*seat-20);
  assert.ok(Math.abs(s.height/s.width-(flat?1:.672))<.001);
 }
});

test('mobile board uses space to the right of one rail in either view',async()=>{
 const {mobileSceneSize}=await import('../src/viewport-layout.js');
 for(const [w,h,rail] of [[836,290,190],[659,275,154],[1016,650,190]])for(const flat of [true,false]){
  const s=mobileSceneSize(w,h,rail,flat);
  assert.ok(s.width<=w-rail-8+.001);
  assert.ok(s.height<=h-4+.001);
  assert.ok(Math.abs(s.height/s.width-(flat?1:.672))<.001);
 }
});
