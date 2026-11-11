// A phone's portrait game view is an orientation guide; landing and setup stay usable.
export function needsLandscape(width,height,playing,touchDevice=true){
 return Boolean(touchDevice&&playing&&width<=600&&height>width);
}
