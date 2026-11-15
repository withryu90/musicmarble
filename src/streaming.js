// Fictional in-game app occupancy rights; no real service account or connection.
export const STREAMING_RIGHTS_PRICE=200;
export const STREAMING_INSTALL_PRICE=50;
export const STREAMING_REVENUE=30;
export const STREAMING_APPS=Object.freeze([
 {id:'youtube-music',name:'너튜브 뮤직',era:'baroque',color:'#e73842',symbol:'youtube'},
 {id:'apple-music',name:'사과뮤직',era:'classical',color:'#e95d85',symbol:'apple'},
 {id:'spotify',name:'스파이',era:'romantic',color:'#1db866',symbol:'spotify'},
 {id:'melon',name:'메론',era:'modern',color:'#00af6b',symbol:'melon'}
].map(Object.freeze));
export const streamingApp=id=>STREAMING_APPS.find(app=>app.id===id);
export function streamingIcon(id){
 const app=streamingApp(id);if(!app)return '';
 // Custom game emblems, keeping the familiar red/pink/green palette.
 const art={
  youtube:'<rect x="1" y="1" width="30" height="30" rx="12" fill="#ec4052"/><path d="M22 8a10 10 0 1 0 2 14" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"/><path d="m13 10 9 6-9 6z" fill="white"/><circle cx="25" cy="9" r="2" fill="#ffd8df"/>',
  apple:'<rect x="1" y="1" width="30" height="30" rx="10" fill="#ec668e"/><path d="M21 9v13c0 5-8 6-8 2 0-3 4-4 6-3V10z" fill="white"/><path d="M18 8q1-5 7-4-1 5-7 4" fill="#ffe4ec"/><path d="M8 11v6m-3-3h6" stroke="white" stroke-width="1.6" stroke-linecap="round"/>',
  spotify:'<rect x="1" y="1" width="30" height="30" rx="13" fill="#34be7d"/><path d="M7 11q9-4 18 1M8 16q8-3 15 1M10 21q6-2 11 1" fill="none" stroke="#163e35" stroke-width="2.5" stroke-linecap="round"/><circle cx="25" cy="24" r="2" fill="#e0ffe9"/>',
  melon:'<rect x="1" y="1" width="30" height="30" rx="11" fill="#37b962"/><path d="M7 23V15a4 4 0 0 1 8 0v8m0-8a4 4 0 0 1 8 0v8" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/><path d="M21 8q1-5 7-4-1 5-7 4" fill="#f5e985"/>'
 };
 return `<svg viewBox="0 0 32 32" role="img" aria-label="${app.name}" xmlns="http://www.w3.org/2000/svg">${art[app.symbol]}</svg>`;
}
