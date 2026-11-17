import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {recordVisit,visitStatistics,pruneVisits,authorized,maskIp,visitPeriodStart} from '../lib/visits.mjs';
import worker from '../worker.js';
function database(){const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../migrations/0004_visit_statistics.sql',import.meta.url),'utf8'));return {sql,prepare(query){const s=sql.prepare(query);let args=[];return {bind(...v){args=v;return this;},async run(){return s.run(...args);},async first(){return s.get(...args)||null;},async all(){return {results:s.all(...args)};}};}};}
const token='test-admin-secret-with-more-than-32-characters';
const env=db=>({DB:db,VISITS_ADMIN_TOKEN:token,VISITS_FULL_IP:'true'});
const id=n=>'00000000-0000-4000-a000-'+String(n).padStart(12,'0');
function request(ip='203.0.113.9'){const r=new Request('https://worker.example/api/visits',{headers:{'CF-Connecting-IP':ip,'User-Agent':'Mozilla/5.0 iPhone Mobile KAKAOTALK 11'}});r.cf={country:'KR',region:'Chungcheongnam-do',city:'Cheonan'};return r;}
test('visit records use server time, edge IP and approximate edge location, not supplied identity fields',async()=>{
 const db=database();await recordVisit(db,request(),{id:id(1),source:'blog.naver.com/a?secret=123',ip:'1.1.1.1',time:1,city:'forged',nickname:'private'},env(db),100000);
 const row=db.sql.prepare('SELECT * FROM visit_events').get();assert.equal(row.ip,'203.0.113.9');assert.equal(row.created_at,100000);assert.equal(row.city,'Cheonan');assert.equal(row.source,'blog.naver.com');assert.equal(row.browser,'카카오톡');assert.equal(row.device,'모바일');assert.equal(row.nickname,undefined);assert.notEqual(row.visitor_hash,row.ip);
 await recordVisit(db,request(),{id:id(1)},env(db),100001);assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM visit_events').get().n,1);db.sql.close();
});
test('optional IP masking and disabled collection avoid retaining unexpected addresses',async()=>{
 const db=database();await recordVisit(db,request(),{id:id(1)},{...env(db),VISITS_FULL_IP:'false'});assert.equal(db.sql.prepare('SELECT ip FROM visit_events').get().ip,'203.0.113.*');
 assert.equal(maskIp('2001:db8::1'),'2001:db8:0:*');assert.equal(maskIp('::1'),'0:0:0:*');assert.equal(maskIp('bad'),'알 수 없음');
 assert.equal((await recordVisit(db,request(),{id:id(2)},{})).recorded,false);assert.equal((await recordVisit(db,new Request('https://example.com'),{id:id(3)},env(db))).recorded,false);db.sql.close();
});
test('statistics follow Korean calendar days, deduplicate IPs and hide records older than 30 days',async()=>{
 const db=database(),now=Date.UTC(2026,10,17,3),yesterday=Date.UTC(2026,10,16,14),today=Date.UTC(2026,10,16,16);
 await recordVisit(db,request(),{id:id(1)},env(db),yesterday);await recordVisit(db,request(),{id:id(2)},env(db),today);await recordVisit(db,request('203.0.113.10'),{id:id(3)},env(db),today);
 await recordVisit(db,request(),{id:id(4)},env(db),now-31*86400000);
 const stats=await visitStatistics(db,'1',now);assert.deepEqual({...stats.summary},{visits:2,visitors:2});assert.equal(stats.daily[0].label,'2026-11-17');assert.equal(stats.hourly[0].label,'01');assert.equal(stats.visits.length,2);
 assert.equal((await visitStatistics(db,'9999',now)).days,7);await pruneVisits(db,now);assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM visit_events').get().n,3);assert.equal(visitPeriodStart(now,1),Date.UTC(2026,10,16,15));db.sql.close();
});
test('admin API requires a strong server-side secret and never includes IP data before authentication',async()=>{
 const db=database();await recordVisit(db,request(),{id:id(1)},env(db));
 for(const supplied of ['',token+'x']){const response=await worker.fetch(new Request('https://worker.example/api/admin/visits',{headers:{Authorization:'Bearer '+supplied}}),env(db));assert.equal(response.status,401);assert.doesNotMatch(await response.text(),/203\.0\.113/);}
 const response=await worker.fetch(new Request('https://worker.example/api/admin/visits?days=7',{headers:{Authorization:'Bearer '+token}}),env(db));assert.equal(response.status,200);assert.equal((await response.json()).visits[0].ip,'203.0.113.9');assert.equal(await authorized(new Request('https://example.com'),undefined),false);
 const page=await worker.fetch(new Request('https://worker.example/admin/visits'),env(db));assert.equal(page.status,200);assert.match(page.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.equal(page.headers.get('Cache-Control'),'no-store');const html=await page.text();assert.doesNotMatch(html,new RegExp(token));assert.doesNotMatch(html,/203\.0\.113/);assert.match(html,/관리자 확인/);db.sql.close();
});
test('invalid and foreign-origin visit submissions do not write records',async()=>{
 const db=database();await assert.rejects(recordVisit(db,request(),{id:'no'},env(db)),{status:400});
 const response=await worker.fetch(new Request('https://worker.example/api/visits',{method:'POST',headers:{Origin:'https://attacker.example'},body:JSON.stringify({id:id(1)})}),env(db));assert.equal(response.status,403);assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM visit_events').get().n,0);db.sql.close();
});
