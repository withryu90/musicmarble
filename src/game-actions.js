import {turnPromptKey} from './turn-flow.js?v=31f379138836';
// Presentation can lag behind the room. Send one intent at a time, against the
// latest revision, and never replay an intent after its turn/question has changed.
export class GameActions{
 constructor({latest,send,refresh,remember}){Object.assign(this,{latest,send,refresh,remember});this.tail=Promise.resolve();this.pending=new Map();}
 run(body,session,presented){
  const context=s=>`${s?.code}:${turnPromptKey(s?.state)}`;
  const expected=context(presented),key=JSON.stringify([session.code,session.token,expected,body.action,body.args||[]]);
  if(this.pending.has(key))return this.pending.get(key);
  const execute=async()=>{
   let current=this.latest(session.code)||presented;
   if(context(current)!==expected)return current;
   for(let attempt=0;attempt<2;attempt++){
    try{const result=await this.send({...body,revision:current.revision},session);this.remember(result);return result;}
    catch(error){
     if(attempt||!error.message.includes('게임 상태가 갱신'))throw error;
     current=await this.refresh(session);this.remember(current);
     if(context(current)!==expected)return current;
    }
   }
  };
  const result=this.tail.then(execute);this.tail=result.catch(()=>{});this.pending.set(key,result);
  result.finally(()=>{if(this.pending.get(key)===result)this.pending.delete(key);}).catch(()=>{});
  return result;
 }
}
