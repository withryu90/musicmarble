import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RoomService} from './rooms.js';
export function makeServer({root=resolve(fileURLToPath(new URL('..',import.meta.url))),service=new RoomService()}={}){
 const rate=new Map();
 const server=createServer(async(req,res)=>{
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
   const url=new URL(req.url,'http://localhost');
   const json=(status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
   try{
     if(url.pathname==='/api/health')return json(200,{ok:true,rooms:service.rooms.size});
     if(url.pathname.startsWith('/api/')){
       if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return json(403,{error:'허용되지 않은 요청입니다.'});
       if(req.method==='GET'&&url.pathname==='/api/events'){
         const code=url.searchParams.get('code'),token=url.searchParams.get('token');
         service.authenticate(code,token);
         const room=service.get(code);if(room.listeners.size>=30)throw Error('연결이 너무 많습니다. 다른 탭을 닫아 주세요.');
         res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
         const unsubscribe=service.subscribe(code,token,snapshot=>res.write(`data: ${JSON.stringify(snapshot)}\n\n`));
         const unsubscribeChat=service.subscribeChat(code,token,payload=>res.write(`event: chat\ndata: ${JSON.stringify(payload)}\n\n`));
         const heartbeat=setInterval(()=>res.write(': heartbeat\n\n'),15000);
         res.on('close',()=>{clearInterval(heartbeat);unsubscribe();unsubscribeChat();});return;
       }
       if(req.method!=='POST')return json(404,{error:'경로를 찾을 수 없습니다.'});
       const ip=req.socket.remoteAddress,now=Date.now(),bucket=rate.get(ip)||{time:now,count:0};if(now-bucket.time>60000){bucket.time=now;bucket.count=0;}bucket.count++;rate.set(ip,bucket);if(bucket.count>1200)return json(429,{error:'요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'});
       if(rate.size>10000)for(const [k,v] of rate)if(now-v.time>60000)rate.delete(k);
       let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)return json(413,{error:'요청이 너무 큽니다.'});}
       let input;try{input=JSON.parse(body);}catch{return json(400,{error:'올바른 JSON 요청이 필요합니다.'});}
       if(!input||typeof input!=='object')throw Error('요청을 확인해 주세요.');
       if(url.pathname==='/api/create-solo')return json(201,service.createSolo(input.nickname,input.config||{},input.characterId));
       if(url.pathname==='/api/create')return json(201,service.create(input.nickname,input.characterId));
       if(url.pathname==='/api/join')return json(201,service.join(input.code,input.nickname,input.characterId));
       const token=req.headers.authorization?.replace(/^Bearer /,'');
       if(url.pathname==='/api/resume'){const {room,member}=service.authenticate(input.code,token);return json(200,{...service.snapshot(room),playerId:member.id});}
       if(url.pathname==='/api/chat')return json(200,service.chat(input.code,token,input.message));
       if(url.pathname==='/api/action')return json(200,service.act(input.code,token,input));
       return json(404,{error:'경로를 찾을 수 없습니다.'});
     }
     if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
     const pathName=decodeURIComponent(url.pathname),path=resolve(root,`.${pathName==='/'?'/index.html':pathName}`);
     const rel=path.slice(root.length+1);
     if(!path.startsWith(root+sep)||!(rel==='index.html'||rel.startsWith('src'+sep)))throw Error('Not found');
     const file=await stat(path);if(!file.isFile())throw Error('Not found');
     const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.m4a':'audio/mp4','.ogg':'audio/ogg','.txt':'text/plain; charset=utf-8'}[extname(path)]||'application/octet-stream';
     const headers={'Content-Type':mime,'Cache-Control':'no-cache','Content-Length':file.size};
     if(mime.startsWith('audio/')){
       headers['Accept-Ranges']='bytes';
       if(req.method==='GET'&&req.headers.range){
         const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
         let start=range?.[1]?Number(range[1]):0,end=range?.[2]?Number(range[2]):file.size-1;
         if(range&&!range[1]&&range[2]){start=Math.max(0,file.size-Number(range[2]));end=file.size-1;}
         if(!range||(!range[1]&&!range[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=file.size){res.writeHead(416,{'Content-Range':`bytes */${file.size}`});return res.end();}
         end=Math.min(end,file.size-1);res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${file.size}`});return createReadStream(path,{start,end}).on('error',()=>res.destroy()).pipe(res);
       }
     }
     res.writeHead(200,headers);if(req.method==='HEAD')return res.end();
     if(mime.startsWith('audio/'))return createReadStream(path).on('error',()=>res.destroy()).pipe(res);
     res.end(await readFile(path));
   }catch(error){if(url.pathname.startsWith('/api/'))json(400,{error:error.message});else{res.writeHead(404);res.end('Not found');}}
 });
 const timer=setInterval(()=>service.cleanup(),60000);timer.unref();server.on('close',()=>{clearInterval(timer);service.close();});return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||5173),host=process.env.HOST||'0.0.0.0';
 makeServer({root:process.argv.includes('--dist')?resolve('dist'):undefined}).listen(port,host,()=>console.log(`Music Marble → http://localhost:${port}\n공유 접속: 이 컴퓨터의 IP:${port} (같은 네트워크)\n방 데이터는 서버 메모리에 보관되며 서버 재시작 시 초기화됩니다.`));
}
