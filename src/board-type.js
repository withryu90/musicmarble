// Keep the largest possible title within its own fixed, centred title box.
export function fittedTitleSize(fontSize,width,height,lineWidths,lineHeights){
 const widest=Math.max(1,...lineWidths),tallest=Math.max(1,lineHeights.reduce((n,h)=>n+h,0));
 const ratio=Math.min(1,width/widest,height/tallest);
 return ratio<1?Math.floor(fontSize*ratio*.96*100)/100:fontSize;
}
export function fitBoardTitles(root=document){
 for(const title of root.querySelectorAll('.board .tile-copy strong')){
  title.style.removeProperty('--fit-title-size');
  const lines=[...title.querySelectorAll('.tile-title-line')];if(!lines.length||!title.clientWidth||!title.clientHeight)continue;
  const font=parseFloat(getComputedStyle(title).fontSize);
  const size=fittedTitleSize(font,title.clientWidth,title.clientHeight,lines.map(l=>l.scrollWidth),lines.map(l=>l.scrollHeight));
  if(size<font)title.style.setProperty('--fit-title-size',`${size}px`);
 }
}
