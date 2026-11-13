export function roomConfig(value={},fallback={rounds:8,coins:1200}){
 const rounds=Number(value.rounds??fallback.rounds),coins=Number(value.coins??fallback.coins);
 if(![4,8,12].includes(rounds)||![1000,1200,1600].includes(coins))throw Error('게임 길이와 시작 코인을 확인해 주세요.');
 return {rounds,coins};
}
// Keep an immediate draft while a setting update travels to the room host.
export class LobbyConfig{
 constructor(){this.drafts=new Map();}
 read(snapshot){return this.drafts.get(snapshot.code)||roomConfig(snapshot.config);}
 update(snapshot,changes){const config=roomConfig(changes,this.read(snapshot));this.drafts.set(snapshot.code,config);return config;}
}
