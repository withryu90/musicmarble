import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {versionAssets} from '../scripts/version-assets.mjs';
test('every release versions CSS, boot loader, dependency modules and recordings consistently',async()=>{
 const dir=await mkdtemp(tmpdir()+'/musicmarble-release-'),root=pathToFileURL(dir+'/');
 try{
  await mkdir(new URL('src/assets/',root),{recursive:true});
  await writeFile(new URL('index.html',root),'<link href="./src/theme.css"><script src="./src/browser.js?v=old"></script>');
  await writeFile(new URL('src/browser.js',root),"import './module.js?v=older';const audio=new URL('./assets/test.wav',import.meta.url);const original='./assets/original.mp3';");
  await writeFile(new URL('src/module.js',root),'export const ready=true;');await writeFile(new URL('src/theme.css',root),'body{color:blue}');await writeFile(new URL('src/assets/test.wav',root),'audio');await writeFile(new URL('src/assets/original.mp3',root),'unaltered source audio');
  const first=await versionAssets(root);assert.match(first,/^[a-f0-9]{12}$/);
  assert.match(await readFile(new URL('index.html',root),'utf8'),new RegExp(`theme.css\\?v=${first}`));
  const loader=await readFile(new URL('src/browser.js',root),'utf8');assert.ok(loader.includes(`module.js?v=${first}`));assert.ok(loader.includes(`test.wav?v=${first}`));assert.ok(loader.includes(`original.mp3?v=${first}`));
  assert.equal(await versionAssets(root),first);
  await writeFile(new URL('src/module.js',root),'export const ready=false;');const second=await versionAssets(root);assert.notEqual(second,first);assert.ok((await readFile(new URL('index.html',root),'utf8')).includes(`browser.js?v=${second}`));
 }finally{await rm(dir,{recursive:true,force:true});}
});
