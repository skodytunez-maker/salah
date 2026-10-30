import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {ALPHABET_RECORDINGS} from '../dist/js/arabic-alphabet-recordings.js';

const source=await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
const handlers=new Map(),stores=new Map(),requests=[];
let offline=false,partial=false;
const payload=Uint8Array.from({length:256},(_,i)=>i);
const key=request=>typeof request==='string'?request:request.url;
const caches={async open(name){
 if(!stores.has(name))stores.set(name,new Map());const entries=stores.get(name);
 return {async match(request){return entries.get(key(request))?.clone();},async put(request,response){entries.set(key(request),response.clone());}};
}};
const scope='https://fixture.invalid/salah/';
const self={registration:{scope},location:new URL(scope),addEventListener(type,handler){handlers.set(type,handler);}};
const context=vm.createContext({self,caches,URL,Request,Response,Headers,Map,Set,Promise,AbortController,setTimeout,clearTimeout,
 fetch:async request=>{requests.push({url:request.url,range:request.headers.get('Range')});if(offline)throw Error('offline');
  if(partial&&request.headers.has('Range'))return new Response(payload.slice(0,2),{status:206,headers:{'Content-Type':'audio/mpeg','Content-Range':'bytes 0-1/256'}});
  return new Response(payload,{headers:{'Content-Type':'audio/mpeg'}});
 }});
vm.runInContext(source,context);
const assets=JSON.parse(source.match(/const ASSETS=(\[[^;]+\]);/)[1]);
assert.ok(!assets.some(path=>/\/alphabet-audio\/.*\.(mp3|wav)$/.test(path)),'Installing shell never downloads recordings');
assert.equal(requests.length,0);
async function get(path,headers={},method='GET'){
 const request=new Request(new URL(path,scope),{headers,method}),tasks=[];let response;
 handlers.get('fetch')({request,waitUntil(task){tasks.push(task);},respondWith(task){response=task;}});
 if(!response)return null;
 const result=await response;for(let i=0;i<tasks.length;i++)await tasks[i];return result;
}
for(const path of Object.values(ALPHABET_RECORDINGS)){
 const response=await get(path);assert.equal(response.status,200);
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),payload);
}
assert.equal(requests.length,29);assert.equal(stores.get('salah-alphabet-audio-v1').size,29);
assert.ok(!stores.has('salah-adhan-audio-v1'),'Letter clips do not share the Azan cache');
offline=true;
for(const range of ['bytes=0-1','bytes=250-','bytes=-3']){
 const response=await get(ALPHABET_RECORDINGS.alif,{Range:range});assert.equal(response.status,206);
 const expected=range==='bytes=0-1'?payload.slice(0,2):range==='bytes=250-'?payload.slice(250):payload.slice(253);
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),expected);
 assert.equal(Number(response.headers.get('Content-Length')),expected.length);
}
assert.equal((await get(ALPHABET_RECORDINGS.alif,{Range:'bytes=999-'})).status,416);
assert.equal(requests.length,29,'Offline repeat and iOS range requests never reach network');
for(const path of ['assets/alphabet-audio/unknown.mp3','assets/alphabet-audio/alif.mp3?private=1','https://other.invalid/salah/assets/alphabet-audio/alif.mp3','../other/assets/alphabet-audio/alif.mp3'])assert.equal(await get(path),null,'Only allowlisted same-project recordings handled');
assert.equal(await get(ALPHABET_RECORDINGS.ba,{Authorization:'Bearer private'}),null);
assert.equal(await get(ALPHABET_RECORDINGS.ba,{},'POST'),null);
// iOS may first request a short range: cache the full response separately for offline reuse.
stores.get('salah-alphabet-audio-v1').clear();offline=false;partial=true;
assert.equal((await get(ALPHABET_RECORDINGS.ba,{Range:'bytes=0-1'})).status,206);
assert.deepEqual(requests.slice(-2).map(r=>r.range),['bytes=0-1',null]);
offline=true;
const full=await get(ALPHABET_RECORDINGS.ba);assert.equal(full.status,200);assert.deepEqual(new Uint8Array(await full.arrayBuffer()),payload);
// Generalizing the cache handler must preserve existing Azan offline playback.
offline=false;partial=false;await get('./assets/audio/adhan-makkah.mp3');offline=true;
assert.equal((await get('./assets/audio/adhan-makkah.mp3',{Range:'bytes=0-1'})).status,206);
assert.equal(stores.get('salah-adhan-audio-v1').size,1);
assert.equal(stores.get('salah-alphabet-audio-v1').size,1);
const manifest=JSON.parse(await fs.readFile(new URL('../dist/data/alphabet-audio-sources.json',import.meta.url),'utf8'));
assert.deepEqual(manifest.recordings.map(row=>row.id).sort(),Object.keys(ALPHABET_RECORDINGS).sort());
for(const row of manifest.recordings){
 const wav=await fs.readFile(new URL('../dist/'+row.localFile,import.meta.url));
 assert.ok(wav.toString('ascii',0,3)==='ID3'||wav[0]===255,'MP3 header');
 assert.equal(row.license,'MIT');assert.equal(row.performer,null);assert.ok(row.gainDb>0);assert.equal(row.bytes,wav.length);
}
console.log('PASS: 28 on-demand recordings, offline repeat, iOS byte ranges, partial-download completion, cache isolation, auth/scope bypass, MP3 headers and attribution.');
