// One source-space rectangle for the photographs, skyline and weather. Phones
// keep their existing CSS composition. Narrow artwork is never stretched wide.
const panorama = {width:853,height:1844};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const validSize = size => Number.isFinite(size?.width) && size.width > 0 &&
  Number.isFinite(size?.height) && size.height > 0;

export function wallpaperLayout({width,height,wallpaper='mosque',geometry}={}) {
  const phoneLandscape = validSize({width,height}) && width > height && Math.min(width,height) < 600;
  const protectedSubject = geometry?.fitSubject === true && validSize(geometry);
  if (!validSize({width,height}) || Math.min(width,height) < 600 && !protectedSubject && !phoneLandscape) return null;
  const source = validSize(geometry) ? geometry : wallpaper === 'mosque'
    ? {width:1536,height:1024} : wallpaper === 'new-york' ? {width:1536,height:1024,focalX:.6} : panorama;
  const wide = width > height;
  const contain = Math.min(width/source.width,height/source.height);
  const cover = Math.max(width/source.width,height/source.height);
  // At most 12% of a narrow composition can be cropped in either direction.
  // Full-bleed landscape needs a separate, aligned day/night/sky asset set.
  const narrow = source.width/source.height < .85;
  const fillViewport=geometry?.fillViewport===true;
  const scale = phoneLandscape ? cover : Math.min(width,height)<600 || fillViewport ? cover : narrow ? Math.min(cover,contain/.88) : cover;
  const photoWidth = source.width*scale, photoHeight = source.height*scale;
  let left = (width-photoWidth)*(narrow && wide ? .96 : narrow ? .5 : wallpaper === 'mosque' ? .86 : .5);
  if((protectedSubject || fillViewport) && Number.isFinite(geometry.focalX) && geometry.focalX>=0 && geometry.focalX<=1) left=clamp(width*.5-photoWidth*geometry.focalX,width-photoWidth,0);
  if(wallpaper === 'new-york' && !geometry) left=clamp(width*.5-photoWidth*.6,width-photoWidth,0);
  let top = (height-photoHeight)*.5;
  if(fillViewport && Number.isFinite(geometry.focalY) && geometry.focalY>=0 && geometry.focalY<=1) top=clamp(height*.5-photoHeight*geometry.focalY,height-photoHeight,0);
  if (wallpaper === 'mosque') {
    // Keep the minarets and main dome (right-hand third) in portrait as well.
    const min = -photoWidth*.65, max = width-photoWidth*.95;
    if (min <= max) left = clamp(left,min,max);
  }
  // Landscape phones display the whole photograph instead of enlarging a portrait crop.
  if(phoneLandscape){left=(width-photoWidth)*.5;top=(height-photoHeight)*.5;}
  return {width:photoWidth,height:photoHeight,left,top,scale,
    mode:phoneLandscape?'phone-landscape':Math.min(width,height)<600?'phone-artwork':wide?'tablet-wide':'tablet-portrait',
    needsLandscape:wide && narrow && !fillViewport};
}

const layouts = new WeakMap();
const properties = ['left','top','width','height'];
export function applyWallpaperLayout(scene,weather,options) {
  const layout = wallpaperLayout(options);
  const key = JSON.stringify(layout);
  if (layouts.get(scene) === key) return layout;
  layouts.set(scene,key);
  if (layout) {
    for (const target of [scene,weather]) {
      target.dataset.sceneLayout = layout.mode;
      for (const property of properties)
        target.style.setProperty('--scene-photo-'+property,layout[property]+'px');
    }
    scene.dataset.needsLandscape = String(layout.needsLandscape);
  } else if (scene.dataset.sceneLayout) {
    for (const target of [scene,weather]) {
      delete target.dataset.sceneLayout;
      for (const property of properties) target.style.removeProperty('--scene-photo-'+property);
    }
    delete scene.dataset.needsLandscape;
  }
  return layout;
}
