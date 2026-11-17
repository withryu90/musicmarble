// Game notices may delay presentation, but a resolved turn must never wait behind
// an old automatically opened prompt once a newer server snapshot is available.
export function shouldDrainTurnUpdates({pending=0,deferred=0,active=false,intro=false,dice=false}={}){
 return deferred>0&&!pending&&!active&&!intro&&!dice;
}
export function turnPromptKey(state){
 return state?`${state.turnNumber??0}:${state.phase}:${state.turn}:${state.quiz}:${state.feedback?.index}:${state.purchaseChallenge?.questionId}:${state.purchaseChallenge?.response}:${state.trade?JSON.stringify(state.trade):''}`:'lobby';
}

// Normal dice movement is under 12 seconds; recover only a genuinely stale view.
export function shouldRecoverPresentation({latestRevision,presentedRevision,lastProgressAt,now=Date.now(),intro=false}){
 return !intro&&latestRevision>presentedRevision&&now-lastProgressAt>25000;
}

// Viewing menus never mutates the shared turn; allow it on every screen size.
const VIEW_ACTIONS=new Set(['close','home','leave','tab','filter','fullscreen','help','settings','history','export','board-view','board-zoom-in','board-zoom-out','board-zoom-reset','my-character','character-gallery','character-bio','copy-code','orientation-continue','orientation-landscape','browser-guide','copy-game-link','visit-privacy']);
export const canUseDuringProgress=action=>VIEW_ACTIONS.has(action);
