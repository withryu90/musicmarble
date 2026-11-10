import { BOARD, WORKS, QUIZZES, EVENTS } from './data.js';
import {characterById,drawCharacterIds} from './characters.js';
import {PURCHASE_QUIZZES,purchaseQuizById} from './purchase-quizzes.js';
export const VERSION=1;
export const MAX_PLAYERS=4;
export const COLORS=['#607f76','#bd795e','#7e78a5','#6c91ac','#b09a54'];
export const current=s=>s.players[s.turn];
export const owned=(s,id)=>Number.isInteger(id)&&s.players[id]?WORKS.filter(w=>s.ownership[w.id]?.player===id):[];
export function collection(s,work,player){
  const all=owned(s,player);
  if(all.filter(w=>w.era===work.era).length===4)return {name:'시대 컬렉션',multiplier:2};
  if(all.filter(w=>w.composer===work.composer).length===2)return {name:`${work.composer} 컬렉션`,multiplier:1.5};
  return {name:'기본 이용료',multiplier:1};
}
export const fee=(s,w)=>Math.round((w.fee+(s.ownership[w.id]?.level||0)*20)*collection(s,w,s.ownership[w.id]?.player).multiplier);
export const score=(s,p)=>p.coins+owned(s,p.id).reduce((n,w)=>n+w.price+(s.ownership[w.id].level||0)*100,0);
const clone=s=>structuredClone(s);
function log(s,text){s.log.unshift({round:s.round,text});s.log=s.log.slice(0,60);}
function change(s,p,amount){const actual=Math.max(-p.coins,amount);p.coins+=actual;if(actual!==amount)log(s,`${p.name}: 잔액 한도에서 ${-actual} MC 지급. 수업 모드에서 부족액은 면제됩니다.`);return actual;}
const shuffled=(items,rng)=>{const arr=[...items];for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
export function createGame({names=['초록 팀','오렌지 팀'],rounds=8,coins=1200,characterIds}={},rng=Math.random){
  if(!Array.isArray(names)||names.length<2||names.length>MAX_PLAYERS||!names.every(n=>typeof n==='string'&&n.trim().length>0&&n.length<=16))throw Error('2–4명의 이름을 입력해 주세요.');
  if(![4,8,12].includes(rounds)||![1000,1200,1600].includes(coins))throw Error('수업 설정이 올바르지 않습니다.');
  const assigned=characterIds??drawCharacterIds(names.length,[],rng);
  if(!Array.isArray(assigned)||assigned.length!==names.length||new Set(assigned).size!==names.length||!assigned.every(characterById))throw Error('중복되지 않는 캐릭터를 배정해 주세요.');
  return {version:VERSION,players:names.map((name,id)=>({id,name:name.trim(),characterId:assigned[id],color:COLORS[id],coins,position:0,skipTurns:0,knowledge:0,attempts:0})),round:1,maxRounds:rounds,leaderLaps:0,turnNumber:0,turn:0,phase:'roll',ownership:{},dice:null,lastRent:null,lastEvent:null,lastAssignment:null,lastSkipped:[],lastPrisonTransfer:null,lastPrisonRoll:null,quiz:null,feedback:null,quizUsed:false,purchased:false,purchaseChallenge:null,trade:null,eventDeck:shuffled(EVENTS.map((_,i)=>i),rng),quizDeck:shuffled(QUIZZES.map(q=>q.id),rng),eventCursor:0,quizCursor:0,log:[{round:1,text:'음악사 여행을 시작합니다. 첫 팀이 주사위를 굴려 주세요.'}]};
}
function openQuiz(s,kind){
  const pool=s.quizDeck.filter(id=>!kind||QUIZZES.find(q=>q.id===id).kind===kind);
  s.quiz=pool[s.quizCursor%pool.length];s.quizCursor++;s.phase='quiz';s.quizUsed=true;
}
export function roll(state,dice,rng=Math.random){
  if(state.phase!=='roll')throw Error('현재는 주사위를 굴릴 수 없습니다.');
  if(!Number.isInteger(dice)||dice<1||dice>6)throw Error('주사위 값은 1–6입니다.');
  const s=clone(state),p=current(s);s.dice=dice;s.phase='action';s.lastEvent=null;s.lastRent=null;s.lastAssignment=null;s.lastSkipped=[];s.lastPrisonTransfer=null;s.lastPrisonRoll=null;s.feedback=null;s.quizUsed=false;s.purchased=false;s.purchaseChallenge=null;
  if((p.skipTurns??0)>0){
    if(BOARD[p.position].type!=='prison')throw Error('감옥 위치를 확인해 주세요.');
    const escaped=dice===6;p.skipTurns=escaped?0:p.skipTurns-1;
    s.lastPrisonRoll={dice,escaped,remaining:p.skipTurns};
    log(s,`${p.name}: 탈출 주사위 ${dice} — ${escaped?'탈출 성공! 6칸 이동':p.skipTurns?'탈출 실패, 다음 자기 차례에 한 번 더 도전':'두 번 도전 완료, 다음 자기 차례부터 정상 이동'}`);
    if(!escaped){s.phase='jailed';return s;}
  }
  const next=p.position+dice;if(next>=BOARD.length){p.coins+=200;log(s,`${p.name}: 한 바퀴 완주! +200 MC`);if(p.id===0){s.leaderLaps=(s.leaderLaps??0)+1;s.round=Math.min(s.leaderLaps+1,s.maxRounds);log(s,`첫 주자 ${p.name}: ${s.leaderLaps}/${s.maxRounds}바퀴 완주`);}}p.position=next%BOARD.length;
  const cell=BOARD[p.position];log(s,`${p.name}: ${dice}칸 이동 → ${cell.title}`);
  if(cell.type==='work'){
    const owner=s.ownership[cell.id];if(owner&&owner.player!==p.id){const cost=fee(s,cell),actual=-change(s,p,-cost);s.players[owner.player].coins+=actual;s.lastRent={workId:cell.id,owner:owner.player,amount:actual,expected:cost};log(s,`${p.name} → ${s.players[owner.player].name}: 가상 이용료 ${actual} MC (기준 ${cost} MC)`);}
  }else if(cell.type==='event'){
    const event=EVENTS[s.eventDeck[s.eventCursor++%EVENTS.length]];const actual=change(s,p,event.amount);s.lastEvent={...event,actual};log(s,`${event.title}: ${p.name} ${actual>=0?'+':''}${actual} MC`);
  }else if(cell.type==='prison'||cell.type==='go-to-prison'){
    if(cell.type==='go-to-prison'){
      const destination=BOARD.findIndex(c=>c.type==='prison');
      s.lastPrisonTransfer={from:p.position,to:destination};p.position=destination;
      log(s,`${p.name}: 감옥으로 가기 → 불법 스트리밍 감옥으로 즉시 이동`);
    }
    p.skipTurns=2;s.phase='jailed';log(s,`${p.name}: 불법 스트리밍 감옥에 도착 — 다음 두 자기 차례에 6으로 탈출 도전`);
  }else if(cell.type==='transfer'){
    const works=owned(s,p.id);
    if(!works.length){s.lastAssignment={from:p.id,skipped:true};log(s,`${p.name}: 저작권 양도 — 보유 작품이 없어 통과`);}
    else{
      const highest=Math.max(...works.map(w=>w.price)),candidates=works.filter(w=>w.price===highest);
      const work=candidates[Math.floor(rng()*candidates.length)],recipients=s.players.filter(player=>player.id!==p.id),recipient=recipients[Math.floor(rng()*recipients.length)];
      s.ownership[work.id].player=recipient.id;
      s.lastAssignment={from:p.id,to:recipient.id,workId:work.id,price:work.price,skipped:false};
      log(s,`${p.name} → ${recipient.name}: 최고가 작품 「${work.title}」 가상 저작재산권 무상 양도 (${work.price} MC 기준)`);
    }
  }else if(cell.type==='quiz'||cell.type==='copyright')openQuiz(s,cell.type==='copyright'?'copyright':null);
  else if(cell.type==='concert'){s.players.forEach(team=>team.coins+=100);log(s,'모두의 음악회: 모든 팀 +100 MC');}
  return s;
}
export function startPurchaseQuiz(state,rng=Math.random){
 const s=clone(state),p=current(s),w=BOARD[p.position];
 if(s.phase!=='action'||s.trade||w.type!=='work'||s.ownership[w.id])throw Error('도착한 빈 작품 칸에서만 구입 OX 퀴즈를 풀 수 있습니다.');
 if(s.purchaseChallenge)throw Error('구입 OX 퀴즈는 도착할 때 한 번만 도전할 수 있습니다.');
 if(p.coins<w.price)throw Error('뮤직코인이 부족합니다.');
 const questions=PURCHASE_QUIZZES.filter(q=>q.workId===w.id),q=questions[Math.floor(rng()*questions.length)];
 s.purchaseChallenge={workId:w.id,questionId:q.id,response:null,correct:null};s.phase='purchase-quiz';return s;
}
export function answerPurchaseQuiz(state,response){
 if(state.phase!=='purchase-quiz'||!state.purchaseChallenge||typeof response!=='boolean')throw Error('O 또는 X를 선택해 주세요.');
 const s=clone(state),challenge=s.purchaseChallenge,q=purchaseQuizById(challenge.questionId);
 if(!q||q.workId!==BOARD[current(s).position].id)throw Error('구입 퀴즈 정보를 확인해 주세요.');
 challenge.response=response;challenge.correct=response===q.answer;s.phase='purchase-feedback';
 log(s,`${current(s).name}: 구입 OX 퀴즈 ${challenge.correct?'정답 — 이용권 구입 가능':'오답 — 코인 차감 없이 구입 기회 종료'}`);return s;
}
export function closePurchaseFeedback(state){
 if(state.phase!=='purchase-feedback'||typeof state.purchaseChallenge?.correct!=='boolean')throw Error('구입 OX 퀴즈 해설을 먼저 확인해 주세요.');
 const s=clone(state);s.phase='action';return s.purchaseChallenge.correct?s:nextTurn(s);
}
export function buy(state){
  const s=clone(state),p=current(s),w=BOARD[p.position];
  if(s.phase!=='action'||w.type!=='work'||s.ownership[w.id])throw Error('구입할 수 있는 작품이 아닙니다.');
  if(s.purchaseChallenge?.workId!==w.id||s.purchaseChallenge.correct!==true)throw Error('이용권 구입 OX 퀴즈를 먼저 맞혀야 합니다.');
  if(p.coins<w.price)throw Error('뮤직코인이 부족합니다.');
  p.coins-=w.price;s.ownership[w.id]={player:p.id,level:0};s.purchased=true;log(s,`${p.name}: ${w.composer} 「${w.title}」 이용권 구입 (${w.price} MC)`);return s;
}
// Production purchase commits the payment, ownership and turn advance atomically.
export function purchaseAndNext(state){return nextTurn(buy(state.phase==='purchase-feedback'?closePurchaseFeedback(state):state));}
export function skipPurchase(state){if(state.phase!=='purchase-feedback'||state.purchaseChallenge?.correct!==true)throw Error('구입 선택을 확인해 주세요.');return nextTurn(closePurchaseFeedback(state));}
export function upgrade(state,id){
  const s=clone(state),p=current(s),owner=s.ownership[id];
  if(s.phase!=='action'||!owner||owner.player!==p.id||owner.level!==0||p.coins<100)throw Error('공연 기획을 할 수 없습니다. (내 이용권, 100 MC 필요, 작품당 1회)');
  p.coins-=100;owner.level=1;log(s,`${p.name}: 「${WORKS.find(w=>w.id===id).title}」 공연 기획, 기본 이용료 +20 MC`);return s;
}
export function sell(state,id){
  const s=clone(state),p=current(s),w=WORKS.find(w=>w.id===id);
  if(s.phase!=='action'||!w||s.ownership[id]?.player!==p.id)throw Error('반납할 내 이용권을 선택해 주세요.');
  const amount=Math.floor((w.price+s.ownership[id].level*100)/2);p.coins+=amount;delete s.ownership[id];log(s,`${p.name}: 「${w.title}」 은행 반납, +${amount} MC`);return s;
}
export function startQuiz(state){if(state.phase!=='action'||state.quizUsed)throw Error('퀴즈는 차례마다 한 번 가능합니다.');const s=clone(state);openQuiz(s);return s;}
export function answerQuiz(state,index){
  if(state.phase!=='quiz')throw Error('진행 중인 퀴즈가 없습니다.');
  const s=clone(state),q=QUIZZES.find(q=>q.id===s.quiz),p=current(s);
  if(!Number.isInteger(index)||index<0||index>=q.options.length)throw Error('답을 선택해 주세요.');
  p.attempts++;const correct=q.answer===index;if(correct){p.coins+=80;p.knowledge++;}s.feedback={correct,index};s.phase='feedback';log(s,`${p.name}: 퀴즈 ${correct?'정답! +80 MC':'도전 완료. 해설을 함께 읽어 보세요.'}`);return s;
}
export function closeFeedback(state){if(state.phase!=='feedback')throw Error('해설을 먼저 확인해 주세요.');const s=clone(state);s.phase='action';s.quiz=null;s.feedback=null;return s;}
export function nextTurn(state){
  if(!['action','jailed'].includes(state.phase)||state.trade)throw Error('진행 중인 활동을 먼저 마쳐 주세요.');
  const s=clone(state);s.turnNumber=(s.turnNumber??0)+1;s.lastSkipped=[];
  s.round=Math.min((s.leaderLaps??0)+1,s.maxRounds);
  if((s.leaderLaps??0)>=s.maxRounds){s.phase='finished';log(s,`첫 주자 ${s.players[0].name}의 ${s.maxRounds}바퀴 완주로 여행 종료! 자산과 배움을 함께 돌아봅니다.`);}
  else{
    s.turn=(s.turn+1)%s.players.length;
    s.phase='roll';
  }
  s.lastEvent=null;s.lastAssignment=null;s.lastPrisonTransfer=null;s.lastPrisonRoll=null;s.purchaseChallenge=null;return s;
}
export function finishGame(state){const s=clone(state);s.phase='finished';s.trade=null;log(s,'교사가 수업을 마쳤습니다. 현재 자산과 배움으로 결과를 기록합니다.');return s;}
export function proposeTrade(state,{workId,to,price}){
  const s=clone(state),p=current(s);
  if(s.phase!=='action'||s.trade||s.ownership[workId]?.player!==p.id||!Number.isInteger(to)||!s.players[to]||to===p.id||!Number.isInteger(price)||price<1||price>10000)throw Error('거래할 작품, 상대 팀, 1–10,000 MC의 정수 가격을 확인해 주세요.');
  if(s.players[to].coins<price)throw Error('상대 팀의 뮤직코인이 부족합니다.');
  s.trade={workId,from:p.id,to,price};return s;
}
export function resolveTrade(state,accepted){
  if(state.phase!=='action'||!state.trade)throw Error('거래 제안이 없습니다.');
  const s=clone(state),t=s.trade,w=WORKS.find(w=>w.id===t.workId);
  if(accepted){if(s.players[t.to].coins<t.price||s.ownership[t.workId]?.player!==t.from)throw Error('거래 조건이 바뀌었습니다.');s.players[t.to].coins-=t.price;s.players[t.from].coins+=t.price;s.ownership[t.workId].player=t.to;log(s,`${s.players[t.to].name}: ${s.players[t.from].name}에게 「${w.title}」 이용권 ${t.price} MC에 구입`);}
  else log(s,'거래 제안이 거절 또는 취소되었습니다.');s.trade=null;return s;
}
export function isValidSave(s){
  try{
    if(s?.version!==VERSION||!Array.isArray(s.players)||s.players.length<2||s.players.length>MAX_PLAYERS)return false;
    if(!['roll','action','quiz','feedback','purchase-quiz','purchase-feedback','jailed','finished'].includes(s.phase)||!Number.isInteger(s.turn)||!s.players[s.turn])return false;
    if(![4,8,12].includes(s.maxRounds)||!Number.isInteger(s.round)||s.round<1||s.round>s.maxRounds)return false;
    if(s.leaderLaps!==undefined&&(!Number.isInteger(s.leaderLaps)||s.leaderLaps<0||s.leaderLaps>s.maxRounds))return false;
    if(s.turnNumber!==undefined&&(!Number.isInteger(s.turnNumber)||s.turnNumber<0))return false;
    if(!s.players.every((p,i)=>p.id===i&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=16&&p.color===COLORS[i]&&Number.isInteger(p.position)&&p.position>=0&&p.position<24&&Number.isInteger(p.coins)&&p.coins>=0&&Number.isInteger(p.knowledge)&&p.knowledge>=0&&Number.isInteger(p.attempts)&&p.attempts>=p.knowledge))return false;
    const characterIds=s.players.map(p=>p.characterId).filter(id=>id!==undefined);
    if(characterIds.length&&(characterIds.length!==s.players.length||new Set(characterIds).size!==characterIds.length||!characterIds.every(characterById)))return false;
    if(!s.ownership||Array.isArray(s.ownership)||!Object.entries(s.ownership).every(([id,o])=>WORKS.some(w=>w.id===id)&&s.players[o.player]&&Number.isInteger(o.player)&&[0,1].includes(o.level)))return false;
    if(!Array.isArray(s.eventDeck)||s.eventDeck.length!==EVENTS.length||new Set(s.eventDeck).size!==EVENTS.length||!s.eventDeck.every(i=>Number.isInteger(i)&&EVENTS[i]))return false;
    if(!Array.isArray(s.quizDeck)||s.quizDeck.length!==QUIZZES.length||new Set(s.quizDeck).size!==QUIZZES.length||!s.quizDeck.every(id=>QUIZZES.some(q=>q.id===id)))return false;
    if(!Number.isInteger(s.eventCursor)||s.eventCursor<0||!Number.isInteger(s.quizCursor)||s.quizCursor<0||typeof s.quizUsed!=='boolean')return false;
    if(['quiz','feedback'].includes(s.phase)&&!QUIZZES.some(q=>q.id===s.quiz))return false;
    if(s.phase==='feedback'&&(!s.feedback||typeof s.feedback.correct!=='boolean'||!Number.isInteger(s.feedback.index)||s.feedback.index<0||s.feedback.index>2))return false;
    if(s.trade&&(!WORKS.some(w=>w.id===s.trade.workId)||s.ownership[s.trade.workId]?.player!==s.trade.from||s.trade.from!==s.turn||!s.players[s.trade.to]||s.trade.to===s.trade.from||!Number.isInteger(s.trade.price)||s.trade.price<1||s.trade.price>10000||s.phase!=='action'))return false;
    if(s.players.some(p=>p.skipTurns!==undefined&&(!Number.isInteger(p.skipTurns)||p.skipTurns<0||p.skipTurns>2)))return false;
    if(s.lastPrisonTransfer&&(!Number.isInteger(s.lastPrisonTransfer.from)||BOARD[s.lastPrisonTransfer.from]?.type!=='go-to-prison'||BOARD[s.lastPrisonTransfer.to]?.type!=='prison'||current(s).position!==s.lastPrisonTransfer.to))return false;
    if(s.phase==='jailed'&&(BOARD[current(s).position].type!=='prison'||(!s.lastPrisonRoll&&current(s).skipTurns!==2)))return false;
    if(s.players.some(p=>(p.skipTurns??0)>0&&BOARD[p.position].type!=='prison'))return false;
    if(s.lastPrisonRoll){const r=s.lastPrisonRoll;if(!Number.isInteger(r.dice)||r.dice<1||r.dice>6||r.escaped!==(r.dice===6)||r.remaining!==current(s).skipTurns||r.remaining<0||r.remaining>1||(!r.escaped&&s.phase!=='jailed'&&s.phase!=='finished'))return false;}
    if(s.purchaseChallenge){const c=s.purchaseChallenge,q=purchaseQuizById(c.questionId);if(!q||q.workId!==c.workId||c.workId!==BOARD[current(s).position].id||![null,true,false].includes(c.response)||![null,true,false].includes(c.correct))return false;if(c.response===null?c.correct!==null:c.correct!==(c.response===q.answer))return false;}
    if(['purchase-quiz','purchase-feedback'].includes(s.phase)&&(!s.purchaseChallenge||s.ownership[s.purchaseChallenge.workId]))return false;
    if(s.phase==='purchase-quiz'&&s.purchaseChallenge.response!==null)return false;
    if(s.phase==='purchase-feedback'&&typeof s.purchaseChallenge.correct!=='boolean')return false;
    if(s.lastAssignment){const t=s.lastAssignment;if(!Number.isInteger(t.from)||!s.players[t.from]||typeof t.skipped!=='boolean')return false;if(!t.skipped&&(!Number.isInteger(t.to)||!s.players[t.to]||t.to===t.from||!WORKS.some(w=>w.id===t.workId&&w.price===t.price)))return false;}
    if(s.lastEvent&&(!EVENTS.some(e=>e.title===s.lastEvent.title)||typeof s.lastEvent.text!=='string'||typeof s.lastEvent.prompt!=='string'||typeof s.lastEvent.effect!=='string'||!Number.isInteger(s.lastEvent.actual)))return false;
    return Array.isArray(s.log)&&s.log.length<=60&&s.log.every(l=>Number.isInteger(l.round)&&typeof l.text==='string');
  }catch{return false;}
}
