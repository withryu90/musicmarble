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

test('embedded browsers release the guide when device orientation is landscape despite a stale portrait viewport',async()=>{
 const {needsLandscapeInWindow}=await import('../src/orientation.js');
 const portrait={innerWidth:390,innerHeight:844};
 assert.equal(needsLandscapeInWindow(portrait,true),true);
 for(const type of ['landscape-primary','landscape-secondary'])assert.equal(needsLandscapeInWindow({...portrait,screen:{orientation:{type}}},true),false);
 for(const orientation of [90,-90,270])assert.equal(needsLandscapeInWindow({...portrait,orientation},true),false);
 assert.equal(needsLandscapeInWindow({...portrait,orientation:0},true),true);
 assert.equal(needsLandscapeInWindow({...portrait,screen:{orientation:{type:'portrait-primary'}}},true),true);
 assert.equal(needsLandscapeInWindow({innerWidth:844,innerHeight:390},true),false);
 assert.equal(needsLandscapeInWindow(portrait,false),false);
 assert.equal(needsLandscapeInWindow(portrait,true,false),false);
});
