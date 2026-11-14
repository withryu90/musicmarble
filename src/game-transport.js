import {PeerTransport} from './peer-transport.js?v=98f0d6747076';
import {HttpTransport} from './http-transport.js?v=98f0d6747076';
export class GameTransport{
 constructor({peer=new PeerTransport(),http=new HttpTransport()}={}){Object.assign(this,{peer,http});}
 get connection(){return this.peer.connection;}
 async request(path,body={},session){
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
 subscribe(session,listener){return (session?.transport==='https'?this.http:this.peer).subscribe(session,listener);}
 close(){this.peer.close();this.http.close();}
}
