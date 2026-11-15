// Fictional in-game app occupancy rights; no real service account or connection.
export const STREAMING_RIGHTS_PRICE=200;
export const STREAMING_INSTALL_PRICE=50;
export const STREAMING_REVENUE=30;
export const STREAMING_APPS=Object.freeze([
 {id:'youtube-music',name:'너튜브 뮤직',era:'baroque',color:'#ff0033',symbol:'youtube'},
 {id:'apple-music',name:'사과뮤직',era:'classical',color:'#e95d85',symbol:'apple'},
 {id:'spotify',name:'스파이',era:'romantic',color:'#1db866',symbol:'spotify'},
 {id:'melon',name:'메론',era:'modern',color:'#00af6b',symbol:'melon'}
].map(Object.freeze));
export const streamingApp=id=>STREAMING_APPS.find(app=>app.id===id);
export function streamingIcon(id){
 const app=streamingApp(id);if(!app)return '';
 // Custom game emblems, keeping the familiar red/pink/green palette.
 const art={
  youtube:'<path d="M16 1.5c1.3 0 2.5.3 3.6 1l8 4.6c1.8 1 2.9 2.9 2.9 5v7.8c0 2.1-1.1 4-2.9 5l-8 4.6a7.2 7.2 0 0 1-7.2 0l-8-4.6a5.8 5.8 0 0 1-2.9-5v-7.8c0-2.1 1.1-4 2.9-5l8-4.6c1.1-.7 2.3-1 3.6-1Z" fill="#ff0033"/><path d="M14 9.5 21 7v4l-5 1.8v8.7c0 3.2-7 4.5-7 1 0-2.6 3.2-3.5 5-2.8Z" fill="white"/><path d="M21 17v5m4-7v9" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
  apple:'<rect x="1" y="1" width="30" height="30" rx="10" fill="#ec668e"/><path d="M21 9v13c0 5-8 6-8 2 0-3 4-4 6-3V10z" fill="white"/><path d="M18 8q1-5 7-4-1 5-7 4" fill="#ffe4ec"/><path d="M8 11v6m-3-3h6" stroke="white" stroke-width="1.6" stroke-linecap="round"/>',
  spotify:'<rect x="1" y="1" width="30" height="30" rx="13" fill="#34be7d"/><path d="M7 11q9-4 18 1M8 16q8-3 15 1M10 21q6-2 11 1" fill="none" stroke="#163e35" stroke-width="2.5" stroke-linecap="round"/><circle cx="25" cy="24" r="2" fill="#e0ffe9"/>',
  melon:'<rect x="1" y="1" width="30" height="30" rx="11" fill="#37b962"/><path d="M7 23V15a4 4 0 0 1 8 0v8m0-8a4 4 0 0 1 8 0v8" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/><path d="M21 8q1-5 7-4-1 5-7 4" fill="#f5e985"/>'
 };
 return `<svg viewBox="0 0 32 32" role="img" aria-label="${app.name}" xmlns="http://www.w3.org/2000/svg">${art[app.symbol]}</svg>`;
}
