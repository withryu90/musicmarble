import {RANKING_ORIGIN} from './ranking.js?v=b7cb70991701';
import {randomToken} from './random.js?v=b7cb70991701';
// Carrier NATs cannot block a browser-to-browser channel that is no longer needed.
export class HttpTransport{
 constructor({origin=RANKING_ORIGIN,fetchFn=globalThis.fetch.bind(globalThis),interval=1500,timeout=15000}={}){Object.assign(this,{origin,fetchFn,interval,timeout});this.listeners=new Set();this.generation=0;this.resumeReads=new Map();this.joinKeys=new Map();}
 async request(path,body={},session){
  let data={...body};
  if(['create','join'].includes(path)){
   const key=JSON.stringify([path,body.code,body.nickname,body.characterId]);
   if(!this.joinKeys.has(key))this.joinKeys.set(key,randomToken());data.requestId=this.joinKeys.get(key);
  }else data={...data,code:session?.code,token:session?.token};
  const readKey=path==='resume'?`${data.code}:${data.token}`:null;
  if(readKey&&this.resumeReads.has(readKey))return this.resumeReads.get(readKey);
  const once=async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeout);
   try{
    const response=await this.fetchFn(`${this.origin}/api/game/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'omit',cache:'no-store',signal:controller.signal});
    const result=await response.json();
    if(!response.ok)throw Object.assign(Error(result.error||'게임 서버에 연결하지 못했어요.'),{status:response.status});
    return result;
   }catch(error){if(error.status)throw error;throw Error('게임 서버에 연결하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');}
   finally{clearTimeout(timer);}
  };
  const send=async()=>{
   try{return await once();}catch(error){
    // Creation/join use a stable ticket, reads are harmless. Never replay a payment.
    if(!['create','join','resume'].includes(path)||error.status&&error.status!==409)throw error;
    return once();
   }
  };
  const pending=send();if(readKey){this.resumeReads.set(readKey,pending);pending.finally(()=>this.resumeReads.delete(readKey)).catch(()=>{});}return pending;
 }
 subscribe(session,listener){
  let active=true,timer=null,revision=-1,chatSeq=-1,failures=0;const generation=this.generation;
  const poll=async()=>{
   if(!active||generation!==this.generation)return;
   try{
    const data=await this.request('resume',{},session);
    if(!active||generation!==this.generation)return;
    const recovered=failures>0;failures=0;
    if(data.revision>revision||recovered){revision=data.revision;listener.onSnapshot?.(data);}
    if(data.chatSeq!==chatSeq){chatSeq=data.chatSeq;listener.onChat?.({code:data.code,messages:data.messages||[]});}
   }catch(error){if(active&&generation===this.generation){failures++;listener.onDisconnect?.(error.message);}}
   finally{if(active&&generation===this.generation)timer=setTimeout(poll,Math.min(6000,this.interval*Math.max(1,failures)));}
  };
  const stop=()=>{active=false;clearTimeout(timer);this.listeners.delete(stop);};this.listeners.add(stop);void poll();return {close:stop};
 }
 close(){this.generation++;for(const stop of [...this.listeners])stop();this.resumeReads.clear();this.joinKeys.clear();}
}
