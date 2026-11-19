import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {updateResourceSizes} from './build-update-resource-sizes.mjs';
import {validUpdateProgress,updatePercent,createUpdateDownloadProgress} from '../dist/js/update-download-progress.js';
import {UI_CATALOGUES} from '../dist/js/i18n-catalogues.js';
const manifest=await updateResourceSizes({check:true});assert.ok(manifest.files>600&&manifest.bytes>50000000);
const source=await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
const names=Array.from({length:8},(_,i)=>'./asset'+i),sizes=Object.fromEntries(names.map((name,i)=>[name,(i+1)*32])),total=Object.values(sizes).reduce((a,b)=>a+b,0);
async function install({bad=null,quota=false,fail=false,slowCache=false}={}){
 const handlers={},messages=[],saved=[],scope='https://example.test/salah/';let active=0,maximum=0,skipped=0,claimed=0,releaseCache;
 const clients=[{url:scope+'#home',postMessage:value=>messages.push(structuredClone(value))},{url:'https://example.test/other/',postMessage:()=>assert.fail('Other app saw progress')},{url:'https://other.test/salah/',postMessage:()=>assert.fail('Other origin saw progress')}];
 const self={registration:{scope,active:null},location:{origin:'https://example.test'},clients:{matchAll:async()=>clients,claim:async()=>claimed++},skipWaiting:async()=>skipped++,addEventListener:(type,fn)=>handlers[type]=fn};
 let releasePut;const putGate=new Promise(resolve=>releasePut=resolve);
 const context=vm.createContext({self,URL,Request,Response,Headers,Map,Set,Promise,AbortController,setTimeout,clearTimeout,
  caches:{open:async()=>({put:async(request,response)=>{if(quota)throw Error('quota');const bytes=new Uint8Array(await response.arrayBuffer());assert.equal(bytes.length,sizes['./'+new URL(request.url).pathname.split('/').at(-1)]);assert.ok(bytes.every(value=>value===7),'Original resource bytes must survive caching');if(slowCache)await putGate;saved.push(request.url);},delete:async()=>true}),keys:async()=>[],delete:async()=>{throw Error('Old cache must not be deleted during install');}},
  fetch:async request=>{assert.equal(request.cache,'no-cache','HTTP cache must revalidate changed assets');assert.equal(request.method,'GET');assert.equal(request.headers.has('Authorization'),false);active++;maximum=Math.max(maximum,active);await Promise.resolve();active--;if(fail)throw Error('network');const name='./'+new URL(request.url).pathname.split('/').at(-1),size=sizes[name];
   const bytes=new Uint8Array(size);bytes.fill(7);const stream=new ReadableStream({start(controller){controller.enqueue(bytes.slice(0,size/2));controller.enqueue(bytes.slice(size/2));controller.close();}});
   return new Response(stream,{status:bad==='partial'?206:200,headers:{'Content-Length':'2','Content-Encoding':'gzip',...(bad==='range'?{'Content-Range':'bytes 0-1/2'}:{}),...(bad==='vary'?{'Vary':'*'}:{})}});
  }});
 let patched=source.replace(/const ASSETS=[^\r\n]+;/,'const ASSETS='+JSON.stringify(names)+';').replace(/const UPDATE_RESOURCE_BYTES=[^\r\n]+;/,'const UPDATE_RESOURCE_BYTES='+JSON.stringify(sizes)+';');
 if(bad==='size')patched=patched.replace('const UPDATE_RESOURCE_BYTES='+JSON.stringify(sizes)+';','const UPDATE_RESOURCE_BYTES='+JSON.stringify({...sizes,'./asset0':1})+';');
 vm.runInContext(patched,context);let task;handlers.install({waitUntil:value=>task=value});
 if(slowCache){for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));assert.ok(!messages.some(value=>value.stage==='ready'),'100% waits for all cache writes');releasePut();}
 if(bad||quota||fail){await assert.rejects(task);assert.ok(!messages.some(value=>value.stage==='ready'));assert.equal(skipped,0);assert.equal(claimed,0);assert.equal(messages.at(-1).stage,'failed');}
 else{await task;assert.equal(saved.length,names.length);assert.ok(maximum<=6);const last=messages.at(-1);assert.equal(last.stage,'ready');assert.equal(last.loaded,total);assert.equal(last.total,total,'Count decoded bytes, not compressed Content-Length');assert.equal(last.completedFiles,8);assert.equal(updatePercent(last),100);assert.equal(skipped,0,'Normal installs keep the activation gate');assert.equal(claimed,0);for(const message of messages){assert.deepEqual(Object.keys(message).sort(),['completedFiles','loaded','schema','sequence','stage','total','totalFiles','type','version'].sort(),'Only public progress metadata may be broadcast');if(message.stage==='loading')assert.ok(updatePercent(message)<100);}
  let response=null;handlers.message({source:{url:scope},data:{type:'SALAH_UPDATE_PROGRESS_REQUEST'},ports:[{postMessage:value=>response=value}]});assert.equal(response.stage,'ready');response=null;handlers.message({source:{url:'https://example.test/other/'},data:{type:'SALAH_UPDATE_PROGRESS_REQUEST'},ports:[{postMessage:value=>response=value}]});assert.equal(response,null);
 }
}
await install();await install({slowCache:true});for(const bad of ['partial','range','vary','size'])await install({bad});await install({quota:true});await install({fail:true});

const base={type:'SALAH_UPDATE_PROGRESS',schema:1,version:534,sequence:1,stage:'loading',loaded:100,total:1000,completedFiles:1,totalFiles:8};
for(const value of [{...base,loaded:-1},{...base,version:533},{...base,total:NaN},{...base,stage:'ready'},{...base,loaded:1001},{...base,totalFiles:0}])assert.equal(validUpdateProgress(value,533),null);
assert.equal(updatePercent({...base,loaded:1000}),99);
const win=new Window({url:'https://example.test/salah/'}),doc=win.document;let now=0,language='ru',paintLanguage=null,listener=null,removed=0;
const serviceWorker={addEventListener:(name,fn)=>{assert.equal(name,'message');listener=fn;},removeEventListener:(name,fn)=>{if(listener===fn){listener=null;removed++;}}};
class Channel{constructor(){this.port1={onmessage:null,close(){}};this.port2={postMessage:value=>this.port1.onmessage?.({data:value})};}}
const worker={postMessage:(message,ports)=>{assert.equal(message.type,'SALAH_UPDATE_PROGRESS_REQUEST');ports[0].postMessage(null);}};
const t=(key,params={})=>Object.entries(params).reduce((value,[name,replacement])=>value.replaceAll('{'+name+'}',String(replacement)),UI_CATALOGUES[language][key]);
const ui=createUpdateDownloadProgress({t,subscribeLanguage:fn=>{paintLanguage=fn;return()=>paintLanguage=null;},serviceWorker,currentVersion:533,doc,now:()=>now,Channel});
assert.equal(doc.querySelector('.app-download-progress'),null,'Automatic checks stay quiet');ui.start(worker);
const progress=()=>doc.querySelector('progress'),text=()=>doc.querySelector('.app-download-copy').textContent;
assert.equal(progress().hasAttribute('value'),false,'Unknown/native/legacy progress must not fabricate percentages');
listener({source:{},data:base});assert.equal(progress().hasAttribute('value'),false,'Reject unrelated worker');
listener({source:worker,data:base});assert.equal(progress().value,10);assert.ok(!text().includes('Примерно'));
now=2000;listener({source:worker,data:{...base,sequence:2,loaded:200}});now=4000;listener({source:worker,data:{...base,sequence:3,loaded:300}});assert.match(text(),/Примерно/,'ETA appears only after real transfer samples');
const before=text();listener({source:worker,data:{...base,sequence:2,loaded:500}});assert.equal(text(),before,'Ignore reordered/stale broadcasts');
for(language of Object.keys(UI_CATALOGUES)){paintLanguage();assert.ok(!/pwaUi\.|undefined/.test(text()));assert.equal(progress().value,30);}
language='ru';now=14000;listener({source:worker,data:{...base,sequence:4,loaded:310}});assert.match(text(),/мин/,'A slowing connection revises the estimate upward');
listener({source:worker,data:{...base,sequence:5,stage:'ready',loaded:1000,completedFiles:8}});assert.equal(progress().value,100);
const ready=text();listener({source:worker,data:{...base,sequence:6,loaded:500}});assert.equal(text(),ready,'Ready cannot regress');
doc.querySelector('button').click();assert.equal(doc.querySelector('.app-download-progress'),null,'Close hides the notice without applying/cancelling the update');ui.finish();assert.equal(listener,null);assert.equal(paintLanguage,null);assert.ok(removed>0);await win.happyDOM.close();
console.log('PASS: real streamed shell bytes, conditional cache requests, bounded concurrency, cache-write completion, failures/privacy, measured progress/ETA, 8 languages, legacy unknown state and cleanup.');
