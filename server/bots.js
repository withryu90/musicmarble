import {BOARD,WORKS,QUIZZES} from '../src/data.js';
import * as G from '../src/engine.js';

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
  if(state.phase==='roll')return decide('roll');
  if(state.phase==='quiz'){
    const q=QUIZZES.find(q=>q.id===state.quiz);
    const wrong=q.options.map((_,i)=>i).filter(i=>i!==q.answer);
    const answer=random()<.65?q.answer:wrong[Math.floor(random()*wrong.length)];
    return decide('answerQuiz',[answer]);
  }
  if(state.phase==='feedback')return decide('closeFeedback');
  if(state.phase!=='action')return null;
  const cell=BOARD[p.position];
  if(!memory.buy){memory.buy=true;if(cell.type==='work'&&!state.ownership[cell.id]&&p.coins>=cell.price+100&&random()<.85)return decide('buy');}
  if(!memory.upgrade){
    memory.upgrade=true;
    const options=G.owned(state,p.id).filter(w=>!state.ownership[w.id].level);
    if(options.length&&p.coins>=350&&random()<.35)return decide('upgrade',[options[Math.floor(random()*options.length)].id]);
  }
  if(!memory.quiz){memory.quiz=true;if(!state.quizUsed&&random()<.8)return decide('startQuiz');}
  return decide('nextTurn');
}

export function applyBotDecision(state,decision,dice){
  if(!decision)return state;
  if(decision.action==='roll')return G.roll(state,dice);
  const actions={buy:G.buy,upgrade:G.upgrade,startQuiz:G.startQuiz,answerQuiz:G.answerQuiz,closeFeedback:G.closeFeedback,nextTurn:G.nextTurn,resolveTrade:G.resolveTrade};
  if(!Object.hasOwn(actions,decision.action))throw Error('잘못된 봇 동작입니다.');
  return actions[decision.action](state,...decision.args);
}
