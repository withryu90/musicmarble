import {BOARD,WORKS,PRISON_MESSAGE} from './data.js?v=6c8b417e3ccc';

// Public, structured notices for each atomic server action; never parse prose logs.
export function activityChanges(before,after){
 if(!before||!after)return [];
 const notices=[],add=(type,title,fields={})=>notices.push({type,title,round:after.round,actorId:after.turn,...fields});
 const coin=(playerId,amount)=>({playerId,amount});
 const rolled=['roll','backward-roll'].includes(before.phase)&&after.phase!=='roll'&&before.turn===after.turn&&before.turnNumber===after.turnNumber&&Number.isInteger(after.dice);
 if(rolled){
  const actor=after.turn;
  if(after.phase==='backward-roll')add('backward-entry','뒤로가기 · 주사위를 한 번 더 굴려요',{changes:[],text:'주사위를 한 번 더 굴려 나온 숫자만큼 뒤로 이동합니다. 뒤로 이동해 도착한 칸의 규칙을 적용합니다.'});
  if(after.lastBackwardMove){const move=after.lastBackwardMove;add('backward-move',`뒤로 ${move.steps}칸 이동`,{changes:[],text:`추가 주사위 결과는 ${move.steps}입니다. ${move.steps}칸 뒤로 이동했습니다. 도착한 곳은 「${BOARD[move.to].title}」입니다.`});}
  if(before.players[actor].position+after.dice>=BOARD.length)add('start-bonus','한 바퀴 완주 보너스',{changes:[coin(actor,200)],text:'시대의 문을 지나 200 MC를 받았습니다.'});
  if(after.lastRent){const r=after.lastRent,w=WORKS.find(w=>w.id===r.workId);add('rent','가상 이용료 지급',{workId:r.workId,otherId:r.owner,amount:r.amount,expected:r.expected??null,changes:[coin(actor,-r.amount),coin(r.owner,r.amount)],text:`${w.composer} 「${w.title}」 이용료를 지급했습니다.`});}
  if(after.lastAssignment){const t=after.lastAssignment;
   if(t.skipped)add('copyright-transfer-skipped','양도할 작품 없음',{actorId:t.from,changes:[],text:'보유한 작품이 없어 저작권 양도 없이 이 칸을 통과했습니다.'});
   else{const w=WORKS.find(w=>w.id===t.workId);add('copyright-transfer','저작권 양도',{actorId:t.from,otherId:t.to,workId:t.workId,amount:t.price,changes:[],text:`${after.players[t.from].name} 님의 최고가 작품 ${w.composer} 「${w.title}」의 게임 속 가상 저작재산권을 ${after.players[t.to].name} 님에게 무상 양도했습니다.`,assignment:{...t}});}
  }
  if(after.lastPrisonTransfer)add('prison-transfer','감옥으로 이동',{changes:[],text:'「감옥으로 가기」 칸에 도착하여 불법 스트리밍 감옥으로 이동합니다. 다음 두 번의 자기 차례에 주사위 6으로 탈출에 도전합니다.'});
  if(after.lastPrisonRoll){const r=after.lastPrisonRoll;add('prison-roll',r.escaped?'감옥 탈출 성공!':r.remaining?'감옥 탈출 실패':'감옥 대기 종료',{changes:[],escaped:r.escaped,text:r.escaped?'주사위 6! 감옥에서 즉시 탈출하여 6칸 이동합니다.':r.remaining?`주사위 ${r.dice}. 감옥에 머뭅니다. 다음 자기 차례에 한 번 더 도전할 수 있습니다.`:`주사위 ${r.dice}. 두 번의 도전을 마쳤습니다. 이번 차례는 감옥에 머물고 다음 자기 차례부터 정상 이동합니다.`});}
  if(!after.lastPrisonRoll&&BOARD[after.players[actor].position].type==='prison')add('prison-entry','불법 스트리밍 감옥',{changes:[],text:PRISON_MESSAGE});
  if(after.lastEvent)add('history-event',after.lastEvent.title,{card:{...after.lastEvent},changes:[coin(actor,after.lastEvent.actual)],text:after.lastEvent.text});
  if(BOARD[after.players[actor].position].type==='concert')add('concert','모두의 음악회 지원금',{changes:after.players.map(p=>coin(p.id,100)),text:'모든 참가자가 음악회 지원금 100 MC를 받았습니다.'});
 }
 for(const w of WORKS){
  const previous=before.ownership[w.id],next=after.ownership[w.id];
  if(!previous&&next)add('purchase','작품 이용권 구입',{actorId:next.player,workId:w.id,changes:[coin(next.player,-w.price)],text:`${w.composer} 「${w.title}」의 가상 이용권을 구입했습니다.`});
  else if(previous&&!next){const amount=Math.floor((w.price+previous.level*100)/2);add('sale','이용권 은행 반납',{actorId:previous.player,workId:w.id,changes:[coin(previous.player,amount)],text:`「${w.title}」 이용권을 은행에 반납했습니다.`});}
  else if(previous&&next&&previous.player!==next.player){if(rolled&&after.lastAssignment?.workId===w.id)continue;const price=before.trade?.price??0;add('trade-complete','이용권 거래 성사',{actorId:next.player,otherId:previous.player,workId:w.id,changes:[coin(next.player,-price),coin(previous.player,price)],text:`「${w.title}」 이용권이 새로운 참가자에게 이전되었습니다.`});}
  else if(previous&&next&&next.level>previous.level)add('upgrade','공연 프로젝트 완성',{actorId:next.player,workId:w.id,changes:[coin(next.player,-100)],text:`「${w.title}」 공연을 기획했습니다. 기본 이용료가 20 MC 높아집니다.`});
 }
 if(before.phase==='purchase-quiz'&&after.phase==='purchase-feedback')add('purchase-quiz-result',after.purchaseChallenge.correct?'구입 OX 퀴즈 정답':'구입 OX 퀴즈 오답',{correct:after.purchaseChallenge.correct,workId:after.purchaseChallenge.workId,changes:[],text:after.purchaseChallenge.correct?'구입 OX 퀴즈를 맞혔습니다.':'구입 OX 퀴즈를 틀렸습니다.'});
 if(before.phase==='quiz'&&after.phase==='feedback')add('quiz-result',after.feedback.correct?'배움퀴즈를 맞혔습니다!':'배움퀴즈를 틀렸습니다.',{correct:after.feedback.correct,changes:[coin(after.turn,after.feedback.correct?80:0)],text:after.feedback.correct?'배움퀴즈를 맞혔습니다.':'배움퀴즈를 틀렸습니다.'});
 if(!before.trade&&after.trade){const t=after.trade;add('trade-offer','이용권 거래 제안',{actorId:t.from,otherId:t.to,workId:t.workId,amount:t.price,changes:[],text:`「${WORKS.find(w=>w.id===t.workId).title}」 이용권의 거래 가격 ${t.price} MC를 제안했습니다.`});}
 if(before.trade&&!after.trade&&!notices.some(n=>n.type==='trade-complete'))add('trade-cancelled','거래 거절 또는 취소',{actorId:before.trade.from,otherId:before.trade.to,workId:before.trade.workId,changes:[],text:'거래가 성사되지 않아 이용권과 코인은 이전되지 않았습니다.'});
 if(after.endReason?.type==='bankruptcy'&&before.endReason?.type!=='bankruptcy'){const id=after.endReason.playerId;add('bankruptcy','파산으로 게임 종료',{actorId:id,changes:[],text:`${after.players[id].name} 님의 보유 코인이 0 MC가 되어 2인 게임을 종료합니다. 최종 결과를 확인해 주세요.`});}
 if(after.endReason?.type==='laps'&&before.endReason?.type!=='laps'){const id=after.endReason.playerId;add('first-finish','첫 완주로 게임 종료',{actorId:id,changes:[],text:`${after.players[id].name} 님이 가장 먼저 ${after.maxRounds}바퀴를 완주해 게임을 종료합니다.`});}
 return notices;
}

// Each client consumes the same room journal once, including repeated SSE snapshots.
export class ActivityInbox{
 constructor(){this.reset();}
 reset(){this.room=null;this.seen=0;this.pending=[];}
 accept(room,items=[]){
  const ordered=[...items].sort((a,b)=>a.id-b.id);
  if(this.room!==room){this.room=room;this.seen=ordered.at(-1)?.id??0;this.pending=[];return;}
  for(const item of ordered)if(item.id>this.seen){this.pending.push(item);this.seen=item.id;}
 }
 take(){return this.pending.shift()??null;}
}
