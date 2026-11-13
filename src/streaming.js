// Fictional in-game app occupancy rights; no real service account or connection.
export const STREAMING_RIGHTS_PRICE=200;
export const STREAMING_INSTALL_PRICE=50;
export const STREAMING_REVENUE=30;
export const STREAMING_APPS=Object.freeze([
 {id:'youtube-music',name:'유튜브 뮤직',era:'baroque',color:'#e73842',symbol:'youtube'},
 {id:'apple-music',name:'애플뮤직',era:'classical',color:'#e95d85',symbol:'apple'},
 {id:'spotify',name:'스포티파이',era:'romantic',color:'#1db866',symbol:'spotify'},
 {id:'melon',name:'멜론',era:'modern',color:'#00af6b',symbol:'melon'}
].map(Object.freeze));
export const streamingApp=id=>STREAMING_APPS.find(app=>app.id===id);
export function streamingIcon(id){
 const app=streamingApp(id);if(!app)return '';
 const art={
  youtube:'<circle cx="16" cy="16" r="15" fill="#f03"/><circle cx="16" cy="16" r="10" fill="none" stroke="white" stroke-width="1.5"/><path d="m13 10 9 6-9 6z" fill="white"/>',
  apple:'<defs><linearGradient id="apple-stream" x2="0" y2="1"><stop stop-color="#fa768a"/><stop offset="1" stop-color="#f23461"/></linearGradient></defs><rect x="1" y="1" width="30" height="30" rx="7" fill="url(#apple-stream)"/><path d="M23 6v16c0 5-7 6-7 2 0-3 3-4 5-3V11l-9 2v12c0 5-7 5-7 1 0-3 3-4 5-3V9z" fill="white"/>',
  spotify:'<circle cx="16" cy="16" r="15" fill="#1ed760"/><path d="M7 12q10-4 19 1M8 17q9-3 16 1M10 22q7-2 12 1" fill="none" stroke="#10291d" stroke-width="2.5" stroke-linecap="round"/>',
  melon:'<rect x="1" y="1" width="30" height="30" rx="8" fill="#00cd3c"/><path d="M7 23V14a4 4 0 0 1 8 0v9m0-9a4 4 0 0 1 8 0v9" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/><circle cx="25" cy="7" r="3" fill="#ffff42"/>'
 };
 return `<svg viewBox="0 0 32 32" role="img" aria-label="${app.name}" xmlns="http://www.w3.org/2000/svg">${art[app.symbol]}</svg>`;
}
