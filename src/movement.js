// Board traversal is visual only; the authoritative final state comes from the server.
export function movementPath(start,steps,size){
 if(!Number.isInteger(size)||size<1||!Number.isInteger(start)||start<0||start>=size||!Number.isInteger(steps)||steps<1||steps>6)throw Error('올바른 보드 위치와 주사위 값이 필요합니다.');
 return Array.from({length:steps},(_,i)=>(start+i+1)%size);
}
