// Sentence spacing only: leave decimals, catalogue numbers and existing line breaks intact.
export function sentenceBreakPositions(text){
 const positions=[],pattern=/[.!?。！？]["'”’」』)\]]*[ \t]+(?=\S)/gu;
 for(const match of text.matchAll(pattern)){
  if(text[match.index]==='.'&&/(?:\b(?:Op|No|Mr|Mrs|Ms|Dr)|\b[A-Z]|(?:^|\n)\s*\d+)\.$/.test(text.slice(0,match.index+1)))continue;
  positions.push(match.index+match[0].length);
 }
 return positions;
}
const PROSE='p,.quiz-question,.notice,.muted,.modal-body small';
export function formatModalSentences(dialog){
 if(!dialog)return;
 const containers=[...dialog.querySelectorAll(PROSE)].filter(el=>!el.closest('button,a,label,input,select,textarea,code,pre')&&!el.parentElement?.closest('p,.quiz-question,.notice,.muted,small'));
 for(const container of containers){
  let text='';const nodes=[];
  function collect(parent){for(const child of parent.childNodes){
   if(child.nodeType===3){const start=text.length;text+=child.data;nodes.push({node:child,start,end:text.length});}
   else if(child.nodeType===1){
    if(child.tagName==='BR')text+='\n';
    else if(!['BUTTON','INPUT','SELECT','TEXTAREA','SCRIPT','STYLE','SVG','CODE','PRE','A'].includes(child.tagName))collect(child);
   }
  }}
  collect(container);
  for(const position of sentenceBreakPositions(text).reverse()){
   const entry=nodes.find(item=>position>=item.start&&position<item.end);if(!entry)continue;
   const next=entry.node.splitText(position-entry.start),br=container.ownerDocument.createElement('br');
   br.dataset.sentenceBreak='';next.parentNode.insertBefore(br,next);
  }
 }
}
