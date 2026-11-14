import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{createNatureVideoCache,NATURE_VIDEO_BASE,NATURE_VIDEO_KINDS,natureVideoUrl}from '../dist/js/quran-nature-video-cache.js';
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
let eligible=false,network={},live=0,peak=0,cancelled=0;
function response(size=4,{type='video/mp4',declared=size}={}){
 let read=false,closed=false;const close=()=>{if(!closed){closed=true;live--;}};
 return{ok:true,status:200,type:'cors',headers:new Headers({'Content-Type':type,'Content-Length':String(declared)}),body:{cancel:async()=>{cancelled++;close();},getReader:()=>({read:async()=>{if(!read){read=true;return{done:false,value:new Uint8Array(size)};}close();return{done:true};},cancel:async()=>{cancelled++;close();},releaseLock(){}})}};
}
const urls=[],revoked=[],requests=[];
const fetcher=async(url,options)=>{requests.push({url,options});live++;peak=Math.max(peak,live);return response();};
const cache=createNatureVideoCache({fetcher,canWarm:()=>eligible,connection:()=>network,createUrl:blob=>{const url='blob:cache-'+urls.length;urls.push({url,size:blob.size});return url;},revokeUrl:url=>revoked.push(url)});
await cache.warm('fire');assert.equal(requests.length,0,'Closed or Photo player does not warm bytes');
eligible=true;for(const effectiveType of ['2g','slow-2g']){network={effectiveType};await cache.warm('fire');}network={saveData:true};await cache.warm('fire');assert.equal(requests.length,0,'Save-Data and slow2g skip speculative downloads');network={};
const first=cache.warm('fire'),duplicate=cache.warm('fire');await Promise.all([first,duplicate]);
assert.equal(peak,1,'Only one compressed download runs at a time');assert.equal(live,0);assert.deepEqual(requests.map(r=>r.url.split('/').at(-1)),['rain.mp4','wind.mp4','forest.mp4','ocean.mp4','fire.mp4'],'Other scenes precede the currently streaming canonical video');
assert.equal(cache.state.entries,5);assert.equal(cache.state.bytes,20);for(const kind of NATURE_VIDEO_KINDS)assert.ok(cache.get(kind).startsWith('blob:'));assert.equal(natureVideoUrl('forged'),null);
for(const r of requests){assert.equal(r.options.mode,'cors');assert.equal(r.options.credentials,'omit');assert.equal(r.options.priority,'low');assert.equal(r.options.cache,'force-cache');assert.equal(r.options.signal.aborted,false);assert.ok(r.url.startsWith(NATURE_VIDEO_BASE));}
for(let i=0;i<8;i++)await cache.warm('rain');assert.equal(requests.length,5,'Completed bytes warm once per session');cache.stop();assert.equal(cache.state.entries,5,'Closing releases requests but retains compressed clips');cache.destroy();cache.destroy();assert.equal(cache.state.bytes,0);assert.equal(revoked.length,5);assert.equal(new Set(revoked).size,5,'Every owned Blob URL is revoked once');

let pendingResolve,attempts=0,signal,creates=0;
const abortCache=createNatureVideoCache({canWarm:()=>true,connection:()=>({}),fetcher:(url,options)=>{attempts++;signal=options.signal;if(attempts===1)return new Promise(resolve=>pendingResolve=resolve);live++;return Promise.resolve(response());},createUrl:()=>{creates++;return'blob:abort-'+creates;},revokeUrl(){}});
const interrupted=abortCache.warm('rain');await flush();const oldSignal=signal;abortCache.stop();assert.equal(oldSignal.aborted,true);assert.equal(abortCache.state.entries,0);
const resumed=abortCache.warm('rain');live++;pendingResolve(response());await interrupted;await resumed;assert.equal(abortCache.state.entries,5,'Aborted partial warming can resume without storing late old data');assert.equal(creates,5);abortCache.destroy();

let failures=0;const failRequests=[];
const failuresCache=createNatureVideoCache({canWarm:()=>true,connection:()=>({}),fetcher:async url=>{failRequests.push(url);if(url.endsWith('/rain.mp4')&&failures++===0)throw Error('network');live++;return response();},createUrl:()=> 'blob:ok-'+failRequests.length,revokeUrl(){}});
await failuresCache.warm('fire');assert.equal(failRequests.length,5);for(let i=0;i<8;i++)await failuresCache.warm('fire');assert.equal(failRequests.length,5,'Failures do not retry through player state ticks');failuresCache.retry('rain');await failuresCache.warm('fire');assert.equal(failRequests.length,6);assert.equal(failuresCache.state.entries,5);failuresCache.destroy();

const limited=createNatureVideoCache({maxBytes:10,canWarm:()=>true,connection:()=>({}),fetcher:async()=>{live++;return response(4);},createUrl:()=> 'blob:limited-'+Math.random(),revokeUrl(){}});
await limited.warm('fire');assert.equal(limited.state.bytes,8);assert.equal(limited.state.entries,2);assert.ok(cancelled>=3,'Over-budget bodies are cancelled before buffering');limited.destroy();
const lying=createNatureVideoCache({maxBytes:8,canWarm:()=>true,connection:()=>({}),fetcher:async()=>{live++;return response(30,{declared:1});},createUrl:()=>{assert.fail('Oversized body cannot own a URL');},revokeUrl(){}});
await lying.warm('fire');assert.equal(lying.state.bytes,0);assert.equal(lying.state.inflightBytes,0);lying.destroy();

for(const name of ['index.html','owner.html','share.html']){
 const html=await fs.readFile(new URL('../dist/'+name,import.meta.url),'utf8');const csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 const directive=key=>csp.split(';').find(part=>part.trim().startsWith(key+' '));
 assert.ok(directive('connect-src').includes(NATURE_VIDEO_BASE),name+': native-origin CORS byte fetch needs exact public video prefix');assert.ok(directive('media-src').includes(NATURE_VIDEO_BASE));assert.ok(directive('media-src').includes('blob:'),name+': cached bytes decode through owned Blob URLs');assert.ok(!directive('connect-src').includes('https://skodytunez-maker.github.io '),'Do not broaden the host allowlist');
}
const source=await fs.readFile(new URL('../dist/js/quran-nature-video-cache.js',import.meta.url),'utf8');assert.doesNotMatch(source,/createElement|MediaSession|new Audio|setInterval|setTimeout/,'Byte warming creates no decoder, audio owner or background timer');
let uncancellable=0;const noAbort=createNatureVideoCache({Controller:null,canWarm:()=>true,connection:()=>({}),fetcher:()=>{uncancellable++;throw Error('Must not warm without cancellation');}});await noAbort.warm('fire');assert.equal(uncancellable,0);noAbort.destroy();
console.log('PASS: selected-player-only single-request warming, others-before-current, once-only success/failure, abort/stale completion isolation,16MiB compressed budget, Blob URL ownership/revocation, Save-Data/2g guard and all three native-origin CSP policies.');
