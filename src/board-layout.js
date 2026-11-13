// The board uses only the perimeter of the square; corner cells are shared.
export const BOARD_SIDE=9;
export const BOARD_SPACES=4*(BOARD_SIDE-1);
export function boardCoordinates(index){
 if(!Number.isInteger(index)||index<0||index>=BOARD_SPACES)throw Error('올바른 보드 칸 번호가 필요합니다.');
 const edge=BOARD_SIDE-1;
 if(index<=edge)return [1,index+1];
 if(index<=edge*2)return [index-edge+1,BOARD_SIDE];
 if(index<=edge*3)return [BOARD_SIDE,edge*3+1-index];
 return [BOARD_SPACES+1-index,1];
}

// A gradient travels inward, leaving its first half on the outside edge.
export function ownershipDirection(index){
 const [row,col]=boardCoordinates(index);
 return row===1?'bottom':col===BOARD_SIDE?'left':row===BOARD_SIDE?'top':'right';
}
