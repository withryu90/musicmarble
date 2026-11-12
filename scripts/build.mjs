import {versionAssets} from './version-assets.mjs';
import {mkdir,cp,rm} from 'node:fs/promises';
const version=await versionAssets();
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of ['index.html','src'])await cp(file,`dist/${file}`,{recursive:true});
console.log(`Built static app ${version} → dist/`);
