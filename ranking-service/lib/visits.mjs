const DAY=86400000,KST=9*3600000;
export const VISIT_RETENTION_MS=30*DAY;
const clean=(value,max=100)=>String(value||'').replace(/[\x00-\x1f\x7f]/g,'').slice(0,max);
export async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function authorized(request,secret){
 if(!secret||secret.length<32)return false;
 const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!token||token.length>256)return false;
 const a=await digest(token),b=await digest(secret);let difference=0;
 for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
 return difference===0;
}
export function maskIp(ip){
 if(/^\d+\.\d+\.\d+\.\d+$/.test(ip))return ip.split('.').slice(0,3).join('.')+'.*';
 if(ip.includes(':')){const sides=ip.split('::'),left=sides[0]?sides[0].split(':'):[],right=sides[1]?sides[1].split(':'):[];
  const parts=sides.length===2?[...left,...Array(Math.max(0,8-left.length-right.length)).fill('0'),...right]:left;
  return parts.slice(0,3).join(':')+':*';}
 return '알 수 없음';
}
export function browserInfo(ua=''){
 const device=/iPad|Tablet/i.test(ua)?'태블릿':/Mobile|iPhone|Android/i.test(ua)?'모바일':'컴퓨터';
 const browser=/KAKAOTALK/i.test(ua)?'카카오톡':/Instagram/i.test(ua)?'인스타그램':/NAVER/i.test(ua)?'네이버':/SamsungBrowser/i.test(ua)?'삼성 인터넷':/Edg/i.test(ua)?'Edge':/Firefox|FxiOS/i.test(ua)?'Firefox':/Chrome|CriOS/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'기타';
 return {device,browser};
}
function sourceHost(value){if(!value)return '';try{return new URL('https://'+String(value)).hostname.slice(0,120);}catch{return '';}}
export async function recordVisit(db,request,body,env,now=Date.now()){
 if(!env.VISITS_ADMIN_TOKEN||env.VISITS_ADMIN_TOKEN.length<32)return {recorded:false};
 if(!body||!/^[-a-f0-9]{36}$/i.test(body.id||''))throw Object.assign(Error('올바르지 않은 방문 기록입니다.'),{status:400});
 const ip=clean(request.headers.get('CF-Connecting-IP'),64);
 if(!ip)return {recorded:false};
 const visitor=await digest(env.VISITS_ADMIN_TOKEN+'|'+ip);
 const recent=await db.prepare('SELECT COUNT(*) AS count FROM visit_events WHERE visitor_hash=? AND created_at>=?').bind(visitor,now-60000).first();
 if(recent.count>=300)return {recorded:false};
 const {device,browser}=browserInfo(request.headers.get('User-Agent')||'');
 const cf=request.cf||{};
 await db.prepare('INSERT OR IGNORE INTO visit_events (id,created_at,visitor_hash,ip,country,region,city,device,browser,source) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(body.id,now,visitor,env.VISITS_FULL_IP==='true'?ip:maskIp(ip),clean(cf.country,10),clean(cf.region),clean(cf.city),device,browser,sourceHost(body.source)).run();
 return {recorded:true};
}
export function visitPeriodStart(now,days){return Math.max(now-VISIT_RETENTION_MS,Math.floor((now+KST)/DAY)*DAY-KST-(days-1)*DAY);}
export async function visitStatistics(db,requestedDays,now=Date.now()){
 const days=[1,7,30].includes(Number(requestedDays))?Number(requestedDays):7,start=visitPeriodStart(now,days);
 const summary=await db.prepare('SELECT COUNT(*) AS visits,COUNT(DISTINCT visitor_hash) AS visitors FROM visit_events WHERE created_at>=?').bind(start).first();
 const rows=async sql=>(await db.prepare(sql).bind(start).all()).results;
 const daily=await rows("SELECT strftime('%Y-%m-%d',created_at/1000,'unixepoch','+9 hours') AS label,COUNT(*) AS count FROM visit_events WHERE created_at>=? GROUP BY label ORDER BY label");
 const hourly=await rows("SELECT strftime('%H',created_at/1000,'unixepoch','+9 hours') AS label,COUNT(*) AS count FROM visit_events WHERE created_at>=? GROUP BY label ORDER BY label");
 const regions=await rows("SELECT country,region,city,COUNT(*) AS count FROM visit_events WHERE created_at>=? GROUP BY country,region,city ORDER BY count DESC LIMIT 20");
 const browsers=await rows('SELECT browser AS label,COUNT(*) AS count FROM visit_events WHERE created_at>=? GROUP BY browser ORDER BY count DESC');
 const visits=await rows('SELECT created_at AS time,ip,country,region,city,device,browser,source FROM visit_events WHERE created_at>=? ORDER BY created_at DESC,id DESC LIMIT 200');
 return {days,start,generatedAt:now,retentionDays:30,summary,daily,hourly,regions,browsers,visits};
}
export async function pruneVisits(db,now=Date.now()){return db.prepare('DELETE FROM visit_events WHERE created_at<?').bind(now-VISIT_RETENTION_MS).run();}
