// Only public game phases and an expiring typing flag are shared; quiz answers stay private.
export function playerStatus(state,id,{typingUntil=0,presentation=null,now=Date.now()}={}){
 if(state.phase==='finished')return '대기 중';
 if(typingUntil>now)return '채팅 중';
 if(presentation?.playerId===id)return '진행 중';
 if(state.trade?.to===id||state.trade?.from===id)return '진행 중';
 if(state.turn!==id)return '대기 중';
 if(['quiz','purchase-quiz'].includes(state.phase))return '퀴즈 중';
 return '진행 중';
}
