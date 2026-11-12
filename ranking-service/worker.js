import {registerGame,submitGame,topRanking,nicknameAvailability} from './lib/ranking-core.mjs';
const ALLOWED_ORIGINS=new Set(['https://withryu90.github.io']);
const originAllowed=origin=>!origin||ALLOWED_ORIGINS.has(origin)||/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
export default {async fetch(request,env){
 const origin=request.headers.get('Origin'),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'};
 if(origin&&originAllowed(origin))headers['Access-Control-Allow-Origin']=origin;
 const json=(body,status=200)=>Response.json(body,{status,headers});
 if(!originAllowed(origin))return json({error:'허용되지 않은 접속입니다.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const path=new URL(request.url).pathname;
 if(path==='/'&&request.method==='GET')return json({service:'뮤직마블 전체 랭킹',game:'https://withryu90.github.io/musicmarble/'});
 if(!env.DB)return json({error:'점수 저장소를 준비하고 있습니다.'},503);
 try{
  if(path==='/api/ranking/top'&&request.method==='GET')return json(await topRanking(env.DB));
  if(request.method!=='POST'||!['/api/ranking/register','/api/ranking/submit','/api/ranking/nickname'].includes(path))return json({error:'요청을 찾을 수 없습니다.'},404);
  const content=await request.text();if(content.length>4096)return json({error:'요청이 너무 큽니다.'},413);const body=JSON.parse(content);
  if(path==='/api/ranking/nickname')return json(await nicknameAvailability(env.DB,body.nickname));
  if(path==='/api/ranking/register')return json(await registerGame(env.DB,body));
  const secret=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');return json(await submitGame(env.DB,body.gameId,secret,body));
 }catch(error){return json({error:error.status?error.message:request.method==='GET'?'랭킹을 불러오지 못했습니다.':error.message},error.status||400);}
}};
