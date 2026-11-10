import * as G from '../src/engine.js';
import {purchaseQuizById} from '../src/purchase-quizzes.js';
export function qualifyPurchase(state){
 if(state.purchaseChallenge?.correct===true)return state;
 const challenge=G.startPurchaseQuiz(state,()=>0),q=purchaseQuizById(challenge.purchaseChallenge.questionId);
 return G.closePurchaseFeedback(G.answerPurchaseQuiz(challenge,q.answer));
}
export const buyQualified=state=>G.buy(qualifyPurchase(state));
