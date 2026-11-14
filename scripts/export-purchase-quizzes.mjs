import {mkdir,writeFile} from 'node:fs/promises';
import {WORKS} from '../src/data.js';
import {PURCHASE_QUIZZES} from '../src/purchase-quizzes.js';
const lines=[`뮤직마블 · 작품별 감상 퀴즈 ${PURCHASE_QUIZZES.length}문항`,'20작품 × 각 5문항 · O=맞다 / X=아니다',''];
let number=0;
for(const work of WORKS){
 lines.push(`【${work.composer} · ${work.title}】`);
 for(const q of PURCHASE_QUIZZES.filter(q=>q.workId===work.id)){
  lines.push(`${++number}. ${q.question}`,`문항 ID: ${q.id}`,`정답: ${q.answer?'O':'X'}`,`해설: ${q.explanation}`,`참고: ${q.source}`,'');
 }
}
await mkdir(new URL('../docs/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/작품별_구입OX_100문항.txt',import.meta.url),lines.join('\n'),'utf8');
console.log(`Exported ${number} questions`);
