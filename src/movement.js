// Board traversal is visual only; the authoritative final state comes from the server.
export function movementPath(start,steps,size){
 if(!Number.isInteger(size)||size<1||!Number.isInteger(start)||start<0||start>=size||!Number.isInteger(steps)||steps<1||steps>6)throw Error('올바른 보드 위치와 주사위 값이 필요합니다.');
 return Array.from({length:steps},(_,i)=>(start+i+1)%size);
}

// Turns proceed in player-ID order. Once introduced, a token stays visible even at START.
export function boardTokenVisible(state,player,movingPlayerId=null){
 return player.id===movingPlayerId||player.position!==0||(state.turnNumber??0)>player.id||
  (state.turn===player.id&&state.phase!=='roll'&&state.dice!==null);
}

// START is an on-tile entrance; other figures stand beside their edge tile.
export function boardTokenAnchor(row,col,side){
 if(row===1&&col===1)return {x:50,y:50};
 return {x:col===1?-60:col===side?160:50,y:row===1?-60:row===side?160:50};
}

export function backwardPath(start,steps,size){
 if(!Number.isInteger(size)||size<1||!Number.isInteger(start)||start<0||start>=size||!Number.isInteger(steps)||steps<1||steps>6)throw Error('올바른 뒤로 이동 정보가 필요합니다.');
 return Array.from({length:steps},(_,i)=>(start-i-1+size)%size);
}
