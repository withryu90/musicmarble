import test from 'node:test';
import assert from 'node:assert/strict';
import {fittedTitleSize} from '../src/board-type.js';
test('short titles keep their enlarged font size',()=>assert.equal(fittedTitleSize(19,80,40,[50,40],[19,19]),19));
test('long title lines shrink to fit their fixed width without splitting a word',()=>{const size=fittedTitleSize(19,80,40,[120,40],[19,19]);assert.ok(size<19);assert.ok(120*size/19<=80);});
test('three title lines also fit vertically and never enlarge the tile',()=>{const size=fittedTitleSize(19,80,40,[50,60,40],[20,20,20]);assert.ok(60*size/19<=40);assert.ok(size>0);});
