import{t}from './i18n.js';
import{uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute}from './ui.js';
import{actionIcon,actionLabel}from './action-icons.js';
import{wallpapers,skyObjects,previewClock,SCENE_PREVIEW_DURATION,SCENE_PREVIEW_STOPS,skyProjectionFrame,projectSkyObjects,moonAppearance,moonPhasePath}from './wallpapers.js';
import{loadDecodedImage,watchDecodedImages}from './image-presentation.js';
import{loadLandmark}from './landmarks.js';
import{applyWallpaperLayout}from './wallpaper-layout.js';
import{settings}from './storage.js';
import{sceneAt,previewScene,sceneForMode}from './day-night.js';
import{weatherFrame}from './weather-data.js';
import{createSkyAtmosphere}from './sky-atmosphere.js';
import{loadSkyMattes}from './sky-matte.js';
import{ADVANCED_SKY_AVAILABLE}from './sky-feature-policy.js';
import{ownerVerified}from './owner-auth.js';
import{getPosition,getMoonPosition}from './vendor/suncalc.js';
export{loadWeather,cachedWeather,weatherName,weatherFrame,weatherKey,WEATHER_REFRESH_INTERVAL}from './weather-data.js';

let skyAnimation=null,lastSkySample=null,lastSkyStamp=null;
let previewStarted=null,previewOverride=null,lastContext=null,weatherPreview=null,previewRequested=false,previewRequestedAt=null,previewAnchor=null,previewCityKey=null,previewOrigin='';
const previewActive=()=>previewRequested||previewStarted!==null;
const advancedSkyAvailable=()=>ADVANCED_SKY_AVAILABLE===true||(typeof ownerVerified==='function'&&ownerVerified());
let previousSkyAccess=advancedSkyAvailable();
const liveSkyActive=()=>advancedSkyAvailable()&&(settings.liveSky===true||previewActive()||weatherPreview!==null);
const cityKey=()=>JSON.stringify([settings.city||null,settings.wallpaper,settings.landmarkCity]);
const previewCityValid=()=>Number.isFinite(settings.city?.latitude)&&Math.abs(settings.city.latitude)<=90&&Number.isFinite(settings.city?.longitude)&&Math.abs(settings.city.longitude)<=180;
let landmarkKey=null,landmarkRequest=null,landmarkUrls=[],landmarkState='idle',landmarkEntry=null,landmarkGeometry=null,landmarkImages=[];
// Retain decoded sources while their exact URLs are used by the CSS layers.
let builtinKey=null,builtinRequest=null,builtinState='idle',builtinImages=[];
const cloudTextureUrl='./assets/home-clouds-509.webp';
let cloudTextureState='idle',cloudTextureRequest=null,cloudTextureImage=null;
let skySurface=null,skySurfaceRevision=0,skyRenderer=null,skyForeground=null,skyFrame={day:0,dawn:0,dusk:0,phase:'night'},skyInstant=null,skyProjected=null,skyAstronomy=null;
let skyWeather={clouds:0,fog:0},skyWeatherFrom={clouds:0,fog:0},skyWeatherTarget={clouds:0,fog:0},skyWeatherStarted=null,skyWeatherInitialized=false;
let skyMotionTime=0,skyMotionAt=null,lastSkyDrawAt=null,lastSkyDrawCost=0,lastSkyAnimationAt=null;
let skyPhotoPair=null,skyAttemptPair=null,skyRequest=null,skyGeneration=0,moonImageStop=null,skyPageHidden=false;
const createSkyCanvas=(width,height)=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;};
async function prepareSkySurface(dayURL,nightURL,dayImage,nightImage,signal){
 try{return await loadSkyMattes({dayURL,nightURL,dayImage,nightImage,signal,canvasFactory:createSkyCanvas,maxDimension:2400});}catch{return null;}
}
function releaseSkyForeground(){if(skyForeground){for(const canvas of [skyForeground.day,skyForeground.night]){canvas.width=0;canvas.height=0;}skyForeground=null;}}
function cancelSkyPreparation(){skyGeneration++;skyRequest?.abort();skyRequest=null;skyAttemptPair=null;}
const skySelectionKey=()=>settings.wallpaper==='landmark'?'landmark:'+landmarkKey:'builtin:'+builtinKey;
function releaseAdvancedSky(scene){
 cancelSkyPreparation();pauseSkyAnimation();cloudTextureRequest?.abort();cloudTextureRequest=null;cloudTextureState='idle';cloudTextureImage=null;
 skyRenderer?.dispose();skyRenderer=null;skySurface?.dispose?.();skySurface=null;skySurfaceRevision++;releaseSkyForeground();
 skyProjected=null;skyAstronomy=null;lastSkySample=null;lastSkyDrawAt=null;lastSkyDrawCost=0;skyWeatherStarted=null;skyWeatherInitialized=false;skyMotionTime=0;moonPaintKey=null;
 for(const canvas of scene.querySelectorAll?.('canvas')||[]){canvas.width=0;canvas.height=0;}
 scene.dataset.unifiedSky='off';scene.style.setProperty('--scene-photo-exposure','1');scene.style.removeProperty?.('--scene-celestial-visibility');
 const effect=document.getElementById('weather-layer');if(effect){effect.dataset.unifiedSky='off';effect.dataset.motion='off';effect.dataset.rain='off';effect.dataset.snow='off';}scene.dataset.weatherMotion='off';
}
function syncLiveSkyMode(scene){
 if(!scene)return;const active=liveSkyActive(),mode=active?'on':'off';
 if(scene.dataset.liveSky===mode)return;
 scene.dataset.liveSky=mode;document.body.dataset.liveSky=mode;
 const effect=document.getElementById('weather-layer');if(effect)effect.dataset.liveSky=mode;
 if(!active){
  releaseAdvancedSky(scene);moonImageStop?.();moonImageStop=null;
  const image=scene.querySelector('[data-moon-disc]');if(image?.tagName==='IMG'){image.removeAttribute('src');image.setAttribute('data-image-pending','');}
 }else{
  const image=scene.querySelector('[data-moon-disc]');if(image?.tagName==='IMG'){image.setAttribute('data-image-pending','');image.src='./assets/home-moon-disc.jpg';moonImageStop=watchDecodedImages(image.parentElement,{fallback:null});}
 }
}
function acceptSkyPhotoPair(scene,pair){
 cancelSkyPreparation();skyPhotoPair={...pair,selectionKey:skySelectionKey()};
 if(skySurface){skySurface.dispose?.();skySurface=null;skySurfaceRevision++;releaseSkyForeground();}
 scene.dataset.unifiedSky=liveSkyActive()?'fallback':'off';
}
function ensureSkySurface(scene){
 if(!liveSkyActive()||skyPageHidden||document.hidden||!document.body.classList.contains('home-page')||scene.dataset.imagePending==='true'||!skyPhotoPair||skyPhotoPair.selectionKey!==skySelectionKey()||skyAttemptPair===skyPhotoPair)return;
 const pair=skyPhotoPair,controller=new AbortController(),generation=skyGeneration;skyRequest=controller;skyAttemptPair=pair;
 void prepareSkySurface(pair.dayURL,pair.nightURL,pair.dayImage,pair.nightImage,controller.signal).then(surface=>{
  if(controller.signal.aborted||skyRequest!==controller||generation!==skyGeneration||pair!==skyPhotoPair||pair.selectionKey!==skySelectionKey()||!liveSkyActive()||skyPageHidden||document.hidden||!document.body.classList.contains('home-page')||scene.dataset.imagePending==='true'||!scene.isConnected){surface?.dispose?.();if(skyRequest===controller){skyRequest=null;skyAttemptPair=null;}return;}
  skyRequest=null;commitSkySurface(scene,surface);renderUnifiedSky(scene,true);smoothPreview();
 });
}
function commitSkySurface(scene,surface){
 const previous=skySurface;skySurface=surface?.valid?surface:null;skySurfaceRevision++;releaseSkyForeground();scene.dataset.unifiedSky='fallback';
 if(previous&&previous!==surface)previous.dispose?.();if(surface&&!surface.valid)surface.dispose?.();
 if(skySurface)prepareCloudTexture(scene,document.body.classList.contains('home-page'));
}
function prepareCloudTexture(scene,enabled){
 if(!liveSkyActive()||skyPageHidden||document.hidden||!enabled||cloudTextureState!=='idle')return;
 const controller=new AbortController();cloudTextureRequest=controller;cloudTextureState='loading';
 void loadDecodedImage(cloudTextureUrl,{signal:controller.signal}).then(image=>{
  if(controller.signal.aborted||cloudTextureRequest!==controller||!liveSkyActive())return;
  cloudTextureImage=image;cloudTextureRequest=null;cloudTextureState='ready';
  skyRenderer?.setTexture(image);
  if(scene.isConnected){renderUnifiedSky(scene,true);smoothPreview();}
 }).catch(()=>{if(!controller.signal.aborted&&cloudTextureRequest===controller){cloudTextureRequest=null;cloudTextureState='error';}});
}
function pendingScene(scene,value){for(const data of [scene.dataset,document.body.dataset]){const key=data===scene.dataset?'imagePending':'sceneImagePending';if(value){if(data[key]!=='true')data[key]='true';}else if(data[key])delete data[key];}}
function clearBuiltinStyles(scene){for(const name of ['.scene-night','.scene-day']){const node=scene.querySelector(name);if(node)node.style.backgroundImage='';}const sky=scene.querySelector('.scene-sky'),effect=document.getElementById('weather-layer');for(const node of [sky,effect])if(node){node.style.maskImage='';node.style.webkitMaskImage='';}}
function prepareBuiltin(scene,home,tablet){
 const kind=settings.wallpaper,key=kind+':'+tablet;if(key!==builtinKey){cancelSkyPreparation();builtinRequest?.abort();builtinRequest=null;builtinKey=key;builtinState='idle';}
 scene.dataset.wallpaper=kind;document.body.dataset.wallpaper=kind;pendingScene(scene,builtinState!=='ready');
 if(!home||builtinState!=='idle')return;const controller=new AbortController();builtinRequest=controller;builtinState='loading';
 const source=wallpapers.find(item=>item.id===kind)||wallpapers[0],groups=kind==='new-york'&&tablet?[
  ['./assets/window-new-york-night-tablet-v1.webp',source.night],['./assets/window-new-york-day-tablet-v1.webp',source.day],['./assets/window-sky-mask-tablet-v1.svg','./assets/window-sky-mask.svg'],['./assets/window-weather-mask-tablet-v1.svg','./assets/window-weather-mask.svg']
 ]:[[source.night],[source.day],...(kind==='new-york'?[['./assets/window-sky-mask.svg'],['./assets/window-weather-mask.svg']]:[])];
 const load=async choices=>{for(const url of choices)try{return{url,image:await loadDecodedImage(url,{signal:controller.signal})};}catch(error){if(controller.signal.aborted)throw error;}throw Error('Wallpaper unavailable');};
 void Promise.all(groups.map(load)).then(async images=>{
  if(controller.signal.aborted||builtinRequest!==controller||settings.wallpaper!==kind||!scene.isConnected)return;
  builtinImages=images;const night=scene.querySelector('.scene-night'),day=scene.querySelector('.scene-day'),sky=scene.querySelector('.scene-sky'),effect=document.getElementById('weather-layer');
  if(night)night.style.backgroundImage='url("'+images[0].url+'")';if(day)day.style.backgroundImage='url("'+images[1].url+'")';
  for(const [node,image]of [[sky,images[2]],[effect,images[3]]])if(node){const mask=image?'url("'+image.url+'")':'';node.style.maskImage=mask;node.style.webkitMaskImage=mask;}
  acceptSkyPhotoPair(scene,{dayURL:images[1].url,nightURL:images[0].url,dayImage:images[1].image,nightImage:images[0].image});builtinRequest=null;builtinState='ready';layoutScene(scene);pendingScene(scene,false);ensureSkySurface(scene);if(previewRequested)atmosphere(Date.now(),lastContext?.times,lastContext?.weather);else smoothPreview();
 }).catch(()=>{if(!controller.signal.aborted&&builtinRequest===controller){controller.abort();builtinRequest=null;builtinState='error';}});
}
function wallpaperCaption(scene){
 let caption=scene.querySelector('.wallpaper-caption');
 if(!caption){caption=document.createElement('span');caption.className='wallpaper-caption';scene.append(caption)}
 const name=scene.dataset.wallpaper==='landmark'&&landmarkEntry?landmarkEntry.name:scene.dataset.wallpaper==='new-york'?t('landmarkUi.newYork'):'';
 if(scene.dataset.wallpaper==='new-york')caption.setAttribute('data-i18n','landmarkUi.newYork');else caption.removeAttribute('data-i18n');if(caption.textContent!==name)caption.textContent=name;
 if(caption.hidden!==!name)caption.hidden=!name;
}
let skyProjectionContext=null,skyProjectionKey=null,skyProjectionPlane=null,lastSkyHorizon=58,lastCloudCover=0;
// Reproduce each photograph's own CSS crop. Night and day need not share an
// aspect ratio (notably the portrait-day / wide-night Tyumen pair).
function foregroundPhotoPlan(image,frame,phase='day'){
 const sw=Number(image?.naturalWidth||image?.width),sh=Number(image?.naturalHeight||image?.height),width=frame?.width,height=frame?.height;
 if(![sw,sh,width,height].every(value=>Number.isFinite(value)&&value>0))return null;
 const box=frame.layout||{left:0,top:0,width,height},extension=!frame.layout&&frame.wallpaper==='mosque'&&width<=600,stretch=frame.layout?.mode==='phone-landscape';
 const x=extension?.85:frame.wallpaper==='landmark'&&frame.landmark==='tyumen'&&phase==='night'?.75:.5,dy=frame.wallpaper==='landmark'&&frame.landmark==='khujand'?-2:0;
 const rect=fraction=>{const scale=extension?box.height*fraction/sh:Math.max(box.width/sw,box.height/sh),w=stretch?box.width:sw*scale,h=stretch?box.height:sh*scale;return{left:box.left+(box.width-w)*x,top:box.top+(box.height-h)*.5+dy,width:w,height:h};};
 return{box:{left:box.left,top:box.top,width:box.width,height:box.height},main:rect(1),extension:extension?rect(.9):null,sourceWidth:sw,sourceHeight:sh};
}
function foregroundRasterBounds(frame,plans,pixelRatio=1){
 const box=plans.find(Boolean)?.box;if(!box)return null;
 const left=Math.max(0,box.left),top=Math.max(0,box.top),width=Math.min(frame.width,box.left+box.width)-left,height=Math.min(frame.height,box.top+box.height)-top;
 if(!(width>0&&height>0))return null;
 // Sample the decoded photo at display density once. A source-density backing
 // would be filtered again when CSS enlarges this canvas on a Retina screen.
 const ratio=Math.min(Math.max(1,Number.isFinite(pixelRatio)?pixelRatio:1),3072/Math.max(width,height),Math.sqrt(3000000/(width*height)));
 const pixelsW=Math.max(1,Math.floor(width*ratio)),pixelsH=Math.max(1,Math.floor(height*ratio));
 return{left,top,width,height,pixelsW,pixelsH,scaleX:pixelsW/width,scaleY:pixelsH/height};
}
function foregroundPhase(image,plan,bounds,canvasFactory){
 const canvas=canvasFactory(bounds.pixelsW,bounds.pixelsH),c=canvas.getContext('2d');c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 const transform=ctx=>ctx.setTransform(bounds.scaleX,0,0,bounds.scaleY,-bounds.left*bounds.scaleX,-bounds.top*bounds.scaleY);
 transform(c);c.drawImage(image,plan.main.left,plan.main.top,plan.main.width,plan.main.height);
 if(plan.extension){
  // The original phone extension replaces its underlying sky too. Multiply
  // the two complete FG sources by complementary masks, then add them.
  const mask=(ctx,inverse)=>{const g=ctx.createLinearGradient(0,plan.box.top,0,plan.box.top+plan.box.height);for(const[at,alpha]of [[0,0],[.05,0],[.10,1],[.90,1],[.95,0],[1,0]])g.addColorStop(at,'rgba(0,0,0,'+(inverse?1-alpha:alpha)+')');ctx.globalCompositeOperation='destination-in';ctx.fillStyle=g;ctx.fillRect(bounds.left,bounds.top,bounds.width,bounds.height);ctx.globalCompositeOperation='source-over';};
  mask(c,true);const extra=canvasFactory(bounds.pixelsW,bounds.pixelsH),e=extra.getContext('2d');e.imageSmoothingEnabled=true;e.imageSmoothingQuality='high';transform(e);e.drawImage(image,plan.extension.left,plan.extension.top,plan.extension.width,plan.extension.height);mask(e,false);c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='lighter';c.drawImage(extra,0,0);c.globalCompositeOperation='source-over';extra.width=0;extra.height=0;
 }
 c.setTransform(1,0,0,1,0,0);return canvas;
}
function blendForeground(canvas,night,day,weight){
 const d=Math.max(0,Math.min(1,Number.isFinite(weight)?weight:0)),c=canvas.getContext('2d');c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.clearRect(0,0,canvas.width,canvas.height);c.globalCompositeOperation='lighter';
 if(d<1){c.globalAlpha=1-d;c.drawImage(night,0,0);}if(d>0){c.globalAlpha=d;c.drawImage(day,0,0);}c.globalAlpha=1;c.globalCompositeOperation='source-over';
}
function layoutScene(scene,effect=document.getElementById('weather-layer'),reproject=true){
 wallpaperCaption(scene);
 const layout=applyWallpaperLayout(scene,effect,{width:document.documentElement?.clientWidth,height:window.innerHeight,wallpaper:scene.dataset.wallpaper,geometry:scene.dataset.wallpaper==='landmark'?landmarkGeometry:null});
 if(layout){if(document.body.dataset.sceneLayout!==layout.mode)document.body.dataset.sceneLayout=layout.mode;}else if(document.body.dataset.sceneLayout)delete document.body.dataset.sceneLayout;
 skyProjectionContext={width:document.documentElement?.clientWidth||window.innerWidth,height:window.innerHeight,wallpaper:scene.dataset.wallpaper,landmark:landmarkEntry?.id||settings.landmarkCity,geometry:landmarkGeometry,layout};
 const plane=skyProjectionFrame(skyProjectionContext),key=JSON.stringify([skyProjectionContext,plane]);
 skyProjectionPlane=plane;
 if(plane&&key!==skyProjectionKey){skyProjectionKey=key;for(const[name,value]of Object.entries({left:plane.planeLeft,top:plane.planeTop,width:plane.width,height:plane.height}))scene.style.setProperty('--sky-plane-'+name,value+'px');if(reproject&&lastSkySample)paintSky(scene,lastSkySample,lastSkyStamp);}
}
let layoutResize=null;
window.addEventListener('resize',()=>{
 if(layoutResize!==null)return;
 layoutResize=requestAnimationFrame(()=>{layoutResize=null;const scene=document.getElementById('home-scene');if(scene){prepareLandmark(scene,document.body.classList.contains('home-page'));layoutScene(scene)}});
});
function landmarkNote(){const note=document.getElementById('landmark-status');if(!note)return;note.hidden=settings.wallpaper!=='landmark'||landmarkState==='ready'||landmarkState==='idle';setUiMessage(note,uiMessage(landmarkState==='loading'?'weatherUi.cityLoading':landmarkState==='unavailable'?'weatherUi.cityPreparing':'weatherUi.cityInternet'))}
function stopLandmarkRequest(){landmarkRequest?.abort();landmarkRequest=null}
function releaseLandmarkUrls(urls){for(const url of urls)URL.revokeObjectURL(url)}
function neutralLandmark(scene){landmarkEntry=null;landmarkGeometry=null;wallpaperCaption(scene);delete scene.dataset.landmarkCity;for(const key of ['day','night','mask'])scene.style.setProperty('--landmark-'+key,'none')}
function clearLandmark(scene){stopLandmarkRequest();releaseLandmarkUrls(landmarkUrls);landmarkUrls=[];landmarkImages=[];neutralLandmark(scene)}
function keepLandmarkSurface(scene){
 scene.dataset.wallpaper='landmark';document.body.dataset.wallpaper='landmark';
 if(!landmarkUrls.length)neutralLandmark(scene);
}
function prepareLandmark(scene,home){
 const selected=settings.wallpaper==='landmark';
 const viewportWidth=document.documentElement?.clientWidth||window.innerWidth||0,viewportHeight=window.innerHeight||0;
 const tablet=Math.min(viewportWidth,viewportHeight)>=600 || viewportWidth>viewportHeight;
 const key=selected?[settings.landmarkCity,settings.city?.latitude,settings.city?.longitude,tablet?'tablet':'phone'].join(':'):null;
 if(key!==landmarkKey){
  cancelSkyPreparation();
  stopLandmarkRequest();landmarkKey=key;landmarkState='idle';
  // While another landmark is loading, keep the currently decoded city visible.
  // Do not flash the bundled mosque wallpaper between two explicit city choices.
  if(!selected)clearLandmark(scene);
  else{builtinRequest?.abort();builtinRequest=null;builtinKey=null;builtinState='idle';builtinImages=[];clearBuiltinStyles(scene);pendingScene(scene,!landmarkUrls.length);}
 }
 if(selected)keepLandmarkSurface(scene);
 else prepareBuiltin(scene,home,Math.min(viewportWidth,viewportHeight)>=600);
 landmarkNote();if(key===null||!home||landmarkState!=='idle')return;
 const controller=new AbortController();landmarkRequest=controller;landmarkState='loading';landmarkNote();
 loadLandmark(settings.city,{signal:controller.signal,chosen:settings.landmarkCity,tablet}).then(async result=>{
  if(controller.signal.aborted)return;
  if(result.status!=='ready'){landmarkRequest=null;landmarkState=result.status;keepLandmarkSurface(scene);landmarkNote();return}
  const urls=result.blobs.map(blob=>URL.createObjectURL(blob));
  try{
   const images=await Promise.all(urls.map((url,i)=>loadDecodedImage(url,{signal:controller.signal}).catch(error=>{error.assetKey=['day','night','mask'][i];throw error;})));
   if(controller.signal.aborted){releaseLandmarkUrls(urls);return}
   const previous=landmarkUrls;
   // Swap only after both photographs are decoded, then release the old city.
   for(const [i,name]of ['day','night','mask'].entries())scene.style.setProperty('--landmark-'+name,'url("'+urls[i]+'")');
   landmarkUrls=urls;landmarkImages=images;landmarkEntry=result.entry;landmarkGeometry={width:images[0].naturalWidth,height:images[0].naturalHeight,fitSubject:result.entry.fitSubject===true,focalX:result.entry.focalX,focalY:result.entry.focalY,fillViewport:result.entry.fillViewport===true};landmarkRequest=null;landmarkState='ready';
   scene.dataset.wallpaper='landmark';scene.dataset.landmarkCity=result.entry.id;document.body.dataset.wallpaper='landmark';
   acceptSkyPhotoPair(scene,{dayURL:result.entry.day,nightURL:result.entry.night,dayImage:images[0],nightImage:images[1]});layoutScene(scene);pendingScene(scene,false);ensureSkySurface(scene);releaseLandmarkUrls(previous);landmarkNote();if(previewRequested)atmosphere(Date.now(),lastContext?.times,lastContext?.weather);else smoothPreview();
  }
  catch(error){releaseLandmarkUrls(urls);if(!controller.signal.aborted){if(error.assetKey)void loadLandmark.invalidate?.(result.entry,error.assetKey);landmarkRequest=null;landmarkState='offline';keepLandmarkSurface(scene);landmarkNote()}}
 }).catch(()=>{if(!controller.signal.aborted){landmarkRequest=null;landmarkState='offline';keepLandmarkSurface(scene);landmarkNote()}});
}
window.addEventListener('online',()=>{if(landmarkState==='offline')landmarkState='idle';if(builtinState==='error')builtinState='idle';if(cloudTextureState==='error')cloudTextureState='idle';inactiveContext=null});
function queueScenePreview(){pauseSkyAnimation();previewStarted=null;previewRequested=true;previewRequestedAt=performance.now();previewAnchor=null;previewCityKey=cityKey();previewOrigin=String(window.location?.hash||'');previewOverride=null;weatherTail={rain:0,snow:0};previousWet='none';}
export function startScenePreview(){stopWeatherPreview();queueScenePreview();return true;}
function stopScenePreview(){const active=previewActive();pauseSkyAnimation();previewStarted=null;previewRequested=false;previewRequestedAt=null;previewAnchor=null;previewCityKey=null;previewOverride=null;if(active){weatherTail={rain:0,snow:0};previousWet='none';moonPaintKey=null;}document.getElementById('scene-preview-controls')?.remove();document.body.classList.remove('scene-preview');syncLiveSkyMode(document.getElementById('home-scene'));}
function sceneLayer(){
 let scene=document.getElementById('home-scene');
 if(!scene){scene=document.createElement('div');scene.id='home-scene';scene.dataset.imagePending='true';scene.setAttribute('aria-hidden','true');scene.innerHTML='<div class="scene-night"></div><div class="scene-day"></div><div class="scene-dawn"></div><div class="scene-dusk"></div><div class="scene-sky"><div class="scene-sky-plane"><div class="scene-sky-fallback-cover"></div><canvas class="scene-atmosphere-sky" width="0" height="0"></canvas><span class="scene-sun"></span><span class="scene-moon"><svg class="scene-moon-defs" aria-hidden="true"><defs><clipPath id="home-scene-moon-phase" clipPathUnits="objectBoundingBox"><path data-moon-phase d="M0 0Z"/></clipPath></defs></svg><span class="scene-moon-phase"><img data-moon-disc alt="" width="160" height="160"></span></span><canvas class="scene-atmosphere-clouds" width="0" height="0"></canvas></div></div><canvas class="scene-foreground" width="0" height="0"></canvas><div class="scene-shade"></div>';document.getElementById('weather-layer').before(scene);watchDecodedImages(scene,{fallback:null});}
 return scene;
}

const weatherPreviews={clear:{kind:'clear',clouds:0,precipitation:0,fresh:true},clouds:{kind:'overcast',clouds:1,precipitation:0,fresh:true},rain:{kind:'rain',clouds:.9,precipitation:.7,fresh:true},snow:{kind:'snow',clouds:.85,precipitation:.65,fresh:true}};
export function startWeatherPreview(){stopScenePreview();weatherPreview='rain';return true;}
function stopWeatherPreview(){weatherPreview=null;document.getElementById('weather-preview-controls')?.remove();syncLiveSkyMode(document.getElementById('home-scene'));}
function weatherLayer(effect){
 if(effect.dataset.ready)return;
 const particles=(count,cls)=>'<div class="'+cls+'">'+Array.from({length:count},(_,i)=>'<span style="--x:'+((i*37+11)%101)+'%;--delay:-'+((i*13)%31)+'s;--speed:'+(cls==='weather-rain'?(.7+(i%5)*.13):(9+(i%7)*1.5))+'s;--size:'+(1.5+(i%3)*.8)+'px"></span>').join('')+'</div>';
 effect.innerHTML='<div class="weather-mist"></div>'+particles(38,'weather-rain')+particles(36,'weather-snow');
 effect.dataset.ready='true';
}
let weatherTail={rain:0,snow:0},previousWet='none';
function sampleSkyWeather(now=performance.now()){
 if(skyWeatherStarted===null)return skyWeather;
 const t=Math.max(0,Math.min(1,(now-skyWeatherStarted)/6000)),mix=t*t*(3-2*t);
 skyWeather={clouds:skyWeatherFrom.clouds+(skyWeatherTarget.clouds-skyWeatherFrom.clouds)*mix,fog:skyWeatherFrom.fog+(skyWeatherTarget.fog-skyWeatherFrom.fog)*mix};
 if(t===1){skyWeather={...skyWeatherTarget};skyWeatherStarted=null;}return skyWeather;
}
function setSkyWeather(target,immediate=false){
 const now=performance.now(),same=target.clouds===skyWeatherTarget.clouds&&target.fog===skyWeatherTarget.fog;
 if(immediate||!skyWeatherInitialized){const changed=!skyWeatherInitialized||skyWeather.clouds!==target.clouds||skyWeather.fog!==target.fog;skyWeather=skyWeatherFrom=skyWeatherTarget={...target};skyWeatherStarted=null;skyWeatherInitialized=true;return changed;}
 if(same){sampleSkyWeather(now);return false;}
 sampleSkyWeather(now);skyWeatherFrom={...skyWeather};skyWeatherTarget={...target};skyWeatherStarted=now;return false;
}
function readSkyAstronomy(instant){
 const city=settings.city,key=[Math.floor(instant/1000),city?.latitude,city?.longitude].join(':');if(skyAstronomy?.key===key)return skyAstronomy;
 try{if(!Number.isFinite(instant)||!Number.isFinite(city?.latitude)||!Number.isFinite(city?.longitude))return null;const date=new Date(instant),sun=getPosition(date,city.latitude,city.longitude),moon=getMoonPosition(date,city.latitude,city.longitude);if(!Number.isFinite(sun.altitude)||!Number.isFinite(moon.altitude))return null;return skyAstronomy={key,sun,moon};}catch{return null;}
}
function paintSunLight(scene,instant){
 const altitude=readSkyAstronomy(instant)?.sun.altitude??-30,x=Math.max(0,Math.min(1,(altitude+.5)/12.5)),t=x*x*(3-2*x),mix=(a,b)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',');
 scene.style.setProperty('--scene-sun-core',mix([255,215,160],[255,255,250]));scene.style.setProperty('--scene-sun-mid',mix([255,164,88],[255,248,225]));scene.style.setProperty('--scene-sun-edge',mix([231,111,61],[237,189,115]));
}
function foregroundCache(frame){
 const day=foregroundPhotoPlan(skySurface.dayFG,frame,'day'),night=foregroundPhotoPlan(skySurface.nightFG,frame,'night'),bounds=foregroundRasterBounds(frame,[day,night],window.devicePixelRatio||1);if(!day||!night||!bounds)return null;
 const key=JSON.stringify([skySurfaceRevision,day,night,bounds]);if(skyForeground?.key===key)return skyForeground;
 // The visible composite already owns its pixels. Release old offscreen
 // phases before allocating replacements, without changing that visible frame.
 releaseSkyForeground();let dayCanvas=null,nightCanvas=null;
 try{dayCanvas=foregroundPhase(skySurface.dayFG,day,bounds,createSkyCanvas);nightCanvas=foregroundPhase(skySurface.nightFG,night,bounds,createSkyCanvas);}catch(error){for(const canvas of [dayCanvas,nightCanvas])if(canvas){canvas.width=0;canvas.height=0;}throw error;}
 return skyForeground={key,bounds,dayPlan:day,nightPlan:night,day:dayCanvas,night:nightCanvas,mix:null};
}
function foregroundSkyBottom(cache){
 const mapped=(metrics,image,plan)=>{const h=metrics?.height||image.height,y=Number.isFinite(metrics?.horizonY)?metrics.horizonY:h;return Math.max(...[plan.main,plan.extension].filter(Boolean).map(rect=>rect.top+Math.max(0,Math.min(1,y/h))*rect.height));};
 return Math.max(mapped(skySurface.dayMetrics,skySurface.dayFG,cache.dayPlan),mapped(skySurface.nightMetrics,skySurface.nightFG,cache.nightPlan));
}
function renderForeground(scene,cache,weather){
 const canvas=scene.querySelector('.scene-foreground');if(!canvas)return false;const b=cache.bounds,day=Math.round(skyFrame.day*10000)/10000,key=[day,Math.round(weather.fog*10000),Math.round(skyFrame.day*1000)].join(':');
 for(const[k,v]of Object.entries({left:b.left,top:b.top,width:b.width,height:b.height}))canvas.style[k]=v+'px';
 if(canvas.width!==b.pixelsW||canvas.height!==b.pixelsH){canvas.width=b.pixelsW;canvas.height=b.pixelsH;cache.mix=null;}
 if(cache.mix===key)return true;blendForeground(canvas,cache.night,cache.day,day);
 if(weather.fog>0){const c=canvas.getContext('2d'),color=[22,29,41].map((v,i)=>Math.round(v+([165,174,183][i]-v)*skyFrame.day)).join(','),g=c.createLinearGradient(0,0,0,canvas.height);g.addColorStop(0,'rgba('+color+','+weather.fog*.60+')');g.addColorStop(.6,'rgba('+color+','+weather.fog*.38+')');g.addColorStop(1,'rgba('+color+','+weather.fog*.12+')');c.globalCompositeOperation='source-atop';c.fillStyle=g;c.fillRect(0,0,canvas.width,canvas.height);c.globalCompositeOperation='source-over';}
 cache.mix=key;return true;
}
function renderUnifiedSky(scene,force=false){
 if(!liveSkyActive()||skyPageHidden)return false;
 const now=performance.now();if(!force&&lastSkyDrawAt!==null&&now-lastSkyDrawAt<Math.max(1000/12,lastSkyDrawCost*3))return scene.dataset.unifiedSky==='ready';
 const fallback=()=>{scene.dataset.unifiedSky='fallback';scene.style.removeProperty?.('--scene-celestial-visibility');const effect=document.getElementById('weather-layer');if(effect)effect.dataset.unifiedSky='off';return false;};
 if(!document.body.classList.contains('home-page')||document.hidden)return scene.dataset.unifiedSky==='ready';
 if(scene.dataset.imagePending==='true'&&!force)return scene.dataset.unifiedSky==='ready';
 if(!skySurface?.valid||!cloudTextureImage||!skyProjectionPlane||!skyProjected||!Number.isFinite(skyInstant))return fallback();
 try{
  const frame=skyProjectionContext,cache=foregroundCache(frame),base=scene.querySelector('.scene-atmosphere-sky'),front=scene.querySelector('.scene-atmosphere-clouds'),plane=skyProjectionPlane;if(!cache||!base||!front)return fallback();
  const ratio=Math.min(1,1024/Math.max(plane.width,plane.height),Math.sqrt(1000000/(plane.width*plane.height))),width=Math.max(1,Math.floor(plane.width*ratio)),height=Math.max(1,Math.floor(plane.height*ratio)),weather=sampleSkyWeather(now);
  const moving=!settings.motion&&settings.weatherAnimation&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&weather.clouds>0;if(moving&&skyMotionAt!==null){const elapsed=(now-skyMotionAt)/1000;if(elapsed>=0&&elapsed<2)skyMotionTime+=elapsed;}skyMotionAt=moving?now:null;
  const astronomy=readSkyAstronomy(skyInstant),point=body=>({x:skyProjected[body+'X']/100*width,y:skyProjected[body+'Y']/100*height,altitude:astronomy?.[body]?.altitude??-30});
  skyRenderer??=createSkyAtmosphere({canvasFactory:createSkyCanvas,texture:cloudTextureImage});
  const result=skyRenderer.render({skyCanvas:base,cloudCanvas:front,width,height,horizonY:Math.max(1,Math.min(height,(foregroundSkyBottom(cache)-plane.top)/plane.height*height)),sun:point('sun'),moon:point('moon'),day:skyFrame.day,clouds:weather.clouds,fog:weather.fog,instant:skyInstant,latitude:settings.city?.latitude,longitude:settings.city?.longitude,motionTime:skyMotionTime});
  if(!result.sourceReady||!renderForeground(scene,cache,weather))return fallback();
  const gate=skyWeatherTarget.clouds>=.94||skyWeatherTarget.fog>=.78?0:result.skyVisibility;scene.style.setProperty('--scene-celestial-visibility',String(gate));scene.dataset.unifiedSky='ready';document.getElementById('weather-layer').dataset.unifiedSky='on';lastSkyDrawAt=now;lastSkyDrawCost=Math.max(0,performance.now()-now);return true;
 }catch{return fallback();}
}
function paintWeather(effect,now,weather,frame,home,scene){
 if(!home&&weatherPreview!==null)stopWeatherPreview();
 weatherLayer(effect);
 const scenePreview=previewActive(),view=scenePreview?weatherPreviews.clear:weatherPreview!==null?weatherPreviews[weatherPreview]:weatherFrame(settings.weather?weather:null,now);
 const active=home&&view.fresh;effect.dataset.weatherEnabled=active?'on':'off';
 const reduced=settings.motion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const moving=active&&settings.weatherAnimation&&!reduced&&!document.hidden;
 scene.dataset.weatherMotion=moving?'on':'off';
 const clouds=active?view.clouds:0;
 // Dense cloud hides celestial discs and removes warm, direct sunlight.
 scene.style.setProperty('--scene-clouds',String(clouds));
 const fog=active&&view.kind==='fog',opaque=clouds>=.94;
 // Leaving Home only pauses its renderer. Keep its weather snapshot and any
 // real transition so returning never replays a clear-to-cloudy introduction.
 lastCloudCover=clouds;const weatherReset=home&&setSkyWeather({clouds,fog:fog?1:0},scenePreview||!active||weatherPreview===null&&!settings.weather||reduced||!settings.transitions);
 prepareCloudTexture(scene,home&&!!skySurface?.valid&&scene.dataset.imagePending!=='true');
 scene.style.setProperty('--scene-sky-visibility',String(fog||opaque?0:Math.max(0,1-clouds*clouds*1.08)));
 scene.style.setProperty('--scene-direct-light',String(fog||opaque?0:1-clouds*.92));
 scene.style.setProperty('--scene-mist',fog?'.78':'0');
 if(scene.dataset.unifiedSky==='ready'&&(fog||opaque))scene.style.setProperty('--scene-celestial-visibility','0');
 const wet=active&&moving?view.kind==='snow'?'snow':['rain','storm'].includes(view.kind)?'rain':'none':'none';
 if(wet!==previousWet){if(previousWet!=='none'&&moving)weatherTail[previousWet]=now+2500;previousWet=wet}
 effect.dataset.rain=moving&&(wet==='rain'||weatherTail.rain>now)?'on':'off';
 effect.dataset.snow=moving&&(wet==='snow'||weatherTail.snow>now)?'on':'off';
 effect.className='';effect.dataset.kind=active?view.kind:'none';effect.dataset.source=active?(scenePreview||weatherPreview!==null?'preview':'live'):'none';effect.dataset.motion=moving?'on':'off';effect.dataset.clouds=active&&view.clouds>0?'on':'off';
 effect.style.setProperty('--weather-clouds',active?String(view.clouds):'0');
 effect.style.setProperty('--weather-day',String(frame.day));
 effect.style.setProperty('--weather-dark',String(1-frame.day));
 effect.style.setProperty('--weather-rain',active&&['rain','storm'].includes(view.kind)?String(view.precipitation):'0');
 effect.style.setProperty('--weather-snow',active&&view.kind==='snow'?String(view.precipitation):'0');
 effect.style.setProperty('--weather-mist',active?(fog?'.86':view.kind==='overcast'?'.12':'0'):'0');
 effect.style.setProperty('--weather-fog-color',[35+Math.round(frame.day*139),48+Math.round(frame.day*133),65+Math.round(frame.day*123)].join(','));
 renderUnifiedSky(scene,weatherReset);
 if(weatherPreview!==null&&!document.getElementById('weather-preview-controls')){
  const controls=document.createElement('div');controls.id='weather-preview-controls';controls.className='scene-preview-controls weather-preview-controls';controls.setAttribute('role','group');setUiAttribute(controls,'aria-label','weatherUi.previewLabel');
  controls.innerHTML='<span>'+uiLeaf('weatherUi.preview')+'</span>'+[['clear','weatherUi.clear','☼'],['clouds','weatherUi.cloudy','☁'],['rain','weatherUi.rain','☂'],['snow','weatherUi.snow','❄'],['close','weatherUi.finishPreview','×']].map(([value,label,icon])=>'<button type="button" data-weather-preview="'+value+'" '+uiAttribute(label)+'>'+icon+'</button>').join('');
  controls.querySelectorAll('button').forEach(button=>button.onclick=()=>{if(button.dataset.weatherPreview==='close')stopWeatherPreview();else weatherPreview=button.dataset.weatherPreview;atmosphere(Date.now(),lastContext?.times,lastContext?.weather)});document.body.append(controls);
 }
 for(const button of document.querySelectorAll('[data-weather-preview]'))button.setAttribute('aria-pressed',String(button.dataset.weatherPreview===weatherPreview));
}

let previousSkyTime=null,previousSkyContext=null,previousSky=null;
let inactiveContext=null;
let moonPaintKey=null;
function paintMoon(scene,instant){
 const key=[Math.floor(instant/60000),settings.city?.latitude,settings.city?.longitude].join(':');
 if(key===moonPaintKey)return;moonPaintKey=key;
 const appearance=moonAppearance(instant,settings.city),path=scene.querySelector('[data-moon-phase]');
 path?.setAttribute?.('d',moonPhasePath(appearance.fraction));
 scene.style.setProperty('--sky-moon-rotation',appearance.rotation+'deg');
 scene.style.setProperty('--sky-moon-texture-rotation',appearance.textureRotation+'deg');
 // Never turn the unlit new Moon into a luminous decorative full disc.
 scene.style.setProperty('--sky-moon-light',String(Math.min(1,Math.max(0,(appearance.fraction-.003)/.025))));
 scene.dataset.skyFacing=Number.isFinite(settings.city?.latitude)?settings.city.latitude<0?'north':'south':'unknown';
}
function paintSceneLight(scene,frame){
 skyFrame=frame;if(!liveSkyActive()){scene.style.setProperty('--scene-photo-exposure','1');return;}
 const mix=(a,b,t)=>a.map((value,i)=>Math.round(value+(b[i]-value)*t)),sum=frame.dawn+frame.dusk,warm=Math.max(0,Math.min(1,sum)),morning=sum>0?frame.dawn/sum:.5;
 const colors={zenith:mix([3,10,25],[47,105,156],frame.day),middle:mix([9,23,43],[105,154,186],frame.day),horizon:mix([20,34,53],[193,206,214],frame.day)};
 colors.horizon=mix(colors.horizon,mix([239,153,117],[249,190,142],morning),warm*.82);
 for(const[name,color]of Object.entries(colors))scene.style.setProperty('--sky-'+name,color.join(','));
 scene.style.setProperty('--sky-warm',String(warm));
 scene.style.setProperty('--scene-photo-exposure',String(!previewActive()&&settings.backgroundMode!=='auto'?1:.72+.28*frame.day));
 skyFrame=frame;paintSunLight(scene,skyInstant);
}
function paintSky(scene,sky,now,render=true){
 if(!liveSkyActive())return;
 lastSkySample=sky;lastSkyStamp=now;
 sky=projectSkyObjects(sky,skyProjectionContext||{wallpaper:settings.wallpaper});
 const projectedSky=sky;
 if(scene.dataset.wallpaper==='landmark'&&!landmarkEntry)sky={...sky,sun:0,moon:0};
 skyProjected=sky;
 const context=[skyProjectionKey,settings.wallpaper,settings.landmarkCity,settings.backgroundMode,settings.city?.latitude,settings.city?.longitude,previewOverride,previewStarted].join(':');
 const reset=previousSkyContext!==context||previousSkyTime===null||Math.abs(now-previousSkyTime)>5000||previousSky&&['sunX','moonX'].some(key=>Math.abs(projectedSky[key]-previousSky[key])>15);
 scene.classList.toggle('sky-reset',reset);previousSkyContext=context;previousSkyTime=now;previousSky=projectedSky;
 for(const key of ['sunX','sunY','sun','moonX','moonY','moon'])scene.style.setProperty('--sky-'+key,String(sky[key]));
 lastSkyHorizon=sky.horizonY||58;scene.style.setProperty('--sky-horizonY',String(lastSkyHorizon));
 if(render)renderUnifiedSky(scene,true);
}
function skyNeedsAnimation(){
 if(!liveSkyActive()||skyPageHidden||document.hidden||!document.body.classList.contains('home-page')||settings.motion||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
 const preview=previewStarted!==null&&previewOverride===null&&settings.transitions,scene=document.getElementById('home-scene');
 if(scene?.dataset.imagePending==='true')return false;
 return preview||scene?.dataset.unifiedSky==='ready'&&(skyWeatherStarted!==null||settings.weatherAnimation&&skyWeather.clouds>0);
}
function pauseSkyAnimation(){if(skyAnimation!==null)cancelAnimationFrame(skyAnimation);skyAnimation=null;skyMotionAt=null;lastSkyAnimationAt=null;}
function smoothPreview(){
 if(!skyNeedsAnimation()){pauseSkyAnimation();return;}if(skyAnimation!==null)return;
 const draw=()=>{skyAnimation=null;if(!skyNeedsAnimation()){skyMotionAt=null;return;}const now=performance.now();
  if(previewStarted!==null&&previewOverride===null){if(cityKey()!==previewCityKey){stopScenePreview();atmosphere(Date.now(),lastContext?.times,lastContext?.weather);return;}if(now-previewStarted>=SCENE_PREVIEW_DURATION){stopScenePreview();atmosphere(Date.now(),lastContext?.times,lastContext?.weather);return;}}
  if(lastSkyAnimationAt===null||now-lastSkyAnimationAt>=1000/12){const scene=sceneLayer();
   if(previewStarted!==null&&previewOverride===null){const elapsed=now-previewStarted,instant=previewClock(previewAnchor,lastContext?.times,elapsed,settings.city),frame=previewCityValid()?sceneForMode(instant,lastContext?.times,'auto',settings.city):previewScene(elapsed/SCENE_PREVIEW_DURATION*20000),sky=skyObjects(instant,lastContext?.times,'auto',null,settings.city);skyInstant=instant;paintSky(scene,sky,now,false);paintMoon(scene,instant);paintSceneLight(scene,frame);for(const key of ['day','dawn','dusk'])scene.style.setProperty('--scene-'+key,frame[key].toFixed(4));scene.dataset.phase=frame.phase;}
   renderUnifiedSky(scene);lastSkyAnimationAt=now;
  }
  if(skyNeedsAnimation())skyAnimation=requestAnimationFrame(draw);else skyMotionAt=null;
 };skyAnimation=requestAnimationFrame(draw);
}
function pauseHiddenSky(){pauseSkyAnimation();if(previewActive())stopScenePreview();if(weatherPreview!==null)stopWeatherPreview();if(skyRequest)cancelSkyPreparation();if(cloudTextureState==='loading'){cloudTextureRequest?.abort();cloudTextureRequest=null;cloudTextureState='idle';}}
window.addEventListener('pagehide',()=>{skyPageHidden=true;pauseHiddenSky();});
window.addEventListener('pageshow',()=>{skyPageHidden=false;});
document.addEventListener?.('visibilitychange',()=>{if(document.hidden)pauseHiddenSky();});
export function atmosphere(now,times,weather){
 lastContext={times,weather};
 const layer=document.getElementById('atmosphere'),effect=document.getElementById('weather-layer'),home=document.body.classList.contains('home-page');
 document.body.classList.toggle('reduce-motion',settings.motion);
 document.body.classList.toggle('no-transitions',!settings.transitions);
  if(previewActive()&&(cityKey()!==previewCityKey||skyPageHidden||document.hidden||!home&&(previewStarted!==null||String(window.location?.hash||'')!==previewOrigin&&!/^#?home(?:$|\?)/.test(String(window.location?.hash||'')))))stopScenePreview();
  if(weatherPreview!==null&&(skyPageHidden||document.hidden||!home))stopWeatherPreview();
  const access=advancedSkyAvailable();if(previousSkyAccess&&!access){stopScenePreview();stopWeatherPreview();}previousSkyAccess=access;
  const existingScene=document.getElementById('home-scene');syncLiveSkyMode(existingScene);
  if(skyPageHidden||document.hidden){pauseSkyAnimation();if(skyRequest)cancelSkyPreparation();if(cloudTextureState==='loading'){cloudTextureRequest?.abort();cloudTextureRequest=null;cloudTextureState='idle';}effect.dataset.motion='off';if(existingScene)existingScene.dataset.weatherMotion='off';return;}
 const staticContext=[home,settings.wallpaper,settings.landmarkCity,settings.backgroundMode,settings.liveSky,settings.motion,settings.transitions,settings.city?.latitude,settings.city?.longitude,Math.floor(now/60000)].join(':');
  if(!home&&!previewActive()&&weatherPreview===null&&inactiveContext===staticContext)return;
 inactiveContext=home?null:staticContext;
  const scene=sceneLayer();syncLiveSkyMode(scene);prepareLandmark(scene,home);layoutScene(scene,effect,false);if((!home||scene.dataset.imagePending==='true')&&skyRequest)cancelSkyPreparation();ensureSkySurface(scene);
  if(previewRequested&&performance.now()-previewRequestedAt>=20000)stopScenePreview();
  if(previewRequested&&home&&scene.dataset.imagePending!=='true'&&(settings.wallpaper==='landmark'?landmarkState==='ready':builtinState==='ready')){previewRequested=false;previewStarted=performance.now();previewAnchor=now;}
  if(previewStarted!==null&&performance.now()-previewStarted>=SCENE_PREVIEW_DURATION)stopScenePreview();
  const preview=previewActive(),previewElapsed=previewStarted===null?null:previewOverride==='day'?SCENE_PREVIEW_STOPS[3]:previewOverride==='night'?SCENE_PREVIEW_DURATION-2000:Math.min(performance.now()-previewStarted,SCENE_PREVIEW_DURATION),instant=previewElapsed===null?now:previewClock(previewAnchor,times,previewElapsed,settings.city);
  const frame=previewElapsed===null?sceneForMode(now,times,settings.backgroundMode,settings.city):previewCityValid()?sceneForMode(instant,times,'auto',settings.city):previewOverride==='day'?{day:1,dawn:0,dusk:0,phase:'day'}:previewOverride==='night'?sceneAt(NaN,null):previewScene(previewElapsed/SCENE_PREVIEW_DURATION*20000);
 document.body.classList.toggle('scene-preview',preview);
  scene.dataset.phase=frame.phase;
 const skyMode=preview?(previewOverride==='day'?'light':previewOverride==='night'?'dark':'auto'):settings.backgroundMode;
 skyInstant=instant;if(liveSkyActive()){const sky=skyObjects(instant,times,skyMode,null,settings.city);paintSky(scene,sky,previewStarted!==null?performance.now():now,false);paintMoon(scene,instant);}paintSceneLight(scene,frame);
 for(const key of ['day','dawn','dusk'])scene.style.setProperty('--scene-'+key,frame[key].toFixed(4));
  if(preview&&!document.getElementById('scene-preview-controls')){const controls=document.createElement('div');controls.id='scene-preview-controls';controls.className='scene-preview-controls';controls.setAttribute('role','group');setUiAttribute(controls,'aria-label','weatherUi.backgroundPreview');controls.innerHTML='<span>'+uiLeaf('weatherUi.background')+' · '+uiLeaf('weatherUi.clear')+'</span><button type="button" data-scene-preview="day" '+uiAttribute('weatherUi.dayPreview')+'>☼</button><button type="button" data-scene-preview="night" '+uiAttribute('weatherUi.nightPreview')+'>☾</button><button type="button" data-scene-preview="auto" '+uiAttribute('weatherUi.transitionPreview')+'>'+actionIcon('play')+'</button><button type="button" data-scene-preview="close" '+uiAttribute('weatherUi.finishTransition')+'>×</button>';controls.querySelectorAll('button').forEach(button=>button.onclick=()=>{const choice=button.dataset.scenePreview;if(choice==='close')stopScenePreview();else if(choice==='auto')queueScenePreview();else previewOverride=choice;atmosphere(Date.now(),lastContext?.times,lastContext?.weather)});document.body.append(controls)}
 if(preview)for(const button of document.querySelectorAll('[data-scene-preview]'))button.setAttribute('aria-pressed',String(button.dataset.scenePreview===(previewOverride||'auto')));
 if(settings.backgroundMode!=='dark'){layer.style.filter='brightness('+(.76+frame.day*.55)+')';layer.style.background='radial-gradient(ellipse at 75% 25%,rgba(69,90,151,'+(.04+frame.day*.12)+'),transparent 60%),linear-gradient(160deg,#10182b,#060914 75%)'}else{layer.style.filter='';layer.style.background=''}
 paintWeather(effect,now,weather,frame,home,scene);smoothPreview();
}
