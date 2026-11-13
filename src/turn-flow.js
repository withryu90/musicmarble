// Game notices may delay presentation, but a resolved turn must never wait behind
// an old automatically opened prompt once a newer server snapshot is available.
export function shouldDrainTurnUpdates({pending=0,deferred=0,active=false,intro=false,dice=false}={}){
 return deferred>0&&!pending&&!active&&!intro&&!dice;
}
export function turnPromptKey(state){
 return state?`${state.turnNumber??0}:${state.phase}:${state.turn}:${state.quiz}:${state.feedback?.index}:${state.purchaseChallenge?.questionId}:${state.purchaseChallenge?.response}:${state.trade?JSON.stringify(state.trade):''}`:'lobby';
}
