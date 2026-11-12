export const MAX_SCORE=1000000;
export function registration(body){
 if(!body||typeof body.gameId!=='string'||!/^[a-zA-Z0-9_-]{20,128}$/.test(body.gameId)||typeof body.secret!=='string'||!/^[a-f0-9]{64}$/.test(body.secret))throw Error('올바른 게임 등록 정보가 필요합니다.');
 if(!Array.isArray(body.players)||body.players.length<1||body.players.length>4)throw Error('참가자를 확인해 주세요.');
 const ids=new Set(),names=new Set();
 const players=body.players.map(p=>{const name=typeof p.name==='string'?p.name.normalize('NFC').trim():'';if(!Number.isInteger(p.id)||p.id<0||p.id>3||ids.has(p.id)||!name||name.length>16||/[\u0000-\u001f\u007f]/.test(name)||names.has(name))throw Error('닉네임과 참가자 번호를 확인해 주세요.');ids.add(p.id);names.add(name);return {id:p.id,name};});
 return {gameId:body.gameId,secret:body.secret,players};
}
export function finalScores(body,roster){
 if(!Array.isArray(body?.scores)||body.scores.length!==roster.length)throw Error('전체 참가자의 최종 점수가 필요합니다.');
 const ids=new Set();return body.scores.map(p=>{const player=roster.find(x=>x.id===p.id);if(!player||ids.has(p.id)||!Number.isSafeInteger(p.score)||p.score<0||p.score>MAX_SCORE)throw Error('최종 점수를 확인해 주세요.');ids.add(p.id);return {id:p.id,name:player.name,score:p.score};});
}
export async function tokenHash(secret){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export const DUPLICATE_NICKNAME='이미 등록된 닉네임입니다.';
export function normalizeNickname(value){
 const name=typeof value==='string'?value.normalize('NFC').trim():'';
 if(!name||name.length>16||/[\u0000-\u001f\u007f]/.test(name))throw Error('닉네임은 1–16자로 입력해 주세요.');
 return name;
}
export async function nicknameAvailability(db,value){
 const name=normalizeNickname(value),used=await db.prepare('SELECT nickname FROM ranking_nicknames WHERE nickname=?').bind(name).first();
 return {nickname:name,available:!used};
}
export async function registerGame(db,body,now=Date.now()){
 const value=registration(body),hash=await tokenHash(value.secret),roster=JSON.stringify(value.players);
 const previous=await db.prepare('SELECT token_hash,roster FROM ranking_games WHERE id=?').bind(value.gameId).first();
 if(previous&&(previous.token_hash!==hash||previous.roster!==roster))throw Object.assign(Error('등록된 게임 정보를 확인해 주세요.'),{status:409});
 const statements=[db.prepare('INSERT INTO ranking_games (id,token_hash,roster,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(value.gameId,hash,roster,now)];
 for(const p of value.players)statements.push(db.prepare('INSERT INTO ranking_nicknames (nickname,game_id,player_id,registered_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM ranking_games WHERE id=? AND token_hash=? AND roster=?) AND NOT EXISTS (SELECT 1 FROM ranking_nicknames WHERE nickname=? AND game_id=? AND player_id=?)').bind(p.name,value.gameId,p.id,now,value.gameId,hash,roster,p.name,value.gameId,p.id));
 try{await db.batch(statements);}catch(error){if(/UNIQUE constraint failed: ranking_nicknames\.nickname/i.test(error.message))throw Object.assign(Error(DUPLICATE_NICKNAME),{status:409});throw error;}
 const game=await db.prepare('SELECT token_hash,roster FROM ranking_games WHERE id=?').bind(value.gameId).first();
 if(game.token_hash!==hash||game.roster!==roster)throw Object.assign(Error('등록된 게임 정보를 확인해 주세요.'),{status:409});
 return {registered:true,gameId:value.gameId};
}
export async function submitGame(db,id,secret,body,now=Date.now()){
 const game=await db.prepare('SELECT token_hash,roster,completed_at FROM ranking_games WHERE id=?').bind(id).first();
 if(!game||typeof secret!=='string'||game.token_hash!==await tokenHash(secret))throw Object.assign(Error('게임 기록 권한을 확인해 주세요.'),{status:403});
 if(game.completed_at!==null)return {recorded:true,duplicate:true};
 const scores=finalScores(body,JSON.parse(game.roster));
 await registerGame(db,{gameId:id,secret,players:JSON.parse(game.roster)},now);
 const statements=scores.map(p=>db.prepare('INSERT INTO ranking_scores (game_id,player_id,nickname,score,completed_at) SELECT ?,?,?,?,? FROM ranking_games WHERE id=? AND token_hash=? AND completed_at IS NULL ON CONFLICT(game_id,player_id) DO NOTHING').bind(id,p.id,p.name,p.score,now,id,game.token_hash));
 statements.push(db.prepare('UPDATE ranking_games SET completed_at=? WHERE id=? AND token_hash=? AND completed_at IS NULL').bind(now,id,game.token_hash));
 await db.batch(statements);return {recorded:true,duplicate:false};
}
export async function topRanking(db){
 const result=await db.prepare('SELECT nickname,score,1 AS games FROM (SELECT *,ROW_NUMBER() OVER (PARTITION BY nickname ORDER BY score DESC,completed_at ASC,game_id ASC,player_id ASC) AS position FROM ranking_scores) WHERE position=1 ORDER BY score DESC,completed_at ASC,nickname ASC LIMIT 10').all();
 return {entries:result.results.map((p,i)=>({rank:i+1,nickname:p.nickname,score:Number(p.score),games:1})),updatedAt:Date.now()};
}
