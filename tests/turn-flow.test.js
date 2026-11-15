import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldDrainTurnUpdates,turnPromptKey,shouldRecoverPresentation,canUseDuringProgress} from '../src/turn-flow.js';

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

test('stale presentation recovers without cutting short normal movement, participant intro or an unanswered live question',()=>{
 const input={latestRevision:5,presentedRevision:4,lastProgressAt:1000,now:27000};
 assert.equal(shouldRecoverPresentation(input),true);
 assert.equal(shouldRecoverPresentation({...input,now:11000}),false);
 assert.equal(shouldRecoverPresentation({...input,intro:true}),false);
 assert.equal(shouldRecoverPresentation({...input,presentedRevision:5}),false);
});

test('read-only menus and popup closing stay available during progress on desktop and mobile',()=>{
 for(const action of ['history','help','settings','fullscreen','tab','board-view','board-zoom-in','board-zoom-out','board-zoom-reset','close','export','cell','work','home'])assert.equal(canUseDuringProgress(action),true,action);
 for(const action of ['roll','roll-backward','purchase-confirm','purchase-answer','answer','next','handoff-next','upgrade','streaming-buy','swap-confirm','pay-bail'])assert.equal(canUseDuringProgress(action),false,action);
});
