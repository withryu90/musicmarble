export const ROUND_OPTIONS=Object.freeze(Array.from({length:8},(_,i)=>i+1));
export function roomConfig(value={},fallback={rounds:4,coins:1500}){
 const rounds=Number(value.rounds??fallback.rounds),coins=Number(value.coins??fallback.coins);
 if(!ROUND_OPTIONS.includes(rounds)||![1000,1200,1500,1600].includes(coins))throw Error('게임 길이와 시작 코인을 확인해 주세요.');
 return {rounds,coins};
}
// Keep an immediate draft while a setting update travels to the room host.
export class LobbyConfig{
 constructor(){this.drafts=new Map();}
 read(snapshot){const config=snapshot.config;return this.drafts.get(snapshot.code)||roomConfig([9,10,12].includes(config?.rounds)?{...config,rounds:8}:config);}
 update(snapshot,changes){const config=roomConfig(changes,this.read(snapshot));this.drafts.set(snapshot.code,config);return config;}
}
