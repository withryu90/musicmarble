import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldDrainTurnUpdates,turnPromptKey} from '../src/turn-flow.js';

test('a newer turn drains past an old automatic prompt after notices finish',()=>{
 assert.equal(shouldDrainTurnUpdates({deferred:2}),true);
 for(const block of [{pending:1},{active:true},{intro:true},{dice:true}])assert.equal(shouldDrainTurnUpdates({deferred:2,...block}),false);
 assert.equal(shouldDrainTurnUpdates(),false);
});
test('the same participant and phase in a later turn get a fresh prompt',()=>{
 const state={turn:0,phase:'action',turnNumber:0};
 assert.notEqual(turnPromptKey(state),turnPromptKey({...state,turnNumber:4}));
 assert.equal(turnPromptKey(null),'lobby');
});
