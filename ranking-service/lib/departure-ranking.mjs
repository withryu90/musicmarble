import {activePlayers,score} from '../../src/engine.js';
import {randomToken} from '../../src/random.js';
import {registerGame} from './ranking-core.mjs';
// Trusted authoritative room state, never a client-supplied score or host token.
export async function recordDepartureGame(db,room,now=Date.now()){
 if(room.rankingRecorded||room.state?.phase!=='finished'||!room.state.players.some(p=>p.withdrawn)||room.rollPresentation?.finishAt>now)return;
 const players=activePlayers(room.state).filter(p=>!p.isBot);if(!players.length)return;
 let game=await db.prepare('SELECT roster,completed_at FROM ranking_games WHERE id=?').bind(room.gameId).first();
 if(!game){await registerGame(db,{gameId:room.gameId,secret:randomToken(),players:players.map(p=>({id:p.id,name:p.name}))},now);game=await db.prepare('SELECT roster,completed_at FROM ranking_games WHERE id=?').bind(room.gameId).first();}
 if(game.completed_at!==null){room.rankingRecorded=true;return;}
 const roster=JSON.parse(game.roster);if(players.some(p=>!roster.some(r=>r.id===p.id&&r.name===p.name)))throw Error('참가자 기록을 확인해 주세요.');
 const rows=players.map(p=>db.prepare('INSERT INTO ranking_scores (game_id,player_id,nickname,score,completed_at) SELECT ?,?,?,?,? FROM ranking_games WHERE id=? AND completed_at IS NULL ON CONFLICT(game_id,player_id) DO NOTHING').bind(room.gameId,p.id,p.name,score(room.state,p),now,room.gameId));
 rows.push(db.prepare('UPDATE ranking_games SET completed_at=? WHERE id=? AND completed_at IS NULL').bind(now,room.gameId));
 await db.batch(rows);room.rankingRecorded=true;
}
