// Wrap only at spaces so a word is never split across nickname lines.
export function nicknameLines(name){
 const text=String(name).trim();
 const letters=Array.from(new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(text),part=>part.segment);
 if(letters.length<=6)return [text];
 const middle=Math.ceil(letters.length/2);
 const spaces=letters.map((letter,i)=>letter===' '?i:-1).filter(i=>i>0&&i<letters.length-1);
 if(!spaces.length)return [text];
 const split=spaces.sort((a,b)=>Math.abs(a-middle)-Math.abs(b-middle))[0];
 return [letters.slice(0,split).join('').trim(),letters.slice(split).join('').trim()];
}
