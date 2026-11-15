import {DeveloperTransport} from './developer-transport.js?v=e74d34b16d4b';
import {PeerTransport} from './peer-transport.js?v=e74d34b16d4b';
import {HttpTransport} from './http-transport.js?v=e74d34b16d4b';
export class GameTransport{
 constructor({peer=new PeerTransport(),http=new HttpTransport(),developer=new DeveloperTransport()}={}){Object.assign(this,{peer,http,developer});}
 get connection(){return this.developer.connection||this.peer.connection;}
 async request(path,body={},session){
  if(path==='create-developer'){this.close();return this.developer.request(path,body);}
  if(session?.transport==='developer')return this.developer.request(path,body,session);
  if(path==='developer')throw Error('테스트 게임에서만 사용할 수 있어요.');
  if(path==='create'){this.close();return this.http.request(path,body);}
  if(path==='create-solo'){this.close();return this.peer.request(path,body,session);}
  if(path==='join'){
   this.close();
   if(/^\d{6}$/.test(body.code||'')){
    try{return await this.http.request(path,body);}catch(error){if(error.status!==404)throw error;}
   }
   return this.peer.request(path,body,session);
  }
  return session?.transport==='https'?this.http.request(path,body,session):this.peer.request(path,body,session);
 }
 subscribe(session,listener){return (session?.transport==='developer'?this.developer:session?.transport==='https'?this.http:this.peer).subscribe(session,listener);}
 close(){this.peer.close();this.http.close();this.developer.close();}
}
