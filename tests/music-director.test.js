import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicDirector} from '../src/music-director.js';
function fixture(){
 let visible=true;const state={source:'lobby',volume:.25,playing:false};
 const bgm={status:()=>({...state}),setSource:s=>{state.source=s;state.playing=false;},setVolume:v=>state.volume=v,pause:()=>state.playing=false,play:async()=>state.playing=true};
 const music=createMusicDirector({bgm,lobbySource:'lobby',gameSource:'garden',isVisible:()=>visible});
 return {music,state,hide:()=>visible=false,show:()=>visible=true};
}
test('game music loops independently of dice, coin, quiz and ending effects',()=>{
 const {music,state}=fixture();music.sync({game:true});assert.equal(state.source,'garden');assert.equal(state.volume,.1);
 for(const name of ['dice','gain','loss','applause','concert']){music.effectStarted(name,1);assert.equal(state.playing,true);music.effectEnded(name,1);assert.equal(state.playing,true);}
});
test('prison playback suspends BGM until every active prison clip ends',()=>{
 const {music,state}=fixture();music.sync({game:true});music.effectStarted('prison',1);assert.equal(state.playing,false);
 music.sync({gesture:true});assert.equal(state.playing,false);music.effectStarted('prison',2);music.effectEnded('prison',1);assert.equal(state.playing,false);
 music.effectEnded('prison',2);assert.equal(state.playing,true);assert.equal(state.source,'garden');
});
test('ending prison playback cannot override mute or hidden-tab settings',()=>{
 const {music,state,hide,show}=fixture();music.sync({game:true});music.effectStarted('prison',1);music.sync({enabled:false});music.effectEnded('prison',1);assert.equal(state.playing,false);
 music.sync({enabled:true});assert.equal(state.playing,true);music.effectStarted('prison',2);hide();music.effectEnded('prison',2);assert.equal(state.playing,false);
 show();music.sync();assert.equal(state.playing,true);music.sync({game:false});assert.equal(state.source,'lobby');assert.equal(state.volume,.25);
});
test('bundled original game loop is mobile-compatible stereo PCM with a smooth join',async()=>{
 const {readFile}=await import('node:fs/promises');const data=await readFile(new URL('../src/assets/audio/music-garden-loop.wav',import.meta.url));
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.readUInt16LE(20),1);assert.equal(data.readUInt16LE(22),2);assert.equal(data.readUInt32LE(24),22050);
 const frames=(data.length-44)/4;assert.ok(frames/22050>33&&frames/22050<34);
 for(let channel=0;channel<2;channel++)assert.ok(Math.abs(data.readInt16LE(44+channel*2)-data.readInt16LE(data.length-4+channel*2))<1000);
});
test('listening hints pause BGM without overriding another prison interruption or mute',()=>{
 const {music,state}=fixture();music.sync({game:true});music.effectStarted('listening-hint',1);assert.equal(state.playing,false);
 music.effectStarted('prison',1);music.effectEnded('listening-hint',1);assert.equal(state.playing,false);music.effectEnded('prison',1);assert.equal(state.playing,true);
 music.effectStarted('listening-hint',2);music.sync({enabled:false});music.effectEnded('listening-hint',2);assert.equal(state.playing,false);
});
