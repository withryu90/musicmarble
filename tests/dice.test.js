import test from 'node:test';
import assert from 'node:assert/strict';
import {diceCube} from '../src/dice.js';
import {movementPath} from '../src/movement.js';
for(let result=1;result<=6;result++)test(`upper face shows the ${result} steps actually moved`,()=>{
 const html=diceCube(result);
 const faces=[...html.matchAll(/data-die-face="([^"]+)" data-value="(\d)">([\s\S]*?)<\/g>/g)];
 const top=faces.find(face=>face[1]==='top');
 assert.equal(Number(top[2]),result);
 assert.equal((top[3].match(/<circle /g)||[]).length,result);
 assert.equal(movementPath(0,result,28).length,Number(top[2]));
 assert.ok(html.includes(`aria-label="주사위 눈 ${result}"`));
 const values=faces.map(face=>Number(face[2]));
 assert.equal(new Set(values).size,3);
 for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++)assert.notEqual(values[i]+values[j],7);
});
