import {movementPath,backwardPath} from './movement.js?v=8e61fac21b67';
import {BOARD} from './data.js?v=8e61fac21b67';
export const ROLL_TIMING=Object.freeze({lead:2800,roll:2200,result:2400,close:600,step:720,arrival:680});
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
export function shouldPresentRoll(snapshot,lastId,now){const p=snapshot?.rollPresentation;return !!p&&p.id!==lastId&&p.finishAt>now&&p.turnNumber===snapshot.state?.turnNumber&&p.actorId===snapshot.state?.turn;}

export function rollArrivalNotice(state){
 const cell=BOARD[state.players[state.turn].position];
 if(cell.type==='work')return {type:'work-arrival',title:'작품에 도착했어요',actorId:state.turn,round:state.round,workId:cell.id,changes:[],text:`${cell.composer} 「${cell.title}」 · 구입가 ${cell.price} MC`};
 if(cell.type==='streaming')return {type:'streaming-arrival',title:'스트리밍 앱 인수',actorId:state.turn,round:state.round,appId:cell.id,changes:[],text:cell.subtitle};
 return null;
}
