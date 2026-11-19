import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=(await fs.readFile(new URL('../dist/js/city-data.js',import.meta.url),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/\bexport /g,'');
const point={latitude:57.150123,longitude:65.520987};
function fixture(){
 let time=1000,id=0,allowed=true,calls=0,bodyMode='normal',requests=[];const timers=new Map(),late=[];
 class Clock extends Date{static now(){return time;}}
 const fetcher=async(url,options)=>{calls++;requests.push({url:String(url),signal:options.signal});assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');if(bodyMode==='fetch')return new Promise(()=>{});const data=String(url).includes('bigdatacloud')?{city:'Тюмень',countryName:'Россия'}:{timezone:'Asia/Yekaterinburg'};return {ok:true,json:()=>bodyMode==='body'?new Promise(resolve=>late.push(()=>resolve(data))):Promise.resolve(data)};};
 const context=vm.createContext({Date:Clock,Intl,URL,URLSearchParams,AbortController,Map,WeakMap,Error,Promise,personalDataAllowed:()=>allowed,fetch:fetcher,setTimeout:(fn,ms)=>{const key=++id;timers.set(key,{fn,ms});return key;},clearTimeout:key=>timers.delete(key)});
 vm.runInContext(source+'\nglobalThis.lookup={locateCity,searchCities};',context);
 return {locate:(coords=point,options={})=>context.lookup.locateCity(coords,options),search:options=>context.lookup.searchCities('Тюм',options),setAllowed:value=>allowed=value,setMode:value=>bodyMode=value,advance:ms=>time+=ms,setTime:value=>time=value,late,timers,requests,get calls(){return calls;},fire(){for(const [key,timer]of [...timers]){assert.equal(timer.ms,12000);timers.delete(key);timer.fn();}}};
}
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
{
 const f=fixture();const city=await f.locate();assert.equal(f.calls,2);assert.equal(city.name,'Тюмень');city.name='mutated';
 assert.equal((await f.locate()).name,'Тюмень');assert.equal(f.calls,2,'Exact fresh repeat skips BOTH reverse/timezone requests');
 await f.locate({...point,longitude:point.longitude+1e-10});assert.equal(f.calls,4,'Do not round new coordinates to a previous city');
 f.advance(120001);await f.locate();assert.equal(f.calls,6,'Expired answers are revalidated');f.setTime(0);await f.locate();assert.equal(f.calls,8,'Clock rollback cannot keep an answer fresh');
 f.setAllowed(false);await assert.rejects(f.locate());assert.equal(f.calls,8,'Consent policy is checked before the cache');f.setAllowed(true);await f.locate();assert.equal(f.calls,10,'A denied lookup clears its prior cached answer');assert.equal(f.timers.size,0);
}
{
 const f=fixture();for(let i=0;i<9;i++)await f.locate({...point,latitude:57+i*.001});assert.equal(f.calls,18);await f.locate({...point,latitude:57});assert.equal(f.calls,20,'Memory cache is bounded to eight places');
}
for(const mode of ['fetch','body']){
 const f=fixture();f.setMode(mode);const task=f.locate();const rejected=assert.rejects(task,error=>error.name==='TimeoutError');await flush();f.fire();await rejected;assert.equal(f.timers.size,0);assert.ok(f.requests.every(request=>request.signal.aborted));for(const resolve of f.late)resolve();await flush();f.setMode('normal');await f.locate();assert.equal(f.calls,4,'Timed-out/late answers must not populate the cache');
}
{
 const f=fixture();f.setMode('body');const controller=new AbortController(),task=f.locate(point,{signal:controller.signal}),rejected=assert.rejects(task,error=>error.name==='AbortError');await flush();controller.abort();await rejected;for(const resolve of f.late)resolve();await flush();assert.equal(f.timers.size,0);f.setMode('normal');await f.locate();assert.equal(f.calls,4,'Closing a dialog cannot cache a delayed response');
}
{
 const f=fixture(),controller=new AbortController();controller.abort();await assert.rejects(f.locate(point,{signal:controller.signal}),error=>error.name==='AbortError');assert.equal(f.calls,0);assert.equal(f.timers.size,0);
 f.setMode('fetch');const task=f.search(),rejected=assert.rejects(task,error=>error.name==='TimeoutError');await flush();f.fire();await rejected;assert.equal(f.timers.size,0,'City text search uses the same hard cleanup deadline');
}
{
 const f=fixture();f.setMode('body');const coords={...point},task=f.locate(coords);await flush();coords.latitude=0;coords.longitude=0;for(const resolve of f.late)resolve();const city=await task;assert.equal(city.latitude,point.latitude);assert.equal(city.longitude,point.longitude,'An async caller cannot mutate the position after requests start');
}
console.log('PASS: exact-coordinate repeat avoids 2 provider requests;2-minute/eight-entry memory bounds,consent before cache,no rounded city guesses,hard fetch/body deadlines,abort/late response cleanup and stable coordinates.');
