import{skyObjects}from './wallpapers.js';
import{loadLandmark}from './landmarks.js';
import{settings}from './storage.js';
import{sceneAt,previewScene,sceneForMode}from './day-night.js';
import{weatherFrame}from './weather-data.js';
export{loadWeather,cachedWeather,weatherName,weatherFrame,weatherKey}from './weather-data.js';

let skyAnimation=null;
let previewStarted=null,previewOverride=null,lastContext=null,weatherPreview=null;
let landmarkKey=null,landmarkRequest=null,landmarkUrls=[],landmarkState='idle',landmarkEntry=null;
function landmarkNote(){const note=document.getElementById('landmark-status');if(!note)return;note.hidden=settings.wallpaper!=='landmark';note.textContent=landmarkState==='ready'?landmarkEntry.name+' · '+landmarkEntry.landmark:landmarkState==='loading'?'Загружаем фон города…':landmarkState==='unavailable'?'Фон для этого города ещё готовится.':landmarkState==='offline'?'Для первой загрузки фона нужен интернет.':'Фон подбирается по выбранному городу.'}
function clearLandmark(scene){landmarkRequest?.abort();landmarkRequest=null;for(const url of landmarkUrls)URL.revokeObjectURL(url);landmarkUrls=[];landmarkEntry=null;for(const key of ['day','night','mask'])scene.style.removeProperty('--landmark-'+key)}
function prepareLandmark(scene,home){
 const key=settings.wallpaper==='landmark'?[settings.city?.latitude,settings.city?.longitude].join(':'):null;
 if(key!==landmarkKey){clearLandmark(scene);landmarkKey=key;landmarkState='idle'}
 scene.dataset.wallpaper=settings.wallpaper==='landmark'&&landmarkState!=='ready'?'mosque':settings.wallpaper;document.body.dataset.wallpaper=scene.dataset.wallpaper;
 landmarkNote();if(key===null||!home||landmarkState!=='idle')return;
 const controller=new AbortController();landmarkRequest=controller;landmarkState='loading';landmarkNote();
 loadLandmark(settings.city,{signal:controller.signal}).then(async result=>{
  if(controller.signal.aborted)return;
  if(result.status!=='ready'){landmarkState=result.status;landmarkNote();return}
  const urls=result.blobs.map(blob=>URL.createObjectURL(blob));
  try{await Promise.all(urls.slice(0,2).map(url=>{const image=new Image();image.src=url;return image.decode()}));if(controller.signal.aborted){urls.forEach(url=>URL.revokeObjectURL(url));return}landmarkUrls=urls;landmarkEntry=result.entry;landmarkState='ready';for(const [i,key]of ['day','night','mask'].entries())scene.style.setProperty('--landmark-'+key,'url("'+urls[i]+'")');scene.dataset.wallpaper='landmark';document.body.dataset.wallpaper='landmark';landmarkNote()}
  catch{urls.forEach(url=>URL.revokeObjectURL(url));if(!controller.signal.aborted){landmarkState='offline';landmarkNote()}}
 }).catch(()=>{if(!controller.signal.aborted){landmarkState='offline';landmarkNote()}});
}
window.addEventListener('online',()=>{if(landmarkState==='offline'){landmarkState='idle';inactiveContext=null}});
export function startScenePreview(){stopWeatherPreview();previewStarted=performance.now();previewOverride=null}
function stopScenePreview(){if(skyAnimation!==null)cancelAnimationFrame(skyAnimation);skyAnimation=null;previewStarted=null;previewOverride=null;document.getElementById('scene-preview-controls')?.remove();document.body.classList.remove('scene-preview')}
function sceneLayer(){
 let scene=document.getElementById('home-scene');
 if(!scene){scene=document.createElement('div');scene.id='home-scene';scene.setAttribute('aria-hidden','true');scene.innerHTML='<div class="scene-night"></div><div class="scene-day"></div><div class="scene-dawn"></div><div class="scene-dusk"></div><div class="scene-sky"><div class="scene-sky-plane"><span class="scene-sun"></span><span class="scene-moon"><img src="./assets/window-moon.webp" alt="" width="160" height="160"></span></div></div><div class="scene-shade"></div>';document.getElementById('weather-layer').before(scene)}
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
function paintWeather(effect,now,weather,frame,home){
 if(!home&&weatherPreview!==null)stopWeatherPreview();
 weatherLayer(effect);
 const view=weatherPreview!==null?weatherPreviews[weatherPreview]:weatherFrame(settings.weather?weather:null,now);
 const active=home&&view.fresh;
 const reduced=settings.motion||!settings.transitions||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const moving=active&&settings.weatherAnimation&&!reduced&&!document.hidden;
 effect.className='';effect.dataset.kind=active?view.kind:'none';effect.dataset.source=active?(weatherPreview!==null?'preview':'live'):'none';effect.dataset.motion=moving?'on':'off';effect.dataset.clouds=active&&view.clouds>0?'on':'off';
 effect.style.setProperty('--weather-clouds',active?String(view.clouds):'0');
 effect.style.setProperty('--weather-day',String(frame.day));
 effect.style.setProperty('--weather-dark',String(1-frame.day));
 effect.style.setProperty('--weather-rain',active&&moving&&['rain','storm'].includes(view.kind)?String(view.precipitation):'0');
 effect.style.setProperty('--weather-snow',active&&moving&&view.kind==='snow'?String(view.precipitation):'0');
 effect.style.setProperty('--weather-mist',active?(view.kind==='fog'?'.55':view.kind==='overcast'?'.12':'0'):'0');
 if(weatherPreview!==null&&!document.getElementById('weather-preview-controls')){
  const controls=document.createElement('div');controls.id='weather-preview-controls';controls.className='scene-preview-controls weather-preview-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Просмотр погоды');
  controls.innerHTML='<span>Погода · просмотр</span>'+[['clear','Ясно','☼'],['clouds','Облачно','☁'],['rain','Дождь','☂'],['snow','Снег','❄'],['close','Завершить просмотр погоды','×']].map(([value,label,icon])=>'<button type="button" data-weather-preview="'+value+'" aria-label="'+label+'">'+icon+'</button>').join('');
  controls.querySelectorAll('button').forEach(button=>button.onclick=()=>{if(button.dataset.weatherPreview==='close')stopWeatherPreview();else weatherPreview=button.dataset.weatherPreview;atmosphere(Date.now(),lastContext?.times,lastContext?.weather)});document.body.append(controls);
 }
 for(const button of document.querySelectorAll('[data-weather-preview]'))button.setAttribute('aria-pressed',String(button.dataset.weatherPreview===weatherPreview));
}

let previousSkyTime=null,previousSkyContext=null,previousSky=null;
let inactiveContext=null;
function paintSky(scene,sky,now){
 const context=[settings.wallpaper,settings.backgroundMode,settings.city?.latitude,settings.city?.longitude,previewOverride,previewStarted].join(':');
 const reset=previousSkyContext!==context||previousSkyTime===null||Math.abs(now-previousSkyTime)>5000||previousSky&&['sunX','moonX'].some(key=>Math.abs(sky[key]-previousSky[key])>15);
 scene.classList.toggle('sky-reset',reset);previousSkyContext=context;previousSkyTime=now;previousSky=sky;
 for(const key of ['sunX','sunY','sun','moonX','moonY','moon'])scene.style.setProperty('--sky-'+key,String(sky[key]));
}
function smoothPreview(){
 if(skyAnimation!==null||previewStarted===null||previewOverride!==null||settings.motion||!settings.transitions||window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return;
 const draw=()=>{skyAnimation=null;if(previewStarted===null||previewOverride!==null||!document.body.classList.contains('home-page')||document.hidden||settings.motion||!settings.transitions||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const elapsed=performance.now()-previewStarted;if(elapsed>=22000){stopScenePreview();return;}
 const scene=sceneLayer(),frame=previewScene(elapsed),sky=skyObjects(Date.now(),lastContext?.times,'auto',Math.min(elapsed,19999),settings.city);
 paintSky(scene,sky,performance.now());for(const key of ['day','dawn','dusk'])scene.style.setProperty('--scene-'+key,frame[key].toFixed(4));scene.dataset.phase=frame.phase;skyAnimation=requestAnimationFrame(draw);};skyAnimation=requestAnimationFrame(draw);
}
export function atmosphere(now,times,weather){
 lastContext={times,weather};
 const layer=document.getElementById('atmosphere'),effect=document.getElementById('weather-layer'),home=document.body.classList.contains('home-page');
 document.body.classList.toggle('reduce-motion',settings.motion||!settings.transitions);
 if(document.hidden){if(skyAnimation!==null)cancelAnimationFrame(skyAnimation);skyAnimation=null;effect.dataset.motion='off';return;}
 const staticContext=[home,settings.wallpaper,settings.backgroundMode,settings.motion,settings.transitions,settings.city?.latitude,settings.city?.longitude,Math.floor(now/60000)].join(':');
 if(!home&&previewStarted===null&&weatherPreview===null&&inactiveContext===staticContext)return;
 inactiveContext=home?null:staticContext;
 if(previewStarted!==null&&(!home||(previewOverride===null&&performance.now()-previewStarted>=22000)))stopScenePreview();
 const preview=previewStarted!==null,frame=preview?(previewOverride==='day'?{day:1,dawn:0,dusk:0,phase:'day'}:previewOverride==='night'?sceneAt(NaN,null):previewScene(performance.now()-previewStarted)):sceneForMode(now,times,settings.backgroundMode),scene=sceneLayer();
 document.body.classList.toggle('scene-preview',preview);
 scene.dataset.phase=frame.phase;prepareLandmark(scene,home);
 const sky=skyObjects(now,times,previewOverride==='day'?'light':previewOverride==='night'?'dark':settings.backgroundMode,preview&&previewOverride===null?Math.min(performance.now()-previewStarted,19999):null,settings.city);
 paintSky(scene,sky,previewStarted!==null?performance.now():now);
 for(const key of ['day','dawn','dusk'])scene.style.setProperty('--scene-'+key,frame[key].toFixed(4));
 if(preview&&!document.getElementById('scene-preview-controls')){const controls=document.createElement('div');controls.id='scene-preview-controls';controls.className='scene-preview-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Просмотр фона');controls.innerHTML='<span>Фон</span><button type="button" data-scene-preview="day" aria-label="Посмотреть дневной фон">☼</button><button type="button" data-scene-preview="night" aria-label="Посмотреть ночной фон">☾</button><button type="button" data-scene-preview="auto" aria-label="Показать смену суток">▶</button><button type="button" data-scene-preview="close" aria-label="Завершить просмотр смены дня и ночи">×</button>';controls.querySelectorAll('button').forEach(button=>button.onclick=()=>{const choice=button.dataset.scenePreview;if(choice==='close')stopScenePreview();else{previewOverride=choice==='auto'?null:choice;if(choice==='auto')previewStarted=performance.now()}atmosphere(Date.now(),lastContext?.times,lastContext?.weather)});document.body.append(controls)}
 if(preview)for(const button of document.querySelectorAll('[data-scene-preview]'))button.setAttribute('aria-pressed',String(button.dataset.scenePreview===(previewOverride||'auto')));
 if(settings.backgroundMode!=='dark'){layer.style.filter='brightness('+(.76+frame.day*.55)+')';layer.style.background='radial-gradient(ellipse at 75% 25%,rgba(69,90,151,'+(.04+frame.day*.12)+'),transparent 60%),linear-gradient(160deg,#10182b,#060914 75%)'}else{layer.style.filter='';layer.style.background=''}
 paintWeather(effect,now,weather,frame,home);smoothPreview();
}
