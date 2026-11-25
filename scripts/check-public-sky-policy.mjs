import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {ADVANCED_SKY_AVAILABLE} from '../dist/js/sky-feature-policy.js';
import {wallpapers,skyProjectionFrame,projectSkyObjects,previewClock,SCENE_PREVIEW_DURATION,SCENE_PREVIEW_STOPS} from '../dist/js/wallpapers.js';
import {sceneAt,sceneForMode,previewScene} from '../dist/js/day-night.js';
import {applyWallpaperLayout} from '../dist/js/wallpaper-layout.js';
import {weatherFrame} from '../dist/js/weather-data.js';
import {t} from '../dist/js/i18n.js';
import {uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute} from '../dist/js/ui.js';
import {actionIcon} from '../dist/js/action-icons.js';

assert.equal(ADVANCED_SKY_AVAILABLE,false,'The actual public release policy is closed, independently of saved preferences');
const w=new Window({url:'https://fixture.invalid/#home'}),doc=w.document;w.innerWidth=393;w.innerHeight=853;Object.defineProperty(doc.documentElement,'clientWidth',{get:()=>393});Object.defineProperty(doc,'hidden',{value:false,writable:true,configurable:true});
doc.body.className='home-page';doc.body.innerHTML='<div id="atmosphere"></div><div id="weather-layer"></div><div class="central-next-label">Иша · 18:15</div><output id="countdown">00:21:41</output><section class="quran-global-player">Аль-А’раф</section>';
doc.head.innerHTML='<style>'+(await readFile(new URL('../dist/day-night.css',import.meta.url),'utf8'))+(await readFile(new URL('../dist/weather.css',import.meta.url),'utf8'))+'</style>';
let contexts=0,celestialCalls=0,uiReads=0,rafCalls=0,advancedLoads=0,mono=0,wall=Date.parse('2026-11-17T12:53:00Z');
w.HTMLCanvasElement.prototype.getContext=function(){contexts++;throw Error('Public policy cannot allocate an advanced Canvas context');};
for(const node of doc.querySelectorAll('.central-next-label,#countdown,.quran-global-player'))node.getBoundingClientRect=()=>{uiReads++;return{left:20,top:350,right:373,bottom:450,width:353,height:100};};
const settings={liveSky:true,weather:true,weatherAnimation:true,motion:false,transitions:true,backgroundMode:'auto',wallpaper:'mosque',landmarkCity:'auto',city:{latitude:57.153,longitude:65.5343}};
const photos=[],forbidden=()=>{advancedLoads++;throw Error('Advanced renderer/texture/matte unavailable in public512');},celestial=()=>{celestialCalls++;throw Error('Public512 cannot compute or place dynamic Sun/Moon');};
const context=vm.createContext({ADVANCED_SKY_AVAILABLE,document:doc,window:w,settings,t,uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute,actionIcon,wallpapers,skyProjectionFrame,projectSkyObjects,previewClock,SCENE_PREVIEW_DURATION,SCENE_PREVIEW_STOPS,sceneAt,sceneForMode,previewScene,applyWallpaperLayout,weatherFrame,
 skyObjects:celestial,moonAppearance:celestial,moonPhasePath:celestial,getPosition:celestial,getMoonPosition:celestial,layoutSkyObjects:celestial,loadSkyMattes:forbidden,createSkyAtmosphere:forbidden,
 loadDecodedImage:(url,{signal}={})=>{assert.ok(!/home-clouds|home-moon/.test(url));photos.push({url,signal});return Promise.resolve({complete:true,naturalWidth:1536,naturalHeight:1024});},watchDecodedImages:()=>()=>{},
 performance:{now:()=>mono},Date:class extends Date{static now(){return wall;}},AbortController,requestAnimationFrame(){rafCalls++;return 1;},cancelAnimationFrame(){}
});
const source=await readFile(new URL('../dist/js/weather.js',import.meta.url),'utf8');vm.runInContext(source.replace("await import('./sky-matte.js')", '({loadSkyMattes:globalThis.loadSkyMattes})').split('\n').filter(line=>!line.startsWith('import')&&!line.startsWith('export{')).join('\n').replaceAll('export function','function'),context);
const tick=()=>{context.atmosphere(wall,null,{weather_code:45,cloud_cover:100,precipitation:3,temperature_2m:-2,apparent_temperature:-4,wind_speed_10m:1,interval:900,dataAt:wall,fetchedAt:wall});mono+=1000;wall+=1000;},turns=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
tick();await turns();tick();const scene=doc.getElementById('home-scene');assert.equal(photos.length,2);assert.ok(scene.querySelector('.scene-day').style.backgroundImage);assert.ok(scene.querySelector('.scene-night').style.backgroundImage);
const assertClosed=()=>{
 assert.equal(scene.dataset.liveSky,'off');assert.equal(scene.dataset.unifiedSky,'off');assert.equal(scene.style.getPropertyValue('--scene-photo-exposure'),'1');
 assert.equal(scene.querySelector('[data-moon-disc]').getAttribute('src'),null);
 for(const selector of ['.scene-sky','.scene-foreground','.scene-dawn','.scene-dusk'])assert.equal(w.getComputedStyle(scene.querySelector(selector)).display,'none');
 for(const selector of ['.scene-day','.scene-night'])assert.equal(w.getComputedStyle(scene.querySelector(selector)).filter,'none');assert.equal(w.getComputedStyle(doc.getElementById('weather-layer')).display,'block','Fresh legacy weather remains visible without the new sky');
 for(const canvas of scene.querySelectorAll('canvas'))assert.equal(canvas.width*canvas.height,0);
 assert.deepEqual({contexts,celestialCalls,uiReads,rafCalls,advancedLoads},{contexts:0,celestialCalls:0,uiReads:0,rafCalls:0,advancedLoads:0});
};
assertClosed();
// Old/imported preferences and both exported legacy demonstration entry points are
// insufficient to open the new sky feature, even while Home is visible/online.
for(const persisted of [true,false,'true',1,null,undefined]){
 settings.liveSky=persisted;assert.equal(context.startScenePreview(),true);tick();await turns();assertClosed();assert.ok(doc.getElementById('scene-preview-controls'),'Ordinary Day/Night demonstration uses the original photographs');context.stopScenePreview();
 assert.equal(context.startWeatherPreview(),true);tick();await turns();assertClosed();assert.ok(doc.getElementById('weather-preview-controls'));assert.equal(doc.getElementById('weather-layer').dataset.rain,'on','The existing rain demonstration is functional without advanced assets');assert.equal(doc.getElementById('weather-layer').dataset.source,'preview');context.stopWeatherPreview();tick();
 assert.equal(vm.runInContext('previewRequested',context),false);assert.equal(vm.runInContext('previewStarted',context),null);assert.equal(vm.runInContext('weatherPreview',context),null);assert.equal(doc.querySelector('#scene-preview-controls,#weather-preview-controls'),null);
}
for(const mode of ['light','dark','auto']){
 settings.liveSky=true;settings.backgroundMode=mode;const expected=sceneForMode(wall,null,mode,settings.city);tick();assert.equal(scene.style.getPropertyValue('--scene-day'),expected.day.toFixed(4),'Ordinary photo lighting choices still work');assertClosed();
}
w.dispatchEvent(new w.Event('pagehide'));doc.hidden=true;doc.dispatchEvent(new w.Event('visibilitychange'));tick();doc.hidden=false;w.dispatchEvent(new w.Event('pageshow'));tick();assertClosed();
assert.equal(photos.length,2,'Public preference/demo calls do not redownload photographs');assert.equal(settings.weather,true);assert.equal(settings.weatherAnimation,true);assert.equal(doc.getElementById('countdown').textContent,'00:21:41');
await w.happyDOM.close();
console.log('PASS: actual public feature policy is closed for stored/imported true and functional basic previews; no advanced assets, contexts, celestial placement, UI reads or RAF; original photo lighting and unrelated preferences remain intact.');
