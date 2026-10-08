import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
const scope='https://example.github.io/salah/',handlers=new Map(),stores=new Map();
let requests=0,offline=false,cacheDenied=false,quota=false,content='art',type='image/webp';
const context={URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
 self:{registration:{scope},location:{origin:new URL(scope).origin},addEventListener:(name,fn)=>handlers.set(name,fn)},
 caches:{open:async name=>{if(cacheDenied)throw Error('storage denied');if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {match:async request=>map.get(typeof request==='string'?request:request.url)?.clone(),put:async(request,response)=>{if(quota)throw Error('quota');map.set(request.url,response.clone());}};}},
 fetch:async request=>{requests++;assert.equal(request.credentials,'omit');if(offline)throw Error('offline');const response=new Response(content,{headers:{'Content-Type':type}});Object.defineProperty(response,'type',{value:'basic'});return response;}
};
vm.runInNewContext(source,context);
assert.equal(requests,0,'Installing the worker source does not download optional artwork');
const send=async(path,headers={})=>{let response;const tasks=[];handlers.get('fetch')({request:new Request(new URL(path,scope),{headers}),respondWith:value=>response=value,waitUntil:value=>tasks.push(value)});const result=await response;await Promise.all(tasks);return result;};
const day='assets/window-new-york-day-tablet-v1.webp';
assert.equal(await (await send(day)).text(),'art');assert.equal(requests,1);
offline=true;assert.equal(await (await send(day)).text(),'art');assert.equal(requests,1,'Saved tablet art works offline without another request');offline=false;
type='text/html';assert.equal((await send('assets/window-new-york-night-tablet-v1.webp')).status,0,'Error pages never poison artwork cache');
type='image/webp';content='x'.repeat(3145729);assert.equal((await send('assets/window-new-york-night-tablet-v1.webp')).status,0,'Oversize responses are not stored');
content='art';cacheDenied=true;assert.equal(await (await send('assets/window-new-york-night-tablet-v1.webp')).text(),'art','Unavailable cache must not prevent online artwork');cacheDenied=false;quota=true;assert.equal(await (await send('assets/window-new-york-night-tablet-v1.webp')).text(),'art','Quota failure must not discard a valid image');quota=false;
const before=requests;
for(const [path,headers]of [[day,{Authorization:'Bearer private'}],[day,{Range:'bytes=0-9'}],[day+'?private=1',{}],['assets/unlisted-user-photo.webp',{}],['https://another.example/art.webp',{}]])assert.equal(await send(path,headers),undefined);
assert.equal(requests,before,'Private, foreign, range and unlisted requests bypass this cache');
console.log('PASS: optional tablet artwork downloads only on selection, stays offline, omits credentials and rejects private/unlisted/oversize/error responses.');
