import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {WORKS} from '../src/data.js';
import {WORK_ARTWORK} from '../src/work-artwork.js';

test('every purchasable work has its own local, lightweight background illustration',()=>{
 assert.deepEqual(Object.keys(WORK_ARTWORK).sort(),WORKS.map(w=>w.id).sort());
 assert.equal(new Set(Object.values(WORK_ARTWORK)).size,WORKS.length);
 for(const work of WORKS){
  const url=new URL(WORK_ARTWORK[work.id]);
  const bytes=readFileSync(url);
  assert.equal(bytes.subarray(0,3).toString('hex'),'ffd8ff',work.id);
  assert.ok(statSync(url).size<300000,`${work.id} should stay small for mobile`);
 }
});
