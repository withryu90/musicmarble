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
