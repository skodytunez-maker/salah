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

// Exercise the actual weather controller. Only native image/canvas work and the
// clock are substituted; route changes, targets and interpolation are real.
const w=new Window({url:'https://fixture.invalid/#home'}),doc=w.document;
w.innerWidth=393;w.innerHeight=853;
Object.defineProperty(doc.documentElement,'clientWidth',{get:()=>393});
Object.defineProperty(doc,'hidden',{value:false,writable:true,configurable:true});
doc.body.className='home-page';
doc.body.innerHTML='<div id="atmosphere"></div><div id="weather-layer"></div><output id="countdown">00:21:41</output>';
const settings={liveSky:true,wallpaper:'mosque',landmarkCity:'auto',backgroundMode:'auto',city:{latitude:57.153,longitude:65.5343},weather:true,weatherAnimation:true,motion:false,transitions:true};
let mono=0,wall=Date.parse('2026-11-18T08:46:12Z'),nextRAF=0,loads=0,disposals=0;
const raf=new Map(),paints=[];
const observed={weather_code:3,cloud_cover:100,precipitation:0,temperature_2m:-1,apparent_temperature:-2,wind_speed_10m:1,interval:900,dataAt:wall,fetchedAt:wall};
w.HTMLCanvasElement.prototype.getContext=function(){return {setTransform(){},clearRect(){},drawImage(){},fillRect(){},createLinearGradient(){return {addColorStop(){}};}};};
const makeSurface=()=>{
 const make=()=>{const c=doc.createElement('canvas');c.width=853;c.height=1844;return c;};
 return {valid:true,dayFG:make(),nightFG:make(),dayMetrics:{width:853,height:1844,horizonY:1100},nightMetrics:{width:853,height:1844,horizonY:1100},dispose(){disposals++;}};
};
const context=vm.createContext({ADVANCED_SKY_AVAILABLE:true,ownerVerified:()=>false,document:doc,window:w,settings,t,uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute,actionIcon,wallpapers,previewClock,SCENE_PREVIEW_DURATION,SCENE_PREVIEW_STOPS,skyProjectionFrame,projectSkyObjects,moonAppearance,moonPhasePath,applyWallpaperLayout,layoutSkyObjects,sceneForMode,sceneAt,previewScene,weatherFrame,skyObjects,getPosition,getMoonPosition,
 performance:{now:()=>mono},Date:class extends Date{static now(){return wall;}},AbortController,
 loadDecodedImage:async()=>{loads++;return {complete:true,naturalWidth:1536,naturalHeight:1024};},watchDecodedImages:()=>()=>{},loadSkyMattes:async()=>makeSurface(),
 createSkyAtmosphere:()=>({setTexture(){},dispose(){disposals++;},render(frame){paints.push({...frame});return {sourceReady:true,skyVisibility:1-frame.clouds};}}),
 requestAnimationFrame:fn=>{raf.set(++nextRAF,fn);return nextRAF;},cancelAnimationFrame:id=>raf.delete(id)
});
const source=await readFile(new URL('../dist/js/weather.js',import.meta.url),'utf8');
vm.runInContext(source.split('\n').filter(line=>!line.startsWith('import')&&!line.startsWith('export{')).join('\n').replaceAll('export function','function'),context);
const turns=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
const tick=(elapsed=0)=>{mono+=elapsed;wall+=elapsed;context.atmosphere(wall,null,observed);};
const route=(name)=>{w.location.hash='#'+name;doc.body.className=name==='home'?'home-page':name+'-page';tick();};
const frame=()=>paints.at(-1);
const sample=()=>JSON.parse(vm.runInContext('JSON.stringify(sampleSkyWeather(performance.now()))',context));
tick();await turns();tick();
const scene=doc.getElementById('home-scene'),surface=vm.runInContext('skySurface',context),painter=vm.runInContext('skyRenderer',context),originalLoads=loads;
assert.equal(scene.dataset.unifiedSky,'ready');
assert.equal(frame().clouds,1);assert.equal(raf.size,1);
for(const name of ['knowledge','quran','menu','adhkar']){
 const before=paints.length;
 route(name);assert.equal(raf.size,0,'Other sections stop sky motion');
 assert.equal(paints.length,before,'Other sections do not redraw the retained sky');
 tick(1500);assert.equal(paints.length,before);
 route('home');
 assert.equal(frame().clouds,1,'Home must immediately retain the overcast sky instead of replaying clear-to-cloudy');
 assert.equal(sample().clouds,1);assert.equal(vm.runInContext('skyWeatherStarted',context),null);
 assert.equal(doc.getElementById('home-scene'),scene);assert.equal(vm.runInContext('skySurface',context),surface);assert.equal(vm.runInContext('skyRenderer',context),painter);
 assert.equal(loads,originalLoads,'Returning does not reload photos, mattes or textures');assert.equal(raf.size,1);
}
// Fresh weather can still blend once. A route change during that blend must not
// replace its target or restart its six-second clock.
observed.weather_code=2;observed.cloud_cover=40;observed.dataAt=wall;observed.fetchedAt=wall;
tick();const target=weatherFrame(observed,wall).clouds,started=vm.runInContext('skyWeatherStarted',context);
assert.ok(target>0&&target<1);tick(2000);assert.ok(frame().clouds>target&&frame().clouds<1);
route('knowledge');tick(1000);route('home');
assert.equal(vm.runInContext('skyWeatherStarted',context),started,'Navigation preserves an actual weather change already in progress');
assert.ok(frame().clouds>target&&frame().clouds<1);
tick(4000);assert.equal(frame().clouds,target);assert.equal(vm.runInContext('skyWeatherStarted',context),null);
// Fog, disabled weather and freshness remain authoritative; navigation grants no
// persistent preview or opt-in and never changes playback/countdown content.
observed.weather_code=45;observed.cloud_cover=100;tick();tick(6000);assert.equal(frame().fog,1);
route('menu');route('home');assert.equal(frame().fog,1);
settings.weather=false;tick();assert.deepEqual(sample(),{clouds:0,fog:0});
settings.weather=true;settings.motion=true;tick();assert.deepEqual(sample(),{clouds:1,fog:1});assert.equal(raf.size,0);
settings.motion=false;settings.transitions=false;observed.weather_code=2;observed.cloud_cover=40;tick();assert.equal(frame().clouds,target);assert.equal(frame().fog,0);
settings.transitions=true;doc.hidden=true;doc.dispatchEvent(new w.Event('visibilitychange'));const hiddenPaints=paints.length;tick(1500);assert.equal(paints.length,hiddenPaints);assert.equal(raf.size,0);
doc.hidden=false;tick();assert.equal(frame().clouds,target);
wall+=2*24*3600000;tick();assert.deepEqual(sample(),{clouds:0,fog:0},'Stale observations must not remain fresh because of retained route state');
assert.equal(disposals,0);assert.equal(doc.getElementById('countdown').textContent,'00:21:41');
assert.equal(settings.liveSky,true);assert.equal(settings.weather,true);assert.equal(vm.runInContext('previewActive()',context),false);
await w.happyDOM.close();
console.log('PASS: Home returns retain current clouds/fog, canvas and decoded images; off-route/hidden motion stops, real weather transitions keep their original clock, disabled/stale/reduced-motion policies and unrelated UI remain intact.');
