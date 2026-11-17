import {RANKING_ORIGIN} from './ranking.js?v=5d57b86fa755';
export function visitPayload(view){
 const url=new URL(view.location.href);
 if(url.hostname!=='withryu90.github.io'||!url.pathname.startsWith('/musicmarble/')||url.searchParams.has('dev'))return null;
 let source='';try{source=new URL(view.document.referrer).hostname;}catch{}
 return {id:view.crypto.randomUUID(),source};
}
export function trackVisit(view=window,fetchFn=globalThis.fetch.bind(globalThis)){
 try{const payload=visitPayload(view);if(!payload)return;
  // Only one page-open request; no game polling, names, room codes, or URL queries.
  void fetchFn(RANKING_ORIGIN+'/api/visits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit',keepalive:true}).catch(()=>{});
 }catch{}
}
