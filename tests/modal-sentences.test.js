import test from 'node:test';
import assert from 'node:assert/strict';
import {sentenceBreakPositions} from '../src/modal-sentences.js';
function lines(text){let start=0;return [...sentenceBreakPositions(text),text.length].map(end=>{const line=text.slice(start,end).trim();start=end;return line;});}
test('Korean explanations separate complete sentences including quotations',()=>{
 assert.deepEqual(lines('감옥에 갇혔습니다. 다음 차례에 도전하세요! 6이 나오면 탈출해요.'),['감옥에 갇혔습니다.','다음 차례에 도전하세요!','6이 나오면 탈출해요.']);
 assert.deepEqual(lines('“정답인가요?” 다음 문장을 읽어요. 코인은 유지돼요.'),['“정답인가요?”','다음 문장을 읽어요.','코인은 유지돼요.']);
});
test('music catalogue numbers, initials and decimals remain intact',()=>{
 assert.deepEqual(lines('J. S. Bach의 작품입니다. 녹턴 Op. 9 No. 2의 이용료는 1.5배예요. 다시 만나요.'),['J. S. Bach의 작품입니다.','녹턴 Op. 9 No. 2의 이용료는 1.5배예요.','다시 만나요.']);
});
test('existing explicit line breaks are not duplicated',()=>{
 assert.deepEqual(lines('1. 첫 문장입니다. 다음 문장이에요.'),['1. 첫 문장입니다.','다음 문장이에요.']);
 assert.deepEqual(sentenceBreakPositions('첫 문장입니다.\n다음 문장이에요.'),[]);
 assert.deepEqual(sentenceBreakPositions('첫 문장입니다. \n다음 문장이에요.'),[]);
});
