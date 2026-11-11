// Rejection sampling avoids bias for room codes and dice in browsers and Node.
export function randomInt(min,max){
 if(max===undefined){max=min;min=0;}
 const span=max-min;if(!Number.isInteger(span)||span<1||span>0x100000000)throw Error('Invalid random range');
 const limit=Math.floor(0x100000000/span)*span,value=new Uint32Array(1);
 do{crypto.getRandomValues(value);}while(value[0]>=limit);
 return min+value[0]%span;
}
export function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');}
