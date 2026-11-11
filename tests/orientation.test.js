import test from 'node:test';
import assert from 'node:assert/strict';
import {needsLandscape} from '../src/orientation.js';
test('only an active phone portrait game requests rotation',()=>{
 assert.equal(needsLandscape(390,844,false),false);
 assert.equal(needsLandscape(390,844,true),true);
 assert.equal(needsLandscape(320,568,true),true);
 assert.equal(needsLandscape(844,390,true),false);
 assert.equal(needsLandscape(768,1024,true),false);
 assert.equal(needsLandscape(1280,800,true),false);
 assert.equal(needsLandscape(494,739,true,false),false);
});
