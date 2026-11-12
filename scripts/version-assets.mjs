import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export async function versionAssets(root=new URL('../',import.meta.url)){
 const files=[];
 async function scan(path){for(const item of await readdir(new URL(path,root),{withFileTypes:true})){const name=path+item.name;if(item.isDirectory())await scan(name+'/');else if(/\.(js|css|wav|m4a)$/.test(name))files.push(name);}}
 await scan('src/');files.sort();
 const normal=s=>s.replace(/\?v=[\w-]+/g,'');const hash=createHash('sha256');
 for(const file of ['index.html',...files]){const data=await readFile(new URL(file,root));hash.update(file);hash.update(/\.(html|js|css)$/.test(file)?normal(data.toString()):data);}
 const version=hash.digest('hex').slice(0,12);
 for(const file of files.filter(f=>f.endsWith('.js')&&!f.includes('/vendor/'))){
  const url=new URL(file,root),source=await readFile(url,'utf8');
  const updated=source.replace(/(['"])(\.\.?\/[^'"\s?]+\.(?:js|wav|m4a))(?:\?v=[\w-]+)?\1/g,(_,quote,path)=>`${quote}${path}?v=${version}${quote}`);
  if(updated!==source)await writeFile(url,updated);
 }
 const index=new URL('index.html',root),html=await readFile(index,'utf8');
 await writeFile(index,html.replace(/((?:href|src)="\.\/src\/[^"?]+\.(?:js|css))(?:\?v=[\w-]+)?"/g,`$1?v=${version}"`));
 return version;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)console.log(await versionAssets());
