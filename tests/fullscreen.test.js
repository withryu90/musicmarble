import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enterFullscreen,toggleFullscreen,isStandalone} from '../src/fullscreen.js';
const browser={navigator:{},matchMedia:()=>({matches:false})};
test('supported browser requests fullscreen with navigation hidden and can exit',async()=>{
 let options,exits=0;const doc={documentElement:{async requestFullscreen(value){options=value;}}};
 assert.equal(await enterFullscreen(doc,browser),'entered');assert.equal(options.navigationUI,'hide');
 doc.fullscreenElement={};doc.exitFullscreen=async()=>exits++;assert.equal(await toggleFullscreen(doc,browser),'exited');assert.equal(exits,1);
});
test('unsupported and denied requests return guide states without throwing',async()=>{
 assert.equal(await enterFullscreen({documentElement:{}},browser),'unsupported');
 assert.equal(await enterFullscreen({documentElement:{requestFullscreen:()=>Promise.reject(Error('denied'))}},browser),'blocked');
 assert.equal(await enterFullscreen({documentElement:{webkitRequestFullscreen(){}}},browser),'entered');
});
test('Home Screen web app is already in standalone mode and does not request fullscreen',async()=>{
 const ios={...browser,navigator:{standalone:true}};assert.equal(isStandalone(ios),true);assert.equal(await enterFullscreen({documentElement:{}},ios),'standalone');
});
test('manifest launches under the GitHub Pages project path and all PNG icons have correct sizes',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../src/app.webmanifest',import.meta.url)));
 assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'landscape');
 for(const base of ['https://withryu90.github.io/musicmarble/src/app.webmanifest','http://localhost:5193/src/app.webmanifest'])assert.equal(new URL(manifest.start_url,base).pathname,new URL('../',base).pathname);
 for(const icon of [...manifest.icons,{src:'./assets/app-icons/apple-touch-icon.png',sizes:'180x180'}]){
  const bytes=readFileSync(new URL('../src/'+icon.src.slice(2),import.meta.url));const [width,height]=icon.sizes.split('x').map(Number);assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);
 }
});
