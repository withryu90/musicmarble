import test from 'node:test';
import assert from 'node:assert/strict';
import {movementPath} from '../src/movement.js';
test('dice movement visits each intermediate tile in order',()=>{
 for(let start=0;start<24;start++)for(let dice=1;dice<=6;dice++){
  const path=movementPath(start,dice,24);assert.equal(path.length,dice);
  path.forEach((position,i)=>assert.equal(position,(start+i+1)%24));
 }
});
test('passing start wraps one tile at a time',()=>{assert.deepEqual(movementPath(22,5,24),[23,0,1,2,3]);});
test('invalid movement cannot create a visual path',()=>{
 for(const args of [[-1,2,24],[24,2,24],[0,0,24],[0,7,24],[0,2,0],[0,1.5,24]])assert.throws(()=>movementPath(...args));
});
