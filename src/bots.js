import {BOARD,WORKS,QUIZZES} from './data.js?v=d286a5360200';
import * as G from './engine.js?v=d286a5360200';
import {purchaseQuizById} from './purchase-quizzes.js?v=d286a5360200';

// Small, bounded decisions; bots use exactly the same rules and balances as people.
export function botDecision(state,previous={},random=Math.random){
  const turnKey=`${state.turnNumber??state.round}:${state.turn}`;
  const memory=previous.turnKey===turnKey?{...previous}:{turnKey};
  const decide=(action,args=[])=>({action,args,memory});
  if(state.phase==='finished')return null;
  if(state.trade){
    const t=state.trade,buyer=state.players[t.to];
    if(!buyer.isBot)return null;
    const w=WORKS.find(w=>w.id===t.workId);
    const investment=w.price+state.ownership[w.id].level*100;
    const accepted=buyer.coins>=t.price&&t.price<=Math.round(investment*1.2)&&random()<.8;
    return decide('resolveTrade',[accepted]);
  }
  const p=G.current(state);if(!p.isBot)return null;
  if(['roll','backward-roll'].includes(state.phase))return decide('roll');
  if(state.phase==='jailed')return decide('nextTurn');
  if(state.phase==='purchase-quiz'){const q=purchaseQuizById(state.purchaseChallenge.questionId);return decide('answerPurchaseQuiz',[random()<.65?q.answer:!q.answer]);}
  if(state.phase==='purchase-feedback')return decide('closePurchaseFeedback');
  if(state.phase==='quiz'){
    const q=QUIZZES.find(q=>q.id===state.quiz);
    const wrong=q.options.map((_,i)=>i).filter(i=>i!==q.answer);
    const answer=random()<.65?q.answer:wrong[Math.floor(random()*wrong.length)];
    return decide('answerQuiz',[answer]);
  }
  if(state.phase==='feedback')return decide('closeFeedback');
  if(state.phase!=='action')return null;
  const cell=BOARD[p.position];
  if(cell.type==='work'&&!state.ownership[cell.id]){
    if(state.purchaseChallenge?.correct===true&&!memory.buy&&p.coins>=cell.price){memory.buy=true;return decide('buy');}
    if(!state.purchaseChallenge&&!memory.purchase){memory.purchase=true;if(p.coins>=cell.price+100&&random()<.85)return decide('startPurchaseQuiz');}
  }
  if(!memory.upgrade){
    memory.upgrade=true;
    const options=WORKS.filter(w=>G.canUpgrade(state,w.id));
    if(options.length&&p.coins>=350&&random()<.35)return decide('upgrade',[options[Math.floor(random()*options.length)].id]);
  }
  if(!memory.quiz){memory.quiz=true;if(!state.quizUsed&&random()<.8)return decide('startQuiz');}
  return decide('nextTurn');
}

export function applyBotDecision(state,decision,dice){
  if(!decision)return state;
  if(decision.action==='roll')return G.roll(state,dice);
  const actions={buy:G.purchaseAndNext,startPurchaseQuiz:G.startPurchaseQuiz,answerPurchaseQuiz:G.answerPurchaseQuiz,closePurchaseFeedback:G.closePurchaseFeedback,upgrade:G.upgrade,startQuiz:G.startQuiz,answerQuiz:G.answerQuiz,closeFeedback:G.closeFeedback,nextTurn:G.nextTurn,resolveTrade:G.resolveTrade};
  if(!Object.hasOwn(actions,decision.action))throw Error('잘못된 봇 동작입니다.');
  return actions[decision.action](state,...decision.args);
}
