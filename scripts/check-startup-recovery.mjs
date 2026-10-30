import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../dist/js/app-recover.js',import.meta.url),'utf8');
const html=await fs.readFile(new URL('../dist/recover.html',import.meta.url),'utf8');
assert.match(html,/<script defer src="\.\/js\/app-recover\.js"><\/script>/);
assert.doesNotMatch(html,/type="module"|src="\.\/js\/app\.js"/,'Recovery cannot depend on the broken main module');
function events(object={}){const listeners=new Map();return Object.assign(object,{
 addEventListener(type,listener){const set=listeners.get(type)||new Set();set.add(listener);listeners.set(type,set);},
 removeEventListener(type,listener){listeners.get(type)?.delete(listener);},
 emit(type){for(const listener of [...(listeners.get(type)||[])])listener();}
});}
async function run({version=419,waiting=false,offline=false,noWorker=false,registerFails=false}={}){
 const messages=[],navigation=[],button={disabled:false},status={textContent:''};
 const saved=new Map([['account','signed-in'],['counter','123'],['settings','city']]),before=[...saved];
 const worker=events({state:waiting?'installed':'activated',postMessage(message,ports){
  messages.push(message.type);
  if(message.type==='SALAH_RELEASE_INFO')ports[0].postMessage({version});
  else if(message.type==='SALAH_APPLY_UPDATE')queueMicrotask(()=>{this.state='activated';this.emit('statechange');});
 }});
 const registration=events({active:waiting?null:worker,waiting:waiting?worker:null,installing:null,update:async()=>{}});
 const serviceWorker={register:async(path,options)=>{assert.equal(path,'./sw.js');assert.equal(options.updateViaCache,'none');if(registerFails)throw Error('offline');return registration;}};
 const context={document:{getElementById:id=>id==='repair-app'?button:status},navigator:{onLine:!offline,...(noWorker?{}:{serviceWorker})},location:{replace:route=>navigation.push(route)},
  MessageChannel:class{constructor(){this.port1={onmessage:null,close(){}};this.port2={postMessage:value=>queueMicrotask(()=>this.port1.onmessage?.({data:value}))};}},
  setTimeout:(fn,ms)=>setTimeout(fn,ms===30000?20:ms),clearTimeout,queueMicrotask,
  localStorage:{getItem:key=>saved.get(key),setItem(){assert.fail('Recovery must preserve local data');},clear(){assert.fail('Recovery must preserve local data');}},
  caches:{delete(){assert.fail('Recovery must not delete personal/media caches');}}};
 vm.runInNewContext(source,context);
 const pending=button.onclick();await button.onclick();await pending;
 assert.deepEqual([...saved],before);
 return {messages,navigation,button,status};
}
for(const waiting of [false,true]){
 const result=await run({waiting});assert.deepEqual(result.navigation,['./#home']);assert.equal(result.button.disabled,true);
 assert.equal(result.messages.filter(x=>x==='SALAH_APPLY_UPDATE').length,waiting?1:0);
}
for(const options of [{version:418},{offline:true},{registerFails:true}]){
 const result=await run(options);assert.deepEqual(result.navigation,[]);assert.equal(result.button.disabled,false);
 assert.match(result.status.textContent,/Не удалось/);
 assert.ok(!result.messages.includes('SALAH_APPLY_UPDATE'),'Never activate the broken 418 worker');
}
assert.deepEqual((await run({noWorker:true})).navigation,['./#home']);
console.log('PASS: independent recovery activates only corrected releases, waits for activation, handles offline/retry, and preserves account/settings/counters.');

// The installed iPhone shortcut must recover without opening Safari or reinstalling.
const workerSource=await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
async function upgrade(previousVersion,failInstall=false){
 const handlers={},cached=new Map(),deleted=[],navigated=[];let skipped=0,claimed=0,bundled=false;
 const cache={async addAll(requests){assert.ok(requests.length>400);if(failInstall)throw Error('network');bundled=true;},async put(key,response){cached.set(key,response);},async match(key){return cached.get(key)?.clone();},async delete(key){return cached.delete(key);}};
 const previous=previousVersion==null?null:{postMessage(message,ports){assert.equal(message.type,'SALAH_RELEASE_INFO');ports[0].postMessage({version:previousVersion});}};
 const windowFor=url=>({url,async navigate(target){
  const original=new URL(url),next=new URL(target);
  assert.equal(next.origin,original.origin);assert.equal(next.pathname,original.pathname);assert.equal(next.hash,original.hash);
  assert.equal(next.searchParams.get('salah-repair'),'426','Force a new document rather than a fragment-only navigation');
  for(const[key,value]of original.searchParams)assert.equal(next.searchParams.get(key),value);
  assert.ok(bundled,'Cache the complete corrected app before reopening');navigated.push(target);
 }});
 const scope='https://example.test/salah/';
 const self={registration:{scope,active:previous},location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn,
  skipWaiting:async()=>{assert.ok(bundled);skipped++;},
  clients:{claim:async()=>{claimed++;},matchAll:async()=>[
   windowFor(scope+'#adhkar'),windowFor(scope+'index.html?entry=shortcut#more'),
   windowFor(scope+'recover.html'),windowFor(scope+'owner.html#admin'),
   windowFor('https://example.test/another-app/'),windowFor('https://other.test/salah/')
  ]}};
 const context=vm.createContext({self,URL,Request,Response,Headers,Map,Set,Promise,AbortController,setTimeout,clearTimeout,
  MessageChannel:class{constructor(){this.port1={onmessage:null,close(){}};this.port2={postMessage:data=>queueMicrotask(()=>this.port1.onmessage?.({data}))};}}});
 vm.runInContext(workerSource,context);
 const cacheName=vm.runInContext('CACHE',context);
 context.caches={open:async name=>{assert.equal(name,cacheName);return cache;},keys:async()=>[cacheName,'salah-shell-v418','salah-quran-audio-v1'],delete:async name=>{deleted.push(name);return true;}};
 let installing;handlers.install({waitUntil:promise=>installing=promise});
 if(failInstall){await assert.rejects(installing,/network/);assert.equal(skipped,0);assert.equal(claimed,0);return;}
 await installing;
 let activating;handlers.activate({waitUntil:promise=>activating=promise});await activating;
 assert.equal(claimed,1);assert.deepEqual(deleted,['salah-shell-v418'],'Keep Quran and personal/media caches');
 assert.equal(skipped,previousVersion===418?1:0);
 assert.deepEqual(navigated,previousVersion===418?[scope+'?salah-repair=426#adhkar',scope+'index.html?entry=shortcut&salah-repair=426#more',scope+'owner.html?salah-repair=426#admin']:[],
  'Reopen existing broken main and owner shortcuts; preserve routes and leave recovery/other apps alone');
}
await upgrade(418);await upgrade(416);await upgrade(null);await upgrade(418,true);
console.log('PASS: a confirmed broken 418 installation recovers its existing Home Screen windows automatically; working releases and failed downloads do not bypass waiting.');
