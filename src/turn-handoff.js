import {streamingOpportunity} from './engine.js?v=039638e6e41a';
import {BOARD} from './data.js?v=039638e6e41a';
// Offer the handoff only after mandatory learning/purchase choices are resolved.
export function canOfferTurnHandoff(state,playerId){
 if(!state||state.turn!==playerId||state.trade||!['action','jailed'].includes(state.phase))return false;
 if(streamingOpportunity(state))return false;
 const player=state.players[playerId],cell=BOARD[player.position];
 if(cell.type==='work'&&!state.ownership[cell.id]&&player.coins>=cell.price&&!state.purchased&&state.purchaseChallenge?.correct!==false)return false;
 return true;
}
