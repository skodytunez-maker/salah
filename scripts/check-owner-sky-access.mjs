import {ADVANCED_SKY_AVAILABLE} from '../dist/js/sky-feature-policy.js';
import {mock} from 'node:test';
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
Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,location:w.location});
let fixtureSession=null,serverOwner=false,serverMfa=false,authChanged,waitingGate=null,gateCalls=0;
w.supabase={createClient:()=>({auth:{onAuthStateChange:fn=>{authChanged=fn;},getSession:async()=>({data:{session:fixtureSession}}),getUser:async token=>{assert.equal(token,fixtureSession.access_token);return{data:{user:fixtureSession.user}};},refreshSession:async()=>({data:{session:fixtureSession}}),signOut:async()=>{fixtureSession=null;authChanged('SIGNED_OUT',null);return{error:null};}}})};
globalThis.fetch=async(url,options)=>{gateCalls++;assert.ok(String(url).endsWith('/functions/v1/owner-access'));assert.equal(options.method,'GET');assert.equal(options.cache,'no-store');if(waitingGate)return waitingGate.promise;return serverMfa?Response.json({owner:false,mfaRequired:true}):serverOwner?Response.json({owner:true}):Response.json({error:'owner_only'},{status:403});};
mock.method(Date,'now',()=>wall);
const {verifyOwner,ownerVerified,ownerNeedsMfa,onOwnerChange,signOutOwner}=await import('../dist/js/owner-auth.js');

const source=await readFile(new URL('../dist/js/weather.js',import.meta.url),'utf8');
const context=vm.createContext({ADVANCED_SKY_AVAILABLE,ownerVerified,document:doc,window:w,settings:saved,t,uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute,actionIcon,wallpapers,previewClock,SCENE_PREVIEW_DURATION,SCENE_PREVIEW_STOPS,skyProjectionFrame,projectSkyObjects,moonPhasePath,applyWallpaperLayout,layoutSkyObjects,sceneForMode,sceneAt,previewScene,weatherFrame,getPosition,getMoonPosition,
 skyObjects:(...args)=>{skyCalls++;return skyObjects(...args);},moonAppearance:(...args)=>{moonCalls++;return moonAppearance(...args);},
 performance:{now:()=>mono},Date:class extends Date{static now(){return wall;}},AbortController,
 loadDecodedImage:(url,{signal}={})=>{const task={url,signal,...deferred()};(url==='./assets/home-clouds-509.webp'?clouds:photos).push(task);return task.promise;},watchDecodedImages:()=>()=>{},
 loadSkyMattes:args=>{const task={args,...deferred()};mattes.push(task);return task.promise;},
 createSkyAtmosphere:()=>({setTexture(){},dispose(){painterDisposals++;},render(frame){paints.push(frame);return{sourceReady:true,skyVisibility:1};}}),
 requestAnimationFrame:fn=>{raf.set(++nextRAF,fn);return nextRAF;},cancelAnimationFrame:id=>raf.delete(id)
});
vm.runInContext(source.split('\n').filter(line=>!line.startsWith('import')&&!line.startsWith('export{')).join('\n').replaceAll('export function','function'),context);
const tick=()=>{context.atmosphere(wall,null,observed);mono+=1000;wall+=1000;},state=code=>vm.runInContext(code,context);
const finishMatte=task=>{const make=()=>{const canvas=doc.createElement('canvas');canvas.width=853;canvas.height=1844;return canvas;},dayFG=make(),nightFG=make();let disposed=0;const surface={valid:true,dayFG,nightFG,dayMetrics:{width:853,height:1844,horizonY:1100},nightMetrics:{width:853,height:1844,horizonY:1100},dispose(){disposed++;dayFG.width=dayFG.height=nightFG.width=nightFG.height=0;}};task.resolve(surface);return{surface,get disposed(){return disposed;}};};

const noAdvanced=()=>{const scene=doc.getElementById('home-scene');assert.equal(scene.dataset.liveSky,'off');assert.equal(scene.dataset.unifiedSky,'off');assert.equal(scene.querySelector('[data-moon-disc]').getAttribute('src'),null);assert.equal(raf.size,0);};
assert.equal(ADVANCED_SKY_AVAILABLE,false);assert.equal(await verifyOwner(),false);tick();for(const task of photos)task.resolve({complete:true,naturalWidth:1536,naturalHeight:1024});await turns();tick();noAdvanced();assert.equal(mattes.length,0);assert.equal(contexts,0);assert.equal(skyCalls,0);
// A saved session, self-editable role claims, and MFA-pending owner are not grants.
fixtureSession={access_token:'fixture-nonsecret-session',user:{id:'fixture-account',user_metadata:{owner:true,role:'owner'}}};saved.liveSky=true;
assert.equal(await verifyOwner({verifySession:true}),false);tick();noAdvanced();assert.equal(mattes.length,0);
serverOwner=true;serverMfa=true;assert.equal(await verifyOwner({verifySession:true}),false);assert.equal(ownerNeedsMfa(),true);tick();noAdvanced();assert.equal(mattes.length,0);
// Await the actual protected gate: no resources before its successful response.
serverMfa=false;waitingGate=deferred();const checking=verifyOwner({verifySession:true});await turns();const duplicateCheck=verifyOwner();await turns();assert.equal(gateCalls,3,'Concurrent owner entry checks share the existing protected request');tick();noAdvanced();assert.equal(mattes.length,0);waitingGate.resolve(Response.json({owner:true}));assert.equal(await checking,true);assert.equal(await duplicateCheck,true);waitingGate=null;
saved.liveSky=false;tick();noAdvanced();assert.equal(mattes.length,0,'A verified owner still defaults to basic photographs until explicit opt-in');
saved.liveSky=true;tick();assert.equal(mattes.length,1);assert.ok(skyCalls>0);assert.equal(doc.getElementById('home-scene').dataset.liveSky,'on');const expiredTask=mattes[0];
// Expiry emits no role event; each real renderer tick must recheck the getter.
wall+=60001;assert.equal(ownerVerified(),false);tick();noAdvanced();assert.equal(expiredTask.args.signal.aborted,true);const expiredSurface=finishMatte(expiredTask);await turns();assert.equal(expiredSurface.disposed,1);assert.equal(contexts,0);assert.equal(saved.liveSky,true,'Revocation blocks access without rewriting the owner preference');
assert.equal(await verifyOwner({verifySession:true}),true);tick();const ready=finishMatte(mattes[1]);await turns();clouds.at(-1).resolve({complete:true,naturalWidth:720,naturalHeight:540});await turns();tick();assert.equal(doc.getElementById('home-scene').dataset.unifiedSky,'ready');assert.ok(contexts>0);assert.equal(raf.size,1);
// The actual app observer repaints on revocation; no route/form reconstruction.
const off=onOwnerChange(()=>context.atmosphere(wall,null,observed));await signOutOwner();assert.equal(ownerVerified(),false);noAdvanced();assert.equal(ready.disposed,1);assert.equal(painterDisposals,1);assert.equal(saved.liveSky,true);off();
// The independently isolated signed-out pilot retains its explicit feature flag.
context.ADVANCED_SKY_AVAILABLE=true;saved.liveSky=false;tick();noAdvanced();const before=mattes.length;assert.equal(context.startScenePreview(),true);tick();assert.equal(mattes.length,before+1);assert.equal(doc.getElementById('home-scene').dataset.liveSky,'on');context.stopScenePreview();tick();noAdvanced();assert.equal(saved.liveSky,false);
assert.equal(gateCalls,4,'Only denial, MFA, one pending grant and one renewal request reach the protected fixture');assert.equal(photos.length,2,'Role changes and demos retain the original decoded photographs');assert.equal(doc.getElementById('countdown').textContent,'00:21:41');mock.restoreAll();await w.happyDOM.close();
console.log('PASS: real server/MFA owner capability gates advanced resources dynamically; ordinary/forged/MFA-pending access stays basic, default off, expiry and logout cancel/dispose, late responses cannot reopen, private signed-out opt-in remains available.');
