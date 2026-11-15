// Count visible reading time on each device, independently of shared turn timing.
export const CONCERT_NOTICE_MS=8000;
export class ConcertNoticeWindow{
 constructor(){this.stop();}
 start(now=Date.now(),visible=true){this.remaining=CONCERT_NOTICE_MS;this.last=now;this.visible=visible;this.active=true;}
 tick(now=Date.now(),visible=true){
  if(!this.active)return false;
  if(this.visible&&visible)this.remaining=Math.max(0,this.remaining-Math.max(0,now-this.last));
  this.last=now;this.visible=visible;
  return this.remaining===0;
 }
 get seconds(){return Math.ceil(this.remaining/1000);}
 stop(){this.active=false;this.remaining=0;this.last=0;this.visible=false;}
}
