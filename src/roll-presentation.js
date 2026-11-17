import {movementPath,backwardPath} from './movement.js?v=7e4a5cbb0abf';
import {BOARD} from './data.js?v=7e4a5cbb0abf';
export const ROLL_TIMING=Object.freeze({lead:1200,roll:1000,result:1600,close:400,step:720,arrival:680});
export function rollPath(before,after){
 const actor=before.turn,dice=after.dice,backward=before.phase==='backward-roll';
 if(after.lastPrisonRoll&&!after.lastPrisonRoll.escaped)return [];
 const steps=after.endReason?.type==='laps'?after.endReason.moveSteps??dice:dice;
 const path=(backward?backwardPath:movementPath)(before.players[actor].position,steps,BOARD.length);
 const back=after.lastBackwardMove,transfer=after.lastPrisonTransfer;
 if(!backward&&back&&path.at(-1)===back.from)path.push(...backwardPath(back.from,back.steps,BOARD.length));
 if(transfer&&path.at(-1)===transfer.from)path.push(transfer.to);
 return path;
}
export function createRollPresentation(before,after,id,now=Date.now()){
 const startAt=now+ROLL_TIMING.lead,resultAt=startAt+ROLL_TIMING.roll,closeAt=resultAt+ROLL_TIMING.result,moveAt=closeAt+ROLL_TIMING.close,path=rollPath(before,after);
 return {id,actorId:before.turn,turnNumber:before.turnNumber,before:structuredClone(before),dice:after.dice,path,startAt,resultAt,closeAt,moveAt,finishAt:moveAt+path.length*ROLL_TIMING.step+ROLL_TIMING.arrival};
}
export function presentationStage(plan,now){
 if(now<plan.startAt)return 'waiting';if(now<plan.resultAt)return 'rolling';if(now<plan.closeAt)return 'result';if(now<plan.moveAt)return 'closing';if(now<plan.finishAt)return 'moving';return 'finished';
}
export function presentedSteps(plan,now){return Math.max(0,Math.min(plan.path.length,Math.floor((now-plan.moveAt)/ROLL_TIMING.step)));}
export function rollSnapshotMatches(plan,snapshot){
 const s=snapshot?.state,actor=plan?.actorId,player=s?.players?.[actor],before=plan?.before?.players?.[actor];
 if(!player||!before||!Array.isArray(plan.path)||s.turn!==actor||s.turnNumber!==plan.turnNumber||s.dice!==plan.dice)return false;
 if(snapshot.rollPresentation&&snapshot.rollPresentation.id!==plan.id)return false;
 if(player.position!==(plan.path.at(-1)??before.position))return false;
 return s.phase!=='backward-roll'||BOARD[player.position]?.type==='back-three';
}
export function shouldPresentRoll(snapshot,lastId,now){const p=snapshot?.rollPresentation;return !!p&&p.id!==lastId&&p.finishAt>now&&rollSnapshotMatches(p,snapshot);}

export function rollArrivalNotice(state){
 const cell=BOARD[state.players[state.turn].position];
 if(cell.type==='work')return {type:'work-arrival',title:'작품에 도착했어요',actorId:state.turn,round:state.round,workId:cell.id,changes:[],text:`${cell.composer} 「${cell.title}」 · 구입가 ${cell.price} MC`};
 if(cell.type==='work-swap')return {type:'work-swap-arrival',title:'작품 트레이드',actorId:state.turn,round:state.round,changes:[],text:'보드에서 원하는 상대 작품과 내 작품을 한 개씩 골라 맞바꿀 수 있어요.'};
 if(cell.type==='streaming')return {type:'streaming-arrival',title:'스트리밍 앱 인수',actorId:state.turn,round:state.round,appId:cell.id,changes:[],text:cell.subtitle};
 return null;
}
