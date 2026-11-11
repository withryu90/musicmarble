import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERS} from '../src/characters.js';
import {CHARACTER_BIOS} from '../src/character-bios.js';
test('every selectable character has a concise biography and historical composers have valid life years',()=>{
 assert.deepEqual(Object.keys(CHARACTER_BIOS).sort(),CHARACTERS.map(c=>c.id).sort());
 for(const c of CHARACTERS){const bio=CHARACTER_BIOS[c.id];assert.ok(bio.achievement.length>=20&&bio.achievement.length<=100);if(c.id.startsWith('teacher-')){assert.equal(bio.birth,null);assert.equal(bio.death,null);}else{assert.ok(Number.isInteger(bio.birth));assert.ok(Number.isInteger(bio.death));assert.ok(bio.birth<bio.death);assert.ok(bio.death-bio.birth<110);}}
});
test('distinct Mendelssohn and Schumann biographies retain their own years',()=>{
 assert.equal(CHARACTER_BIOS['fanny-mendelssohn'].birth,1805);assert.equal(CHARACTER_BIOS.mendelssohn.birth,1809);
 assert.equal(CHARACTER_BIOS['clara-schumann'].death,1896);assert.equal(CHARACTER_BIOS.schumann.death,1856);
 assert.deepEqual([CHARACTER_BIOS.boulanger.birth,CHARACTER_BIOS.boulanger.death],[1893,1918]);
});

test('Lee Hwayoung biography uses the requested private birth year and exact introduction',()=>{
 assert.deepEqual(CHARACTER_BIOS['teacher-lee-hwayoung'],{birth:null,death:null,achievement:'누구보다 음악을 사랑하고 평소 드럼 연주를 즐기는 대한민국 대표 국어 교사'});
});
