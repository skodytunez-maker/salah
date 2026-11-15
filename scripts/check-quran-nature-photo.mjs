import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{mountNatureMotion}from '../dist/js/quran-nature-motion.js';
import{loadDecodedImage}from '../dist/js/image-presentation.js';
const w=new Window({url:'https://fixture.invalid/#home'}),d=w.document,photos=[],videos=[],timers=new Map();let reduced=false,nextTimer=0;
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve()};
function image(){
 const node=d.createElement('img'),state={complete:false,naturalWidth:0,naturalHeight:0},row={node,state,decode:null};
 for(const key of Object.keys(state))Object.defineProperty(node,key,{get:()=>state[key],configurable:true});
 node.decode=()=>new Promise(resolve=>row.decode=resolve);photos.push(row);return node;
}
const loadPhoto=(src,options)=>{const result=loadDecodedImage(src,{...options,createImage:image,timeoutMs:5000});const row=photos.at(-1);row.src=src;row.signal=options.signal;return result};
function video(){
 const node=d.createElement('video'),state={currentSrc:'',readyState:0,paused:true},set=node.setAttribute.bind(node),row={node,state,requests:[]};
 for(const key of Object.keys(state))Object.defineProperty(node,key,{get:()=>state[key],configurable:true});
 node.setAttribute=(key,value)=>{set(key,value);if(key==='src'){row.requests.push(value);state.currentSrc=value;state.readyState=2}};
 node.play=async()=>{state.paused=false};node.pause=()=>{state.paused=true;node.dispatchEvent(new w.Event('pause'))};node.load=()=>{state.paused=true;state.currentSrc='';state.readyState=0};
 node.requestVideoFrameCallback=undefined;videos.push(row);return node;
}
const panel=d.createElement('section');panel.dataset.nature='rain';panel.dataset.natureVisual='photo';panel.innerHTML='<button data-nature="forest">Forest</button><button data-nature-visual="photo">Photo</button>';d.body.append(panel);
const cache={get:()=>null,warm(){},stop(){},retry(){},destroy(){}},motion=mountNatureMotion(panel,{doc:d,win:w,loadPhoto,createVideo:video,createCache:()=>cache,isReduced:()=>reduced,setTimer:callback=>{const id=++nextTimer;timers.set(id,callback);return id},clearTimer:id=>timers.delete(id)});
const runTimers=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(callback=>callback())};
const currentPhoto=()=>photos.at(-1),loaded=row=>{row.state.complete=true;row.state.naturalWidth=1080;row.state.naturalHeight=1920;row.node.dispatchEvent(new w.Event('load'))};
const decode=async row=>{loaded(row);assert.equal(typeof row.decode,'function');row.decode();await flush()};
const settleStale=async row=>{loaded(row);row.decode?.();await flush()};
const choose=async kind=>{panel.dataset.nature=kind;motion.sync();await flush()};
await flush();assert.equal(photos.length,0,'Compact/hidden player does not preload nature pictures');panel.classList.add('is-expanded');motion.sync();await flush();
assert.equal(photos.length,1);const rain=currentPhoto();assert.equal(rain.src,'./assets/player-nature-493/rain.jpg');assert.equal(panel.dataset.naturePhoto,undefined,'No undecoded JPEG enters visible CSS');
loaded(rain);await flush();assert.equal(panel.dataset.naturePhoto,undefined,'Load completion alone still waits for image.decode');rain.decode();await flush();assert.equal(panel.dataset.naturePhoto,'rain');assert.equal(videos.length,0);
await choose('ocean');const ocean=currentPhoto();assert.equal(panel.dataset.naturePhoto,'rain','Keep the last fully decoded scene while a replacement is slow');loaded(ocean);await flush();assert.equal(panel.dataset.naturePhoto,'rain');
await choose('fire');const fire=currentPhoto();assert.equal(ocean.signal.aborted,true);ocean.decode();await flush();assert.equal(panel.dataset.naturePhoto,'rain','Late stale decode cannot paint a different mode');await decode(fire);assert.equal(panel.dataset.naturePhoto,'fire');
const cachedCount=photos.length;await choose('rain');assert.equal(panel.dataset.naturePhoto,'rain');assert.equal(photos.length,cachedCount,'Quick return reuses one of two decoded pictures');
await choose('forest');const failed=currentPhoto();failed.node.dispatchEvent(new w.Event('error'));await flush();assert.equal(panel.dataset.naturePhoto,'rain');const failures=photos.length;for(let i=0;i<10;i++)motion.sync();await flush();assert.equal(photos.length,failures,'Failed photo waits for an explicit retry');
const retry=new w.Event('click',{bubbles:true});Object.defineProperty(retry,'isTrusted',{value:true});panel.querySelector('[data-nature="forest"]').dispatchEvent(retry);await flush();assert.equal(photos.length,failures+1);await decode(currentPhoto());assert.equal(panel.dataset.naturePhoto,'forest');
panel.dataset.natureVisual='video';motion.sync();await flush();const wrapper=panel.querySelector('.quran-nature-motion');assert.equal(wrapper.hasAttribute('data-ready'),true);assert.equal(videos.length,1);
await choose('ocean');const oceanRetry=currentPhoto();assert.equal(oceanRetry.src,'./assets/player-nature-493/ocean.jpg');assert.equal(panel.dataset.naturePhoto,'forest');assert.equal(wrapper.hasAttribute('data-ready'),true,'Video presentation does not wait for photo loading');
const moving=videos.find(row=>row.node.dataset.kind==='ocean'&&row.node.hasAttribute('src'));assert.ok(moving);const sourceCount=moving.requests.length;
panel.dataset.natureVisual='photo';motion.sync();await flush();assert.equal(wrapper.hasAttribute('data-ready'),true,'Keep complete outgoing video frame until the selected photo is decoded');assert.equal(moving.state.paused,true);
await decode(oceanRetry);assert.equal(panel.dataset.naturePhoto,'ocean');assert.equal(wrapper.hasAttribute('data-ready'),false);assert.ok(moving.node.hasAttribute('src'),'Existing finite video fade is retained');
panel.dataset.natureVisual='video';motion.sync();await flush();assert.equal(moving.requests.length,sourceCount,'Fast Photo→Video still reuses its prepared source');assert.equal(wrapper.hasAttribute('data-ready'),true);
panel.dataset.natureVisual='photo';motion.sync();await flush();runTimers();assert.equal(videos.filter(row=>row.node.hasAttribute('src')).length,0);assert.equal(panel.dataset.naturePhoto,'ocean');
await choose('wind');const wind=currentPhoto();w.dispatchEvent(new w.Event('pagehide'));assert.equal(wind.signal.aborted,true);await settleStale(wind);assert.equal(panel.dataset.naturePhoto,'ocean','Hidden stale result cannot replace the backdrop');
reduced=true;w.dispatchEvent(new w.Event('pageshow'));await flush();const staticWind=currentPhoto();assert.notEqual(staticWind,wind);await decode(staticWind);assert.equal(panel.dataset.naturePhoto,'wind','Reduced motion still permits a complete static picture');assert.equal(videos.filter(row=>row.node.hasAttribute('src')).length,0);
await choose('fire');const disposed=currentPhoto();motion.destroy();assert.equal(disposed.signal.aborted,true);await settleStale(disposed);assert.equal(panel.dataset.naturePhoto,undefined);assert.equal(timers.size,0);assert.equal(panel.querySelector('.quran-nature-motion'),null);
const css=await readFile(new URL('../dist/quran-player.css',import.meta.url),'utf8');for(const kind of ['rain','wind','fire','forest','ocean']){assert.ok(css.includes('[data-nature-photo="'+kind+'"]'));assert.ok(css.includes("url('./assets/player-nature-493/"+kind+".jpg')"))}assert.ok(css.includes('[data-nature-photo="fire"]{--quran-nature-art:'));assert.ok(css.includes("fire.jpg');background-position:70% center}"));
await w.happyDOM.close();console.log('PASS: complete load+decode gates all five original nature JPGs, retained old backdrop/frame, stale/failed/hidden guards, two-photo cache, reduced motion and unchanged immediate two-slot Video/Photo return.');
