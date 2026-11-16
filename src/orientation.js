// A phone's portrait game view is an orientation guide; landing and setup stay usable.
export function needsLandscape(width,height,playing,touchDevice=true){
 return Boolean(touchDevice&&playing&&width<=600&&height>width);
}

// Embedded browsers may report stale viewport dimensions during rotation.
// Use explicit device orientation as an additional way to release the guide.
export function needsLandscapeInWindow(view,playing,touchDevice=true){
 const type=view.screen?.orientation?.type;
 const angle=Number(view.orientation);
 const landscape=type?.startsWith('landscape')||
  (typeof view.orientation==='number'&&Number.isFinite(angle)&&Math.abs(angle)%180===90);
 return !landscape&&needsLandscape(view.innerWidth,view.innerHeight,playing,touchDevice);
}

export function embeddedBrowserName(userAgent=''){
 if(/KAKAOTALK/i.test(userAgent))return '카카오톡';
 if(/Instagram/i.test(userAgent))return '인스타그램';
 if(/NAVER/i.test(userAgent))return '네이버';
 return '';
}
