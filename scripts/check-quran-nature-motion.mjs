import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';

const w=new Window({url:'https://salah.invalid/#home'});Object.assign(globalThis,{window:w,document:w.document,localStorage:w.localStorage});
Object.defineProperty(w.navigator,'mediaSession',{configurable:true,get(){throw Error('Decorative video cannot touch the OS media session');}});
const{mountNatureMotion}=await import('../dist/js/quran-nature-motion.js');
const BASE='https://skodytunez-maker.github.io/salah/assets/player-nature-video-495/';
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
let hidden=false,systemReduced=false,reduced=false,allocations=0;
const mediaListeners=new Set();
Object.defineProperties(w.document,{hidden:{configurable:true,get:()=>hidden},visibilityState:{configurable:true,get:()=>hidden?'hidden':'visible'}});
w.matchMedia=()=>({get matches(){return systemReduced;},addEventListener:(_type,fn)=>mediaListeners.add(fn),removeEventListener:(_type,fn)=>mediaListeners.delete(fn)});
function mockVideo(){
 const node=w.document.createElement('video'),state={paused:true,ended:false,currentSrc:'',readyState:0,error:null},requests=[],attempts=[],listeners=new Map();
 let pauses=0,loads=0;
 for(const key of Object.keys(state))Object.defineProperty(node,key,{configurable:true,get:()=>state[key]});
 const add=node.addEventListener.bind(node),remove=node.removeEventListener.bind(node),set=node.setAttribute.bind(node);
 node.addEventListener=(type,fn,...rest)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);add(type,fn,...rest);};
 node.removeEventListener=(type,fn,...rest)=>{listeners.get(type)?.delete(fn);remove(type,fn,...rest);};
 node.setAttribute=(name,value)=>{set(name,value);if(name==='src'){requests.push(value);state.currentSrc='';state.readyState=0;state.error=null;}};
 node.load=()=>{loads++;state.currentSrc='';state.readyState=0;state.error=null;state.paused=true;};
 node.pause=()=>{pauses++;state.paused=true;node.dispatchEvent(new w.Event('pause'));};
 node.play=()=>{state.paused=false;let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});attempts.push({resolve,reject,promise,url:node.getAttribute('src')});return promise;};
 return{node,state,requests,attempts,listeners,get pauses(){return pauses;},get loads(){return loads;}};
}
const panel=w.document.createElement('section');panel.dataset.nature='rain';panel.innerHTML='<button data-expand>Open player</button><button data-toggle>Reading</button><button data-nature="rain">Rain</button><button data-nature="forest">Forest</button><button data-nature="off">Off</button><input type="range">';w.document.body.append(panel);
const create=mockVideo(),before=w.localStorage.length;
const motion=mountNatureMotion(panel,{doc:w.document,win:w,isReduced:()=>reduced,createVideo:()=>{allocations++;return create.node;}});
assert.equal(allocations,0,'Compact playback allocates no video and has no source/download');
for(const change of [()=>{hidden=true;panel.classList.add('is-expanded');},()=>{hidden=false;reduced=true;},()=>{reduced=false;systemReduced=true;},()=>{systemReduced=false;panel.hidden=true;}]){
 change();motion.sync();assert.equal(allocations,0,'Hidden or reduced animation does not create/download media');
}
panel.hidden=false;motion.sync();assert.equal(allocations,1);assert.equal(create.attempts.length,1);assert.deepEqual(create.requests,[BASE+'rain.mp4']);
const wrapper=panel.querySelector('.quran-nature-motion'),video=create.node;
assert.equal(wrapper.tagName,'DIV');assert.equal(wrapper.children.length,1);assert.equal(wrapper.firstElementChild,video);assert.equal(wrapper.getAttribute('aria-hidden'),'true');assert.equal(wrapper.dataset.kind,'rain');assert.equal(wrapper.hasAttribute('data-ready'),false);
for(const[key,value]of Object.entries({muted:true,defaultMuted:true,volume:0,playsInline:true,loop:true,controls:false,autoplay:false,preload:'none',tabIndex:-1,disablePictureInPicture:true,disableRemotePlayback:true}))assert.equal(video[key],value,key);
assert.equal(video.getAttribute('x-webkit-airplay'),'deny');for(const attr of ['muted','playsinline','loop','disablepictureinpicture','disableremoteplayback'])assert.ok(video.hasAttribute(attr));
function resource(kind){create.state.currentSrc=BASE+kind+'.mp4';create.state.readyState=2;create.state.error=null;create.state.paused=false;}
resource('rain');video.dispatchEvent(new w.Event('loadeddata'));assert.equal(wrapper.hasAttribute('data-ready'),false,'Loaded but unconfirmed playback keeps the static backdrop');
video.dispatchEvent(new w.Event('playing'));assert.equal(wrapper.hasAttribute('data-ready'),true);create.attempts[0].resolve();await flush();
for(let i=0;i<20;i++)motion.sync();assert.equal(create.attempts.length,1,'Player state updates cannot start duplicate playback');
const oldLoaded=[...create.listeners.get('loadeddata')][0],oldError=[...create.listeners.get('error')][0];
panel.dataset.nature='fire';motion.sync();assert.equal(allocations,1,'Mode changes reuse one physical decoder');assert.equal(wrapper.dataset.kind,'fire');assert.equal(wrapper.hasAttribute('data-ready'),false);const firstFire=create.attempts.at(-1);event(panel.querySelector('[data-toggle]'),'click',50);const fireAttempt=create.attempts.at(-1);assert.notEqual(fireAttempt,firstFire,'An explicit gesture can restart a pending/stalled resource without a retry timer');
panel.dataset.nature='ocean';motion.sync();const oceanAttempt=create.attempts.at(-1),pausesBeforeStale=create.pauses;
firstFire.resolve();fireAttempt.resolve();await flush();assert.equal(create.pauses,pausesBeforeStale,'Stale play resolves must never pause the newer source');
resource('rain');oldLoaded();oldError();video.dispatchEvent(new w.Event('loadeddata'));video.dispatchEvent(new w.Event('playing'));assert.equal(wrapper.hasAttribute('data-ready'),false,'Stale frame/playing events cannot reveal a different resource');
create.state.error={code:4};video.dispatchEvent(new w.Event('error'));assert.equal(video.getAttribute('src'),BASE+'ocean.mp4','An old queued error cannot fail the new resource');
resource('ocean');video.dispatchEvent(new w.Event('loadeddata'));assert.equal(wrapper.hasAttribute('data-ready'),false);video.dispatchEvent(new w.Event('playing'));oceanAttempt.resolve();await flush();assert.equal(wrapper.hasAttribute('data-ready'),true);
panel.dataset.nature='forest';motion.sync();create.attempts.at(-1).reject(Error('NotAllowedError'));await flush();assert.equal(video.hasAttribute('src'),false);assert.equal(wrapper.hidden,true);assert.equal(wrapper.hasAttribute('data-ready'),false);
const blockedBeforeOpen=create.attempts.length;panel.classList.remove('is-expanded');motion.sync();event(panel.querySelector('[data-expand]'),'click',500);assert.equal(create.attempts.length,blockedBeforeOpen,'The opener only arms a retry while still compact');panel.classList.add('is-expanded');motion.sync();assert.equal(create.attempts.length,blockedBeforeOpen+1,'Opening after an explicit trusted gesture permits one retry');create.attempts.at(-1).reject(Error('denied again'));await flush();
const failedCount=create.attempts.length;
for(let i=0;i<20;i++){panel.dataset.nature='forest';motion.sync();}await flush();assert.equal(create.attempts.length,failedCount,'Repeated same-kind mutations cannot retry rejected playback');
hidden=true;w.document.dispatchEvent(new w.Event('visibilitychange'));hidden=false;w.document.dispatchEvent(new w.Event('visibilitychange'));w.dispatchEvent(new w.Event('pageshow'));assert.equal(create.attempts.length,failedCount,'Lifecycle changes cannot retry a failed kind');
const forest=panel.querySelector('[data-nature=forest]'),range=panel.querySelector('input');
function event(target,type,time=1000,trusted=true){const e=new w.Event(type,{bubbles:true});Object.defineProperty(e,'isTrusted',{value:trusted});Object.defineProperty(e,'timeStamp',{value:time});target.dispatchEvent(e);}
event(forest,'pointerdown',1000,false);event(range,'change',1050,false);assert.equal(create.attempts.length,failedCount,'Synthetic events do not bypass failed autoplay');
event(forest,'pointerdown',2000);assert.equal(create.attempts.length,failedCount+1,'Explicit trusted same-kind selection retries once');
create.attempts.at(-1).reject(Error('still denied'));await flush();event(forest,'click',2100);assert.equal(create.attempts.length,failedCount+1,'One pointer gesture cannot retry again through its click');
event(range,'change',2300);assert.equal(create.attempts.length,failedCount+2,'Explicit trusted change retries after failure');
create.attempts.at(-1).reject(Error('denied'));await flush();event(forest,'click',4000);assert.equal(create.attempts.length,failedCount+3,'Keyboard-like trusted activation works without pointer events');
resource('forest');video.dispatchEvent(new w.Event('playing'));create.attempts.at(-1).resolve();await flush();assert.equal(wrapper.hasAttribute('data-ready'),true);
for(const mutate of [()=>{hidden=true;},()=>{reduced=true;},()=>{systemReduced=true;},()=>{panel.hidden=true;},()=>{panel.classList.remove('is-expanded');}]){
 mutate();const count=create.attempts.length;motion.sync();assert.equal(video.hasAttribute('src'),false);assert.equal(wrapper.hidden,true);assert.equal(create.state.paused,true);for(let i=0;i<5;i++)motion.sync();assert.equal(create.attempts.length,count,'No load while ineligible');
 hidden=false;reduced=false;systemReduced=false;panel.hidden=false;panel.classList.add('is-expanded');motion.sync();assert.equal(create.attempts.length,count+1);resource('forest');video.dispatchEvent(new w.Event('playing'));create.attempts.at(-1).resolve();await flush();
}
const bfcacheCount=create.attempts.length;w.dispatchEvent(new w.Event('pagehide'));assert.equal(video.hasAttribute('src'),false);motion.sync();assert.equal(create.attempts.length,bfcacheCount);w.dispatchEvent(new w.Event('pageshow'));assert.equal(create.attempts.length,bfcacheCount+1,'BFCache resumes only an eligible nonfailed scene');
resource('forest');video.dispatchEvent(new w.Event('playing'));create.attempts.at(-1).resolve();await flush();
systemReduced=true;for(const fn of mediaListeners)fn();assert.equal(video.hasAttribute('src'),false);systemReduced=false;for(const fn of mediaListeners)fn();assert.equal(create.attempts.length,bfcacheCount+2);
const pending=create.attempts.at(-1),lateLoaded=[...create.listeners.get('loadeddata')][0],lateError=[...create.listeners.get('error')][0],requestCount=create.requests.length;
motion.destroy();motion.destroy();assert.equal(panel.querySelector('.quran-nature-motion'),null);assert.equal(video.hasAttribute('src'),false);assert.equal(create.state.paused,true);assert.equal(mediaListeners.size,0);
pending.resolve();lateLoaded();lateError();await flush();panel.dataset.nature='rain';w.document.dispatchEvent(new w.Event('visibilitychange'));w.dispatchEvent(new w.Event('pageshow'));event(range,'change',8000);assert.equal(create.requests.length,requestCount,'Disposed promises/events cannot resurrect playback');
assert.equal(w.localStorage.length,before,'No writes to identity, settings or playback history');
let unsupportedAttempts=0;const unsupported=mountNatureMotion(panel,{doc:w.document,win:w,createVideo:()=>{unsupportedAttempts++;return null;}});
for(let i=0;i<8;i++)unsupported.sync();assert.equal(unsupportedAttempts,1,'Missing video support fails once, leaving the static scene');assert.equal(panel.querySelector('.quran-nature-motion'),null);unsupported.destroy();
const source=await fs.readFile(new URL('../dist/js/quran-nature-motion.js',import.meta.url),'utf8');
assert.doesNotMatch(source,/\b(?:Audio|AudioContext|claimPlayback|setForegroundAudio|createMediaSession|setInterval|setTimeout|requestAnimationFrame)\s*\(/,'No audio ownership, render loops or background retries');
assert.doesNotMatch(source,/navigator\.mediaSession|\.currentTime\s*=/,'No media-session override or Quran seeking');
assert.equal((source.match(/doc\.createElement\('video'\)/g)||[]).length,1);
console.log('PASS: one selected-only silent inline video, hidden/compact/reduced source release, generation-safe readiness and stale events, bounded explicit retry, BFCache/settings lifecycle, static fallback and disposal without audio/session/history ownership. Mock-media lifecycle only, no device playback claim.');
await w.happyDOM.close();
