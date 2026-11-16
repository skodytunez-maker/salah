import{t}from './i18n.js';
import{uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute}from './ui.js';
import{actionIcon,actionLabel}from './action-icons.js';
import{wallpapers,skyObjects,previewClock,skyProjectionFrame,projectSkyObjects,moonAppearance,moonPhasePath}from './wallpapers.js';
import{loadDecodedImage,watchDecodedImages}from './image-presentation.js';
import{loadLandmark}from './landmarks.js';
import{applyWallpaperLayout}from './wallpaper-layout.js';
import{settings}from './storage.js';
import{sceneAt,previewScene,sceneForMode}from './day-night.js';
import{weatherFrame}from './weather-data.js';
export{loadWeather,cachedWeather,weatherName,weatherFrame,weatherKey,WEATHER_REFRESH_INTERVAL}from './weather-data.js';

let skyAnimation=null,lastSkySample=null,lastSkyStamp=null;
let previewStarted=null,previewOverride=null,lastContext=null,weatherPreview=null;
let landmarkKey=null,landmarkRequest=null,landmarkUrls=[],landmarkState='idle',landmarkEntry=null,landmarkGeometry=null;
// Retain decoded sources while their exact URLs are used by the CSS layers.
let builtinKey=null,builtinRequest=null,builtinState='idle',builtinImages=[];
function pendingScene(scene,value){for(const data of [scene.dataset,document.body.dataset]){const key=data===scene.dataset?'imagePending':'sceneImagePending';if(value){if(data[key]!=='true')data[key]='true';}else if(data[key])delete data[key];}}
function clearBuiltinStyles(scene){for(const name of ['.scene-night','.scene-day']){const node=scene.querySelector(name);if(node)node.style.backgroundImage='';}const sky=scene.querySelector('.scene-sky'),effect=document.getElementById('weather-layer');for(const node of [sky,effect])if(node){node.style.maskImage='';node.style.webkitMaskImage='';}}
function prepareBuiltin(scene,home,tablet){
 const kind=settings.wallpaper,key=kind+':'+tablet;if(key!==builtinKey){builtinRequest?.abort();builtinRequest=null;builtinKey=key;builtinState='idle';}
 scene.dataset.wallpaper=kind;document.body.dataset.wallpaper=kind;pendingScene(scene,builtinState!=='ready');
 if(!home||builtinState!=='idle')return;const controller=new AbortController();builtinRequest=controller;builtinState='loading';
 const source=wallpapers.find(item=>item.id===kind)||wallpapers[0],groups=kind==='new-york'&&tablet?[
  ['./assets/window-new-york-night-tablet-v1.webp',source.night],['./assets/window-new-york-day-tablet-v1.webp',source.day],['./assets/window-sky-mask-tablet-v1.svg','./assets/window-sky-mask.svg'],['./assets/window-weather-mask-tablet-v1.svg','./assets/window-weather-mask.svg']
 ]:[[source.night],[source.day],...(kind==='new-york'?[['./assets/window-sky-mask.svg'],['./assets/window-weather-mask.svg']]:[])];
 const load=async choices=>{for(const url of choices)try{return{url,image:await loadDecodedImage(url,{signal:controller.signal})};}catch(error){if(controller.signal.aborted)throw error;}throw Error('Wallpaper unavailable');};
 void Promise.all(groups.map(load)).then(images=>{
  if(controller.signal.aborted||builtinRequest!==controller||settings.wallpaper!==kind||!scene.isConnected)return;
  builtinImages=images;const night=scene.querySelector('.scene-night'),day=scene.querySelector('.scene-day'),sky=scene.querySelector('.scene-sky'),effect=document.getElementById('weather-layer');
  if(night)night.style.backgroundImage='url("'+images[0].url+'")';if(day)day.style.backgroundImage='url("'+images[1].url+'")';
  for(const [node,image]of [[sky,images[2]],[effect,images[3]]])if(node){const mask=image?'url("'+image.url+'")':'';node.style.maskImage=mask;node.style.webkitMaskImage=mask;}
  builtinRequest=null;builtinState='ready';pendingScene(scene,false);layoutScene(scene);
 }).catch(()=>{if(!controller.signal.aborted&&builtinRequest===controller){controller.abort();builtinRequest=null;builtinState='error';}});
}
function wallpaperCaption(scene){
 let caption=scene.querySelector('.wallpaper-caption');
 if(!caption){caption=document.createElement('span');caption.className='wallpaper-caption';scene.append(caption)}
 const name=scene.dataset.wallpaper==='landmark'&&landmarkEntry?landmarkEntry.name:scene.dataset.wallpaper==='new-york'?t('landmarkUi.newYork'):'';
 if(scene.dataset.wallpaper==='new-york')caption.setAttribute('data-i18n','landmarkUi.newYork');else caption.removeAttribute('data-i18n');if(caption.textContent!==name)caption.textContent=name;
 if(caption.hidden!==!name)caption.hidden=!name;
}
let skyProjectionContext=null,skyProjectionKey=null;
function layoutScene(scene,effect=document.getElementById('weather-layer'),reproject=true){
 wallpaperCaption(scene);
 const layout=applyWallpaperLayout(scene,effect,{width:document.documentElement?.clientWidth,height:window.innerHeight,wallpaper:scene.dataset.wallpaper,geometry:scene.dataset.wallpaper==='landmark'?landmarkGeometry:null});
 if(layout){if(document.body.dataset.sceneLayout!==layout.mode)document.body.dataset.sceneLayout=layout.mode;}else if(document.body.dataset.sceneLayout)delete document.body.dataset.sceneLayout;
 skyProjectionContext={width:document.documentElement?.clientWidth||window.innerWidth,height:window.innerHeight,wallpaper:scene.dataset.wallpaper,landmark:landmarkEntry?.id||settings.landmarkCity,geometry:landmarkGeometry,layout};
 const plane=skyProjectionFrame(skyProjectionContext),key=JSON.stringify([skyProjectionContext,plane]);
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
function clearLandmark(scene){stopLandmarkRequest();releaseLandmarkUrls(landmarkUrls);landmarkUrls=[];neutralLandmark(scene)}
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
   landmarkUrls=urls;landmarkEntry=result.entry;landmarkGeometry={width:images[0].naturalWidth,height:images[0].naturalHeight,fitSubject:result.entry.fitSubject===true,focalX:result.entry.focalX,focalY:result.entry.focalY,fillViewport:result.entry.fillViewport===true};landmarkRequest=null;landmarkState='ready';
   scene.dataset.wallpaper='landmark';scene.dataset.landmarkCity=result.entry.id;document.body.dataset.wallpaper='landmark';
   pendingScene(scene,false);
   layoutScene(scene);releaseLandmarkUrls(previous);landmarkNote();
  }
  catch(error){releaseLandmarkUrls(urls);if(!controller.signal.aborted){if(error.assetKey)void loadLandmark.invalidate?.(result.entry,error.assetKey);landmarkRequest=null;landmarkState='offline';keepLandmarkSurface(scene);landmarkNote()}}
 }).catch(()=>{if(!controller.signal.aborted){landmarkRequest=null;landmarkState='offline';keepLandmarkSurface(scene);landmarkNote()}});
}
window.addEventListener('online',()=>{if(landmarkState==='offline')landmarkState='idle';if(builtinState==='error')builtinState='idle';inactiveContext=null});
export function startScenePreview(){stopWeatherPreview();previewStarted=performance.now();previewOverride=null}
function stopScenePreview(){if(skyAnimation!==null)cancelAnimationFrame(skyAnimation);skyAnimation=null;previewStarted=null;previewOverride=null;document.getElementById('scene-preview-controls')?.remove();document.body.classList.remove('scene-preview')}
function sceneLayer(){
 let scene=document.getElementById('home-scene');
 if(!scene){scene=document.createElement('div');scene.id='home-scene';scene.dataset.imagePending='true';scene.setAttribute('aria-hidden','true');scene.innerHTML='<div class="scene-night"></div><div class="scene-day"></div><div class="scene-dawn"></div><div class="scene-dusk"></div><div class="scene-sky"><div class="scene-sky-plane"><div class="scene-sky-light"></div><span class="scene-sun"></span><span class="scene-moon"><svg class="scene-moon-defs" aria-hidden="true"><defs><clipPath id="home-scene-moon-phase" clipPathUnits="objectBoundingBox"><path data-moon-phase d="M0 0Z"/></clipPath></defs></svg><span class="scene-moon-phase"><img data-image-pending src="./assets/home-moon-disc.jpg" alt="" width="160" height="160"></span></span></div></div><div class="scene-shade"></div>';document.getElementById('weather-layer').before(scene);watchDecodedImages(scene,{fallback:null});}
 return scene;
}

const weatherPreviews={clear:{kind:'clear',clouds:0,precipitation:0,fresh:true},clouds:{kind:'overcast',clouds:1,precipitation:0,fresh:true},rain:{kind:'rain',clouds:.9,precipitation:.7,fresh:true},snow:{kind:'snow',clouds:.85,precipitation:.65,fresh:true}};
export function startWeatherPreview(){stopScenePreview();weatherPreview='rain'}
function stopWeatherPreview(){weatherPreview=null;document.getElementById('weather-preview-controls')?.remove()}
function weatherLayer(effect){
 if(effect.dataset.ready)return;
 const particles=(count,cls)=>'<div class="'+cls+'">'+Array.from({length:count},(_,i)=>'<span style="--x:'+((i*37+11)%101)+'%;--delay:-'+((i*13)%31)+'s;--speed:'+(cls==='weather-rain'?(.7+(i%5)*.13):(9+(i%7)*1.5))+'s;--size:'+(1.5+(i%3)*.8)+'px"></span>').join('')+'</div>';
 effect.innerHTML='<div class="weather-overcast"></div><div class="weather-clouds"><div class="weather-cloud-dark"></div><div class="weather-cloud-light"></div></div><div class="weather-mist"></div>'+particles(38,'weather-rain')+particles(36,'weather-snow');
 effect.dataset.ready='true';
}
let weatherTail={rain:0,snow:0},previousWet='none';
function paintWeather(effect,now,weather,frame,home,scene){
 if(!home&&weatherPreview!==null)stopWeatherPreview();
 weatherLayer(effect);
 const view=weatherPreview!==null?weatherPreviews[weatherPreview]:weatherFrame(settings.weather?weather:null,now);
 const active=home&&view.fresh;
 const reduced=settings.motion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const moving=active&&settings.weatherAnimation&&!reduced&&!document.hidden;
 const clouds=active?view.clouds:0;
 // Dense cloud hides celestial discs and removes warm, direct sunlight.
 scene.style.setProperty('--scene-clouds',String(clouds));
 const fog=active&&view.kind==='fog',opaque=clouds>=.94;
 scene.style.setProperty('--scene-sky-visibility',String(fog||opaque?0:Math.max(0,1-clouds*clouds*1.08)));
 scene.style.setProperty('--scene-direct-light',String(fog||opaque?0:1-clouds*.92));
 scene.style.setProperty('--scene-mist',fog?'.78':'0');
 const wet=active&&moving?view.kind==='snow'?'snow':['rain','storm'].includes(view.kind)?'rain':'none':'none';
 if(wet!==previousWet){if(previousWet!=='none'&&moving)weatherTail[previousWet]=now+2500;previousWet=wet}
 effect.dataset.rain=moving&&(wet==='rain'||weatherTail.rain>now)?'on':'off';
 effect.dataset.snow=moving&&(wet==='snow'||weatherTail.snow>now)?'on':'off';
 effect.className='';effect.dataset.kind=active?view.kind:'none';effect.dataset.source=active?(weatherPreview!==null?'preview':'live'):'none';effect.dataset.motion=moving?'on':'off';effect.dataset.clouds=active&&view.clouds>0?'on':'off';
 effect.style.setProperty('--weather-clouds',active?String(view.clouds):'0');
 effect.style.setProperty('--weather-day',String(frame.day));
 effect.style.setProperty('--weather-dark',String(1-frame.day));
 effect.style.setProperty('--weather-rain',active&&['rain','storm'].includes(view.kind)?String(view.precipitation):'0');
 effect.style.setProperty('--weather-snow',active&&view.kind==='snow'?String(view.precipitation):'0');
 effect.style.setProperty('--weather-mist',active?(fog?'.86':view.kind==='overcast'?'.12':'0'):'0');
 effect.style.setProperty('--weather-fog-color',[35+Math.round(frame.day*139),48+Math.round(frame.day*133),65+Math.round(frame.day*123)].join(','));
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
 const mix=(a,b,t)=>a.map((value,i)=>Math.round(value+(b[i]-value)*t)),warm=Math.max(frame.dawn,frame.dusk);
 const colors={zenith:mix([3,10,25],[47,105,156],frame.day),middle:mix([9,23,43],[105,154,186],frame.day),horizon:mix([20,34,53],[193,206,214],frame.day)};
 colors.horizon=mix(colors.horizon,frame.dawn>frame.dusk?[249,190,142]:[239,153,117],warm*.82);
 for(const[name,color]of Object.entries(colors))scene.style.setProperty('--sky-'+name,color.join(','));
 scene.style.setProperty('--sky-warm',String(warm));
}
function paintSky(scene,sky,now){
 lastSkySample=sky;lastSkyStamp=now;
 sky=projectSkyObjects(sky,skyProjectionContext||{wallpaper:settings.wallpaper});
 if(scene.dataset.wallpaper==='landmark'&&!landmarkEntry)sky={...sky,sun:0,moon:0};
 const context=[skyProjectionKey,settings.wallpaper,settings.landmarkCity,settings.backgroundMode,settings.city?.latitude,settings.city?.longitude,previewOverride,previewStarted].join(':');
 const reset=previousSkyContext!==context||previousSkyTime===null||Math.abs(now-previousSkyTime)>5000||previousSky&&['sunX','moonX'].some(key=>Math.abs(sky[key]-previousSky[key])>15);
 scene.classList.toggle('sky-reset',reset);previousSkyContext=context;previousSkyTime=now;previousSky=sky;
 for(const key of ['sunX','sunY','sun','moonX','moonY','moon'])scene.style.setProperty('--sky-'+key,String(sky[key]));
 scene.style.setProperty('--sky-horizonY',String(sky.horizonY||58));
}
function smoothPreview(){
 if(skyAnimation!==null||previewStarted===null||previewOverride!==null||settings.motion||!settings.transitions||window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return;
 const draw=()=>{skyAnimation=null;if(previewStarted===null||previewOverride!==null||!document.body.classList.contains('home-page')||document.hidden||settings.motion||!settings.transitions||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const elapsed=performance.now()-previewStarted;if(elapsed>=22000){stopScenePreview();return;}
 const scene=sceneLayer(),instant=previewClock(Date.now(),lastContext?.times,Math.min(elapsed,19999),settings.city),frame=sceneForMode(instant,lastContext?.times,'auto',settings.city),sky=skyObjects(Date.now(),lastContext?.times,'auto',Math.min(elapsed,19999),settings.city);
 paintSky(scene,sky,performance.now());paintMoon(scene,instant);paintSceneLight(scene,frame);for(const key of ['day','dawn','dusk'])scene.style.setProperty('--scene-'+key,frame[key].toFixed(4));scene.dataset.phase=frame.phase;skyAnimation=requestAnimationFrame(draw);};skyAnimation=requestAnimationFrame(draw);
}
export function atmosphere(now,times,weather){
 lastContext={times,weather};
 const layer=document.getElementById('atmosphere'),effect=document.getElementById('weather-layer'),home=document.body.classList.contains('home-page');
 document.body.classList.toggle('reduce-motion',settings.motion);
 document.body.classList.toggle('no-transitions',!settings.transitions);
 if(document.hidden){if(skyAnimation!==null)cancelAnimationFrame(skyAnimation);skyAnimation=null;effect.dataset.motion='off';return;}
 const staticContext=[home,settings.wallpaper,settings.landmarkCity,settings.backgroundMode,settings.motion,settings.transitions,settings.city?.latitude,settings.city?.longitude,Math.floor(now/60000)].join(':');
 if(!home&&previewStarted===null&&weatherPreview===null&&inactiveContext===staticContext)return;
 inactiveContext=home?null:staticContext;
 if(previewStarted!==null&&(!home||(previewOverride===null&&performance.now()-previewStarted>=22000)))stopScenePreview();
 const preview=previewStarted!==null,previewElapsed=preview?(previewOverride==='day'?10000:previewOverride==='night'?0:Math.min(performance.now()-previewStarted,19999)):null,instant=preview?previewClock(now,times,previewElapsed,settings.city):now;
 const frame=preview?(previewOverride==='day'?{day:1,dawn:0,dusk:0,phase:'day'}:previewOverride==='night'?sceneAt(NaN,null):settings.city?sceneForMode(instant,times,'auto',settings.city):previewScene(performance.now()-previewStarted)):sceneForMode(now,times,settings.backgroundMode,settings.city),scene=sceneLayer();
 document.body.classList.toggle('scene-preview',preview);
 scene.dataset.phase=frame.phase;prepareLandmark(scene,home);layoutScene(scene,effect,false);
 const skyMode=preview?(previewOverride==='day'?'light':previewOverride==='night'?'dark':'auto'):settings.backgroundMode;
 const sky=skyObjects(now,times,skyMode,previewElapsed,settings.city);
 paintSky(scene,sky,previewStarted!==null?performance.now():now);
 paintMoon(scene,instant);paintSceneLight(scene,frame);
 for(const key of ['day','dawn','dusk'])scene.style.setProperty('--scene-'+key,frame[key].toFixed(4));
 if(preview&&!document.getElementById('scene-preview-controls')){const controls=document.createElement('div');controls.id='scene-preview-controls';controls.className='scene-preview-controls';controls.setAttribute('role','group');setUiAttribute(controls,'aria-label','weatherUi.backgroundPreview');controls.innerHTML='<span>'+uiLeaf('weatherUi.background')+'</span><button type="button" data-scene-preview="day" '+uiAttribute('weatherUi.dayPreview')+'>☼</button><button type="button" data-scene-preview="night" '+uiAttribute('weatherUi.nightPreview')+'>☾</button><button type="button" data-scene-preview="auto" '+uiAttribute('weatherUi.transitionPreview')+'>'+actionIcon('play')+'</button><button type="button" data-scene-preview="close" '+uiAttribute('weatherUi.finishTransition')+'>×</button>';controls.querySelectorAll('button').forEach(button=>button.onclick=()=>{const choice=button.dataset.scenePreview;if(choice==='close')stopScenePreview();else{previewOverride=choice==='auto'?null:choice;if(choice==='auto')previewStarted=performance.now()}atmosphere(Date.now(),lastContext?.times,lastContext?.weather)});document.body.append(controls)}
 if(preview)for(const button of document.querySelectorAll('[data-scene-preview]'))button.setAttribute('aria-pressed',String(button.dataset.scenePreview===(previewOverride||'auto')));
 if(settings.backgroundMode!=='dark'){layer.style.filter='brightness('+(.76+frame.day*.55)+')';layer.style.background='radial-gradient(ellipse at 75% 25%,rgba(69,90,151,'+(.04+frame.day*.12)+'),transparent 60%),linear-gradient(160deg,#10182b,#060914 75%)'}else{layer.style.filter='';layer.style.background=''}
 paintWeather(effect,now,weather,frame,home,scene);smoothPreview();
}
