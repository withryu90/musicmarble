import {streamingOpportunity,canSwapWorks} from './engine.js?v=e74d34b16d4b';
import {BOARD} from './data.js?v=e74d34b16d4b';
// Offer the handoff only after mandatory learning/purchase choices are resolved.
export function canOfferTurnHandoff(state,playerId){
 if(!state||state.turn!==playerId||state.trade||!['action','jailed'].includes(state.phase))return false;
 if(streamingOpportunity(state)||canSwapWorks(state))return false;
 const player=state.players[playerId],cell=BOARD[player.position];
 if(cell.type==='work'&&!state.ownership[cell.id]&&player.coins>=cell.price&&!state.purchased&&!state.purchaseChallenge?.declined&&state.purchaseChallenge?.correct!==false)return false;
 return true;
}
