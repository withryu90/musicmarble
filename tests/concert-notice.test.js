import test from 'node:test';
import assert from 'node:assert/strict';
import {ConcertNoticeWindow,CONCERT_NOTICE_MS} from '../src/concert-notice.js';
test('concert notice stays protected for twelve seconds from display',()=>{
 const w=new ConcertNoticeWindow();w.start(1000);assert.equal(CONCERT_NOTICE_MS,12000);assert.equal(w.seconds,12);
 assert.equal(w.tick(2000),false);assert.equal(w.seconds,11);assert.equal(w.active,true);
 assert.equal(w.tick(12999),false);assert.equal(w.seconds,1);assert.equal(w.tick(13000),true);
 w.stop();assert.equal(w.active,false);assert.equal(w.tick(20000),false);
});
test('late viewers get their own full reading period rather than the hosts elapsed time',()=>{
 const host=new ConcertNoticeWindow(),guest=new ConcertNoticeWindow();host.start(0);guest.start(11000);
 assert.equal(host.tick(12000),true);assert.equal(guest.tick(12000),false);assert.equal(guest.seconds,11);assert.equal(guest.tick(23000),true);
});
test('time in a hidden mobile tab does not consume the reading window',()=>{
 const w=new ConcertNoticeWindow();w.start(0);w.tick(2000);assert.equal(w.seconds,10);
 w.tick(2200,false);assert.equal(w.tick(60000,false),false);assert.equal(w.tick(61000,true),false);assert.equal(w.seconds,10);
 assert.equal(w.tick(71000,true),true);
});
test('starting while hidden preserves the entire window until visible',()=>{
 const w=new ConcertNoticeWindow();w.start(0,false);w.tick(100000,false);w.tick(110000,true);assert.equal(w.seconds,12);assert.equal(w.tick(122000,true),true);
});
test('reset cancels an old concert; a later concert always starts a fresh timer',()=>{
 const w=new ConcertNoticeWindow();w.start(0);w.tick(11000);w.stop();assert.equal(w.active,false);w.start(50000);assert.equal(w.seconds,12);assert.equal(w.tick(51000),false);
});
