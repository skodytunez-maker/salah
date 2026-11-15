import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const rows=new Map(),events={},origin='https://fixture.invalid',scope=origin+'/salah/';let next=null,calls=0;
const key=request=>new URL(typeof request==='string'?request:request.url,scope).href;
const cache={match:async request=>rows.get(key(request))?.clone(),put:async(request,response)=>rows.set(key(request),response.clone())};
const context={self:{registration:{scope},location:{origin},addEventListener:(type,fn)=>events[type]=fn},caches:{open:async()=>cache},URL,Response,Request,Headers,Date,Map,Set,Promise,Number,Intl,console,setTimeout,clearTimeout,AbortController,fetch:async()=>{calls++;if(next instanceof Error)throw next;return next.clone();}};
vm.createContext(context);vm.runInContext(await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),context);
const response=(body,status=200,headers={})=>{const value=new Response(body,{status,headers});Object.defineProperty(value,'type',{value:'basic'});const clone=value.clone.bind(value);value.clone=()=>{const copy=clone();Object.defineProperty(copy,'type',{value:'basic'});return copy;};return value;};
const image=new Request(scope+'assets/reciters/yasseraldossari.jpg');Object.defineProperty(image,'destination',{value:'image'});
async function serve(request=image){const pending=[],result=await context.serve({request,waitUntil:promise=>pending.push(promise)},new URL(request.url));await Promise.all(pending);return result;}
next=response('incomplete',206,{'Content-Range':'bytes 0-9/100'});assert.equal((await serve()).status,0,'Partial image response is never rendered');assert.equal(rows.size,0);
next=response('incomplete',200,{'Content-Range':'bytes 0-9/100'});assert.equal((await serve()).status,0,'A misleading200 with Content-Range is still partial');assert.equal(rows.size,0);
rows.set(image.url,response('bad cached range',200,{'Content-Range':'bytes 0-15/100'}));next=response('partial',206);assert.equal((await serve()).status,0,'A historical partial cache cannot bypass the image guard');
rows.clear();next=response('complete portrait',200,{'Content-Type':'image/jpeg'});assert.equal(await(await serve()).text(),'complete portrait');assert.equal(await rows.get(image.url).clone().text(),'complete portrait');
next=Error('offline');const before=calls;assert.equal(await(await serve()).text(),'complete portrait');assert.equal(calls,before,'An offline cached portrait remains available without a request');
rows.clear();next=Error('connection dropped');assert.equal((await serve()).status,0,'An interrupted request returns an image error for the existing placeholder path');
const audio=new Request(scope+'assets/sample.mp3');Object.defineProperty(audio,'destination',{value:'audio'});next=response('audio range',206,{'Content-Range':'bytes 0-10/100'});assert.equal((await serve(audio)).status,206,'Valid media range behavior is unchanged');assert.equal(rows.size,0,'Partial media is not added to the shell cache');
console.log('PASS: actual worker rejects partial images, preserves complete offline portraits and keeps media ranges separate.');
