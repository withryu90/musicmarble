import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/browser-support.js',import.meta.url),'utf8');
function boot({ie=false,dialog=true,clone=true}={}){
 const app={innerHTML:''},address={},scripts=[];
 const document={documentMode:ie?11:undefined,createElement:tag=>tag==='script'?{noModule:false}:dialog?{showModal(){}}:{},getElementById:id=>id==='app'?app:address,body:{appendChild:script=>scripts.push(script)}};
 const window={fetch(){},EventSource(){},structuredClone:clone?()=>{}:undefined,HTMLDialogElement:dialog?function(){}:undefined,location:{href:'http://192.168.0.10:5190/'}};
 vm.runInNewContext(source,{document,window});
 return {app,address,scripts};
}
test('supported browsers load the game module once',()=>{const {app,scripts}=boot();assert.equal(app.innerHTML,'');assert.equal(scripts.length,1);assert.equal(scripts[0].type,'module');assert.equal(scripts[0].src,'./src/app.js?v=flat-prison-1');});
test('IE and old Safari get a readable address without attempting the game module',()=>{
 for(const options of [{ie:true},{dialog:false},{clone:false}]){
  const {app,address,scripts}=boot(options);assert.equal(scripts.length,0);assert.match(app.innerHTML,/Microsoft Edge/);assert.match(app.innerHTML,/Safari/);assert.equal(address.value,'http://192.168.0.10:5190/');
 }
});
test('module loading failure leaves a recovery message',()=>{const {app,scripts}=boot();scripts[0].onerror();assert.match(app.innerHTML,/새로고침/);});
