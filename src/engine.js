import {ROUND_OPTIONS} from './lobby-config.js?v=749829219847';
import {LISTENING_HINTS,LISTENING_HINT_PRICE,listeningHintDurationMs} from './listening-hints.js?v=749829219847';
import {STREAMING_APPS,STREAMING_RIGHTS_PRICE,STREAMING_INSTALL_PRICE,STREAMING_REVENUE,streamingApp} from './streaming.js?v=749829219847';
import { BOARD, LEGACY_BOARD, WORKS, QUIZZES, EVENTS, CONCERT_SEATS } from './data.js?v=749829219847';
import {characterById,drawCharacterIds} from './characters.js?v=749829219847';
import {PURCHASE_QUIZZES,purchaseQuizById} from './purchase-quizzes.js?v=749829219847';
export const VERSION=2;
export const MAX_PLAYERS=4;
export const BAIL_AMOUNT=400;
export const PRISON_ATTEMPTS=3;
export const QUIZ_TIME_LIMIT=10000;
export const LEARNING_QUIZ_TIME_LIMIT=15000;
export const quizTimeLimit=s=>['quiz','feedback'].includes(s.phase)?LEARNING_QUIZ_TIME_LIMIT:QUIZ_TIME_LIMIT;
export const COLORS=['#607f76','#bd795e','#7e78a5','#6c91ac','#b09a54'];
export const current=s=>s.players[s.turn];
export const activePlayers=s=>s.players.filter(p=>!p.withdrawn);
// Old saves recorded only the first player's laps; retain that known progress.
export const completedLaps=(s,p)=>p.laps??(p.id===0?s.leaderLaps??0:0);
export const hasFinished=(s,p)=>completedLaps(s,p)>=s.maxRounds;
export const allFinished=s=>activePlayers(s).every(p=>hasFinished(s,p));
export const firstFinisher=s=>activePlayers(s).find(p=>hasFinished(s,p));
export function nextPlayerIndex(s){
  for(let step=1;step<=s.players.length;step++){const index=(s.turn+step)%s.players.length;if(!s.players[index].withdrawn&&!hasFinished(s,s.players[index]))return index;}
  return s.turn;
}
function updateProgress(s){s.leaderLaps=completedLaps(s,s.players[0]);s.round=Math.min(Math.min(...activePlayers(s).map(p=>completedLaps(s,p)))+1,s.maxRounds);}
export const owned=(s,id)=>Number.isInteger(id)&&s.players[id]?WORKS.filter(w=>s.ownership[w.id]?.player===id):[];
export function collection(s,work,player){
  const all=owned(s,player);
  if(all.filter(w=>w.era===work.era).length>=4)return {name:'시대 컬렉션',multiplier:2};
  if(all.filter(w=>w.composer===work.composer).length===2)return {name:`${work.composer} 컬렉션`,multiplier:1.5};
  return {name:'기본 이용료',multiplier:1};
}
export const fee=(s,w)=>Math.round((w.fee+(s.ownership[w.id]?.level||0)*20)*collection(s,w,s.ownership[w.id]?.player).multiplier);
export const score=(s,p)=>p.coins+owned(s,p.id).reduce((n,w)=>n+w.price+(s.ownership[w.id].level||0)*100,0)+Object.values(s.platformOwners||{}).filter(id=>id===p.id).length*STREAMING_RIGHTS_PRICE+Object.values(s.streamingInstallations||{}).reduce((sum,apps)=>sum+Object.values(apps).filter(id=>id===p.id).length*STREAMING_INSTALL_PRICE,0);
const clone=s=>structuredClone(s);
function log(s,text){s.log.unshift({round:s.round,text});s.log=s.log.slice(0,60);}
function finishByLaps(s,player,moveSteps){
 s.quizDeadline=null;s.phase='finished';s.round=s.maxRounds;s.trade=null;s.quiz=null;s.feedback=null;s.purchaseChallenge=null;
 s.endReason={type:'laps',playerId:player.id,...(moveSteps===undefined?{}:{moveSteps})};
 log(s,`${player.name}: 가장 먼저 ${s.maxRounds}바퀴 완주! 게임을 종료합니다.`);return s;
}
function checkBankruptcy(s){
  if(s.players.length!==2||s.phase==='finished')return s;
  const player=s.players.find(p=>p.coins===0);if(!player)return s;
  s.quizDeadline=null;s.phase='finished';s.endReason={type:'bankruptcy',playerId:player.id};s.trade=null;s.quiz=null;s.feedback=null;s.purchaseChallenge=null;
  log(s,`${player.name}: 보유 코인 0 MC로 파산 — 2인 게임을 즉시 종료합니다.`);return s;
}
function change(s,p,amount){const actual=Math.max(-p.coins,amount);p.coins+=actual;if(actual!==amount)log(s,`${p.name}: 잔액 한도에서 ${-actual} MC 지급. 수업 모드에서 부족액은 면제됩니다.`);return actual;}
const shuffled=(items,rng)=>{const arr=[...items];for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
export function createGame({names=['초록 팀','오렌지 팀'],rounds=4,coins=1500,characterIds}={},rng=Math.random){
  if(!Array.isArray(names)||names.length<2||names.length>MAX_PLAYERS||!names.every(n=>typeof n==='string'&&n.trim().length>0&&n.length<=16))throw Error('2–4명의 이름을 입력해 주세요.');
  if(!ROUND_OPTIONS.includes(rounds)||![1000,1200,1500,1600].includes(coins))throw Error('수업 설정이 올바르지 않습니다.');
  const assigned=characterIds??drawCharacterIds(names.length,[],rng);
  if(!Array.isArray(assigned)||assigned.length!==names.length||new Set(assigned).size!==names.length||!assigned.every(characterById))throw Error('중복되지 않는 캐릭터를 배정해 주세요.');
  return {version:VERSION,boardLayout:2,quizHistory:{},platformOwners:{},streamingInstallations:{},streamingHandled:false,lastStreamingRevenue:[],players:names.map((name,id)=>({id,name:name.trim(),characterId:assigned[id],color:COLORS[id],coins,position:0,laps:0,skipTurns:0,bailPaid:false,knowledge:0,attempts:0})),round:1,maxRounds:rounds,leaderLaps:0,turnNumber:0,turn:0,phase:'roll',endReason:null,ownership:{},dice:null,lastRent:null,lastEvent:null,lastAssignment:null,lastSkipped:[],lastPrisonTransfer:null,lastPrisonRoll:null,lastBackwardMove:null,lastConcert:null,quiz:null,feedback:null,quizUsed:false,purchased:false,concertWorkId:null,purchaseChallenge:null,trade:null,eventDeck:shuffled(EVENTS.map((_,i)=>i),rng),quizDeck:shuffled(QUIZZES.map(q=>q.id),rng),eventCursor:0,quizCursor:0,log:[{round:1,text:'음악사 여행을 시작합니다. 첫 팀이 주사위를 굴려 주세요.'}]};
}
// Resume only complete recognized quiz banks; remove retired topics without changing scores.
export function migrateRetiredQuiz(state){
 const deck=state?.quizDeck,ids=QUIZZES.map(q=>q.id),known=new Set(ids);
 const history=['q1','q2','q3','q4','q9',...Array.from({length:15},(_,i)=>`q${i+11}`)];
 const retired=new Set([...history,'q6','q7','q10','q26','q27','q28','q29','q30']);
 if(!Array.isArray(deck)||!deck.length||new Set(deck).size!==deck.length||!deck.every(id=>known.has(id)||retired.has(id)))return state;
 const historyCount=history.filter(id=>deck.includes(id)).length,activeCount=ids.filter(id=>deck.includes(id)).length;
 const previous=Array.from({length:10},(_,i)=>`q${i+31}`);
 const previousBank=activeCount===previous.length&&previous.every(id=>deck.includes(id));
 if(historyCount!==0&&historyCount!==history.length||activeCount!==0&&activeCount!==ids.length&&!previousBank||historyCount===0&&activeCount!==ids.length&&!previousBank)return state;
 if(deck.length===known.size&&deck.every(id=>known.has(id)))return state;
 const s=clone(state),cursor=s.quizCursor;
 s.quizDeck=activeCount?[...deck.filter(id=>known.has(id)),...ids.filter(id=>!deck.includes(id))]:[...ids];
 if(Number.isInteger(cursor)&&cursor>=0)s.quizCursor=Math.floor(cursor/deck.length)*s.quizDeck.length+deck.slice(0,cursor%deck.length).filter(id=>known.has(id)).length;
 if(retired.has(s.quiz)){
  if(s.phase==='quiz'){s.quiz=s.quizDeck[s.quizCursor%s.quizDeck.length];s.quizCursor++;}
  else if(s.phase==='feedback'){s.phase='action';s.quiz=null;s.feedback=null;}
 }
 return s;
}
// Persist bounded per-player counts, so reconnects and server restarts keep question variety.
function rememberQuestion(s,playerId,bank,id){
 const record=s.quizHistory[playerId]??={counts:{},last:{}};
 record.counts[id]=(record.counts[id]||0)+1;record.last[bank]=id;
}
function ensureQuizHistory(s){
 if(s.quizHistory!==undefined)return;
 s.quizHistory={};
 // Older saves cannot recover past questions, but can retain the one currently shown.
 if(['quiz','feedback'].includes(s.phase)&&QUIZZES.some(q=>q.id===s.quiz))rememberQuestion(s,s.turn,'learning',s.quiz);
 const q=purchaseQuizById(s.purchaseChallenge?.questionId);
 if(q)rememberQuestion(s,s.turn,q.workId,q.id);
}
function drawQuestion(s,bank,ids,rng){
 ensureQuizHistory(s);
 const record=s.quizHistory[s.turn],count=id=>record?.counts[id]||0;
 const least=Math.min(...ids.map(count));let pool=ids.filter(id=>count(id)===least);
 if(pool.length>1)pool=pool.filter(id=>id!==record?.last[bank]);
 const total=id=>Object.values(s.quizHistory).reduce((sum,p)=>sum+(p.counts[id]||0),0);
 const roomLeast=Math.min(...pool.map(total));pool=pool.filter(id=>total(id)===roomLeast);
 const id=pool[rng?Math.min(pool.length-1,Math.floor(rng()*pool.length)):0];
 rememberQuestion(s,s.turn,bank,id);return id;
}
function validQuizHistory(s){
 if(s.quizHistory===undefined)return true;
 const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
 const known=new Set([...QUIZZES,...PURCHASE_QUIZZES].map(q=>q.id));
 return object(s.quizHistory)&&Object.entries(s.quizHistory).every(([player,record])=>
  /^\d$/.test(player)&&s.players[Number(player)]&&object(record)&&object(record.counts)&&object(record.last)&&
  Object.entries(record.counts).every(([id,count])=>known.has(id)&&Number.isSafeInteger(count)&&count>0)&&
  Object.entries(record.last).every(([bank,id])=>record.counts[id]>0&&(bank==='learning'?QUIZZES.some(q=>q.id===id):PURCHASE_QUIZZES.some(q=>q.workId===bank&&q.id===id))));
}
function openQuiz(s){
  const pool=s.quizDeck.filter(id=>QUIZZES.some(q=>q.id===id));
  const offset=s.quizCursor%pool.length;
  s.quiz=drawQuestion(s,'learning',[...pool.slice(offset),...pool.slice(0,offset)]);s.quizDeadline=null;s.quizCursor++;s.phase='quiz';s.quizUsed=true;
}
export function roll(state,dice,rng=Math.random){
  if(state.phase==='backward-roll')return rollBackward(state,dice,rng);
  if(state.phase!=='roll'||hasFinished(state,current(state)))throw Error('현재는 주사위를 굴릴 수 없습니다.');
  if(!Number.isInteger(dice)||dice<1||dice>6)throw Error('주사위 값은 1–6입니다.');
  const s=clone(state),p=current(s);s.dice=dice;s.phase='action';s.swapHandled=false;s.lastSwap=null;s.streamingHandled=false;s.lastStreamingRevenue=[];s.lastConcert=null;s.lastEvent=null;s.lastRent=null;s.lastAssignment=null;s.lastSkipped=[];s.lastPrisonTransfer=null;s.lastPrisonRoll=null;s.lastBail=null;s.lastBackwardMove=null;s.feedback=null;s.quizUsed=false;s.purchased=false;s.concertWorkId=null;s.purchaseChallenge=null;
  if(p.bailPaid){p.bailPaid=false;log(s,`${p.name}: 보석금 납부 완료 — 일반 주사위로 감옥에서 출발`);}
  if((p.skipTurns??0)>0){
    if(BOARD[p.position].type!=='prison')throw Error('감옥 위치를 확인해 주세요.');
    const escaped=dice===6;p.skipTurns=escaped?0:p.skipTurns-1;
    s.lastPrisonRoll={dice,escaped,remaining:p.skipTurns};
    log(s,`${p.name}: 탈출 주사위 ${dice} — ${escaped?'탈출 성공! 6칸 이동':p.skipTurns?'탈출 실패, 다음 자기 차례에 한 번 더 도전':'세 번 도전 완료, 다음 자기 차례부터 정상 이동'}`);
    if(!escaped){s.phase='jailed';return s;}
  }
  const next=p.position+dice;if(next>=BOARD.length){p.coins+=200;p.laps=completedLaps(s,p)+1;updateProgress(s);log(s,`${p.name}: 한 바퀴 완주! +200 MC (${p.laps}/${s.maxRounds}바퀴)`);if(hasFinished(s,p)){const moveSteps=BOARD.length-p.position;p.position=0;return finishByLaps(s,p,moveSteps);}}p.position=next%BOARD.length;
  return resolveArrival(s,p,rng);
}
export function canPayBail(s){
 const p=current(s);return s.phase==='jailed'&&!s.trade&&BOARD[p.position].type==='prison'&&(p.skipTurns??0)>0&&!p.bailPaid&&p.coins>=BAIL_AMOUNT;
}
export function payBail(state){
 if(!canPayBail(state))throw Error('감옥에 갇힌 본인 차례에 보석금 400 MC를 낼 수 있습니다.');
 const s=clone(state),p=current(s);p.coins-=BAIL_AMOUNT;p.skipTurns=0;p.bailPaid=true;
 s.lastPrisonRoll=null;s.lastBail={playerId:p.id,amount:BAIL_AMOUNT};
 log(s,`${p.name}: 보석금 -${BAIL_AMOUNT} MC — 이번 차례는 마치고 다음 자기 차례에 일반 주사위로 석방`);
 return checkBankruptcy(s);
}
export function rollBackward(state,dice,rng=Math.random){
 if(state.phase!=='backward-roll'||BOARD[current(state).position].type!=='back-three')throw Error('뒤로가기 칸에서 추가 주사위를 굴려 주세요.');
 if(!Number.isInteger(dice)||dice<1||dice>6)throw Error('주사위 값은 1–6입니다.');
 const s=clone(state),p=current(s),from=p.position;s.dice=dice;s.phase='action';
 s.swapHandled=false;s.lastSwap=null;s.streamingHandled=false;s.lastStreamingRevenue=[];s.lastConcert=null;s.lastEvent=null;s.lastRent=null;s.lastAssignment=null;s.lastPrisonTransfer=null;s.lastPrisonRoll=null;s.lastBail=null;s.feedback=null;s.quizUsed=false;s.purchased=false;s.concertWorkId=null;s.purchaseChallenge=null;
 p.position=(from-dice+BOARD.length)%BOARD.length;s.lastBackwardMove={from,to:p.position,steps:dice};
 return resolveArrival(s,p,rng);
}
function resolveArrival(s,p,rng){
  const cell=BOARD[p.position];
  log(s,`${p.name}: ${s.lastBackwardMove?'뒤로 ':''}${s.dice}칸 이동 → ${cell.title}`);
  if(cell.type==='back-three'){
    s.phase='backward-roll';log(s,`${p.name}: 뒤로가기 — 주사위를 한 번 더 굴려 나온 숫자만큼 뒤로 이동합니다.`);return s;
  }
  if(cell.type==='work'){
    const owner=s.ownership[cell.id];if(owner?.player===p.id&&owner.level===0)s.concertWorkId=cell.id;if(owner&&owner.player!==p.id){const cost=fee(s,cell),actual=-change(s,p,-cost);s.players[owner.player].coins+=actual;s.lastRent={workId:cell.id,owner:owner.player,amount:actual,expected:cost};log(s,`${p.name} → ${s.players[owner.player].name}: 가상 이용료 ${actual} MC (기준 ${cost} MC)`);}
  }else if(cell.type==='event'){
    const event=EVENTS[s.eventDeck[s.eventCursor++%EVENTS.length]];const actual=change(s,p,event.amount);s.lastEvent={...event,actual};log(s,`${event.title}: ${p.name} ${actual>=0?'+':''}${actual} MC`);
  }else if(cell.type==='prison'||cell.type==='go-to-prison'){
    if(cell.type==='go-to-prison'){
      const destination=BOARD.findIndex(c=>c.type==='prison');
      s.lastPrisonTransfer={from:p.position,to:destination};p.position=destination;
      log(s,`${p.name}: 감옥으로 가기 → 불법 스트리밍 감옥으로 즉시 이동`);
    }
    p.skipTurns=PRISON_ATTEMPTS;p.bailPaid=false;s.phase='jailed';log(s,`${p.name}: 불법 스트리밍 감옥에 도착 — 다음 세 자기 차례에 6으로 탈출 도전`);
  }else if(cell.type==='transfer'){
    const works=owned(s,p.id);
    if(!works.length){s.lastAssignment={from:p.id,skipped:true};log(s,`${p.name}: 저작권 양도 — 보유 작품이 없어 통과`);}
    else{
      const highest=Math.max(...works.map(w=>w.price)),candidates=works.filter(w=>w.price===highest);
      const work=candidates[Math.floor(rng()*candidates.length)],recipients=activePlayers(s).filter(player=>player.id!==p.id),recipient=recipients[Math.floor(rng()*recipients.length)];
      s.ownership[work.id].player=recipient.id;
      s.lastAssignment={from:p.id,to:recipient.id,workId:work.id,price:work.price,skipped:false};
      log(s,`${p.name} → ${recipient.name}: 최고가 작품 「${work.title}」 가상 저작재산권 무상 양도 (${work.price} MC 기준)`);
    }
  }else if(cell.type==='quiz'||cell.type==='copyright')openQuiz(s);
  else if(cell.type==='concert'){
    const tickets=activePlayers(s).filter(guest=>guest.id!==p.id).map(guest=>{
      const seat=CONCERT_SEATS[Math.min(CONCERT_SEATS.length-1,Math.floor(rng()*CONCERT_SEATS.length))];
      const amount=-change(s,guest,-seat.price);p.coins+=amount;
      log(s,`${guest.name} → ${p.name}: 음악회 ${seat.name} 티켓비 ${amount} MC (정가 ${seat.price} MC)`);
      return {playerId:guest.id,seatId:seat.id,price:seat.price,amount};
    });
    s.lastConcert={hostId:p.id,tickets,total:tickets.reduce((sum,t)=>sum+t.amount,0)};
    log(s,`${p.name}: 음악회 개최! 티켓 수입 ${s.lastConcert.total} MC`);
  }
  if(cell.type==='work')for(const app of STREAMING_APPS){
    const ownerId=s.streamingInstallations?.[cell.id]?.[app.id];if(ownerId===undefined)continue;
    const self=ownerId===p.id,amount=self?0:-change(s,p,-STREAMING_REVENUE);
    if(!self)s.players[ownerId].coins+=amount;
    s.lastStreamingRevenue.push({appId:app.id,workId:cell.id,playerId:ownerId,payerId:p.id,amount,expected:STREAMING_REVENUE,self});
    log(s,self?`${p.name}: 내 ${app.name} 자동 스트리밍 — 추가 비용 없음`:`${p.name} → ${s.players[ownerId].name}: ${app.name} 자동 스트리밍 이용료 ${amount} MC (기준 ${STREAMING_REVENUE} MC)`);
  }
  return checkBankruptcy(s);
}
// New 9x9 saves carry an explicit layout marker; old positions follow their old tile IDs.
export function migrateBoardLayout(state){
 if(!state||state.boardLayout!==undefined||!Array.isArray(state.players)||!state.players.every(p=>Number.isInteger(p.position)&&LEGACY_BOARD[p.position]))return state;
 const s=clone(state),map=i=>BOARD.findIndex(c=>c.id===LEGACY_BOARD[i]?.id);
 s.players.forEach(p=>p.position=map(p.position));s.boardLayout=2;s.platformOwners={};s.streamingInstallations={};s.swapHandled=false;s.lastSwap=null;s.streamingHandled=false;s.lastStreamingRevenue=[];
 if(s.lastPrisonTransfer)s.lastPrisonTransfer={from:map(s.lastPrisonTransfer.from),to:map(s.lastPrisonTransfer.to)};
 // Completed visual paths belong to the former perimeter, and must not replay.
 s.lastBackwardMove=null;return s;
}
export function canBuyPlatform(s){const c=BOARD[current(s).position];return s.phase==='action'&&!s.trade&&!s.streamingHandled&&c.type==='streaming'&&s.platformOwners?.[c.id]===undefined&&current(s).coins>=STREAMING_RIGHTS_PRICE;}
export function streamingOptions(s){
 if(s.phase!=='action'||s.trade||s.streamingHandled)return [];
 const p=current(s),c=BOARD[p.position];
 if(c.type!=='work'||p.coins<STREAMING_INSTALL_PRICE)return [];
 return STREAMING_APPS.filter(app=>s.platformOwners?.[app.id]===p.id&&s.streamingInstallations?.[c.id]?.[app.id]===undefined);
}
export const streamingOpportunity=s=>canBuyPlatform(s)||streamingOptions(s).length>0;
export function buyPlatform(state){
 if(!canBuyPlatform(state))throw Error('도착한 스트리밍 앱 칸에서 아직 인수되지 않은 앱을 인수할 수 있습니다. (200 MC)');
 const s=clone(state),p=current(s),c=BOARD[p.position];s.platformOwners??={};s.platformOwners[c.id]=p.id;p.coins-=STREAMING_RIGHTS_PRICE;s.streamingHandled=true;
 log(s,`${p.name}: ${streamingApp(c.id).name} 앱 인수, -${STREAMING_RIGHTS_PRICE} MC`);return checkBankruptcy(s);
}
export function installStreaming(state,appId){
 if(!streamingOptions(state).some(app=>app.id===appId))throw Error('도착한 작품 칸에 내 앱의 자동 스트리밍을 설치해 주세요. (50 MC, 앱별 1회)');
 const s=clone(state),p=current(s),c=BOARD[p.position];s.streamingInstallations??={};s.streamingInstallations[c.id]??={};s.streamingInstallations[c.id][appId]=p.id;
 p.coins-=STREAMING_INSTALL_PRICE;s.streamingHandled=true;log(s,`${p.name}: 「${c.title}」에 ${streamingApp(appId).name} 자동 스트리밍 설치, -${STREAMING_INSTALL_PRICE} MC`);return checkBankruptcy(s);
}
export function skipStreaming(state){
 if(!streamingOpportunity(state))throw Error('현재 선택할 스트리밍 기회가 없습니다.');
 const s=clone(state);s.streamingHandled=true;return s;
}
export function startPurchaseQuiz(state,rng=Math.random){
 const s=clone(state),p=current(s),w=BOARD[p.position];
 if(s.phase!=='action'||s.trade||w.type!=='work'||s.ownership[w.id])throw Error('도착한 빈 작품 칸에서만 음악 퀴즈를 풀 수 있습니다.');
 if(s.purchaseChallenge)throw Error('음악 퀴즈는 도착할 때 한 번만 도전할 수 있습니다.');
 if(p.coins<w.price)throw Error('뮤직코인이 부족합니다.');
 const ids=PURCHASE_QUIZZES.filter(q=>q.workId===w.id).map(q=>q.id),questionId=drawQuestion(s,w.id,ids,rng);
 s.quizDeadline=null;s.purchaseChallenge={workId:w.id,questionId,response:null,correct:null};s.phase='purchase-quiz';return s;
}
// The clock starts when the participant actually sees the question, after movement.
export function beginQuizTimer(state,now=Date.now()){
 if(!['quiz','purchase-quiz'].includes(state.phase))throw Error('진행 중인 퀴즈가 없습니다.');
 if(state.quizDeadline)return state;
 const s=clone(state);ensureQuizHistory(s);s.quizDeadline=now+quizTimeLimit(state);return s;
}
export function expireQuiz(state,now=Date.now()){
 if(!['quiz','purchase-quiz'].includes(state.phase)||!state.quizDeadline||now<state.quizDeadline)return state;
 const s=clone(state);ensureQuizHistory(s);s.quizDeadline=null;
 if(s.phase==='purchase-quiz'){
  s.purchaseChallenge.response=null;s.purchaseChallenge.correct=false;s.purchaseChallenge.timedOut=true;s.phase='purchase-feedback';
 }else{current(s).attempts++;s.feedback={correct:false,index:-1,timedOut:true};s.phase='feedback';}
 log(s,`${current(s).name}: 퀴즈 시간 초과 — 오답 처리, 코인 차감 없음`);return s;
}
export function canBuyListeningHint(s){
 const c=s.purchaseChallenge,p=current(s),w=BOARD[p.position];
 return s.phase==='purchase-quiz'&&!!c&&listeningHintDurationMs(LISTENING_HINTS[c.workId])>0&&(!c.hint||c.hint.refunded)&& (c.hintAttempts||0)<2&&p.coins>=w.price+LISTENING_HINT_PRICE;
}
export function buyListeningHint(state,now=Date.now()){
 if(!canBuyListeningHint(state))throw Error('현재 감상 힌트를 구입할 수 없습니다.');
 if(state.quizDeadline&&state.quizDeadline<=now)throw Error('퀴즈 시간이 끝났습니다.');
 const s=clone(state),remaining=Math.max(1,Math.min(QUIZ_TIME_LIMIT,(s.quizDeadline||now+QUIZ_TIME_LIMIT)-now));
 current(s).coins-=LISTENING_HINT_PRICE;s.purchaseChallenge.hintAttempts=(s.purchaseChallenge.hintAttempts||0)+1;
 const durationMs=listeningHintDurationMs(LISTENING_HINTS[s.purchaseChallenge.workId]);
 s.purchaseChallenge.hint={until:now+durationMs,remaining,audioRemainingMs:durationMs,paused:false,refunded:false};s.quizDeadline=now+durationMs+remaining;
 return s;
}
// Pausing audio resumes the quiz clock; resuming audio preserves only unused time.
export function pauseListeningHint(state,now=Date.now()){
 const h=state.purchaseChallenge?.hint;
 if(state.phase!=='purchase-quiz'||!h||h.refunded)throw Error('일시정지할 대표 선율이 없습니다.');
 if(h.paused)return state;
 if(now>=h.until)throw Error('대표 선율 재생이 끝났습니다.');
 const s=clone(state),hint=s.purchaseChallenge.hint;
 hint.audioRemainingMs=h.until-now;hint.paused=true;hint.until=0;s.quizDeadline=now+h.remaining;
 return s;
}
export function resumeListeningHint(state,now=Date.now()){
 const h=state.purchaseChallenge?.hint;
 if(state.phase!=='purchase-quiz'||!h||h.refunded||!h.paused||!h.audioRemainingMs)throw Error('이어서 들을 대표 선율이 없습니다.');
 if(!state.quizDeadline||now>=state.quizDeadline)throw Error('퀴즈 시간이 끝났습니다.');
 const s=clone(state),hint=s.purchaseChallenge.hint;
 hint.remaining=state.quizDeadline-now;hint.paused=false;hint.until=now+h.audioRemainingMs;s.quizDeadline=hint.until+hint.remaining;
 return s;
}
export function refundListeningHint(state,now=Date.now()){
 const h=state.purchaseChallenge?.hint;
 if(!h||h.refunded||!['purchase-quiz','purchase-feedback'].includes(state.phase))throw Error('환불할 감상 힌트가 없습니다.');
 const s=clone(state);s.purchaseChallenge.hint.refunded=true;s.purchaseChallenge.hint.until=0;s.purchaseChallenge.hint.paused=false;s.purchaseChallenge.hint.audioRemainingMs=0;current(s).coins+=LISTENING_HINT_PRICE;
 if(s.phase==='purchase-quiz')s.quizDeadline=now+h.remaining;
 return s;
}
export function answerPurchaseQuiz(state,response){
 if(state.phase!=='purchase-quiz'||!state.purchaseChallenge||typeof response!=='boolean')throw Error('O 또는 X를 선택해 주세요.');
 const s=clone(state),challenge=s.purchaseChallenge,q=purchaseQuizById(challenge.questionId);
 if(!q||q.workId!==BOARD[current(s).position].id)throw Error('음악 퀴즈 정보를 확인해 주세요.');
 ensureQuizHistory(s);s.quizDeadline=null;challenge.response=response;challenge.correct=response===q.answer;s.phase='purchase-feedback';
 log(s,`${current(s).name}: 음악 퀴즈 ${challenge.correct?'정답 — 이용권 구입 가능':'오답 — 코인 차감 없이 구입 기회 종료'}`);return s;
}
export function closePurchaseFeedback(state){
 if(state.phase!=='purchase-feedback'||typeof state.purchaseChallenge?.correct!=='boolean')throw Error('음악 퀴즈 해설을 먼저 확인해 주세요.');
 const s=clone(state);ensureQuizHistory(s);s.phase='action';return s;
}
export function buy(state){
  const s=clone(state),p=current(s),w=BOARD[p.position];
  if(s.phase!=='action'||w.type!=='work'||s.ownership[w.id])throw Error('구입할 수 있는 작품이 아닙니다.');
  if(s.purchaseChallenge?.workId!==w.id||s.purchaseChallenge.correct!==true||s.purchaseChallenge.declined)throw Error('음악 퀴즈를 먼저 맞혀야 합니다.');
  if(p.coins<w.price)throw Error('뮤직코인이 부족합니다.');
  p.coins-=w.price;s.ownership[w.id]={player:p.id,level:0};s.purchased=true;log(s,`${p.name}: ${w.composer} 「${w.title}」 이용권 구입 (${w.price} MC)`);return checkBankruptcy(s);
}
// Keep the arrival turn open so learning can be offered after the purchase.
export function purchaseAndNext(state){return buy(state.phase==='purchase-feedback'?closePurchaseFeedback(state):state);}
export function skipPurchase(state){if(state.phase!=='purchase-feedback'||state.purchaseChallenge?.correct!==true)throw Error('구입 선택을 확인해 주세요.');const s=closePurchaseFeedback(state);s.purchaseChallenge.declined=true;return s;}
export function concertWork(state){
  if(state.phase!=='action'||state.trade||state.purchased)return null;
  const p=current(state),w=BOARD[p.position],owner=state.ownership[w.id];
  return w.type==='work'&&state.concertWorkId===w.id&&owner?.player===p.id&&owner.level===0?w:null;
}
export function canUpgrade(state,id){const w=concertWork(state);return !!w&&w.id===id&&current(state).coins>=100;}
export function upgrade(state,id){
  const s=clone(state),p=current(s),owner=s.ownership[id];
  if(!canUpgrade(s,id))throw Error('이전에 구입한 내 작품 칸에 다시 도착해야 공연을 기획할 수 있습니다. (100 MC, 작품당 1회)');
  p.coins-=100;owner.level=1;log(s,`${p.name}: 「${WORKS.find(w=>w.id===id).title}」 공연 기획, 기본 이용료 +20 MC`);return checkBankruptcy(s);
}
export function sell(state,id){
  const s=clone(state),p=current(s),w=WORKS.find(w=>w.id===id);
  if(s.phase!=='action'||!w||s.ownership[id]?.player!==p.id)throw Error('반납할 내 이용권을 선택해 주세요.');
  const amount=Math.floor((w.price+s.ownership[id].level*100)/2);p.coins+=amount;delete s.ownership[id];log(s,`${p.name}: 「${w.title}」 은행 반납, +${amount} MC`);return s;
}
export function canStartLearningQuiz(state){return state.phase==='action'&&!state.quizUsed&&!state.trade&&['work','streaming'].includes(BOARD[current(state).position].type);}
export function startQuiz(state){if(!canStartLearningQuiz(state))throw Error('배움퀴즈는 작품 칸과 스트리밍 앱 인수 칸에서 차례마다 한 번 가능합니다.');const s=clone(state);openQuiz(s);return s;}
export function answerQuiz(state,index){
  if(state.phase!=='quiz')throw Error('진행 중인 퀴즈가 없습니다.');
  const s=clone(state),q=QUIZZES.find(q=>q.id===s.quiz),p=current(s);
  if(!Number.isInteger(index)||index<0||index>=q.options.length)throw Error('답을 선택해 주세요.');
  ensureQuizHistory(s);s.quizDeadline=null;p.attempts++;const correct=q.answer===index;if(correct){p.coins+=30;p.knowledge++;}s.feedback={correct,index};s.phase='feedback';log(s,`${p.name}: 퀴즈 ${correct?'정답! +30 MC':'도전 완료. 해설을 함께 읽어 보세요.'}`);return s;
}
export function closeFeedback(state){if(state.phase!=='feedback')throw Error('해설을 먼저 확인해 주세요.');const s=clone(state);ensureQuizHistory(s);s.phase='action';s.quiz=null;s.feedback=null;return s;}
export function nextTurn(state){
  if(!['action','jailed'].includes(state.phase)||state.trade)throw Error('진행 중인 활동을 먼저 마쳐 주세요.');
  const s=checkBankruptcy(clone(state));if(s.phase==='finished')return s;s.turnNumber=(s.turnNumber??0)+1;s.lastSkipped=[];
  updateProgress(s);
  if(firstFinisher(s))return finishByLaps(s,firstFinisher(s));
  else{
    s.turn=nextPlayerIndex(s);
    s.phase='roll';
  }
  s.swapHandled=false;s.lastSwap=null;s.streamingHandled=false;s.lastStreamingRevenue=[];s.lastConcert=null;s.lastEvent=null;s.lastAssignment=null;s.lastPrisonTransfer=null;s.lastPrisonRoll=null;s.lastBail=null;s.concertWorkId=null;s.purchaseChallenge=null;return s;
}
// Keep seat IDs stable for saved assets, event journals and authenticated sessions.
export function removeDisconnected(state,ids){
 if(state.players.length<3||state.phase==='finished')return state;
 const removed=ids.filter(id=>state.players[id]&&!state.players[id].withdrawn&&!state.players[id].isBot);if(!removed.length)return state;
 const s=clone(state),lost=new Set(removed),wasCurrent=lost.has(s.turn),prisonRoll=s.lastPrisonRoll;
 for(const id of removed){const p=s.players[id];p.withdrawn=true;p.coins=0;p.skipTurns=0;p.bailPaid=false;log(s,`${p.name}: 연결이 60초 이상 끊겨 자동 퇴장했습니다. 작품과 앱은 은행으로 반환됩니다.`);}
 for(const [id,owner] of Object.entries(s.ownership))if(lost.has(owner.player))delete s.ownership[id];
 for(const [id,owner] of Object.entries(s.platformOwners||{}))if(lost.has(owner))delete s.platformOwners[id];
 for(const [id,apps] of Object.entries(s.streamingInstallations||{})){for(const [app,owner] of Object.entries(apps))if(lost.has(owner))delete apps[app];if(!Object.keys(apps).length)delete s.streamingInstallations[id];}
 if(s.trade&&(lost.has(s.trade.from)||lost.has(s.trade.to)))s.trade=null;
 s.lastRent=null;s.lastEvent=null;s.lastAssignment=null;s.lastPrisonTransfer=null;s.lastPrisonRoll=null;s.lastBail=null;s.lastConcert=null;s.lastStreamingRevenue=[];s.concertWorkId=null;if(!wasCurrent)s.lastPrisonRoll=prisonRoll;
 if(wasCurrent){s.turn=nextPlayerIndex(s);s.turnNumber=(s.turnNumber||0)+1;s.phase='roll';s.dice=null;s.quiz=null;s.feedback=null;s.quizDeadline=null;s.purchaseChallenge=null;s.trade=null;s.quizUsed=false;s.purchased=false;s.swapHandled=false;s.lastSwap=null;s.streamingHandled=false;}
 const remaining=activePlayers(s);
 if(remaining.length===1){s.turn=remaining[0].id;s.phase='finished';s.endReason={type:'disconnect',playerId:s.turn};s.quiz=null;s.feedback=null;s.quizDeadline=null;s.purchaseChallenge=null;s.trade=null;log(s,`${remaining[0].name}: 마지막 참가자로 게임을 마칩니다.`);}
 updateProgress(s);return s;
}
export function finishGame(state){const s=clone(state);s.quizDeadline=null;s.phase='finished';s.trade=null;log(s,'교사가 수업을 마쳤습니다. 현재 자산과 배움으로 결과를 기록합니다.');return s;}
export function canSwapWorks(s){return s.phase==='action'&&!s.trade&&!s.swapHandled&&BOARD[current(s).position].type==='work-swap';}
export function swapWorks(state,{giveWorkId,takeWorkId}={}){
 if(!canSwapWorks(state))throw Error('작품 트레이드 칸에 도착한 본인 차례에 한 번 교환할 수 있어요.');
 const give=state.ownership[giveWorkId],take=state.ownership[takeWorkId];
 if(!WORKS.some(w=>w.id===giveWorkId)||!WORKS.some(w=>w.id===takeWorkId)||!give||give.player!==state.turn||!take||take.player===state.turn||state.players[take.player].withdrawn)throw Error('내 작품 한 개와 다른 참가자의 작품 한 개를 선택해 주세요.');
 const s=clone(state),to=take.player;
 s.ownership[giveWorkId].player=to;s.ownership[takeWorkId].player=s.turn;s.swapHandled=true;
 s.lastSwap={from:s.turn,to,giveWorkId,takeWorkId};
 log(s,`${current(s).name}: 「${WORKS.find(w=>w.id===giveWorkId).title}」 ↔ ${s.players[to].name}의 「${WORKS.find(w=>w.id===takeWorkId).title}」 작품 트레이드`);
 return s;
}
export function skipWorkSwap(state){if(!canSwapWorks(state))throw Error('현재 작품 트레이드를 선택할 수 없어요.');const s=clone(state);s.swapHandled=true;return s;}
export function proposeTrade(state,{workId,to,price}){
  const s=clone(state),p=current(s);
  if(s.phase!=='action'||s.trade||s.ownership[workId]?.player!==p.id||!Number.isInteger(to)||!s.players[to]||s.players[to].withdrawn||to===p.id||!Number.isInteger(price)||price<1||price>10000)throw Error('거래할 작품, 상대 팀, 1–10,000 MC의 정수 가격을 확인해 주세요.');
  if(s.players[to].coins<price)throw Error('상대 팀의 뮤직코인이 부족합니다.');
  s.trade={workId,from:p.id,to,price};return s;
}
export function resolveTrade(state,accepted){
  if(state.phase!=='action'||!state.trade)throw Error('거래 제안이 없습니다.');
  const s=clone(state),t=s.trade,w=WORKS.find(w=>w.id===t.workId);
  if(accepted){if(s.players[t.to].coins<t.price||s.ownership[t.workId]?.player!==t.from)throw Error('거래 조건이 바뀌었습니다.');s.players[t.to].coins-=t.price;s.players[t.from].coins+=t.price;s.ownership[t.workId].player=t.to;log(s,`${s.players[t.to].name}: ${s.players[t.from].name}에게 「${w.title}」 이용권 ${t.price} MC에 구입`);}
  else log(s,'거래 제안이 거절 또는 취소되었습니다.');s.trade=null;return checkBankruptcy(s);
}
export function isValidSave(s){
  try{
    if(s?.version!==VERSION||!Array.isArray(s.players)||s.players.length<2||s.players.length>MAX_PLAYERS)return false;
    if(!['roll','action','quiz','feedback','purchase-quiz','purchase-feedback','backward-roll','jailed','finished'].includes(s.phase)||!Number.isInteger(s.turn)||!s.players[s.turn])return false;
    if(!(ROUND_OPTIONS.includes(s.maxRounds)||[9,10,12].includes(s.maxRounds))||!Number.isInteger(s.round)||s.round<1||s.round>s.maxRounds)return false;
    if(s.endReason!=null){const reason=s.endReason;if(s.phase!=='finished'||!Number.isInteger(reason.playerId)||!s.players[reason.playerId]||!['bankruptcy','laps','disconnect'].includes(reason.type))return false;if(reason.type==='bankruptcy'&&(s.players.length!==2||s.players[reason.playerId].coins!==0))return false;if(reason.type==='disconnect'&&(activePlayers(s).length!==1||current(s).withdrawn||reason.playerId!==s.turn))return false;if(reason.type==='laps'&&(!hasFinished(s,s.players[reason.playerId])||(reason.moveSteps!==undefined&&(!Number.isInteger(reason.moveSteps)||reason.moveSteps<1||reason.moveSteps>s.dice||reason.moveSteps>6||s.players[reason.playerId].position!==0))))return false;}
    if(s.players.some(p=>p.withdrawn!==undefined&&typeof p.withdrawn!=='boolean')||s.phase!=='finished'&&current(s).withdrawn)return false;
    if(s.boardLayout!==undefined&&s.boardLayout!==2)return false;
    if(!validQuizHistory(s))return false;
    if(s.swapHandled!==undefined&&typeof s.swapHandled!=='boolean')return false;
    if(s.lastSwap){const t=s.lastSwap;if(!Number.isInteger(t.from)||!Number.isInteger(t.to)||!s.players[t.from]||!s.players[t.to]||t.from===t.to||t.giveWorkId===t.takeWorkId||![t.giveWorkId,t.takeWorkId].every(id=>WORKS.some(w=>w.id===id)))return false;}
    if(s.streamingHandled!==undefined&&typeof s.streamingHandled!=='boolean')return false;
    if(s.platformOwners!==undefined&&(!s.platformOwners||typeof s.platformOwners!=='object'||Array.isArray(s.platformOwners)||!Object.entries(s.platformOwners).every(([app,id])=>streamingApp(app)&&Number.isInteger(id)&&s.players[id])))return false;
    if(s.streamingInstallations!==undefined&&(!s.streamingInstallations||typeof s.streamingInstallations!=='object'||Array.isArray(s.streamingInstallations)||!Object.entries(s.streamingInstallations).every(([id,apps])=>WORKS.some(w=>w.id===id)&&apps&&typeof apps==='object'&&!Array.isArray(apps)&&Object.entries(apps).every(([app,owner])=>streamingApp(app)&&Number.isInteger(owner)&&s.players[owner]&&s.platformOwners?.[app]===owner))))return false;
    if(s.lastStreamingRevenue!==undefined&&(!Array.isArray(s.lastStreamingRevenue)||s.lastStreamingRevenue.length>4||new Set(s.lastStreamingRevenue.map(r=>r.appId)).size!==s.lastStreamingRevenue.length||!s.lastStreamingRevenue.every(r=>r.workId===BOARD[current(s).position].id&&streamingApp(r.appId)&&WORKS.some(w=>w.id===r.workId)&&Number.isInteger(r.playerId)&&s.players[r.playerId]&&Number.isInteger(r.amount)&&r.amount>=0&&r.amount<=STREAMING_REVENUE&&(r.payerId===undefined||r.payerId===s.turn&&r.expected===STREAMING_REVENUE&&typeof r.self==='boolean'&&r.self===(r.payerId===r.playerId)&&(!r.self||r.amount===0))&&s.streamingInstallations?.[r.workId]?.[r.appId]===r.playerId)))return false;
    if(s.leaderLaps!==undefined&&(!Number.isInteger(s.leaderLaps)||s.leaderLaps<0||s.leaderLaps>s.maxRounds))return false;
    if(s.players.some(p=>p.laps!==undefined&&(!Number.isInteger(p.laps)||p.laps<0||p.laps>s.maxRounds)))return false;
    if(s.phase==='roll'&&hasFinished(s,current(s)))return false;
    if(s.turnNumber!==undefined&&(!Number.isInteger(s.turnNumber)||s.turnNumber<0))return false;
    if(!s.players.every((p,i)=>p.id===i&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=16&&p.color===COLORS[i]&&Number.isInteger(p.position)&&p.position>=0&&p.position<BOARD.length&&Number.isInteger(p.coins)&&p.coins>=0&&Number.isInteger(p.knowledge)&&p.knowledge>=0&&Number.isInteger(p.attempts)&&p.attempts>=p.knowledge))return false;
    const characterIds=s.players.map(p=>p.characterId).filter(id=>id!==undefined);
    if(characterIds.length&&(characterIds.length!==s.players.length||new Set(characterIds).size!==characterIds.length||!characterIds.every(characterById)))return false;
    if(!s.ownership||Array.isArray(s.ownership)||!Object.entries(s.ownership).every(([id,o])=>WORKS.some(w=>w.id===id)&&s.players[o.player]&&Number.isInteger(o.player)&&[0,1].includes(o.level)))return false;
    if(!Array.isArray(s.eventDeck)||s.eventDeck.length!==EVENTS.length||new Set(s.eventDeck).size!==EVENTS.length||!s.eventDeck.every(i=>Number.isInteger(i)&&EVENTS[i]))return false;
    if(!Array.isArray(s.quizDeck)||s.quizDeck.length!==QUIZZES.length||new Set(s.quizDeck).size!==QUIZZES.length||!s.quizDeck.every(id=>QUIZZES.some(q=>q.id===id)))return false;
    if(!Number.isInteger(s.eventCursor)||s.eventCursor<0||!Number.isInteger(s.quizCursor)||s.quizCursor<0||typeof s.quizUsed!=='boolean')return false;
    if(['quiz','feedback'].includes(s.phase)&&!QUIZZES.some(q=>q.id===s.quiz))return false;
    if(s.quizDeadline!=null&&(!Number.isSafeInteger(s.quizDeadline)||s.quizDeadline<1||!['quiz','purchase-quiz'].includes(s.phase)))return false;
    if(s.phase==='feedback'&&(!s.feedback||typeof s.feedback.correct!=='boolean'||(s.feedback.timedOut===true?s.feedback.correct!==false||s.feedback.index!==-1:!Number.isInteger(s.feedback.index)||s.feedback.index<0||s.feedback.index>2)))return false;
    if(s.trade&&(!WORKS.some(w=>w.id===s.trade.workId)||s.ownership[s.trade.workId]?.player!==s.trade.from||s.trade.from!==s.turn||!s.players[s.trade.to]||s.trade.to===s.trade.from||!Number.isInteger(s.trade.price)||s.trade.price<1||s.trade.price>10000||s.phase!=='action'))return false;
    if(s.players.some(p=>p.skipTurns!==undefined&&(!Number.isInteger(p.skipTurns)||p.skipTurns<0||p.skipTurns>PRISON_ATTEMPTS)))return false;
    if(s.lastPrisonTransfer&&(!Number.isInteger(s.lastPrisonTransfer.from)||BOARD[s.lastPrisonTransfer.from]?.type!=='go-to-prison'||BOARD[s.lastPrisonTransfer.to]?.type!=='prison'||current(s).position!==s.lastPrisonTransfer.to))return false;
    if(s.phase==='jailed'&&(BOARD[current(s).position].type!=='prison'||(!s.lastPrisonRoll&&![2,PRISON_ATTEMPTS].includes(current(s).skipTurns)&&!current(s).bailPaid)))return false;
    if(s.players.some(p=>(p.skipTurns??0)>0&&BOARD[p.position].type!=='prison'))return false;
    if(s.players.some(p=>p.bailPaid!==undefined&&(typeof p.bailPaid!=='boolean'||p.bailPaid&&(BOARD[p.position].type!=='prison'||p.skipTurns!==0))))return false;
    if(s.lastBail!=null&&(s.lastBail.playerId!==s.turn||s.lastBail.amount!==BAIL_AMOUNT||!current(s).bailPaid||!['jailed','finished'].includes(s.phase)))return false;
    if(s.concertWorkId!=null&&(!WORKS.some(w=>w.id===s.concertWorkId)||BOARD[current(s).position].id!==s.concertWorkId))return false;
    if(s.lastConcert!=null){
      const c=s.lastConcert;
      if(c.hostId!==s.turn||BOARD[current(s).position].type!=='concert'||!Array.isArray(c.tickets)||c.tickets.length!==activePlayers(s).length-1||new Set(c.tickets.map(t=>t.playerId)).size!==c.tickets.length)return false;
      if(!c.tickets.every(t=>Number.isInteger(t.playerId)&&s.players[t.playerId]&&t.playerId!==c.hostId&&CONCERT_SEATS.some(seat=>seat.id===t.seatId&&seat.price===t.price)&&Number.isInteger(t.amount)&&t.amount>=0&&t.amount<=t.price)||c.total!==c.tickets.reduce((sum,t)=>sum+t.amount,0))return false;
    }
    if(s.lastBackwardMove){const m=s.lastBackwardMove;if(BOARD[m.from]?.type!=='back-three'||!Number.isInteger(m.steps)||m.steps<1||m.steps>6||m.to!==(m.from-m.steps+BOARD.length)%BOARD.length||BOARD[m.from].type!=='back-three')return false;}
    if(s.phase==='backward-roll'&&(BOARD[current(s).position].type!=='back-three'||s.lastBackwardMove||s.trade))return false;
    if(s.lastPrisonRoll){const r=s.lastPrisonRoll;if(!Number.isInteger(r.dice)||r.dice<1||r.dice>6||r.escaped!==(r.dice===6)||r.remaining!==current(s).skipTurns||r.remaining<0||r.remaining>=PRISON_ATTEMPTS||(!r.escaped&&s.phase!=='jailed'&&s.phase!=='finished'))return false;}
    if(s.purchaseChallenge?.hint){const h=s.purchaseChallenge.hint;if(!Number.isSafeInteger(h.until)||h.until<0||!Number.isInteger(h.remaining)||h.remaining<1||h.remaining>QUIZ_TIME_LIMIT||typeof h.refunded!=='boolean'||![1,2].includes(s.purchaseChallenge.hintAttempts))return false;if(h.paused!==undefined&&typeof h.paused!=='boolean'||h.audioRemainingMs!==undefined&&(!Number.isSafeInteger(h.audioRemainingMs)||h.audioRemainingMs<0)||h.paused&&(h.until!==0||!h.audioRemainingMs))return false;}
    if(s.purchaseChallenge?.declined!==undefined&&typeof s.purchaseChallenge.declined!=='boolean')return false;
    if(s.purchaseChallenge){const c=s.purchaseChallenge,q=purchaseQuizById(c.questionId);if(!q||q.workId!==c.workId||c.workId!==BOARD[current(s).position].id||![null,true,false].includes(c.response)||![null,true,false].includes(c.correct))return false;if(c.timedOut===true?c.response!==null||c.correct!==false:c.response===null?c.correct!==null:c.correct!==(c.response===q.answer))return false;}
    if(['purchase-quiz','purchase-feedback'].includes(s.phase)&&(!s.purchaseChallenge||s.ownership[s.purchaseChallenge.workId]))return false;
    if(s.phase==='purchase-quiz'&&(s.purchaseChallenge.response!==null||s.purchaseChallenge.timedOut===true))return false;
    if(s.phase==='purchase-feedback'&&typeof s.purchaseChallenge.correct!=='boolean')return false;
    if(s.lastAssignment){const t=s.lastAssignment;if(!Number.isInteger(t.from)||!s.players[t.from]||typeof t.skipped!=='boolean')return false;if(!t.skipped&&(!Number.isInteger(t.to)||!s.players[t.to]||t.to===t.from||!WORKS.some(w=>w.id===t.workId&&w.price===t.price)))return false;}
    if(s.lastEvent&&(!EVENTS.some(e=>e.title===s.lastEvent.title)||typeof s.lastEvent.text!=='string'||typeof s.lastEvent.prompt!=='string'||typeof s.lastEvent.effect!=='string'||!Number.isInteger(s.lastEvent.actual)))return false;
    return Array.isArray(s.log)&&s.log.length<=60&&s.log.every(l=>Number.isInteger(l.round)&&typeof l.text==='string');
  }catch{return false;}
}
