import test from 'node:test';
import assert from 'node:assert/strict';
import {nicknameLines} from '../src/nicknames.js';
test('short nicknames remain on one line',()=>{assert.deepEqual(nicknameLines(' 모차르트 '),['모차르트']);});
test('a long nickname without spaces stays intact',()=>{const name='가나다라마바사아자차카타파하가나';assert.deepEqual(nicknameLines(name),[name]);});
test('musical nicknames split at the word boundary',()=>{assert.deepEqual(nicknameLines('자유로운 카프리치오'),['자유로운','카프리치오']);});
test('emoji stay intact when a name is divided',()=>{const name='🎵🎶🎼🎹🎻🎺🎷🥁';const lines=nicknameLines(name);assert.deepEqual(lines,[name]);});

test('short first words are valid wrapping points',()=>{assert.deepEqual(nicknameLines('별빛 세레나데'),['별빛','세레나데']);assert.deepEqual(nicknameLines('달빛 소나타'),['달빛 소나타']);});
