import test from 'node:test';
import assert from 'node:assert/strict';
import {movementPath,boardTokenVisible,boardTokenAnchor} from '../src/movement.js';
test('dice movement visits each intermediate tile in order',()=>{
 for(let start=0;start<28;start++)for(let dice=1;dice<=6;dice++){
  const path=movementPath(start,dice,28);assert.equal(path.length,dice);
  path.forEach((position,i)=>assert.equal(position,(start+i+1)%28));
 }
});
test('passing start wraps one tile at a time',()=>{assert.deepEqual(movementPath(26,5,28),[27,0,1,2,3]);});
test('invalid movement cannot create a visual path',()=>{
 for(const args of [[-1,2,28],[28,2,28],[0,0,28],[0,7,28],[0,2,0],[0,1.5,28]])assert.throws(()=>movementPath(...args));
});

test('tokens appear only as each player starts moving and remain visible on returning to START',()=>{
 const players=Array.from({length:4},(_,id)=>({id,position:0}));
 const visible=(state,moving=null)=>players.filter(p=>boardTokenVisible(state,p,moving)).map(p=>p.id);
 const initial={players,turnNumber:0,turn:0,phase:'roll',dice:null};
 assert.deepEqual(visible(initial),[]);
 assert.deepEqual(visible(initial,0),[0]);
 assert.deepEqual(visible({...initial,phase:'action',dice:3}),[0]);
 for(let turn=1;turn<4;turn++){
  const state={...initial,turnNumber:turn,turn,dice:3};
  assert.deepEqual(visible(state),Array.from({length:turn},(_,i)=>i));
  assert.deepEqual(visible(state,turn),Array.from({length:turn+1},(_,i)=>i));
 }
 assert.deepEqual(visible({...initial,turnNumber:4,dice:3}),[0,1,2,3]);
});

test('START uses the centre of its own tile rather than the outer left-edge anchor',()=>{
 assert.deepEqual(boardTokenAnchor(1,1,8),{x:50,y:50});
 assert.deepEqual(boardTokenAnchor(1,2,8),{x:50,y:-60});
 assert.deepEqual(boardTokenAnchor(2,1,8),{x:-60,y:50});
 assert.deepEqual(boardTokenAnchor(2,8,8),{x:160,y:50});
 assert.deepEqual(boardTokenAnchor(8,2,8),{x:50,y:160});
});
