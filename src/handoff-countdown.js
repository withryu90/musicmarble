// One deadline per handoff. Cancellation invalidates even an already queued tick.
export class HandoffCountdown{
 constructor({now=()=>Date.now(),schedule=(fn,delay)=>setTimeout(fn,delay),cancel=id=>clearTimeout(id)}={}){Object.assign(this,{now,schedule,cancel});this.generation=0;this.timer=null;}
 stop(){this.generation++;if(this.timer!==null)this.cancel(this.timer);this.timer=null;}
 start({canContinue=()=>true,onTick,onFinish}){
  this.stop();const generation=this.generation,deadline=this.now()+5000;let last;
  const tick=()=>{
   if(generation!==this.generation)return;
   if(!canContinue()){this.stop();return;}
   const remaining=Math.max(0,Math.ceil((deadline-this.now())/1000));
   if(!remaining){this.stop();onFinish();return;}
   if(remaining!==last){last=remaining;onTick(remaining);}
   if(generation===this.generation)this.timer=this.schedule(tick,Math.min(1000,deadline-this.now()));
  };
  tick();
 }
}
