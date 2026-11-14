// Only public game phases and an expiring typing flag are shared; quiz answers stay private.
export function playerStatus(state,id,{typingUntil=0,presentation=null,now=Date.now()}={}){
 if(state.phase==='finished')return '게임 종료';
 if(typingUntil>now)return '채팅 중';
 if(presentation?.playerId===id)return presentation.moving?'이동 중':'주사위 굴리는 중';
 if(state.trade?.to===id)return '거래 확인 중';
 if(state.trade?.from===id)return '거래 제안 중';
 if(state.turn!==id)return '대기 중';
 if(state.phase==='purchase-quiz')return state.purchaseChallenge?.hint?.until>now?'대표 선율 듣는 중':'음악 퀴즈 푸는 중';
 return ({quiz:'배움 퀴즈 푸는 중',feedback:'퀴즈 결과 확인 중','purchase-feedback':'퀴즈 결과 확인 중',roll:state.players[id]?.skipTurns?'탈출 주사위 준비 중':'주사위 준비 중','backward-roll':'뒤로갈 주사위 준비 중',jailed:'감옥에서 대기 중',action:state.purchaseChallenge?.correct?'이용권 구입 중':'행동 선택 중'})[state.phase]||'대기 중';
}
