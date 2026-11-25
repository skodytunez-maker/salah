// Closed public feature: explicit owner-pilot policy below exercises the retained advanced implementation.
const OWNER_PILOT_ADVANCED_SKY_AVAILABLE=true;
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {wallpapers,skyObjects,previewClock,SCENE_PREVIEW_DURATION,SCENE_PREVIEW_STOPS,skyProjectionFrame,projectSkyObjects,moonAppearance,moonPhasePath} from '../dist/js/wallpapers.js';
import {sceneForMode,sceneAt,previewScene} from '../dist/js/day-night.js';
import {weatherFrame} from '../dist/js/weather-data.js';
import {applyWallpaperLayout} from '../dist/js/wallpaper-layout.js';
import {layoutSkyObjects} from '../dist/js/sky-ui-layout.js';
import {t} from '../dist/js/i18n.js';
import {uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute} from '../dist/js/ui.js';
import {actionIcon} from '../dist/js/action-icons.js';
import {getPosition,getMoonPosition} from '../dist/js/vendor/suncalc.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const turns=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
const w=new Window({url:'https://fixture.invalid/#home'}),doc=w.document;
w.innerWidth=393;w.innerHeight=853;Object.defineProperty(doc.documentElement,'clientWidth',{get:()=>w.innerWidth});Object.defineProperty(doc,'hidden',{value:false,writable:true,configurable:true});
doc.body.className='home-page';doc.body.innerHTML='<div id="atmosphere"></div><div id="weather-layer"></div><div class="central-next-label">Следующий · Иша</div><output id="countdown">00:21:41</output>';
doc.head.innerHTML='<style>'+(await readFile(new URL('../dist/day-night.css',import.meta.url),'utf8'))+(await readFile(new URL('../dist/weather.css',import.meta.url),'utf8'))+'</style>';
let mono=0,wall=Date.parse('2026-11-17T12:53:00Z'),skyCalls=0,moonCalls=0,uiReads=0,contexts=0,painterDisposals=0,nextRAF=0;
const photos=[],clouds=[],mattes=[],paints=[],raf=new Map();
for(const node of doc.querySelectorAll('.central-next-label,#countdown'))node.getBoundingClientRect=()=>{uiReads++;return{left:100,top:390,right:280,bottom:410,width:180,height:20};};
const canvasContexts=new WeakMap();w.HTMLCanvasElement.prototype.getContext=function(){contexts++;if(!canvasContexts.has(this))canvasContexts.set(this,{setTransform(){},clearRect(){},drawImage(){},fillRect(){},createLinearGradient(){return{addColorStop(){}};}});return canvasContexts.get(this);};
const saved={wallpaper:'mosque',landmarkCity:'auto',backgroundMode:'auto',city:{latitude:57.153,longitude:65.5343},weather:true,weatherAnimation:true,motion:false,transitions:true};
const observed={weather_code:2,cloud_cover:64,precipitation:0,temperature_2m:-1,apparent_temperature:-2,wind_speed_10m:1,interval:900,dataAt:wall,fetchedAt:wall};
const source=await readFile(new URL('../dist/js/weather.js',import.meta.url),'utf8');
const context=vm.createContext({ADVANCED_SKY_AVAILABLE:OWNER_PILOT_ADVANCED_SKY_AVAILABLE,document:doc,window:w,settings:saved,t,uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute,actionIcon,wallpapers,previewClock,SCENE_PREVIEW_DURATION,SCENE_PREVIEW_STOPS,skyProjectionFrame,projectSkyObjects,moonPhasePath,applyWallpaperLayout,layoutSkyObjects,sceneForMode,sceneAt,previewScene,weatherFrame,getPosition,getMoonPosition,
 skyObjects:(...args)=>{skyCalls++;return skyObjects(...args);},moonAppearance:(...args)=>{moonCalls++;return moonAppearance(...args);},
 performance:{now:()=>mono},Date:class extends Date{static now(){return wall;}},AbortController,
 loadDecodedImage:(url,{signal}={})=>{const task={url,signal,...deferred()};(url==='./assets/home-clouds-509.webp'?clouds:photos).push(task);return task.promise;},watchDecodedImages:()=>()=>{},
 loadSkyMattes:args=>{const task={args,...deferred()};mattes.push(task);return task.promise;},
 createSkyAtmosphere:()=>({setTexture(){},dispose(){painterDisposals++;},render(frame){paints.push(frame);return{sourceReady:true,skyVisibility:1};}}),
 requestAnimationFrame:fn=>{raf.set(++nextRAF,fn);return nextRAF;},cancelAnimationFrame:id=>raf.delete(id)
});
vm.runInContext(source.replace("await import('./sky-matte.js')", '({loadSkyMattes:globalThis.loadSkyMattes})').split('\n').filter(line=>!line.startsWith('import')&&!line.startsWith('export{')).join('\n').replaceAll('export function','function'),context);
const tick=()=>{context.atmosphere(wall,null,observed);mono+=1000;wall+=1000;},state=code=>vm.runInContext(code,context);
const finishMatte=task=>{const make=()=>{const canvas=doc.createElement('canvas');canvas.width=853;canvas.height=1844;return canvas;},dayFG=make(),nightFG=make();let disposed=0;const surface={valid:true,dayFG,nightFG,dayMetrics:{width:853,height:1844,horizonY:1100},nightMetrics:{width:853,height:1844,horizonY:1100},dispose(){disposed++;dayFG.width=dayFG.height=nightFG.width=nightFG.height=0;}};task.resolve(surface);return{surface,get disposed(){return disposed;}};};
const assertBasic=()=>{
 const photo=doc.getElementById('home-scene');assert.equal(photo.dataset.liveSky,'off');assert.equal(photo.dataset.unifiedSky,'off');assert.equal(photo.style.getPropertyValue('--scene-photo-exposure'),'1');
 for(const selector of ['.scene-sky','.scene-foreground','.scene-dawn','.scene-dusk'])assert.equal(w.getComputedStyle(photo.querySelector(selector)).display,'none');
 for(const selector of ['.scene-day','.scene-night'])assert.equal(w.getComputedStyle(photo.querySelector(selector)).filter,'none');
 assert.equal(doc.getElementById('weather-layer').dataset.unifiedSky,'off','Legacy weather remains separate from the advanced sky');assert.equal(photo.querySelector('[data-moon-disc]').getAttribute('src'),null);assert.equal(raf.size,0);
 for(const canvas of photo.querySelectorAll('canvas'))assert.equal(canvas.width*canvas.height,0,'Basic mode releases all advanced backing buffers');
};

// Missing legacy preference plus enabled old weather flags is still photo-only.
tick();assert.equal(photos.length,2);assertBasic();assert.equal(mattes.length,0);assert.equal(clouds.length,0);assert.equal(skyCalls,0);assert.equal(moonCalls,0);assert.equal(contexts,0);assert.equal(uiReads,0);assert.equal(doc.getElementById('weather-layer').dataset.source,'live','Legacy weather is not disabled by basic photo mode');
// Switching off must not cancel an ordinary in-progress photograph download.
saved.liveSky=true;tick();saved.liveSky=false;tick();assert.ok(photos.every(task=>!task.signal.aborted));
for(const task of photos)task.resolve({complete:true,naturalWidth:1536,naturalHeight:1024});await turns();
const photo=doc.getElementById('home-scene'),dayNode=photo.querySelector('.scene-day'),nightNode=photo.querySelector('.scene-night'),daySource=dayNode.style.backgroundImage,nightSource=nightNode.style.backgroundImage;
assert.equal(photo.dataset.imagePending,undefined);assert.ok(daySource&&nightSource);assertBasic();assert.equal(mattes.length,0);assert.equal(clouds.length,0);assert.equal(contexts,0);
for(let i=0;i<4;i++)tick();assert.equal(photos.length,2);assert.equal(skyCalls,1,'Only the explicit short opt-in before photo readiness sampled astronomy');assert.equal(uiReads,0,'Even explicit opt-in keeps astronomical positions independent of Home UI');

saved.liveSky=true;tick();assert.equal(mattes.length,1,'Enabling after photos are ready prepares their retained exact source pair');assert.equal(photos.length,2);assert.equal(mattes[0].args.dayImage,state('skyPhotoPair.dayImage'));assert.ok(photo.querySelector('[data-moon-disc]').getAttribute('src').endsWith('home-moon-disc.jpg'));
saved.liveSky=false;tick();assert.equal(mattes[0].args.signal.aborted,true);assertBasic();const stale=finishMatte(mattes[0]);await turns();assert.equal(stale.disposed,1);assert.equal(state('skySurface'),null);assert.equal(clouds.length,0);

saved.liveSky=true;tick();assert.equal(mattes.length,2);const pendingTextureSurface=finishMatte(mattes[1]);await turns();assert.equal(clouds.length,1);saved.liveSky=false;tick();assert.equal(clouds[0].signal.aborted,true);assert.equal(pendingTextureSurface.disposed,1);
clouds[0].resolve({complete:true,naturalWidth:720,naturalHeight:540});await turns();assertBasic();assert.equal(paints.length,0,'A late aborted texture cannot recreate the renderer');assert.equal(state('cloudTextureImage'),null);

saved.liveSky=true;tick();const readySurface=finishMatte(mattes[2]);await turns();clouds[1].resolve({complete:true,naturalWidth:720,naturalHeight:540});await turns();tick();assert.equal(photo.dataset.unifiedSky,'ready');assert.ok(paints.length>0);assert.ok(contexts>0);assert.equal(raf.size,1);assert.ok(w.getComputedStyle(dayNode).visibility==='hidden');
const canvasPaints=paints.length;saved.liveSky=false;tick();assertBasic();assert.equal(readySurface.disposed,1);assert.equal(painterDisposals,1);for(let i=0;i<3;i++)tick();assert.equal(paints.length,canvasPaints);assert.equal(photos.length,2);assert.equal(dayNode.style.backgroundImage,daySource);assert.equal(nightNode.style.backgroundImage,nightSource);

// Hidden preparation is cancelled without advancing the cloud clock or
// committing a late background surface; visible re-entry can prepare again.
saved.liveSky=true;tick();const hiddenTask=mattes.at(-1);doc.hidden=true;tick();assert.equal(hiddenTask.args.signal.aborted,true);const hiddenSurface=finishMatte(hiddenTask);await turns();assert.equal(hiddenSurface.disposed,1);assert.equal(raf.size,0);saved.liveSky=false;tick();assertBasic();doc.hidden=false;
saved.liveSky=true;saved.motion=true;tick();const reducedSurface=finishMatte(mattes.at(-1));await turns();clouds.at(-1).resolve({complete:true,naturalWidth:720,naturalHeight:540});await turns();tick();assert.equal(photo.dataset.unifiedSky,'ready');assert.equal(raf.size,0,'Opt-in reduced motion is a static advanced frame');const frozenMotion=paints.at(-1).motionTime;tick();assert.equal(paints.at(-1).motionTime,frozenMotion);saved.liveSky=false;tick();assertBasic();assert.equal(reducedSurface.disposed,1);

// Explicit demos are temporary opt-ins. Their close/timeout/hidden paths must
// restore photo-only mode without writing or changing the saved preference.
saved.motion=false;context.startScenePreview();tick();assert.equal(saved.liveSky,false);assert.equal(photo.dataset.liveSky,'on');const previewMatte=mattes.at(-1);assert.ok(doc.getElementById('scene-preview-controls'));doc.querySelector('[data-scene-preview=close]').click();assertBasic();assert.equal(previewMatte.args.signal.aborted,true);assert.equal(saved.liveSky,false);
context.startScenePreview();tick();mono+=SCENE_PREVIEW_DURATION;tick();assertBasic();assert.equal(saved.liveSky,false);
context.startScenePreview();tick();w.dispatchEvent(new w.Event('pagehide'));assert.equal(photo.dataset.liveSky,'off');assert.equal(raf.size,0);tick();assertBasic();w.dispatchEvent(new w.Event('pageshow'));tick();
context.startWeatherPreview();tick();assert.equal(photo.dataset.liveSky,'on','The explicit weather-demo action can preview without persisting opt-in');assert.equal(saved.liveSky,false);context.stopWeatherPreview();tick();assertBasic();
for(const exit of ['pagehide','hidden','route']){
 context.startWeatherPreview();tick();const demoTask=mattes.at(-1),before=mattes.length;assert.equal(state('weatherPreview'),'rain');
 if(exit==='pagehide')w.dispatchEvent(new w.Event('pagehide'));
 else if(exit==='hidden'){doc.hidden=true;doc.dispatchEvent(new w.Event('visibilitychange'));}
 else{doc.body.classList.remove('home-page');tick();}
 assert.equal(state('weatherPreview'),null,'A temporary weather demo closes on '+exit);assert.equal(demoTask.args.signal.aborted,true);assertBasic();
 const lateDemo=finishMatte(demoTask);await turns();assert.equal(lateDemo.disposed,1);
 doc.hidden=false;doc.body.classList.add('home-page');if(exit==='pagehide')w.dispatchEvent(new w.Event('pageshow'));tick();assertBasic();assert.equal(mattes.length,before,'Returning cannot revive a closed weather demo');assert.equal(saved.liveSky,false);
}
// Pagehide can precede document.hidden, including ordinary photo completion.
// The independent gate must stop all new preparation until pageshow.
saved.liveSky=true;tick();const pageTask=mattes.at(-1),beforePage=mattes.length;w.dispatchEvent(new w.Event('pagehide'));assert.equal(doc.hidden,false);assert.equal(pageTask.args.signal.aborted,true);tick();assert.equal(mattes.length,beforePage);
const latePage=finishMatte(pageTask);await turns();assert.equal(latePage.disposed,1);state('ensureSkySurface(document.getElementById("home-scene"))');assert.equal(mattes.length,beforePage,'A late ordinary photo-ready callback cannot restart sky work after pagehide');
w.dispatchEvent(new w.Event('pageshow'));tick();assert.equal(mattes.length,beforePage+1,'An explicit saved opt-in can resume after pageshow');saved.liveSky=false;tick();assertBasic();
assert.equal(saved.weather,true);assert.equal(saved.weatherAnimation,true,'Basic mode never rewrites the independent weather preferences');assert.equal(photos.length,2,'Neither opt-in nor demos redownload the existing source photographs');assert.equal(doc.getElementById('countdown').textContent,'00:21:41');
// Complete a genuinely new photo pair after pagehide, without relying on the
// browser having changed document.hidden or on another application tick.
saved.liveSky=true;saved.wallpaper='new-york';tick();const newPhotos=photos.slice(2),beforeLatePhoto=mattes.length;assert.equal(newPhotos.length,4);w.dispatchEvent(new w.Event('pagehide'));assert.equal(doc.hidden,false);for(const task of newPhotos)task.resolve({complete:true,naturalWidth:853,naturalHeight:1844});await turns();assert.equal(mattes.length,beforeLatePhoto,'The real late photo-ready callback does not start sky preparation after pagehide');assert.equal(raf.size,0);assert.equal(state('builtinState'),'ready','Ordinary photo loading still completes');
w.dispatchEvent(new w.Event('pageshow'));tick();assert.equal(mattes.length,beforeLatePhoto+1,'The retained newly decoded pair becomes eligible only after pageshow');saved.liveSky=false;tick();assertBasic();
await w.happyDOM.close();
console.log('PASS: default-off original photos with no advanced allocations/loading/astronomy/UI reads; retained-photo opt-in, independent sky cancellation and stale disposal, ready-buffer release, hidden/reduced motion and temporary demo exit; weather preferences and photo downloads preserved.');

assert.doesNotMatch(source,/^import[^\n]*from '\.\/sky-matte\.js'/m,'The first screen does not import matte data statically');
const preparation=source.slice(source.indexOf('async function prepareSkySurface'),source.indexOf('\nfunction releaseSkyForeground'));
const delayedModule=deferred();
let loadedMasks=0;
context.loadMatteModule=()=>delayedModule.promise;
const prepare=vm.runInContext('('+preparation.replace("import('./sky-matte.js')",'loadMatteModule()')+')',context);
const stop=new AbortController();
const stopped=prepare('day','night',{}, {},stop.signal);
stop.abort();
delayedModule.resolve({loadSkyMattes:()=>{loadedMasks++;return {valid:true};}});
assert.equal(await stopped,null);
assert.equal(loadedMasks,0,'Turning off the feature during the module load prevents canvas preparation');
assert.equal((await prepare('day','night',{}, {},new AbortController().signal)).valid,true);
assert.equal(loadedMasks,1);
console.log('PASS: matte atlas loading is deferred and an aborted opt-in does not prepare masks.');
