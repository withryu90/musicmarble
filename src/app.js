import {createSoundEffects,activitySound} from './sound-effects.js?v=mobile-audio-resume-1';
import {RankingClient} from './ranking.js?v=global-ranking-live-1';
import {animateFlatStep} from './pawn-motion.js';
import {HandoffCountdown} from './handoff-countdown.js?v=ten-second-handoff-1';
import {fitBoardTitles} from './board-type.js?v=upright-pawns-1';
import {BOARD,WORKS,ERAS,QUIZZES,SOURCES,PRISON_MESSAGE} from './data.js?v=backward-reroll-1';
import * as G from './engine.js?v=backward-reroll-1';
import {ActivityInbox} from './activities.js?v=all-private-quiz-results-1';
import {purchaseQuizById} from './purchase-quizzes.js';
import {BOARD_SIDE,boardCoordinates,ownershipDirection} from './board-layout.js';
import {movementPath,boardTokenVisible,boardTokenAnchor,backwardPath} from './movement.js?v=back-three-1';
import {diceCube} from './dice.js';
import {CHARACTER_BIOS} from './character-bios.js?v=back-three-1';
import {needsLandscape} from './orientation.js';
import {createBgm} from './bgm.js?v=mobile-audio-resume-1';
import {PeerTransport} from './peer-transport.js?v=all-private-quiz-results-1';
import {enterFullscreen,toggleFullscreen,isStandalone,isFullscreen} from './fullscreen.js';
import {canOfferTurnHandoff} from './turn-handoff.js';
import {CHARACTERS,characterFor,characterById} from './characters.js?v=back-three-1';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brandMark = `<svg role="img" aria-label="주사위·음표·동전이 담긴 뮤직마블 아이콘" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
  <rect width="80" height="80" rx="23" fill="#234B40"/>
  <path d="M13 14C27 6 54 7 68 19" stroke="#60816B" stroke-opacity=".35" stroke-width="1.5" stroke-linecap="round"/>
  <g transform="rotate(-13 28 37)">
    <rect x="11" y="21" width="33" height="33" rx="7" fill="#F4EEDB"/>
    <rect x="12.5" y="22.5" width="30" height="30" rx="5.5" stroke="#D7C9A2"/>
    <g fill="#365D4D"><circle cx="20.5" cy="30.5" r="2.6"/><circle cx="34.5" cy="30.5" r="2.6"/><circle cx="27.5" cy="37.5" r="2.6"/><circle cx="20.5" cy="44.5" r="2.6"/><circle cx="34.5" cy="44.5" r="2.6"/></g>
  </g>
  <path d="M49 20v24M49 20l17-4v22M49 25l17-4" stroke="#E7EFD9" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="44.5" cy="44.5" rx="7" ry="5" transform="rotate(-20 44.5 44.5)" fill="#E7EFD9"/>
  <ellipse cx="61.5" cy="38.5" rx="7" ry="5" transform="rotate(-20 61.5 38.5)" fill="#E7EFD9"/>
  <circle cx="55" cy="58" r="15.5" fill="#D3B56E" stroke="#234B40" stroke-width="3"/>
  <circle cx="55" cy="58" r="10.5" stroke="#F5E6B8" stroke-width="1.5"/>
  <path d="M59 53.5c-1-1-6-1.5-7.5.8-2.5 3.7 8.5 2 7 6.2-1 2.8-6.5 2.6-8.5 1M55 50v16" stroke="#6E612F" stroke-width="1.9" stroke-linecap="round"/>
</svg>`;
const peerTransport=new PeerTransport();
const rankingClient=new RankingClient({onChange:updateRankingBoard});
const key='musicmarble.peer.session.v1';
let state=G.createGame(),tab='board',boardView=CSS.supports('container-type','inline-size')?'3d':'flat',filter='all',selected=null,busy=false,session=null,snapshot=null,connected=false,events=null,lastAuto='',revealCharacter=false;
try{session=JSON.parse(localStorage.getItem(key)||'null');}catch{}
let bgmVolume=.25;
try{const saved=localStorage.getItem('musicmarble.bgm.volume');if(saved!==null&&Number.isFinite(Number(saved)))bgmVolume=Math.min(1,Math.max(0,Number(saved)));}catch{}
let bgmEnabled=true;
// A fresh visit always starts with music enabled, even after a previous mute.
if(bgmVolume===0)bgmVolume=.25;
const soundEffects=createSoundEffects();
const lobbyBgm=createBgm({volume:bgmVolume,onChange:updateBgmControls});
function bgmBell(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4M11 2V1h2v1"/><path class="bell-slash" d="M3 3 21 21"/></svg>`;}
function updateBgmControls(){
 const button=$('[data-action="bgm-toggle"]');if(!button)return;
 const status=lobbyBgm.status();button.classList.toggle('is-muted',!bgmEnabled);
 button.setAttribute('aria-pressed',String(bgmEnabled));
 button.setAttribute('aria-label',bgmEnabled?'소리 끄기':'소리 켜기');
 button.title=bgmEnabled?(status.blocked?'음악 켜짐 · 화면을 터치하면 재생됩니다':status.error?'음악을 불러오지 못했어요 · 다시 켜 주세요':'음악·효과음 켜짐 · 누르면 끄기'):'음악·효과음 꺼짐 · 누르면 켜기';
}
function bgmButton(){return `<button type="button" class="icon-button bgm-bell ${bgmEnabled?'':'is-muted'}" data-action="bgm-toggle" aria-label="${bgmEnabled?'소리 끄기':'소리 켜기'}" aria-pressed="${bgmEnabled}" title="${bgmEnabled?'음악·효과음 켜짐 · 누르면 끄기':'음악·효과음 꺼짐 · 누르면 켜기'}">${bgmBell()}</button>`;}
function startBackgroundMusic(gesture=false){if(bgmEnabled&&!document.hidden)void lobbyBgm.play({gesture});}
document.addEventListener('visibilitychange',()=>{if(document.hidden){lobbyBgm.pause();soundEffects.stop();}else startBackgroundMusic();});
function unlockLobbyMusic(e){
 if(bgmEnabled)soundEffects.unlock();
 if(e.target.closest?.('[data-action="bgm-toggle"]'))return;
 if(bgmEnabled&&!lobbyBgm.status().playing)startBackgroundMusic(true);
}
document.addEventListener('pointerdown',unlockLobbyMusic,{capture:true});
document.addEventListener('touchend',unlockLobbyMusic,{capture:true,passive:true});
document.addEventListener('click',unlockLobbyMusic,{capture:true});
document.addEventListener('keydown',e=>{if(!['Shift','Control','Alt','Meta','Escape'].includes(e.key))unlockLobbyMusic(e);},{capture:true});
const myTurn=()=>connected&&session?.playerId===state.turn;
async function request(path,body){return peerTransport.request(path,body,session);}

function remember(){try{localStorage.setItem(key,JSON.stringify(session));}catch{notify('참가 정보를 저장하지 못했어요. 이 창을 유지해 주세요.');}}
let dicePresentation=null;
const activityInbox=new ActivityInbox();
let activeActivity=null,deferredSnapshots=[],participantIntroPending=false;
let autoPurchaseKey=null,lastHandoffKey=null;
const handoffCountdown=new HandoffCountdown();
let galleryReturnCharacter=null;
let chatMessages=[],chatDraft='',chatSending=false,chatRoom=null;
function resetActivityFlow(){handoffCountdown.stop();lastHandoffKey=null;participantIntroPending=false;activityInbox.reset();activeActivity=null;deferredSnapshots=[];}
function stopDicePresentation(){
 if(!dicePresentation)return;
 clearInterval(dicePresentation.ticker);clearTimeout(dicePresentation.timer);
 dicePresentation.element.remove();dicePresentation=null;busy=false;
}
function startDicePresentation(player){
 void soundEffects.play('dice');
 const element=document.createElement('div');element.className='dice-overlay';element.setAttribute('role','status');element.setAttribute('aria-live','polite');
 element.innerHTML=`<div class="dice-stage"><span class="eyebrow">MUSIC MARBLE</span><h2>${esc(player.name)}의 주사위</h2><div class="rolling-die">${diceCube(1)}</div><strong class="dice-result">주사위를 굴리고 있어요…</strong><p>어떤 명곡을 만나게 될까요?</p></div>`;
 document.body.append(element);busy=true;
 const presentation={element,playerId:player.id,started:performance.now(),next:null,result:null,updates:[],resultSnapshot:null,before:structuredClone(state),isBackwardRoll:state.phase==='backward-roll',moving:false,step:0,ticker:null,timer:null};dicePresentation=presentation;
 let face=1;presentation.ticker=setInterval(()=>{face=face%6+1;element.querySelector('.rolling-die').innerHTML=diceCube(face);},150);
}
function presentDiceResult(next){
 const p=dicePresentation;if(!p)return;
 if(!p.next||next.revision>p.next.revision){p.next=next;p.updates.push(next);}
 if(p.result!==null||!next.state||next.state.turn!==p.playerId||next.state.dice===null||next.state.phase==='roll')return;
 p.result=next.state.dice;p.resultSnapshot=next;
 p.timer=setTimeout(()=>{
  clearInterval(p.ticker);p.element.classList.add('dice-settled');
  p.element.querySelector('.rolling-die').innerHTML=diceCube(p.result);
  p.element.querySelector('.dice-result').textContent=`${p.result}${[1,3,6].includes(p.result)?'이':'가'} 나왔어요!`;
  p.element.querySelector('p').textContent=p.isBackwardRoll?`${p.result}칸 뒤로 이동합니다.`:next.state.endReason?.type==='laps'?`${next.state.endReason.moveSteps}칸 이동해 시대의 문에서 완주하면 게임이 종료됩니다.`:next.state.lastPrisonRoll&&!next.state.lastPrisonRoll.escaped?'탈출 실패 · 이번 차례는 감옥에 머뭅니다.':next.state.lastPrisonRoll?.escaped?'6! 탈출 성공 · 6칸 앞으로 이동합니다.':`${p.result}칸 앞으로 이동합니다.`;
  p.timer=setTimeout(()=>{
   p.element.classList.add('dice-closing');
   p.timer=setTimeout(()=>{
    animateBoardMovement(p);
   },600);
  },2400);
 },Math.max(0,2200-(performance.now()-p.started)));
}
function animateBoardMovement(p){
 p.element.remove();p.moving=true;tab='board';
 const travelSteps=p.resultSnapshot.state.endReason?.type==='laps'?p.resultSnapshot.state.endReason.moveSteps??p.result:p.result;p.totalSteps=travelSteps;
 const path=p.resultSnapshot.state.lastPrisonRoll&&!p.resultSnapshot.state.lastPrisonRoll.escaped?[]:(p.isBackwardRoll?backwardPath:movementPath)(p.before.players[p.playerId].position,travelSteps,BOARD.length);
 const forwardSteps=p.isBackwardRoll?0:path.length,backward=p.resultSnapshot.state.lastBackwardMove;
 if(!p.isBackwardRoll&&backward&&path.at(-1)===backward.from)path.push(...backwardPath(backward.from,backward.steps,BOARD.length));
 const transfer=p.resultSnapshot.state.lastPrisonTransfer;
 if(transfer&&path.at(-1)===transfer.from)path.push(transfer.to);
 let pathIndex=0;
 p.backward=p.isBackwardRoll;p.backwardStep=0;state=structuredClone(p.before);render();
 const movementTarget=boardView==='flat'?document.querySelector(`.cell[data-index="${state.players[p.playerId].position}"]`):document.querySelector('.board-scene');
 movementTarget?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:boardView==='flat'?'nearest':'center',inline:'nearest'});
 if(!path.length){p.timer=setTimeout(()=>{const result=p.resultSnapshot,pending=p.updates.filter(update=>update.revision>result.revision);stopDicePresentation();commitSnapshot(result);pending.forEach(receive);},850);return;}
 function advance(){
  const previousPosition=state.players[p.playerId].position;
  state.players[p.playerId].position=path[pathIndex++];p.step=Math.min(pathIndex,p.result);p.backward=!!backward&&pathIndex>forwardSteps;p.backwardStep=pathIndex-forwardSteps;render();
  if(boardView==='flat')animateFlatStep(document.querySelector('.board'),previousPosition,state.players[p.playerId].position,p.playerId,{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  if(pathIndex<path.length)p.timer=setTimeout(advance,900);
  else p.timer=setTimeout(()=>{
   const result=p.resultSnapshot,pending=p.updates.filter(update=>update.revision>result.revision);
   stopDicePresentation();commitSnapshot(result);pending.forEach(receive);

  },850);
 }
 p.timer=setTimeout(advance,900);
}
function receive(next){
 if(participantIntroPending&&snapshot?.state){if(next.revision>snapshot.revision&&!deferredSnapshots.some(s=>s.revision===next.revision))deferredSnapshots.push(next);return;}
 if(snapshot&&next.revision<snapshot.revision)return;
 if(dicePresentation){presentDiceResult(next);return;}
 if(activeActivity||activityInbox.pending.length){if(!deferredSnapshots.some(s=>s.revision===next.revision))deferredSnapshots.push(next);deferredSnapshots.sort((a,b)=>a.revision-b.revision);return;}
 const before=snapshot?.state,after=next.state;
 if(['roll','backward-roll'].includes(before?.phase)&&after&&after.turn===before.turn&&after.turnNumber===before.turnNumber&&(['action','quiz','backward-roll'].includes(after.phase)||after.phase==='finished'&&['bankruptcy','laps'].includes(after.endReason?.type))&&after.dice!==null){
  startDicePresentation(before.players[before.turn]);presentDiceResult(next);return;
 }
 commitSnapshot(next);
}
function commitSnapshot(next){
 if(snapshot&&next.revision<snapshot.revision)return;
 const introduce=!snapshot?.state&&next.state&&(next.state.turnNumber??0)===0&&next.state.dice===null;
 if(introduce)participantIntroPending=true;
 snapshot=next;if(next.state)state=next.state;
 rankingClient.observe(next,session,G.score);
 activityInbox.accept(next.code,next.activities||[]);render();
 if(introduce){revealCharacter=false;participantIntroModal();}
 continueFlow();
}
function statePromptKey(){return snapshot?.state?`${state.phase}:${state.turn}:${state.quiz}:${state.feedback?.index}:${state.purchaseChallenge?.questionId}:${state.purchaseChallenge?.response}:${state.trade?JSON.stringify(state.trade):''}`:'lobby';}
function continueFlow(){
 if(dicePresentation||activeActivity||!snapshot?.state)return;
 const d=$('#modal'),auto=statePromptKey();
 if(d.open){
  if(d.dataset.auto!=='true'||auto===lastAuto)return;
  d.close();
 }
 if(activityInbox.pending.length){showActivity(activityInbox.take());return;}
 while(deferredSnapshots.length&&deferredSnapshots[0].revision<=snapshot.revision)deferredSnapshots.shift();
 if(deferredSnapshots.length){receive(deferredSnapshots.shift());return;}
 const arrival=BOARD[G.current(state).position],purchaseKey=`${session?.code}:${state.turnNumber}:${state.turn}:${arrival.id}`;
 if(myTurn()&&state.phase==='action'&&!state.trade&&arrival.type==='work'&&!state.ownership[arrival.id]&&!state.purchaseChallenge&&G.current(state).coins>=arrival.price&&autoPurchaseKey!==purchaseKey){autoPurchaseKey=purchaseKey;void apply(G.startPurchaseQuiz);return;}
 if(auto!==lastAuto){lastAuto=auto;
  if(state.trade)tradeModal();
  else if(state.phase==='backward-roll'&&myTurn())backwardRollModal();
  else if(['purchase-quiz','purchase-feedback'].includes(state.phase)&&myTurn())purchaseQuizModal();
  else if(['quiz','feedback'].includes(state.phase)&&myTurn())quizModal();
  else if(state.phase==='finished')results();
 }
 const handoffKey=`${session?.code}:${state.turnNumber}:${state.turn}:${snapshot.revision}`;
 if(myTurn()&&canOfferTurnHandoff(state,session.playerId)&&!d.open&&lastHandoffKey!==handoffKey){lastHandoffKey=handoffKey;turnHandoffModal();}
}
function backwardRollModal(){showModal('뒤로가기 · 주사위를 한 번 더 굴려요',`<div class="special-info"><div class="backward-dice">${diceCube(5)}</div><p>주사위를 한 번 더 굴려 나온 숫자만큼 뒤로 이동합니다.</p></div><button class="primary full" data-action="roll-backward">뒤로 이동할 주사위 굴리기 →</button>`);$('#modal').dataset.auto='true';}
function currentConcertWork(){return myTurn()?G.concertWork(state):null;}
function concertPlanningIcon(){return `<span class="concert-cta-icon" aria-hidden="true"><span class="concert-note">♫</span>${concertHall()}</span>`;}
function concertPlanningButton(){
 const w=currentConcertWork();if(!w)return '';
 return `<button class="concert-cta full" data-action="plan-concert" aria-label="공연 기획하기" ${G.current(state).coins<100?'disabled':''}>${concertPlanningIcon()}<span><strong>공연 기획하기</strong><small>100 MC · 기본 이용료 +20 MC<br>다시 도착한 내 작품 · ${esc(w.title)}</small></span><b aria-hidden="true">→</b></button>`;
}
function concertPlanningModal(){
 const w=currentConcertWork();if(!w){notify('현재 도착한 내 작품 칸에서만 공연을 기획할 수 있어요.');return;}
 selected=w.id;
 showModal('도착한 작품으로 공연을 기획할까요?',`<div class="notice"><small>현재 도착한 작품</small><h3>${esc(w.composer)} · 「${esc(w.title)}」</h3></div><p class="concert-planning-intro">이 작품에 100 MC로 공연을 기획합니다. 기본 이용료가 20 MC 올라가고, 현재 칸에 작은 공연장이 세워져요. 작품마다 한 번만 가능합니다.</p><button class="concert-cta full" data-action="upgrade" ${!G.canUpgrade(state,w.id)?'disabled':''}>${concertPlanningIcon()}<span><strong>100 MC로 공연 기획하기</strong><small>현재 도착한 작품에 적용</small></span></button><button class="text-button full" data-action="close">취소하고 보드로 돌아가기</button>`,'concert-planning-modal');
}
function concertHall(){return `<span class="concert-hall" role="img" aria-label="공연 기획 완료 · 작은 공연장"><svg viewBox="0 0 80 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 59 53 68 75 55 30 47Z" fill="#3e6581"/><path d="M16 27 51 35 51 59 16 51Z" fill="#f8e7bb"/><path d="M51 35 68 25 68 49 51 59Z" fill="#c99b50"/><path d="M9 26 45 7 74 23 51 37Z" fill="#436d99"/><path d="M9 26 45 7 51 16 20 30Z" fill="#638fb6"/><path d="M22 34 27 35 27 52 22 51ZM42 38 47 39 47 56 42 55Z" fill="#fff9e9"/><path d="M30 40Q35 31 40 42V55L30 53Z" fill="#29537d"/><path d="M34 41H38V53H34Z" fill="#91cce6"/><path d="M54 38 59 35V43L54 46ZM62 33 66 31V39L62 42Z" fill="#fff1b6"/><path d="M11 54 50 63 71 51V56L51 68 11 59Z" fill="#e3c17e"/><path d="M47 15V25C41 23 39 29 44 30 48 30 50 28 50 25V18L57 16V12Z" fill="#ffdf78"/></svg></span>`;}
function turnHandoffModal(){
 const next=state.players[G.nextPlayerIndex(state)],finishing=!!G.firstFinisher(state),continuing=!finishing&&next.id===state.turn;
 showModal(finishing?'여행을 마무리해요':continuing?'다음 차례를 이어가요':'다음 참가자에게 차례를 넘겨요',`<div class="handoff-next-player">${characterSprite(next)}<div><small>${finishing?'설정한 여행을 모두 마쳤어요.':continuing?'남은 여행을 이어갈 참가자':'다음 참가자'}</small><strong>${finishing?'우리의 여행 결과':esc(next.name)}</strong></div></div><p class="handoff-description">${finishing?'버튼을 누르면 최종 결과를 확인할 수 있어요.':continuing?'다른 참가자들은 모두 완주했어요. 10초 후 나의 다음 차례로 자동으로 넘어갑니다. 버튼을 누르면 바로 이어갈 수 있어요.':'10초 후 다음 참가자에게 자동으로 차례를 넘깁니다. 버튼을 누르면 바로 넘길 수 있어요.'}</p>${finishing?'':concertPlanningButton()}<button class="primary full" data-action="handoff-next">${finishing?'여행 결과 보기 →':continuing?'나의 다음 차례 계속하기 →':'다음 참가자에게 차례 넘기기 →'}</button>${state.phase==='action'&&!state.quizUsed&&!finishing?'<button class="secondary full" data-action="handoff-quiz">차례를 넘기기 전에 배움 퀴즈 풀기 · +80 MC</button>':''}<button class="text-button full" data-action="close">보드에서 더 살펴보기</button>`,'turn-handoff-modal');
 $('#modal').dataset.auto='true';
 if(!finishing){
  const code=session.code,turn=state.turn,turnNumber=state.turnNumber;
  handoffCountdown.start({
   canContinue:()=>session?.code===code&&state.turn===turn&&state.turnNumber===turnNumber&&myTurn()&&canOfferTurnHandoff(state,session.playerId)&&$('#modal').open&&$('#modal').classList.contains('turn-handoff-modal'),
   onTick:seconds=>{const button=$('#modal [data-action="handoff-next"]');if(button)button.textContent=`${continuing?'나의 다음 차례 계속하기':'다음 참가자에게 차례 넘기기'} · ${seconds}초 후 자동 넘기기`;},
   onFinish:()=>{void passHandoff();}
  });
 }
}
async function passHandoff(){
 handoffCountdown.stop();if(busy||!myTurn()||!canOfferTurnHandoff(state,session.playerId))return;
 const button=$('#modal [data-action="handoff-next"]');busy=true;if(button)button.disabled=true;
 try{const passed=await apply(G.nextTurn);if(!passed&&button){button.disabled=false;button.textContent='다시 차례 넘기기 →';}}finally{busy=false;}
}
function dismissActivity(){activeActivity=null;$('#modal').close();continueFlow();}
function historyCard(e,actorId){
 const risk=e.amount<0,category=e.category||e.period||'음악사 사건 카드';
 const kind=category.includes('음악사')?'industry':risk?'risk':'opportunity';
 const symbol={industry:'♫',risk:'♭',opportunity:'♪'}[kind];
 return `<div class="collectible-card card-${kind}"><div class="card-value"><strong>${e.amount>0?'+':''}${e.amount}</strong><small>MC</small></div><div class="card-art art-${kind}"><span class="card-staves" aria-hidden="true">♬</span><span class="card-art-symbol" aria-hidden="true">${symbol}</span><span class="card-art-category">${esc(category)}</span></div><div class="card-ribbon"><h3>${esc(e.title)}</h3></div><div class="card-gem" aria-hidden="true"></div><div class="card-description"><p>${esc(e.text)}</p><strong class="card-effect">${e.amount>=0?'획득':'차감'} ${Math.abs(e.actual??e.amount)} MC</strong>${e.actual!==undefined&&e.actual!==e.amount?`<small>표시 금액 ${Math.abs(e.amount)} MC 중 잔액 한도에서 ${Math.abs(e.actual)} MC를 차감했습니다.</small>`:''}</div><div class="card-owner">${esc(state.players[actorId]?.name||'참가자')}의 사건 카드</div></div>`;
}
function showActivity(item){
 activeActivity=item;
 const effect=activitySound(item);if(effect)void soundEffects.play(effect,`${session.code}:${effect==='prison'?`prison:${state.turnNumber}:${item.actorId}`:`event:${item.id}`}`);
 const actor=state.players[item.actorId],other=state.players[item.otherId];
 const footer=item.type==='backward-entry'&&myTurn()?`<button class="primary full" data-action="roll-backward">뒤로 이동할 주사위 굴리기 →</button>`:`<div class="activity-footer"><small>전체 참가자에게 공개되는 이벤트${activityInbox.pending.length?` · 대기 ${activityInbox.pending.length}건`:''}</small><button class="primary full" data-action="activity-next">확인${activityInbox.pending.length?' · 다음 안내 →':'하고 계속하기 →'}</button></div>`;
 if(item.type==='history-event'){
  showModal('음악사 사건 카드',`<p class="activity-audience">${esc(actor.name)} 님이 사건 카드를 뽑았습니다.</p>${historyCard(item.card,item.actorId)}<p class="card-fiction">카드 내용과 코인 금액은 게임용 가상 시나리오입니다.</p><details class="card-reflection"><summary>함께 생각해요</summary><p>${esc(item.card.prompt)}</p></details>${footer}`,'activity-modal event-card-modal');
 }else{
  const symbols={'backward-entry':'⚄','first-finish':'⚑',bankruptcy:'⚑','backward-move':'↶',purchase:'♫',rent:'⇄',sale:'↩',upgrade:'♬','quiz-result':'?','purchase-quiz-result':'OX','prison-transfer':'↪','prison-entry':'▥','prison-skip':'▥','prison-roll':'⚄','start-bonus':'↻',concert:'♪','trade-complete':'⇄','trade-offer':'↗','trade-cancelled':'–','copyright-transfer':'©','copyright-transfer-skipped':'©'};
  const ledger=(item.changes||[]).map(c=>`<div><span>${characterSprite(state.players[c.playerId])}<b>${esc(state.players[c.playerId].name)}</b></span><strong class="${c.amount<0?'debit':'credit'}">${c.amount>0?'+':''}${num(c.amount)} <small>MC</small></strong></div>`).join('');
  const assignment=item.type==='copyright-transfer'?`<div class="activity-assignment"><div>${characterSprite(actor)}<b>${esc(actor.name)}</b><small>양도하는 참가자</small></div><span aria-hidden="true">→</span><div>${characterSprite(other)}<b>${esc(other.name)}</b><small>양도받는 참가자</small></div></div><p class="assignment-price">작품 구입가 ${num(item.amount)} MC 기준 · 무상 양도</p>`:'';
  const amount=item.type==='trade-offer'?`<div class="activity-proposal">${esc(actor.name)} → ${esc(other.name)}<strong>${num(item.amount)} MC</strong></div>`:'';
  const ownPurchaseQuestion=item.type==='purchase-quiz-result'&&item.actorId===session.playerId&&state.purchaseChallenge?.workId===item.workId?purchaseQuizById(state.purchaseChallenge.questionId):null;
 const verdict=item.type==='purchase-quiz-result'?quizVerdict(item.correct,null,ownPurchaseQuestion?(ownPurchaseQuestion.answer?'O · 맞다':'X · 아니다'):null):item.type==='quiz-result'?quizVerdict(item.correct):'';
 const limited=item.type==='rent'&&item.expected!==null&&item.amount<item.expected?`<p class="muted">기준 이용료 ${num(item.expected)} MC 중 잔액 한도에서 ${num(item.amount)} MC를 지급했습니다.</p>`:'';
  showModal(esc(item.title),`<div class="activity-hero">${item.type==='backward-entry'?`<div class="activity-symbol backward-dice" aria-hidden="true">${diceCube(5)}</div>`:`<span class="activity-symbol" aria-hidden="true">${symbols[item.type]||'♫'}</span>`}${characterSprite(actor)}<strong>${esc(actor.name)}</strong></div>${verdict}<p class="activity-description">${esc(item.type==='prison-entry'?PRISON_MESSAGE:item.text)}</p>${item.type.startsWith('prison-')?'<p class="muted">게임용 가상 상황이며 실제 법적 처벌을 뜻하지 않습니다.</p>':''}${amount}${assignment}${ledger?`<div class="activity-ledger">${ledger}</div>`:''}${limited}${item.workId&&item.type!=='purchase-quiz-result'?'<p class="muted">게임 안의 가상 음악 이용권에 관한 안내입니다.</p>':''}${footer}`,'activity-modal');
 }
 $('#modal').dataset.activity='true';
}
function connect(){
 if(chatRoom!==session.code){chatRoom=session.code;chatMessages=[];chatDraft='';}

 events?.close();events=peerTransport.subscribe(session,{
  onSnapshot:data=>{connected=true;receive(data);},
  onChat:acceptChat,
  onDisconnect:message=>{connected=false;render();if(message)notify(message);}
 });
}
async function enter(path,nickname,code,characterId){
 if(busy)return;busy=true;
 try{session=await request(path,{nickname,code,characterId});remember();snapshot=null;lastAuto='';resetActivityFlow();connect();render();}catch(error){notify(error.message);}finally{busy=false;}
}
async function resume(){if(!session?.code||!session?.token){session=null;render();notify('이 브라우저에 저장된 게임이 없어요. 새 게임을 시작해 주세요.');return;}try{const data=await request('resume',{code:session.code});session.playerId=data.playerId;connected=true;receive(data);connect();}catch(error){session=null;try{localStorage.removeItem(key);}catch{}render();notify(error.message);}}
const num=n=>n.toLocaleString('ko-KR');
const lapProgressText=p=>`${G.completedLaps(state,p)} / ${state.maxRounds}바퀴`;
const era=id=>ERAS.find(e=>e.id===id);
const work=id=>WORKS.find(w=>w.id===id);
const icon=t=>({start:'⚑',event:'✦',quiz:'?',copyright:'©',concert:'♬',transfer:'⇄',prison:'▥','go-to-prison':'↪',work:'♪','back-three':'↶'}[t]);
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').classList.remove('show'),3600);}
async function apply(fn,...args){
 if(!connected){notify('서버에 다시 연결하는 중입니다.');return false;}
 try{const next=await request('action',{code:session.code,action:fn.name,args,revision:snapshot.revision});receive(next);return true;}catch(e){notify(e.message);return false;}
}
function pill(text,cls=''){return `<span class="pill ${cls}">${text}</span>`;}
function characterSprite(person,extra=''){
 const c=characterFor(person),color=playerColor(person);
 return `<span class="character-avatar ${extra} ${c.layout==='single'?'character-single':''} ${c.portrait?'character-bust':''}" style="--team:${color};--character-image:url('${new URL(c.asset,document.baseURI).href}');--character-x:${(c.slot%3)*50}%;--character-y:${Math.floor(c.slot/3)*100}%" role="img" aria-label="${esc(c.name)} 캐릭터"><span class="character-sprite"></span></span>`;
}
function bonusCharacterLabel(character){return character.bonus?'<span class="bonus-character-label">*보너스 캐릭터</span>':'';}
function rankingRows(){
 if(rankingClient.error&&!rankingClient.entries.length)return `<p class="ranking-empty">${esc(rankingClient.error)}</p>`;
 if(!rankingClient.entries.length)return `<p class="ranking-empty">${rankingClient.loading?'전체 랭킹을 불러오고 있어요…':'아직 등록된 기록이 없어요.<br>첫 번째 음악 투자자의 주인공이 되어 보세요!'}</p>`;
 return `<ol class="ranking-list">${rankingClient.entries.map((p,i)=>`<li class="ranking-place-${i+1}"><span class="ranking-place" aria-label="${i+1}위">${i<3?`<span role="img" aria-label="${['금','은','동'][i]}메달">${['🥇','🥈','🥉'][i]}</span>`:i+1}</span><strong>${esc(p.nickname)}</strong><span class="ranking-score">${num(p.score)} <small>점</small></span></li>`).join('')}</ol>`;
}
function rankingPanel(){return `<section class="entrance-ranking" aria-labelledby="ranking-title"><div class="ranking-intro"><span class="eyebrow">MUSIC MARBLE TOP 10</span><h2 id="ranking-title">우리들의 누적 랭킹</h2><p>명곡과 함께 쌓아 가는<br>음악 투자자의 기록</p><small>종료한 게임의 총자산을 점수로 누적해요.<br>봇 제외 · 같은 닉네임은 합산</small><button type="button" class="ranking-refresh" data-action="ranking-refresh" ${rankingClient.loading?'disabled':''}>${rankingClient.loading?'불러오는 중…':'랭킹 새로고침 ↻'}</button></div><div id="ranking-board-content" aria-live="polite">${rankingRows()}</div></section>`;}
function updateRankingBoard(){const panel=$('#ranking-board-content');if(panel)panel.innerHTML=rankingRows();const button=$('[data-action="ranking-refresh"]');if(button){button.disabled=rankingClient.loading;button.textContent=rankingClient.loading?'불러오는 중…':'랭킹 새로고침 ↻';}const status=$('#ranking-save-status');if(status)status.textContent=session?.playerId===0?rankingClient.status(snapshot?.gameId):'최종 점수는 방장 화면에서 전체 랭킹에 기록됩니다.';}
function characterPicker(selected=''){
 return `<div class="character-picker"><label>나의 캐릭터<select name="characterId" aria-label="나의 캐릭터"><option value="">랜덤으로 정하기</option>${CHARACTERS.map(c=>`<option value="${c.id}" ${selected===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><div class="character-choice-preview" aria-live="polite">${characterChoicePreview(selected)}</div><small>${CHARACTERS.length}명 중 직접 고르거나 랜덤으로 정할 수 있어요. 같은 방에서는 중복되지 않아요.</small></div>`;
}
function characterChoicePreview(id){const c=characterById(id);return c?`${bonusCharacterLabel(c)}${characterSprite({id:0,characterId:id},'character-large')}<strong>${esc(c.name)}</strong><small>${esc(c.fullName)}</small>`:'<span class="random-character">?</span><strong>어떤 음악가를 만나게 될까요?</strong><small>다른 참가자와 겹치지 않게 배정해요.</small>';}
function updateCharacterChoice(e){if(e.target.name==='characterId'){const picker=e.target.closest('.character-picker');picker.querySelector('.character-choice-preview').innerHTML=characterChoicePreview(e.target.value);}}
$('#app').addEventListener('change',updateCharacterChoice);
$('#modal').addEventListener('change',updateCharacterChoice);
function participantIntroModal(){
 const participants=state.players.map((person,index)=>`<li class="participant-intro-card" style="--team:${playerColor(person)}"><span class="participant-order">${index+1}번 주자</span>${bonusCharacterLabel(characterFor(person))}${characterSprite(person,'character-large')}<strong class="participant-nickname">${esc(person.name)}</strong><span class="participant-character">${esc(characterFor(person).name)}</span>${person.id===session.playerId?'<span class="participant-self">나</span>':''}</li>`).join('');
 showModal('오늘 함께할 음악 여행자',`<p class="participant-intro-description">오늘 게임에 참여하는 친구들이에요.<br>아래 순서대로 주사위를 굴리며 음악 여행을 떠나요!</p><ol class="participant-intro-list" aria-label="게임 진행 순서">${participants}</ol><p class="participant-intro-note">각자의 캐릭터말은 첫 주사위를 굴려 이동할 때 등장해요.</p><button class="primary full" data-action="enter-board">참가자 확인하고 보드로 →</button>`,'participant-intro-modal');
}
function characterModal(person,starting=false){
 const c=characterFor(person);
 const redraw=starting&&snapshot.mode==='solo'&&state.round===1&&state.phase==='roll'&&state.dice===null;
 showModal(starting?'나의 캐릭터가 정해졌어요':`${esc(person.name)}의 캐릭터`, `<div class="character-reveal">${bonusCharacterLabel(c)}${characterSprite(person,'character-large')}<span class="character-kicker">MUSIC HISTORY CHARACTER</span><h3>${esc(c.name)}</h3><p>${esc(c.fullName)}</p></div><div class="notice">직접 고르거나 랜덤으로 정한 나의 캐릭터예요. 같은 방의 플레이어와 봇은 모두 다른 캐릭터를 사용합니다. 보드에서는 팀 색상의 받침으로 나의 말을 구분할 수 있어요.</div><button class="primary full" data-action="close">${starting?'이 캐릭터로 시작하기 →':'확인'}</button>${redraw?'<button class="text-button" data-action="redraw-character">다른 캐릭터 무작위로 뽑기 ↻</button>':''}`,starting?'entrance-help':'');
}
function characterGallery(){
 showModal(`캐릭터 ${CHARACTERS.length}종`,`<p class="muted">캐릭터 사진이나 이름을 누르면 생몰 연도와 음악사적 업적을 볼 수 있어요.</p><div class="character-gallery">${CHARACTERS.map((c,id)=>`<button type="button" data-action="character-bio" data-id="${c.id}" aria-label="${esc(c.name)} 소개 보기">${bonusCharacterLabel(c)}${characterSprite({id:id%5,characterId:c.id})}<strong>${esc(c.name)}</strong></button>`).join('')}</div>`,'entrance-help character-gallery-modal');
 if(galleryReturnCharacter){$('#modal').querySelector(`[data-id="${galleryReturnCharacter}"]`)?.focus();galleryReturnCharacter=null;}
}
function characterBio(id){
 const c=characterById(id),bio=CHARACTER_BIOS[id];if(!c||!bio)return;
 galleryReturnCharacter=id;
 const lifespan=bio.birth!==null&&bio.death!==null?`${bio.birth} ~ ${bio.death}`:'비밀';
 showModal(`${esc(c.name)} 알아보기`,`<div class="character-reveal character-bio-portrait">${bonusCharacterLabel(c)}${characterSprite({id:0,characterId:id},'character-large')}<p>${esc(c.fullName)}</p><p class="character-lifespan">${esc(lifespan)}</p></div><div class="character-achievement"><h3>캐릭터 소개</h3><p>${esc(bio.achievement)}</p></div>`,'entrance-help character-bio-modal');
}

async function redrawCharacter(){
 try{const next=await request('action',{code:session.code,action:'rerollCharacter',args:[],revision:snapshot.revision});receive(next);if(next.state)characterModal(state.players[session.playerId],true);else notify(`새 캐릭터: ${characterFor(next.members[session.playerId]).name}`);}catch(error){notify(error.message);}
}
// Presentation colours are keyed by seat so saved rooms use the current palette too.
const PLAYER_PALETTE=['#2166e8','#f59e0b','#a442d8','#11a881'];
function playerColor(person){return PLAYER_PALETTE[person.id]||PLAYER_PALETTE[0];}
function playerInk(person){return person.id===0||person.id===2?'#ffffff':'#07111a';}
function tokenVisible(player){return boardTokenVisible(state,player,dicePresentation?.moving?dicePresentation.playerId:null);}
function tokens(index){const occupants=state.players.filter(p=>p.position===index&&tokenVisible(p));const [row,col]=coordinates(index);const {x,y}=boardTokenAnchor(row,col,BOARD_SIDE);return `<div class="tokens ${index===0?'tokens-at-start':''} ${occupants.length>=3?'token-stack':''}" style="--token-x:${x}%;--token-y:${y}%">${occupants.map(p=>`<span data-player-id="${p.id}" class="token character-token ${p.id===state.turn?'token-active':''} ${dicePresentation?.moving&&p.id===dicePresentation.playerId?'token-moving':''}" style="--team:${playerColor(p)}" title="${esc(p.name)} · ${esc(characterFor(p).name)}${p.isBot?' · BOT':''}" aria-label="${esc(p.name)}의 ${esc(characterFor(p).name)} 캐릭터">${characterSprite(p,'board-character')}<span class="character-ground"></span></span>`).join('')}</div>`;}
const coordinates=boardCoordinates;
function startPortal(){return `<span class="start-portal" aria-hidden="true"><svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gate-gold"><stop stop-color="#f6e0a0"/><stop offset=".5" stop-color="#be9047"/><stop offset="1" stop-color="#ffe7a0"/></linearGradient><linearGradient id="gate-light" x2="0" y2="1"><stop stop-color="#bceeff" stop-opacity=".9"/><stop offset="1" stop-color="#398bc0" stop-opacity=".1"/></linearGradient></defs><path d="M22 105V48a28 28 0 0 1 56 0v57" fill="url(#gate-light)" stroke="#286b98" stroke-width="12"/><path d="M20 106V46a30 30 0 0 1 60 0v60" fill="none" stroke="url(#gate-gold)" stroke-width="6"/><path d="M28 102V48a22 22 0 0 1 44 0v54" fill="none" stroke="#f8e4a4" stroke-width="2"/><path d="M13 54h17v50H13zM70 54h17v50H70z" fill="#397ba3" stroke="#ebcc82" stroke-width="2"/><path d="M10 101h24v9H10zM66 101h24v9H66zM10 48h24v8H10zM66 48h24v8H66z" fill="url(#gate-gold)" stroke="#87643d"/><path d="M6 110h88v7H6z" fill="#f1d58f" stroke="#957640"/><path d="M37 18h26l-3-11H40z" fill="url(#gate-gold)" stroke="#96733f"/><path d="M53 29v28c-12-5-16 12-6 12 5 0 10-3 10-8V38l10-3V25z" fill="#f3db95" stroke="#a17b3e" stroke-width="1"/></svg></span>`;}
function landmark(type){
 const drawings={
  start:'<path d="M12 30h40v6H12zM17 14h30v5H17z"/><path d="M23 8h18l9 6H14z"/><path d="M20 19h5v11h-5zm10 0h5v11h-5zm10 0h5v11h-5z"/>',
  'go-to-prison':'<rect x="35" y="6" width="24" height="48" rx="3" fill="#15171c" stroke="#aeb7c3" stroke-width="4"/><path d="M43 8v44m8-44v44" stroke="#d8e0e6" stroke-width="3"/><path d="M3 22h20V12l20 18-20 18V38H3z" fill="#ffdb16" stroke="#17191e" stroke-width="2"/>',
  prison:'<rect x="7" y="4" width="50" height="52" rx="4" fill="#18191c" stroke="#aeb7c3" stroke-width="4"/><path d="M18 52v-9c0-13 28-13 28 0v9" fill="#ec6d29"/><circle cx="32" cy="25" r="14" fill="#f4c28b"/><path d="M18 23c-2-18 28-19 28 0l-8-8-7 5-7-2z" fill="#6b4028"/><circle cx="27" cy="25" r="2" fill="#202127"/><circle cx="37" cy="25" r="2" fill="#202127"/><path d="M28 33q4-3 8 0" fill="none" stroke="#7c462e" stroke-width="2"/><path d="M17 7v47m15-47v47m15-47v47" stroke="#606a77" stroke-width="5"/><path d="M16 7v47m15-47v47m15-47v47" stroke="#dce2e9" stroke-width="2"/>',
  transfer:'<rect x="13" y="8" width="30" height="39" rx="4"/><path d="M21 17h14M21 24h14M21 31h7" stroke="white" stroke-width="3"/><path d="M31 46h23l-6-6m6 6-6 6" fill="none" stroke="currentColor" stroke-width="5"/>',
  event:'<path d="M20 6h29v36H20z"/><path d="M13 13h29v36H13z" opacity=".65"/><path d="m31 19 3 7 8 1-6 5 2 8-7-4-7 4 1-8-5-5 8-1z" fill="#fff"/>',
  'back-three':'<path d="M28 8 8 26l20 18V32h12c9 0 14 5 14 14v6h7v-6c0-14-8-23-21-23H28Z"/>',
  quiz:'<path d="M19 17c0-14 27-14 27 0 0 10-14 9-14 20h-7c0-15 13-13 13-20 0-6-12-6-12 0z"/><circle cx="29" cy="46" r="4"/>',
  copyright:'<circle cx="32" cy="29" r="23"/><circle cx="32" cy="29" r="17" fill="#fff"/><path d="M39 21c-16-8-23 18-2 17" fill="none" stroke="currentColor" stroke-width="6"/>',
  concert:'<path d="M12 25h40v25H12zM8 22 32 6l24 16z"/><path d="M18 28h5v17h-5zm12 0h5v17h-5zm12 0h5v17h-5z" fill="#fff"/><path d="M8 49h48v5H8z"/>',
 };
 return `<svg class="landmark" viewBox="0 0 64 60" fill="currentColor" aria-hidden="true">${drawings[type]||''}</svg>`;
}
function boardTitle(cell){
 const lines={
  'go-to-prison':['감옥으로','가기'],
  'back-three':['뒤로가기'],
  'streaming-prison':boardView==='flat'?['불법','스트리밍','감옥']:['불법 스트리밍','감옥'],
  'handel-water':['수상','음악'],
  'haydn-surprise':['놀람','교향곡'],
  'brahms-hungarian-5':['헝가리 무곡','제5번'],
  'bach-air':['G선상의','아리아'],
  'bach-brandenburg':['브란덴부르크','협주곡'],
  'mozart-serenade':['작은 밤의','음악'],
  'beethoven-5':['교향곡','제5번'],
  'beethoven-9':['교향곡','제9번'],
  'schubert-trout':['송어','5중주'],
  'chopin-nocturne':['녹턴','Op.9 No.2'],
  'chopin-polonaises':['영웅','폴로네즈'],
  concert:['모두의','음악회'],
 }[cell.id]||({event:['음악사','사건'],copyright:['권리','탐구실'],transfer:['저작권','양도']})[cell.type]||[cell.title];
 return lines.map(line=>`<span class="tile-title-line">${esc(line)}</span>`).join('');
}
function tileCopy(c){return `<span class="tile-copy">${c.type!=='work'?landmark(c.type):''}<span class="cell-top">${c.type==='work'?esc(c.composer):icon(c.type)}</span><strong class="${c.id==='bach-brandenburg'?'long-title':''}">${boardTitle(c)}</strong><span class="cell-price">${c.price?`${c.price} MC`:esc(c.type==='go-to-prison'?'':({start:'출발 · +200 MC',quiz:'+80 MC','back-three':'추가 주사위',concert:'+100 MC',event:'음악사 카드',copyright:'저작권 퀴즈',transfer:'최고가 작품',prison:'6으로 탈출 · 기회 2번'})[c.type]||c.subtitle)}</span></span>`;}
function boardLabelLayer(){return `<div class="board-labels" aria-hidden="true">${BOARD.map((c,i)=>`<div class="board-label ${c.type}" data-label-index="${i}">${tileCopy(c)}</div>`).join('')}</div>`;}
function boardPawnLayer(){return `<div class="board-pawns">${BOARD.map((c,i)=>{if(!state.players.some(p=>p.position===i&&tokenVisible(p)))return '';const [row,col]=coordinates(i),anchor=boardTokenAnchor(row,col,BOARD_SIDE);return `<div class="board-pawn-group" data-pawn-index="${i}" data-anchor-x="${anchor.x}" data-anchor-y="${anchor.y}">${tokens(i)}</div>`;}).join('')}</div>`;}
function board(){return `<div class="board-area ${boardView==='3d'?'is-3d':'is-flat'}"><section class="board-summary" aria-label="보드 진행 정보"><div><span class="summary-eyebrow">MUSIC MARBLE</span><h2>명곡의 정원</h2></div><div class="summary-turn"><span class="live-dot"></span>${esc(G.current(state).name)}${dicePresentation?.moving?dicePresentation.backward?` · 뒤로 이동 중 ${dicePresentation.backwardStep} / ${dicePresentation.resultSnapshot.state.lastBackwardMove?.steps??dicePresentation.result}칸`:` · 이동 중 ${dicePresentation.step} / ${dicePresentation.totalSteps??dicePresentation.result}칸`:state.phase==='finished'?' · 여행 완료':'의 차례'}</div><b class="summary-round">${lapProgressText(G.current(state))}<small> ROUND · 완주</small><small class="lap-progress">${esc(G.current(state).name)} 기준 · 전체 완주 ${state.players.filter(p=>G.hasFinished(state,p)).length} / ${state.players.length}명</small></b></section><div class="board-surround">${players('top')}<div class="board-scroll-hint">↔ 보드를 좌우로 밀어 작품을 살펴보세요.</div><div class="board-scene"><div class="garden-ground" aria-hidden="true"></div><div class="scene-decoration decoration-left" aria-hidden="true">♫</div><div class="scene-decoration decoration-right" aria-hidden="true">♪</div><div class="board-wrap"><div class="board-grid-frame"><div class="board" aria-label="음악사 보드판, 시계 방향 진행">${BOARD.map((c,i)=>{
 const [row,col]=coordinates(i),owner=state.ownership[c.id],active=G.current(state).position===i;
 const tile={baroque:'#199fc4',classical:'#8c70cb',romantic:'#ef9b42',modern:'#70b44d'}[c.era]||'#9cbfd0';
 return `<button class="cell ${c.type} ${active?'current':''} ${dicePresentation?.moving&&state.players[dicePresentation.playerId].position===i?'pawn-moving-cell':''} ${owner?'owned':''} ${owner?.level?'upgraded':''}" data-action="cell" data-index="${i}" style="grid-row:${row};grid-column:${col};--era:${c.era?era(c.era).color:'#cbbd99'};--tile:${tile};--owner-inward:${ownershipDirection(i)};--owner:${owner?playerColor(state.players[owner.player]):'transparent'}" aria-label="${i+1}번 ${esc(c.composer||'')} ${esc(c.title)}${owner?`, ${esc(state.players[owner.player].name)} 보유`:''}">${tileCopy(c)}${c.type==='start'?startPortal():''}${tokens(i)}${owner?`<span class="ownership-dot" title="${esc(state.players[owner.player].name)} 보유"></span>`:''}${owner?.level?concertHall():''}</button>`;
 }).join('')}<div class="board-center"><div class="garden-water" aria-hidden="true"><div class="pond-water-effects"><span class="water-caustics"></span><span class="water-glints"></span><span class="water-ripple ripple-one"></span><span class="water-ripple ripple-two"></span><span class="water-ripple ripple-three"></span></div><span class="fountain-shimmer"></span></div></div></div></div></div>${boardView==='3d'?boardLabelLayer()+boardPawnLayer():''}</div>${players('bottom')}</div></div>`;}

function actionPanel(){
 const p=G.current(state),c=BOARD[p.position],o=state.ownership[c.id];
 if(state.phase==='finished')return `<div class="turn-card"><span class="eyebrow">FINALE</span><h2>멋진 여행이었어요!</h2><p>얼마나 모았는지, 무엇을 배웠는지<br>우리의 여정을 돌아보세요.</p><button class="primary full" data-action="results">수업 결과 보기 ↗</button></div>`;
 if(!myTurn())return `<div class="turn-card"><div class="turn-heading"><span class="eyebrow">${connected?'LIVE GAME':'RECONNECTING'}</span>${pill(session?.code||'')}</div><h2>${characterSprite(p)}${esc(p.name)}</h2><div class="waiting-visual">${characterSprite(p,'character-large')}<small>${esc(characterFor(p).name)}</small></div><p>${connected?G.hasFinished(state,state.players[session.playerId])?'나는 완주했어요. 남은 참가자의 완주를 기다리며 함께 지켜봐요.':p.isBot?`${esc(p.name)}이(가) 자동으로 플레이하고 있어요. 곧 내 차례로 돌아옵니다.`:`${esc(p.name)}의 차례입니다. 같은 보드를 보며 함께 전략을 세워요.`:'서버에 다시 연결하고 있어요. 연결되면 최신 상태로 이어집니다.'}</p><div class="notice">나의 닉네임: ${esc(state.players[session.playerId]?.name||'')}<b>보유 코인 ${num(state.players[session.playerId]?.coins||0)} MC</b></div>${state.trade?'<button class="primary full" data-action="trade-open">거래 제안 확인</button>':''}</div>`;
 let content='';
 if(state.phase==='roll')content=`<div class="roll-visual">${diceCube(state.dice||5)}<span>${p.skipTurns?`6이 나오면 즉시 탈출 · 남은 기회 ${p.skipTurns}번`:'다음 명곡은 어디에 있을까요?'}</span></div><button class="primary full" data-action="roll" ${busy?'disabled':''}>${busy?'여행하는 중…':p.skipTurns?'탈출 주사위 굴리기':'주사위 굴리기'} <span>↗</span></button>`;
 else if(state.phase==='backward-roll')content=`<div class="notice">주사위를 한 번 더 굴려 나온 숫자만큼 뒤로 이동합니다.</div><button class="primary full" data-action="roll-backward">뒤로 이동할 주사위 굴리기 →</button>`;
 else if(state.phase==='jailed')content=`<div class="arrival"><span>불법 스트리밍 감옥</span><h3>${state.lastPrisonRoll?'이번 차례는 감옥에 머물러요':'6이 나오면 즉시 탈출!'}</h3><p>${state.lastPrisonRoll?(p.skipTurns?'다음 자기 차례에 한 번 더 탈출 주사위를 굴릴 수 있어요.':'두 번 도전을 마쳤어요. 다음 자기 차례부터 정상 이동해요.'):esc(PRISON_MESSAGE)}</p></div><button class="primary full" data-action="next">안내 확인하고 차례 마치기 →</button>`;
 else if(state.phase==='purchase-quiz'||state.phase==='purchase-feedback')content=`<div class="arrival"><span>이용권 구입 OX 퀴즈</span><h3>${esc(c.title)}</h3><p>정답이면 뮤직코인을 내고 구입할 수 있어요. 오답이면 차감 없이 차례를 넘겨요.</p></div><button class="primary full" data-action="purchase-quiz-open">${state.phase==='purchase-quiz'?'OX 퀴즈 열기':'OX 해설 확인하기'} →</button>`;
 else if(state.phase==='quiz'||state.phase==='feedback')content=`<div class="arrival"><span>배움의 시간</span><h3>${state.phase==='quiz'?'함께 답을 골라 보세요':'답보다 중요한 해설'}</h3><p>퀴즈 정답 시 80 MC를 얻어요.</p></div><button class="primary full" data-action="quiz-open">${state.phase==='quiz'?'퀴즈 열기':'해설 확인하기'} →</button>`;
 else if(state.trade)content=`<div class="notice">거래 제안을 보냈어요. 상대 참가자의 응답을 기다려 주세요.</div><button class="primary full" data-action="trade-open">거래 제안 확인</button>`;
 else {
  content=`<div class="arrival"><span>${state.dice}칸 이동 · ${c.composer?esc(c.composer):'도착한 곳'}</span><h3>${esc(c.title)}</h3><p>${c.type==='work'?esc(c.note):c.type==='start'?'다시 새로운 시대를 만나러 가요.':c.type==='concert'?'모든 팀에 음악회 지원금 100 MC가 지급되었어요.':c.type==='transfer'?(state.lastAssignment?.skipped?'보유 작품이 없어 양도 없이 통과했어요.':'가장 비싼 작품의 가상 권리를 다른 참가자에게 양도했어요.'):state.lastEvent?esc(state.lastEvent.title):'시대의 이야기를 나눠 보세요.'}</p></div>`;
  if(c.type==='work'&&!o){const passed=state.purchaseChallenge?.workId===c.id&&state.purchaseChallenge.correct===true;content+=`<div class="price-row"><span>가상 이용권</span><strong>${num(c.price)} <small>MC</small></strong></div>${passed?'<div class="purchase-pass-note">✓ OX 정답 · 이용권 구입 가능</div>':''}<button class="primary full" data-action="${passed?'buy':'purchase-quiz'}" ${p.coins<c.price?'disabled':''}>${p.coins<c.price?'뮤직코인이 부족해요':passed?'이용권 구입하기 ＋':'OX 퀴즈 풀고 구입하기 →'}</button>`;}
  if(c.type==='work'&&o)content+=`<div class="notice">${o.player===p.id?'나의 컬렉션에 있는 작품이에요.':state.lastRent?.workId===c.id?`${esc(state.players[state.lastRent.owner].name)}에게 ${state.lastRent.amount} MC를 지급했어요.`:`${esc(state.players[o.player].name)}의 이용권입니다.`}<b>기준 이용료 ${G.fee(state,c)} MC</b></div>`;
  if(state.lastEvent)content+=`<button class="secondary full" data-action="event">✦ 사건 카드 다시 보기</button>`;
  if(!state.quizUsed)content+=`<button class="secondary full" data-action="quiz">? 배움 퀴즈 도전 <span>+80 MC</span></button>`;
  content+=`<button class="${c.type==='work'&&!o?'text-button':'primary full'}" data-action="next">${c.type==='work'&&!o?'구입하지 않고 차례 마치기':'다음 팀에게 넘기기'} →</button>`;
 }
 return `<div class="turn-card"><div class="turn-heading"><span class="eyebrow">YOUR TURN</span>${pill(`완주 ${lapProgressText(p)}`)}</div><h2>${characterSprite(p)}${esc(p.name)}</h2><button class="my-character-button" data-action="my-character">${characterSprite(p)}<span>나의 캐릭터 <b>${esc(characterFor(p).name)}</b></span><i>↗</i></button><div class="balance"><span>사용 가능한 뮤직코인</span><strong>${num(p.coins)}<small> MC</small></strong></div>${concertPlanningButton()}${content}</div>`;
}
function players(row){
 const seats=['top-left','top-right','bottom-left','bottom-right'];
 return `<section class="board-players players-${row}" aria-label="함께 여행하는 친구 · ${row==='top'?'위쪽':'아래쪽'}"><h3 class="board-players-heading">함께 여행하는 친구 · ${state.players.length} PLAYERS</h3>${state.players.map((p,i)=>({p,i})).filter(({i})=>seats[i].startsWith(row)).sort((a,b)=>Number(seats[a.i].endsWith('right'))-Number(seats[b.i].endsWith('right'))).map(({p,i})=>`<article class="board-player seat-${seats[i]} ${p.id===state.turn&&state.phase!=='finished'?'active':''} ${p.id===session.playerId?'is-me':''}" style="--player-color:${playerColor(p)};--player-ink:${playerInk(p)}" aria-label="${esc(p.name)} 참가자 정보"><div class="board-player-portrait">${characterSprite(p)}<span class="seat-number">${i+1}</span></div><div class="board-player-info"><div class="board-player-name"><strong>${esc(p.name)}</strong>${p.id===session.playerId?'<span class="seat-badge">나</span>':''}</div><small class="board-player-character">${esc(characterFor(p).name)}</small><div class="board-player-coins"><span>보유 코인</span><b>${num(p.coins)} <small>MC</small></b></div><div class="board-player-assets"><span>총자산</span><b>${num(G.score(state,p))} MC</b><span>이용권 ${G.owned(state,p.id).length}</span></div><small class="board-player-laps">완주 ${lapProgressText(p)}${G.hasFinished(state,p)?' · 완주':''}</small>${p.skipTurns?`<small class="board-player-prison">감옥 탈출 기회 ${p.skipTurns}번</small>`:''}</div>${p.id===state.turn&&state.phase!=='finished'?'<span class="board-player-turn">진행 중</span>':''}</article>`).join('')}</section>`;
}

function collectionView(){return `<section class="collection-view"><div class="view-intro"><span class="eyebrow">THE MUSIC LIBRARY</span><h2>작품을 만나는 또 다른 방법</h2><p>시대와 작곡가를 알아가며 나만의 음악 컬렉션을 완성하세요.</p></div><div class="filters">${[{id:'all',name:'모든 시대'},...ERAS].map(e=>`<button data-action="filter" data-id="${e.id}" class="${filter===e.id?'selected':''}">${e.name}</button>`).join('')}</div><div class="work-grid">${WORKS.filter(w=>filter==='all'||w.era===filter).map(w=>{const o=state.ownership[w.id];return `<button class="work-card" data-action="work" data-id="${w.id}" style="--era:${era(w.era).color}"><div class="work-art"><span>${esc(w.composer)}</span><b>${w.composer==='바흐'?'𝄞':'♫'}</b><small>${esc(w.year)}</small></div><div class="work-details"><span>${era(w.era).name}</span><h3>${w.title}</h3><p>${o?`${esc(state.players[o.player].name)} 보유${o.level?' · 공연 기획':''}`:'아직 만나지 않은 컬렉션'}</p><div><strong>${w.price} MC</strong><span>이용료 ${G.fee(state,w)} MC ↗</span></div></div></button>`;}).join('')}</div></section>`;}
function learning(){return `<section class="learning-view"><div class="view-intro"><span class="eyebrow">LEARN BEYOND THE BOARD</span><h2>음악의 가치를 발견하는 시간</h2><p>돈으로 셀 수 있는 것과, 숫자로 다 담을 수 없는 것.</p></div><div class="learning-grid"><article class="lesson dark"><span>01 / 음악사</span><h3>시대가 바뀌면<br>음악도 달라질까요?</h3><p>보드의 흐름을 따라 바로크에서 근현대까지 여행해요. 시대 구분은 편의를 위한 것이며 작곡가와 양식은 여러 시대에 걸쳐 이어집니다.</p></article><article class="lesson"><span>02 / 가치와 경제</span><h3>가격과 가치는<br>같은 말일까요?</h3><p>게임 가격은 전략을 위한 가상 수치예요. 작품의 예술적·역사적 가치를 나타내는 순위가 아닙니다. 인기, 접근성, 유통 환경은 음악의 경제 활동에 영향을 줍니다.</p></article><article class="lesson"><span>03 / 권리와 이용</span><h3>작품과 녹음에는<br>각자의 권리가 있어요.</h3><p>오래된 작품이라도 최근 연주나 녹음에는 별도의 권리가 있을 수 있어요. 실제 사용 전에는 작품, 음원, 이용 방식과 이용허락 조건을 확인해야 해요.</p></article></div><h3 class="subheading">네 시대, 하나의 음악사</h3><div class="era-timeline">${ERAS.map(e=>`<article style="--era:${e.color}"><span>${e.years}</span><h3>${e.name}</h3><p>${e.detail}</p></article>`).join('')}</div><div class="reflection"><span>함께 이야기해요</span><h3>“가장 비싼 작품이 가장 가치 있는 작품일까요?”</h3><p>오늘 선택한 작품 한 곡과 그 이유를 나눠 보세요. 경제적 가치, 역사적 가치, 나에게 주는 의미를 각각 생각해 보세요.</p></div><div class="source-links"><strong>저작권 학습 참고 자료</strong>${SOURCES.map(s=>`<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label} ↗</a>`).join('')}<small>일반 개념을 배우는 수업 자료입니다. 실제 이용 조건은 해당 권리와 이용 방식에 따라 확인하세요. 이 프로토타입에는 외부 녹음 음원을 포함하지 않았습니다.</small></div></section>`;}
function chatRows(){return chatMessages.map(m=>`<div class="chat-message ${m.playerId===session.playerId?'mine':''}"><div class="chat-message-meta"><strong>${esc(m.name)}</strong><time datetime="${new Date(m.sentAt).toISOString()}">${new Date(m.sentAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})}</time></div><p>${esc(m.text)}</p></div>`).join('')||'<p class="chat-empty">같은 방 친구들과 이야기를 나눠 보세요.</p>';}
function chatPanel(){return `<section class="room-chat" aria-labelledby="chat-title"><div class="section-heading"><h3 id="chat-title">음악 정보 나누기</h3><span>같은 코드의 친구들</span></div><div id="chat-messages" class="chat-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="채팅 메시지">${chatRows()}</div><form id="chat-form"><label for="chat-input">메시지</label><div class="chat-compose"><input id="chat-input" name="message" maxlength="200" autocomplete="off" placeholder="친구에게 메시지 보내기" value="${esc(chatDraft)}" ${!connected?'disabled':''}/><button class="primary" type="submit" ${!connected||chatSending?'disabled':''}>보내기</button></div><small>최대 200자 · 최근 100개 메시지</small></form></section>`;}
function acceptChat(payload){if(payload.code!==session?.code||!Array.isArray(payload.messages))return;if((payload.messages.at(-1)?.id??0)<(chatMessages.at(-1)?.id??0))return;chatMessages=payload.messages;const log=$('#chat-messages');if(log){const atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<45;log.innerHTML=chatRows();if(atBottom)log.scrollTop=log.scrollHeight;}}
async function sendChat(){if(chatSending||!chatDraft.trim())return;const sent=chatDraft;chatSending=true;const button=$('#chat-form button');if(button)button.disabled=true;try{const payload=await request('chat',{code:session.code,message:sent});acceptChat(payload);if(chatDraft===sent){chatDraft='';if($('#chat-input'))$('#chat-input').value='';}}catch(error){notify(error.message);}finally{chatSending=false;if($('#chat-form button'))$('#chat-form button').disabled=!connected;}}
function syncGameOrientation(){
 document.body.classList.toggle('portrait-game',needsLandscape(window.innerWidth,window.innerHeight,Boolean(snapshot?.state&&!participantIntroPending),navigator.maxTouchPoints>0||matchMedia('(any-pointer:coarse)').matches));
}
function updateFullscreenButton(){const button=$('[data-action="fullscreen"]');if(button){const active=isFullscreen(document)||isStandalone(window);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',isFullscreen(document)?'전체화면 해제':'전체화면');}}
document.addEventListener('fullscreenchange',updateFullscreenButton);
document.addEventListener('webkitfullscreenchange',updateFullscreenButton);
window.addEventListener('resize',syncGameOrientation);
let boardTypeFrame=null;
function queueBoardTypeFit(){cancelAnimationFrame(boardTypeFrame);boardTypeFrame=requestAnimationFrame(()=>fitBoardTitles(document));}
window.addEventListener('resize',queueBoardTypeFit);
document.fonts?.ready.then(queueBoardTypeFit);
function render(){
 syncGameOrientation();
 if(participantIntroPending){$('#app').innerHTML='<div class="participant-intro-backdrop" aria-hidden="true"></div>';return;}
 if(!snapshot?.state){renderLobby();return;}
 const boardScrollLeft=$('.is-flat .board-wrap')?.scrollLeft??0;
 const chatFocused=document.activeElement?.id==='chat-input',selection=chatFocused?document.activeElement.selectionStart:null;
 const nav=[['board','게임 보드'],['collection','작품 컬렉션'],['learning','배움 노트']];
 $('#app').innerHTML=`<div class="game-shell"><section class="orientation-guide" role="status" aria-label="가로 화면 안내"><div class="rotate-phone" aria-hidden="true">↻</div><h2>휴대폰을 가로로 돌려 주세요</h2><p>뮤직마블은 가로 화면에서 플레이해요.<br>보드와 주사위 버튼을 함께 보며 음악 여행을 떠나요!</p><small>화면이 바뀌지 않으면 휴대폰의 화면 회전 잠금을 해제해 주세요.</small></section><header class="site-header"><a class="brand" href="#" data-action="home"><span class="brand-icon">${brandMark}</span><div class="brand-copy"><span class="brand-title"><span>뮤</span><span>직</span><span>마</span><span>블</span></span><small>MUSIC MARBL<span class="brand-english-end">E</span></small></div></a><nav aria-label="주 메뉴">${nav.map(([id,title])=>`<button data-action="tab" data-tab="${id}" class="${tab===id?'active':''}" ${tab===id?'aria-current="page"':''}>${title}</button>`).join('')}</nav><div class="header-actions"><span class="classroom-label"><span class="live-dot"></span>${snapshot.mode==='solo'?'봇과 혼자 플레이':'실시간 교실'}</span><button class="icon-button fullscreen-button" data-action="fullscreen" aria-label="전체화면" title="전체화면 / 홈 화면 실행 안내">⛶</button>${bgmButton()}<button class="icon-button" data-action="help" aria-label="게임 가이드">?</button><button class="settings-button" data-action="settings">⚙ <span>수업 설정</span></button></div></header><main><div class="page-heading"><div><div class="eyebrow"><span class="tiny-note">♫</span> 음악을 만나는 새로운 여행</div>${tab!=='board'?`<h1>${tab==='collection'?'당신의 다음 명곡을 찾아보세요.':'음악을 넘어, 가치를 배우다.'}</h1>`:''}<p>${tab==='board'?'명곡의 가치를 발견하고, 권리를 배우는 음악사 보드게임':tab==='collection'?'작품 하나마다 새로운 이야기, 컬렉션 하나마다 깊어지는 배움.':'보드 위의 선택이 교실 속 질문으로 이어집니다.'}</p></div><div class="session-info"><span>CLASSROOM SESSION</span><strong>${state.phase==='finished'?'여행 완료':`완주 <b>${lapProgressText(G.current(state))}</b>`}</strong><small>${esc(G.current(state).name)} · 현재 주자 기준</small></div></div><div class="room-strip"><span><i class="live-dot"></i> ${connected?'실시간 연결됨':'재연결 중…'} · <b>${esc(state.players[session.playerId]?.name||'')}</b></span><button data-action="copy-code">방 코드 <strong>${session.code}</strong> ⧉</button><span>${snapshot.mode==='solo'?`나 + 봇 ${snapshot.members.length-1}명`:`${snapshot.members.length} / 4명 · ${session.playerId===0?'방장':'참가자'}`}</span></div><div class="game-layout"><div class="main-column">${tab==='board'?`<div class="board-toolbar"><div>${ERAS.map(e=>`<span><i style="background:${({baroque:'#199fc4',classical:'#8c70cb',romantic:'#ef9b42',modern:'#70b44d'})[e.id]}"></i>${e.name}</span>`).join('')}</div><div class="board-tools"><button data-action="board-view" aria-pressed="${boardView==='3d'}">${boardView==='3d'?'▦ 평면 보기':'◇ 입체 보기'}</button><button data-action="help">진행 방법 ↗</button></div></div>${board()}<div class="board-caption"><span>✧ 같은 작곡가 2곡 → 이용료 ×1.5 · 같은 시대 4곡 → ×2</span><span>작품을 누르면 이야기가 열려요 ↗</span></div><section class="activity"><div class="section-heading"><h3>여행의 기록 <span>LIVE</span></h3><button data-action="history">전체 보기 ↗</button></div><div aria-live="polite">${state.log.slice(0,3).map(l=>`<p><span>R${String(l.round).padStart(2,'0')}</span>${esc(l.text)}</p>`).join('')}</div></section>`:tab==='collection'?collectionView():learning()}</div><aside>${actionPanel()}${chatPanel()}<div class="copyright-note"><span>©</span><p><strong>이용권은 게임 안에서만 유효해요.</strong>실제 작품이나 음원의 저작권을 얻는 것은 아닙니다.</p></div></aside></div></main><footer><span class="footer-brand">♫ MUSIC MARBLE</span><span>음악의 역사 · 창작의 가치 · 함께하는 배움</span><button data-action="help">교실을 위한 플레이 가이드 ↗</button></footer></div>`;
 updateFullscreenButton();
 queueBoardTypeFit();
 if($('.is-flat .board-wrap'))$('.is-flat .board-wrap').scrollLeft=boardScrollLeft;
 const log=$('#chat-messages');if(log)log.scrollTop=log.scrollHeight;
 if(chatFocused&&$('#chat-input')){$('#chat-input').focus();$('#chat-input').setSelectionRange(selection,selection);}
}
function showModal(title,body,cls=''){
 handoffCountdown.stop();
 const d=$('#modal');d.dataset.auto='false';d.dataset.activity='false';d.className=cls;d.innerHTML=`<div class="modal-header"><span class="eyebrow">MUSIC MARBLE</span><button class="icon-button" data-action="close" aria-label="닫기"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="m3.5 3.5 17 17m0-17-17 17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button></div><h2 id="modal-title">${title}</h2>${body}`;
 d.classList.toggle('quiz-wrong-result',Boolean(d.querySelector('.quiz-verdict.is-incorrect')));
 if(!d.open)d.showModal();
}
function closeModal(){handoffCountdown.stop();if($('#modal').classList.contains('character-bio-modal')){characterGallery();return;}if(participantIntroPending){participantIntroPending=false;$('#modal').close();render();continueFlow();return;}if(activeActivity){dismissActivity();return;}$('#modal').close();continueFlow();}
function quizVerdict(correct,chosen,answer){
 return `<section class="quiz-verdict ${correct?'is-correct':'is-incorrect'}" role="status"><div class="quiz-verdict-heading"><span aria-hidden="true">${correct?'✓':'✕'}</span><strong>${correct?'정답입니다!':'오답입니다!'}</strong></div>${answer?`<div class="quiz-verdict-answers">${chosen?`<p><b>선택한 답</b><span>${esc(chosen)}</span></p>`:''}<p><b>정답</b><span>${esc(answer)}</span></p></div>`:''}</section>`;
}
function purchaseQuizModal(){
 const challenge=state.purchaseChallenge,q=purchaseQuizById(challenge?.questionId);if(!q)return;
 const answered=state.phase==='purchase-feedback',w=work(challenge.workId);
 const options=[{value:true,label:'O',meaning:'맞다'},{value:false,label:'X',meaning:'아니다'}];
 if(answered){
  showModal(challenge.correct?'이용권을 구입할 수 있어요':'이번 구입 기회는 종료됐어요',`${quizVerdict(challenge.correct)}<section class="purchase-work-summary" aria-label="작품 구입 정보"><p class="purchase-composer">${esc(w.composer)}</p><h3>${esc(w.title)}</h3><div class="purchase-price"><span>구입가</span><strong>${w.price.toLocaleString()} <small>MC</small></strong></div></section><button class="primary full purchase-confirm-cta" data-action="${challenge.correct?'purchase-confirm':'purchase-feedback-close'}">${challenge.correct?'구입하고 차례 넘기기 →':'차감 없이 다음 차례로 →'}</button>${challenge.correct?'<button class="text-button full" data-action="purchase-decline">구입하지 않고 차례 넘기기 →</button>':''}`,'purchase-quiz-modal purchase-result-modal');
 }else{
  showModal('이용권 구입 OX 퀴즈',`<div class="quiz-meta">${pill(`${esc(w.composer)} · ${esc(w.title)}`)}${pill(`구입가 ${w.price} MC`)}</div><p class="purchase-quiz-rule">정답이면 뮤직코인으로 이용권을 구입할 수 있어요.<br>오답이어도 코인 차감은 없습니다.</p><h3 class="quiz-question">${esc(q.question)}</h3><div class="purchase-ox-options">${options.map(o=>`<button data-action="purchase-answer" data-value="${o.value}" aria-label="${o.label} · ${o.meaning}"><strong>${o.label}</strong><span>${o.meaning}</span></button>`).join('')}</div><p class="muted">이 칸에 도착한 동안 한 번만 답할 수 있어요. 구입 OX 퀴즈에는 별도 코인·배움 점수 보상이 없습니다.</p>`,'purchase-quiz-modal');
 }
 $('#modal').dataset.auto='true';
}
function quizModal(){const q=QUIZZES.find(q=>q.id===state.quiz);if(!q)return;
 const f=state.feedback;
 showModal(state.phase==='feedback'?(f.correct?'정답입니다!':'오답입니다!'):'생각을 모아, 뮤직 퀴즈',`${f?quizVerdict(f.correct,`${f.index+1}. ${q.options[f.index]}`,`${q.answer+1}. ${q.options[q.answer]}`):''}<div class="quiz-meta">${pill(q.kind==='copyright'?'© 저작권 탐구':'♫ 음악사 탐구')}${pill(f?(f.correct?'보상 +80 MC':'코인 차감 없음'):'정답 +80 MC')}</div><h3 class="quiz-question">${q.question}</h3><div class="quiz-options">${q.options.map((o,i)=>`<button data-action="answer" data-index="${i}" ${f?'disabled':''} class="${f?(i===q.answer?'correct':i===f.index?'incorrect':''):''}"><span>${i+1}</span>${o}${f&&i===q.answer?' ✓ 정답':f&&i===f.index?' ✕ 선택한 답 · 오답':''}</button>`).join('')}</div>${f?`<div class="quiz-explanation"><strong>${f.correct?'정답 · 80 MC 획득':'오답 · 코인은 차감되지 않아요'}</strong><p>${q.explanation}</p></div><button class="primary full" data-action="feedback-close">해설 확인하고 계속하기 →</button>`:'<p class="muted">친구들과 이야기한 뒤 답을 하나 골라 주세요.</p>'}`);$('#modal').dataset.auto='true';
}
function workModal(w){selected=w.id;const o=state.ownership[w.id],p=G.current(state),mine=o?.player===p.id,canAct=state.phase==='action'&&myTurn();
 showModal(esc(w.title),`<div class="work-modal-meta">${pill(era(w.era).name)}<span>${w.composer} · ${w.year}</span></div><div class="work-story" style="--era:${era(w.era).color}"><span>♪</span><p>${w.note}</p></div><div class="stat-grid"><div><span>이용권 가격</span><b>${w.price} <small>MC</small></b></div><div><span>현재 가상 이용료</span><b>${G.fee(state,w)} <small>MC</small></b></div></div><div class="notice">${o?`${esc(state.players[o.player].name)}의 이용권 · ${G.collection(state,w,o.player).name}${o.level?' · 공연 기획 +20 MC':''}`:'아직 보유한 팀이 없어요. 이 칸에 도착해 구입 OX 퀴즈를 맞히면 뮤직코인으로 구입할 수 있어요.'}</div><p class="muted">같은 작곡가 2곡 ×1.5 · 같은 시대 4곡 ×2 (시대 보너스 우선, 중복 없음). 공연 기획은 구입한 내 작품 칸에 다시 도착했을 때만 가능해요. 작품당 100 MC, 1회만 기획할 수 있어요.</p>${mine&&canAct?`<div class="modal-action-grid"><button class="concert-cta full" data-action="upgrade" ${!G.canUpgrade(state,w.id)?'disabled':''}>${concertPlanningIcon()}<span><strong>${o.level?'공연 기획 완료':'공연 기획하기 · 100 MC'}</strong><small>${o.level?'이 작품 칸에 공연장이 세워졌어요':G.concertWork(state)?.id!==w.id?'이 작품 칸에 다시 도착하면 기획할 수 있어요':p.coins<100?'뮤직코인이 부족해요':'기본 이용료 +20 MC · 작은 공연장 설치'}</small></span></button><button class="secondary" data-action="trade-form">다른 팀에 거래 제안</button><button class="text-button" data-action="sell-confirm">은행에 반납 (+${Math.floor((w.price+o.level*100)/2)} MC)</button></div>`:!o&&p.position===BOARD.indexOf(w)&&canAct?`<button class="primary full" data-action="${state.purchaseChallenge?.workId===w.id&&state.purchaseChallenge.correct===true?'buy-modal':'purchase-quiz'}" ${p.coins<w.price?'disabled':''}>${state.purchaseChallenge?.workId===w.id&&state.purchaseChallenge.correct===true?`${w.price} MC로 구입`:'OX 퀴즈 풀고 구입하기 →'}</button>`:''}<small class="muted">가격은 게임을 위한 수치이며 작품의 예술적 가치 순위가 아닙니다.</small>`);
}
function eventModal(){const e=state.lastEvent;if(!e)return;showModal('음악사 사건 카드',`${historyCard(e,state.turn)}<p class="card-fiction">게임용 가상 시나리오 · 다시 보기에는 코인이 추가 정산되지 않습니다.</p><div class="discussion"><b>함께 생각해요</b><p>${esc(e.prompt)}</p></div><button class="primary full" data-action="close">확인</button>`,'event-card-modal');}
function fullscreenGuide(){
 showModal('주소창 없이 게임하기',`<div class="fullscreen-instructions"><p>iPhone Safari는 일반 웹페이지에서 주소창과 탭을 완전히 숨기는 기능이 제한되어 있어요. 홈 화면에서 앱으로 열면 브라우저 창 없이 플레이할 수 있어요.</p><ol><li>게임을 시작하기 전에 Safari의 <b>공유</b> 버튼을 눌러요.</li><li><b>홈 화면에 추가</b>를 선택해요.</li><li><b>웹 앱으로 열기</b>가 보이면 켜고 추가해요.</li><li>홈 화면의 <b>뮤직마블</b> 아이콘으로 실행한 뒤 휴대폰을 가로로 돌려요.</li></ol><p>Android Chrome도 브라우저 메뉴의 <b>홈 화면에 추가 / 앱 설치</b>로 실행할 수 있어요.</p></div><button class="primary full" data-action="close">확인</button>`,'fullscreen-guide-modal');
}
function settingsModal(){showModal('실시간 수업 정보',`<div class="notice">누구든 먼저 ${state.maxRounds}바퀴를 완주하면 즉시 종료해요.<br>${state.players.map(p=>`${esc(p.name)}: ${G.completedLaps(state,p)} / ${state.maxRounds}바퀴${G.hasFinished(state,p)?' · 완주':''}`).join('<br>')}<br><br>공유 코드 <b>${session.code}</b>같은 사이트에 접속한 뒤 이 코드를 입력하면 같은 방에 참가합니다.</div><p class="muted">게임 시작 후 새 참가자는 들어올 수 없습니다. 새로고침하면 시작 화면이 나옵니다. 「이전 게임 이어하기」를 눌러 재접속할 수 있습니다. 방장 화면을 닫으면 연결이 끊깁니다. 같은 브라우저의 이어하기로 복구할 수 있어요.</p><div class="settings-bottom"><button class="text-button" data-action="finish-confirm" ${state.phase==='finished'||session.playerId!==0?'disabled':''}>방장: 현재 수업 종료</button><button class="text-button" data-action="export">현재 결과 내려받기 ↗</button></div><button class="secondary full" data-action="copy-code">방 코드 복사</button><button class="text-button" data-action="leave-confirm">이 화면에서 나가기</button>`);}
function results(){void soundEffects.play('applause',`finished:${snapshot?.gameId||session?.code}`);const ranking=[...state.players].sort((a,b)=>G.score(state,b)-G.score(state,a));showModal('여행 끝, 우리에게 남은 것',`${state.endReason?.type==='laps'?`<div class="notice"><strong>${esc(state.players[state.endReason.playerId].name)} 님이 가장 먼저 완주했어요!</strong><p>${state.maxRounds}바퀴를 완주하여 게임이 종료되었습니다.</p></div>`:''}${state.endReason?.type==='bankruptcy'?`<div class="notice"><strong>${esc(state.players[state.endReason.playerId].name)} 님이 파산했어요.</strong><p>보유 코인이 0 MC가 되어 2인 게임이 종료되었습니다.</p></div>`:''}<p class="muted">전체 완주 ${state.players.filter(p=>G.hasFinished(state,p)).length} / ${state.players.length}명 · ${state.round}라운드의 여정 · 동점은 공동 순위입니다. 점수는 게임 결과이며 음악적 능력을 평가하지 않습니다.</p><p id="ranking-save-status" class="ranking-save-status">${session?.playerId===0?esc(rankingClient.status(snapshot?.gameId)):'최종 점수는 방장 화면에서 전체 랭킹에 기록됩니다.'}</p><div class="results-list">${ranking.map(p=>{const rank=ranking.filter(x=>G.score(state,x)>G.score(state,p)).length+1;return `<div><span class="rank">${rank}</span>${characterSprite(p)}<div><strong>${esc(p.name)}</strong><small>코인 ${num(p.coins)} · 이용권 ${G.owned(state,p.id).length} · 퀴즈 ${p.knowledge}/${p.attempts}</small></div><b>${num(G.score(state,p))}<small>점</small></b></div>`;}).join('')}</div><p class="muted">총점 = 보유 코인 + 이용권 구입가 + 공연 기획비</p><div class="discussion"><b>함께 돌아보기</b><p>① 가장 기억에 남는 작품과 그 이유는?<br>② 음악의 가격과 가치는 어떻게 다를까요?<br>③ 실제 음원 이용 전에 무엇을 확인할까요?</p></div><button class="primary full" data-action="export">학습 결과 내려받기 ↓</button><button class="text-button" data-action="settings">수업 정보 보기 →</button>`);}
function exportResults(){const text=['뮤직마블 · 수업 결과',`기록 시각: ${new Date().toLocaleString('ko-KR')}`,`${state.round}/${state.maxRounds}라운드 · ${state.phase==='finished'?'종료':'진행 중'}`,`종료 조건: 누구든 먼저 ${state.maxRounds}바퀴 완주`,state.endReason?.type==='laps'?`종료 사유: ${state.players[state.endReason.playerId].name} 최초 ${state.maxRounds}바퀴 완주`:state.endReason?.type==='bankruptcy'?`종료 사유: ${state.players[state.endReason.playerId].name} 파산 (보유 코인 0 MC)`:'종료 사유: 완주 또는 수업 종료','총점 = 코인 + 이용권 원가 + 공연 기획비','',...state.players.map(p=>`${p.name}: ${G.completedLaps(state,p)}/${state.maxRounds}바퀴 | ${G.score(state,p)}점 | ${p.coins} MC | 퀴즈 정답 ${p.knowledge}/${p.attempts}\n작품: ${G.owned(state,p.id).map(w=>`${w.composer} ${w.title}`).join(', ')||'없음'}`),'','돌아보기','1. 기억에 남는 작품과 이유:','2. 음악의 가격과 가치의 차이:','3. 실제 음원 이용 전에 확인할 것:','','여행 기록',...state.log.slice().reverse().map(l=>`R${l.round} ${l.text}`),'','게임 이용권은 실제 저작권이나 음원 이용허락이 아닙니다.'].join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='뮤직마블-수업결과.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function soloSetup(){
 const nickname=$('#entry-form input[name="nickname"]')?.value||'';
 showModal('봇 친구들과 음악 여행을 떠나요',`<p class="muted">나와 랜덤한 닉네임의 봇들이 함께 플레이해요. 나의 캐릭터를 직접 고르거나 랜덤으로 정하세요. 봇은 나와 겹치지 않게 배정됩니다. 봇은 주사위, 작품 구입, 공연 기획, 퀴즈를 자동으로 진행하고 거래 제안에도 응답해요.</p><form id="solo-form"><label>나의 닉네임<input name="nickname" required maxlength="16" autocomplete="nickname" placeholder="예: 선율 탐험가" value="${esc(nickname)}" /></label>${characterPicker($('#entry-form select[name="characterId"]')?.value||'')}<div class="form-row"><label>함께할 봇 수<select name="bots"><option value="1">봇 1명 · 총 2명</option><option value="2">봇 2명 · 총 3명</option><option value="3" selected>봇 3명 · 총 4명</option></select></label><label>게임 길이<select name="rounds"><option value="4">4라운드 · 모두 4바퀴</option><option value="8" selected>8라운드 · 모두 8바퀴</option><option value="12">12라운드 · 모두 12바퀴</option></select></label></div><div class="notice">모두 1,200 MC로 시작해요. 봇도 같은 규칙을 적용받으며, 퀴즈를 틀리거나 거래를 거절할 수 있어요. 화면을 나가면 봇은 기다리고, 「이전 게임 이어하기」로 돌아오면 계속합니다.</div><button type="submit" class="primary full">봇과 게임 시작 →</button></form>`,'entrance-help');
}
function help(){showModal('한 차례에 하나씩, 음악을 만나요',`<ol class="guide"><li><b>주사위를 굴리고 이동해요.</b><p>시계 방향으로 음악사를 여행해요. 한 바퀴를 돌면 200 MC를 받습니다.</p></li><li><b>작품의 가상 이용권을 선택해요.</b><p>구입 가능한 빈 작품에 도착하면 이동을 마친 뒤 OX 퀴즈가 자동으로 열려요. 정답이면 뮤직코인을 내고 이용권을 구입한 뒤 자동으로 다음 참가자에게 차례를 넘기고, 오답이면 코인 차감 없이 해설 확인 후 다음 참가자의 차례로 넘어가요. 다른 팀의 작품에 도착하면 가상 이용료를 자동 지급합니다. 작품 칸의 작은 점은 소유 팀 색입니다.</p></li><li><b>불법 스트리밍 감옥에서는 6으로 탈출해요.</b><p>출발점 기준 두 번째 사건 칸은 감옥입니다. 도착 후 다음 두 번의 자기 차례에 탈출 주사위를 굴립니다. 6이 나오면 즉시 탈출해 6칸 이동합니다. 두 번 모두 실패하면 그 두 차례는 감옥에 머물고 다음 자기 차례부터 정상 이동합니다. 코인이나 보유 작품은 차감되지 않습니다. 「감옥으로 가기」 칸도 감옥으로 즉시 이동시켜 같은 규칙을 적용합니다. 게임용 가상 규칙입니다.</p></li><li><b>구입 전 OX 퀴즈를 풀어요.</b><p>빈 작품 칸에서 한 번 도전할 수 있어요. 정답이면 뮤직코인을 내고 이용권을 구입할 수 있고, 오답이면 코인 차감 없이 해설을 확인하고 다음 참가자에게 차례를 넘겨요. 구입 OX에는 별도 코인·배움 점수 보상이 없어요.</p></li><li><b>사건을 경험하고 퀴즈에 도전해요.</b><p>퀴즈 칸은 필수, 다른 칸에서는 차례당 1회 선택 도전해요. 정답은 80 MC, 오답에는 감점이 없습니다. 「저작권 양도」 칸에서는 최고 구입가 작품 한 개를 무작위로 정한 다른 참가자에게 넘깁니다. 보유 작품이 없으면 통과하며, 코인은 변하지 않습니다.</p></li><li><b>컬렉션과 공연을 기획해요.</b><p>같은 작곡가 2곡이면 이용료 ×1.5, 같은 시대 4곡이면 ×2로 적용해요. 중복 적용하지 않습니다. 구입한 내 작품 칸에 다시 도착했을 때만 100 MC로 공연을 기획할 수 있어요(기본 이용료 +20, 작품당 1회). 작품을 구입한 차례에는 기획할 수 없어요. 내 작품을 눌러 거래 제안이나 은행 반납(투자액 50%)을 할 수 있어요.</p></li><li><b>다음 팀에 차례를 넘겨요.</b><p>각 참가자가 출발점을 통과하거나 도착할 때마다 자신의 완주 횟수가 1바퀴 늘어납니다. 플레이어 중 누구든 설정한 4·8·12바퀴를 가장 먼저 완주하면 시대의 문에서 즉시 게임을 종료하고 최종 점수를 기록합니다. 마지막 이동에서 남은 주사위 칸은 이동하지 않으며 추가 구입·퀴즈·이벤트는 진행하지 않습니다. 교사는 수업 설정에서 일찍 마칠 수 있어요.</p></li></ol><div class="notice">2인 플레이에서는 한 명의 보유 코인이 0 MC가 되면 파산으로 즉시 게임을 종료합니다. 3–4인 플레이에서는 파산과 탈락 없이 잔액 한도에서 비용을 지급하고 부족액을 면제합니다. 거래는 제안을 받은 참가자가 자신의 화면에서 수락해야 완료됩니다.</div><p class="muted">혼자 플레이하려면 첫 화면의 「봇과 혼자 플레이하기」에서 봇 수를 선택하세요. 봇은 자동으로 자기 차례를 진행합니다.</p><p class="muted">공유 코드마다 별도의 방이 만들어집니다. 방마다 최대 4명이 참여하며 여러 방이 동시에 진행됩니다. 게임은 방장 브라우저에서 진행됩니다. 방장은 화면을 열어 두세요. 방장이 나가면 연결이 끊깁니다.</p><button class="primary full" data-action="close">여행으로 돌아가기 →</button>`,snapshot?.state?'':'entrance-help');}
$('#app').addEventListener('click',handleClick);$('#modal').addEventListener('click',handleClick);
$('#modal').addEventListener('close',()=>continueFlow());
$('#modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
$('#modal').addEventListener('change',e=>{if(e.target.id==='team-count')document.querySelectorAll('[data-team-field]').forEach(el=>el.hidden=Number(el.dataset.teamField)>=Number(e.target.value));});
$('#modal').addEventListener('submit',async e=>{
 e.preventDefault();const f=new FormData(e.target);
 if(e.target.id==='solo-form'){
  if(busy)return;busy=true;
  const button=e.target.querySelector('button[type="submit"]');button.disabled=true;
  try{
   const next=await request('create-solo',{nickname:String(f.get('nickname')),characterId:String(f.get('characterId')),config:{botCount:Number(f.get('bots')),rounds:Number(f.get('rounds')),coins:1200}});
   events?.close();session=next;remember();snapshot=null;connected=false;lastAuto='';tab='board';revealCharacter=true;resetActivityFlow();$('#modal').close();connect();render();
  }catch(error){notify(error.message);button.disabled=false;}finally{busy=false;}
 }
 if(e.target.id==='trade-form'){closeModal();await apply(G.proposeTrade,{workId:selected,to:Number(f.get('to')),price:Number(f.get('price'))});}

});
async function handleClick(e){const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;if(el.tagName==='A')e.preventDefault();
 if(a==='bgm-toggle'){bgmEnabled=!bgmEnabled;soundEffects.setEnabled(bgmEnabled);if(bgmEnabled){soundEffects.unlock();startBackgroundMusic(true);}else lobbyBgm.pause();updateBgmControls();return;}
 if(a==='activity-next'){dismissActivity();return;}
 if(a==='ranking-jump'){$('.entrance-ranking')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});void rankingClient.refresh();return;}
 if(a==='ranking-refresh'){void rankingClient.refresh(true);return;}
 if(busy)return;
 if(a==='handoff-next'){await passHandoff();return;}
 if(a==='handoff-quiz'){handoffCountdown.stop();$('#modal').close();await apply(G.startQuiz);return;}
 if(a==='board-view'){boardView=boardView==='3d'?'flat':'3d';render();}
 if(a==='home'){tab='board';render();}
 if(a==='tab'){tab=el.dataset.tab;render();}
 if(a==='filter'){filter=el.dataset.id;render();}
 if(a==='enter-board'){closeModal();if(navigator.maxTouchPoints>0||matchMedia('(any-pointer:coarse)').matches)void enterFullscreen(document,window);return;}
 if(a==='fullscreen'){const result=await toggleFullscreen(document,window);if(['unsupported','blocked'].includes(result))fullscreenGuide();else if(result==='standalone')notify('이미 주소창 없는 앱 화면으로 실행 중이에요.');return;}
 if(a==='close')closeModal();
 if(a==='help')help();
 if(a==='solo')soloSetup();
 if(a==='my-character')characterModal(state.players[session.playerId]);
 if(a==='character-gallery')characterGallery();
 if(a==='character-bio')characterBio(el.dataset.id);
 if(a==='redraw-character')await redrawCharacter();
 if(a==='settings')settingsModal();
 if(a==='cell'){const c=BOARD[Number(el.dataset.index)];if(c.type==='work')workModal(c);else showModal(esc(c.title),`<div class="special-info"><span>${icon(c.type)}</span><p>${{start:'출발점입니다. 이 칸을 통과하거나 도착하면 200 MC를 받아요.','back-three':'주사위를 한 번 더 굴려 나온 숫자만큼 뒤로 이동합니다. 이동을 마친 칸의 작품 구입·가상 이용료·음악사 사건 규칙이 적용됩니다.',event:'도착하면 음악사 사건 카드가 열려요. 역사적 맥락을 읽고, 게임 속 코인 변화를 경험하세요. 코인 효과는 수업용 가상 설정입니다.',quiz:'도착하면 음악사·저작권 퀴즈를 풀어요. 정답은 80 MC!',concert:'음악을 나누는 축제! 도착하면 모든 팀이 100 MC를 받아요.',copyright:'작품과 음원의 권리를 구별하는 저작권 퀴즈를 풀어요.',prison:PRISON_MESSAGE,'go-to-prison':'이 칸에 도착하면 불법 스트리밍 감옥으로 즉시 이동합니다. 다음 두 번의 자기 차례에 주사위를 굴려 6이 나오면 즉시 탈출해 6칸 이동합니다. 두 번 모두 실패하면 다음 자기 차례부터 정상 이동합니다. 감옥으로 이동하는 동안 출발 보너스나 중간 칸의 효과는 발생하지 않습니다.',transfer:'보유한 작품 중 구입가가 가장 높은 작품 한 개를 다른 참가자에게 무상 양도합니다. 받는 사람은 무작위로 정하고, 최고가 작품이 여러 개면 그중 한 개를 무작위로 고릅니다. 보유 작품이 없으면 그냥 통과합니다. 공연 기획 상태도 함께 이전되며 코인 지급은 없습니다. 게임 속 가상 권리에만 적용됩니다.'}[c.type]}</p></div><button class="primary full" data-action="close">확인</button>`);}
 if(a==='work')workModal(work(el.dataset.id));
 if(a==='roll'||a==='roll-backward'){
  if(!myTurn()||!['roll','backward-roll'].includes(state.phase))return;
  if(a==='roll-backward'&&state.phase!=='backward-roll')return;
  if(activeActivity&&activeActivity.type!=='backward-entry')return;
  if(a==='roll-backward'){activeActivity=null;$('#modal').close();}
  startDicePresentation(G.current(state));render();
  try{receive(await request('action',{code:session.code,action:'roll',args:[],revision:snapshot.revision}));}
  catch(error){const latest=dicePresentation?.next;stopDicePresentation();if(latest)commitSnapshot(latest);else render();notify(error.message);}
 }
 if(a==='purchase-quiz'){closeModal();await apply(G.startPurchaseQuiz);}
 if(a==='purchase-quiz-open')purchaseQuizModal();
 if(a==='purchase-answer')await apply(G.answerPurchaseQuiz,el.dataset.value==='true');
 if(a==='purchase-feedback-close'){closeModal();await apply(G.closePurchaseFeedback);}
 if(a==='purchase-confirm'){closeModal();await apply(G.purchaseAndNext);}
 if(a==='purchase-decline'){closeModal();await apply(G.skipPurchase);}
 if(a==='buy'||a==='buy-modal'){if(a==='buy-modal')closeModal();await apply(G.purchaseAndNext);}
 if(a==='next')await apply(G.nextTurn);
 if(a==='quiz')await apply(G.startQuiz);
 if(a==='quiz-open')quizModal();
 if(a==='answer')await apply(G.answerQuiz,Number(el.dataset.index));
 if(a==='feedback-close'){closeModal();await apply(G.closeFeedback);}
 if(a==='event')eventModal();
 if(a==='plan-concert'){concertPlanningModal();return;}
 if(a==='upgrade'){$('#modal').close();await apply(G.upgrade,selected);}
 if(a==='sell-confirm'){const w=work(selected),o=state.ownership[selected];showModal('이용권을 은행에 반납할까요?',`<p>「${w.title}」 이용권과 공연 기획 상태를 반납하고 ${Math.floor((w.price+o.level*100)/2)} MC를 받습니다.</p><button class="primary full" data-action="sell">반납 확정</button><button class="text-button" data-action="work" data-id="${w.id}">돌아가기</button>`);}
 if(a==='sell'){closeModal();await apply(G.sell,selected);}
 if(a==='trade-form'){const w=work(selected);showModal('이용권 거래를 제안해요',`<p>판매할 작품: <b>${w.title}</b></p><form id="trade-form"><label>제안을 받을 팀<select name="to">${state.players.filter(p=>p.id!==state.turn).map(p=>`<option value="${p.id}">${esc(p.name)} · ${num(p.coins)} MC</option>`).join('')}</select></label><label>판매 가격 (MC)<input name="price" type="number" required min="1" max="10000" step="1" value="${w.price}" /></label><p class="muted">팀끼리 먼저 가격을 의논하세요. 제안 후 상대 팀의 수락이 필요합니다.</p><button class="primary full" type="submit">거래 제안 보내기 →</button></form>`);}
 if(a==='trade-open')tradeModal();
 if(a==='trade-accept'||a==='trade-reject'){closeModal();await apply(G.resolveTrade,a==='trade-accept');}
 if(a==='history')showModal('우리의 음악사 여행 기록',`<div class="history-list">${state.log.map(l=>`<p><span>R${l.round}</span>${esc(l.text)}</p>`).join('')}</div>`);
 if(a==='finish-confirm')showModal('지금 수업을 마칠까요?',`<p>현재 자산과 배움으로 결과를 정리합니다. 결과는 내려받을 수 있어요.</p><button class="primary full" data-action="finish">수업 마치고 결과 보기</button><button class="text-button" data-action="close">계속 플레이</button>`);
 if(a==='finish'){closeModal();await apply(G.finishGame);}
 if(a==='results')results();
 if(a==='export')exportResults();
 if(a==='copy-code'){try{await navigator.clipboard.writeText(session.code);notify('공유 코드를 복사했어요. 사이트 주소도 함께 보내 주세요.');}catch{notify(`공유 코드: ${session.code}`);}}
 if(a==='leave-confirm')showModal('이 화면에서 나갈까요?',`<p>참가 정보는 이 브라우저에 남습니다. 같은 브라우저에서 「이전 게임 이어하기」를 누르면 돌아올 수 있어요. 방의 참가 슬롯은 유지됩니다.</p><button class="primary full" data-action="leave">첫 화면으로 이동</button><button class="text-button" data-action="close">돌아가기</button>`);
 if(a==='resume'){try{session=JSON.parse(localStorage.getItem(key)||'null');}catch{}await resume();}
 if(a==='leave'){events?.close();connected=false;snapshot=null;session=null;resetActivityFlow();$('#modal').close();render();}

}
function tradeModal(){const t=state.trade;if(!t)return;const receiver=session.playerId===t.to,proposer=session.playerId===t.from;
 showModal(receiver?'이용권 거래 제안이 도착했어요':'거래 응답을 기다리고 있어요',`${pill(receiver?'나에게 온 제안':'거래 진행 중')}<div class="trade-offer"><h3>${work(t.workId).title}</h3><p>${esc(state.players[t.from].name)} → ${esc(state.players[t.to].name)}</p><strong>${num(t.price)} <small>MC</small></strong></div><p class="muted">수락하면 이용권과 코인이 즉시 교환됩니다. 공연 기획 상태도 함께 이전됩니다.</p>${receiver?'<button class="primary full" data-action="trade-accept">이 가격으로 구입하기</button>':''}${receiver||proposer?'<button class="text-button" data-action="trade-reject">거절 / 제안 취소</button>':'<button class="secondary full" data-action="close">보드로 돌아가기</button>'}`);$('#modal').dataset.auto='true';
}
function renderLobby(){
 const joined=!!snapshot;
 $('#app').innerHTML=`<div class="lobby-scene"><div class="sky-notes" aria-hidden="true"><span>♫</span><span>♪</span><span>✦</span><span>♬</span></div><header class="site-header lobby-header"><a class="brand" href="#"><span class="brand-icon">${brandMark}</span><div class="brand-copy"><span class="brand-title"><span>뮤</span><span>직</span><span>마</span><span>블</span></span><small>MUSIC MARBL<span class="brand-english-end">E</span></small></div></a><div class="lobby-header-actions">${bgmButton()}<button class="icon-button" data-action="ranking-jump" aria-label="전체 랭킹 보기" title="전체 랭킹 보기">🏆</button><button class="icon-button" data-action="help" aria-label="진행 방법">?</button></div></header><main class="lobby"><section class="lobby-story"><div class="eyebrow adventure-badge">서양음악사 속으로 떠나는 보드게임 모험</div><h1><span class="hero-lead">시간을 여행하는 음악 투자자,</span> <span class="lobby-slogan">명곡을 소유하라!</span></h1><p><strong>명곡의 가치를 발견하고, 창작의 권리를 배우는</strong><br>새로운 <strong>보드게임, 뮤직마블!</strong></p><figure class="adventure-art"><img src="./src/assets/music-world-adventure-cutout.png" alt="하이든, 모차르트, 베토벤 캐릭터가 주사위와 뮤직코인이 떠 있는 음악 보드 위에서 함께하는 모험" width="1536" height="1024" fetchpriority="high" /></figure><div class="lobby-features"><span><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="3"/><path d="M9.5 10h5l1 7h1.5v2H7v-2h1.5zM6 20h12v2H6z"/></svg></i><b>최대 4명 함께</b></span><span><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/><g fill="currentColor"><circle cx="8" cy="8" r="1.5"/><circle cx="16" cy="8" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/></g></svg></i><b>코드로 만나는 친구들</b></span></div></section><section class="lobby-card">${joined?`<span class="eyebrow">OUR CLASSROOM</span><h2>여행 친구를 기다려요.</h2><p>같은 사이트 주소와 아래 코드를 공유하세요.</p><button class="room-code" data-action="copy-code" aria-label="방 코드 복사">${snapshot.code}<small>클릭해서 복사 ⧉</small></button><div class="lobby-member-heading"><span>참가자 ${snapshot.members.length} / 4명</span><span>${connected?'● 실시간 연결됨':'◌ 연결 중…'}</span></div><div class="lobby-members">${snapshot.members.map(m=>`<div>${characterSprite(m)}<strong>${esc(m.name)}<em class="member-character-name">${esc(characterFor(m).name)}</em></strong><small>${m.id===0?'방장':m.id===session.playerId?'나':''}</small></div>`).join('')}${Array.from({length:G.MAX_PLAYERS-snapshot.members.length},()=>'<div class="empty-member">＋ 친구를 기다리고 있어요</div>').join('')}</div><div class="lobby-character-assignment"><span>내 캐릭터 <b>${esc(characterFor(snapshot.members[session.playerId]).name)}</b></span><button data-action="redraw-character" ${!connected?'disabled':''}>다시 뽑기 ↻</button></div>${session.playerId===0?`<form id="start-form"><div class="form-row"><label>게임 길이<select name="rounds"><option value="4">4라운드 · 모두 4바퀴</option><option value="8" selected>8라운드 · 모두 8바퀴</option><option value="12">12라운드 · 모두 12바퀴</option></select></label><label>시작 코인<select name="coins"><option value="1000">1,000 MC</option><option value="1200" selected>1,200 MC</option><option value="1600">1,600 MC</option></select></label></div><button class="primary full" type="submit" ${snapshot.members.length<2||!connected?'disabled':''}>${snapshot.members.length<2?'2명 이상 모이면 시작할 수 있어요':'모두 모였어요, 게임 시작 →'}</button></form>`:'<div class="notice">방장이 게임을 시작하면 같은 보드로 이동해요.</div>'}<button class="text-button" data-action="leave-confirm">이 화면에서 나가기</button>`:`<span class="eyebrow">LET’S PLAY TOGETHER</span><h2>어떤 여행을 시작할까요?</h2><p>닉네임과 캐릭터를 정하고 음악 여행을 시작하세요.</p><form id="entry-form"><label>나의 닉네임<input name="nickname" placeholder="예: 선율 탐험가" maxlength="16" autocomplete="nickname" required /></label>${characterPicker()}<button class="primary full" type="submit" name="intent" value="create">새 게임방 만들기 ＋</button><div class="or-divider"><span>공유받은 코드가 있나요?</span></div><label>공유 코드<input name="code" placeholder="6자리 공유 코드" maxlength="6" autocomplete="off" class="code-input" /></label><button class="secondary full" type="submit" name="intent" value="join">코드로 게임 참가하기 →</button></form><div class="solo-divider"><span>혼자서도 즐길 수 있어요</span></div><button class="solo-button full" data-action="solo">봇과 혼자 플레이하기 <span>→</span></button><button class="text-button" data-action="resume">이 브라우저의 이전 게임 이어하기 ↗</button><button class="text-button" data-action="character-gallery">음악사 캐릭터 ${CHARACTERS.length}종 둘러보기 ↗</button><div class="entry-note">캐릭터 ${CHARACTERS.length}종 · 직접 선택 또는 랜덤 · 방 안 중복 없음<br>최대 4명 · 각자 기기로 접속 · 코드별 독립 게임<br>방장 화면을 열어 두세요. 방장이 나가면 연결이 끊겨요.</div>`}</section></main>${rankingPanel()}<footer><span class="footer-brand">♫ MUSIC MARBLE</span><span>음악을 배우는 가장 즐거운 한 바퀴</span></footer></div>`;
 startBackgroundMusic();void rankingClient.refresh();
}
$('#app').addEventListener('input',e=>{if(e.target.id==='chat-input')chatDraft=e.target.value;});
$('#app').addEventListener('submit',async e=>{e.preventDefault();if(e.target.id==='chat-form'){await sendChat();return;}const f=new FormData(e.target);if(e.target.id==='entry-form'){const intent=e.submitter?.value||'create';await enter(intent,String(f.get('nickname')),String(f.get('code')).trim().toUpperCase(),String(f.get('characterId')));}if(e.target.id==='start-form'){try{const next=await request('action',{code:session.code,action:'start',args:[{rounds:Number(f.get('rounds')),coins:Number(f.get('coins'))}],revision:snapshot.revision});receive(next);}catch(error){notify(error.message);}}});
// Always show the entrance; stored participation is restored only on explicit resume.
render();

void rankingClient.retryPending();
setInterval(()=>{void rankingClient.retryPending();if(!snapshot?.state)void rankingClient.refresh();},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){void rankingClient.retryPending();if(!snapshot?.state)void rankingClient.refresh(true);}});
