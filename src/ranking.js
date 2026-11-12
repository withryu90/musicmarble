// Shared Cloudflare Worker backed by the production D1 database.
export const RANKING_ORIGIN='https://musicmarble-ranking.musicmarble-withryu90.workers.dev';
const KEY='musicmarble.global-ranking.v1';
function defaultStorage(){try{return globalThis.localStorage||null;}catch{return null;}}
const makeSecret=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
export class RankingClient{
 constructor({fetchFn=globalThis.fetch.bind(globalThis),storage=defaultStorage(),onChange=()=>{},origin=RANKING_ORIGIN,secret=makeSecret}={}){
  Object.assign(this,{fetchFn,storage,onChange,origin,secret});this.entries=[];this.loading=false;this.loaded=false;this.error='';this.lastFetch=0;this.pending=new Set();this.records={};
  try{const saved=JSON.parse(storage?.getItem(KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const [id,r] of Object.entries(saved))if(r&&r.gameId===id&&typeof r.secret==='string'&&/^[a-f0-9]{64}$/.test(r.secret)&&Array.isArray(r.players))this.records[id]=r;}catch{}
 }
 save(){try{const values=Object.values(this.records).sort((a,b)=>b.createdAt-a.createdAt);const keep=values.filter(r=>!r.done).concat(values.filter(r=>r.done).slice(0,100));this.storage?.setItem(KEY,JSON.stringify(Object.fromEntries(keep.map(r=>[r.gameId,r]))));}catch{}}
 async request(path,body,secret){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const response=await this.fetchFn(this.origin+'/api/ranking/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json',...(secret?{Authorization:'Bearer '+secret}:{})}:{},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store',credentials:'omit'});const data=await response.json();if(!response.ok)throw Object.assign(Error(response.status===409&&data?.error==='이미 등록된 닉네임입니다.'?data.error:'랭킹 서버에 연결하지 못했어요.'),{status:response.status});return data;}finally{clearTimeout(timer);}
 }
 async assertNicknameAvailable(value){
  const nickname=typeof value==='string'?value.normalize('NFC').trim():'';
  if(!nickname||nickname.length>16||/[\u0000-\u001f\u007f]/.test(nickname))throw Error('닉네임은 1–16자로 입력해 주세요.');
  if(!this.origin)throw Error('닉네임 중복 확인에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  let data;try{data=await this.request('nickname',{nickname});}catch{throw Error('닉네임 중복 확인에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');}
  if(data?.available===false)throw Error('이미 등록된 닉네임입니다.');
  if(data?.available!==true)throw Error('닉네임 중복 확인에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  return nickname;
 }
 async refresh(force=false){
  if(!this.origin){this.error='전체 랭킹을 준비하고 있어요.';this.onChange();return;}
  if(this.loading||!force&&this.lastFetch&&Date.now()-this.lastFetch<15000)return;
  this.loading=true;this.error='';this.onChange();
  try{const data=await this.request('top');if(!Array.isArray(data.entries)||data.entries.length>10||!data.entries.every(p=>typeof p.nickname==='string'&&p.nickname.length<=16&&Number.isSafeInteger(p.score)&&p.score>=0))throw Error('랭킹 응답을 확인하지 못했어요.');this.entries=data.entries.map((p,i)=>({...p,rank:i+1}));this.loaded=true;this.lastFetch=Date.now();}catch{this.error='랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';}finally{this.loading=false;this.onChange();}
 }
 observe(snapshot,session,score){
  const state=snapshot?.state,id=snapshot?.gameId;if(!state||!id||session?.playerId!==0)return;
  let record=this.records[id];if(!record){if(state.phase==='finished')return;const players=state.players.filter(p=>!p.isBot).map(p=>({id:p.id,name:p.name.normalize('NFC').trim()}));if(!players.length)return;record={gameId:id,secret:this.secret(),players,registered:false,done:false,createdAt:Date.now()};this.records[id]=record;}
  if(state.phase==='finished'&&!record.done)record.scores=record.players.map(p=>({id:p.id,score:score(state,state.players[p.id])}));
  this.save();if(!record.registered||record.scores&&!record.done)void this.flush(record);
 }
 async flush(record){
  if(!this.origin)return;
  if(this.pending.has(record.gameId)||record.done||record.blocked)return;this.pending.add(record.gameId);
  try{if(!record.registered){await this.request('register',{gameId:record.gameId,secret:record.secret,players:record.players});record.registered=true;this.save();}if(record.scores){await this.request('submit',{gameId:record.gameId,scores:record.scores},record.secret);record.done=true;record.error='';this.save();void this.refresh(true);}}
  catch(error){record.blocked=error.status===409;record.error=record.blocked?error.message:'전체 랭킹 기록을 재시도할 예정이에요.';this.save();}finally{this.pending.delete(record.gameId);this.onChange();}
 }
 retryPending(){return Promise.all(Object.values(this.records).filter(r=>r.scores&&!r.done).map(r=>this.flush(r)));}
 status(id){const r=this.records[id];return r?.blocked?r.error:r?.done?'전체 랭킹에 점수를 기록했어요.':r?.scores?r.error||'전체 랭킹에 점수를 기록하고 있어요.':'게임이 끝나면 최종 점수를 전체 랭킹에 기록해요.';}
}
