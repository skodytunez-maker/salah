import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {t,getLocale,subscribeLanguage} from '../dist/js/i18n.js';
import {isPublicReleaseChange} from '../dist/js/release-illustrations.js';
import {createUpdateDownloadProgress} from '../dist/js/update-download-progress.js';

const source=await readFile(new URL('../dist/js/pwa-updates.js',import.meta.url),'utf8');
const code=source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport /g,'')+'\nglobalThis.fixture={registerAppWorker,checkAppUpdate};';
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

// Run the real updater in an old supported shell, with the real transition DOM
// branch and a deterministic clock. No worker activation or network is faked by
// calling private functions: only the browser worker transport is a fixture.
async function setup({interactAtRegistration=false,initialAutoSafe=true,waitingOnEntry=true}={}){
 const win=new Window({url:'https://example.test/salah/#home'}),doc=win.document;
 let now=100000,visibility='visible',autoSafe=initialAutoSafe,applySafe=true,applyMessages=0,reloads=0,checkpoint=0,prompts=0,networkChecks=0;
 Object.defineProperty(doc,'visibilityState',{configurable:true,get:()=>visibility});
 Object.defineProperty(doc,'hidden',{configurable:true,get:()=>visibility!=='visible'});
 const values=new Map([['salah:update-announcement-seen-v2','502'],['salah:settings','{"city":"Тюмень","school":0}'],['salah:adhkar-progress-v2','{"totals":{"tasbih":17}}'],['salah:player-session-v1','{"reciter":"yasser","surah":5,"time":2429}']]);
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)},sessionValues=new Map();
 const session={getItem:key=>sessionValues.get(key)??null,setItem:(key,value)=>sessionValues.set(key,String(value)),removeItem:key=>sessionValues.delete(key)};
 const baseline=[...values],timeouts=new Map(),intervals=new Map();let timerId=0;
 const schedule=(fn,ms)=>{const id=++timerId;timeouts.set(id,{fn,at:now+ms});return id;};
 const workerEvents=new Map(),registrationEvents=new Map(),timeline=[];
 const upcoming={version:502,date:'2026-11-15',changes:['Улучшена работа без интернета']};
 const waiting={state:'installed',postMessage(message,ports){if(message.type==='SALAH_APPLY_UPDATE'){applyMessages++;timeline.push('activate');}else if(message.type==='SALAH_RELEASE_INFO')ports[0].postMessage(upcoming);},addEventListener(){}};
 const registration={waiting:waitingOnEntry?waiting:null,installing:null,update:async()=>{networkChecks++;},addEventListener:(name,fn)=>registrationEvents.set(name,fn)};
 const serviceWorker={controller:{},addEventListener:(name,fn)=>workerEvents.set(name,fn),register:async()=>{if(interactAtRegistration)doc.dispatchEvent(new win.Event('pointerdown'));return registration;}};
 win.addEventListener('salah:before-update-reload',()=>{checkpoint++;timeline.push('checkpoint');});
 class ClockDate extends Date{static now(){return now;}}
 const context=vm.createContext({window:win,document:doc,navigator:{onLine:true,serviceWorker},location:{reload(){reloads++;timeline.push('reload');}},Date:ClockDate,Intl,Event:win.Event,localStorage:storage,sessionStorage:session,
  setTimeout:schedule,clearTimeout:id=>timeouts.delete(id),setInterval:(fn,ms)=>{const id=++timerId;intervals.set(id,{fn,ms});return id;},clearInterval:id=>intervals.delete(id),requestAnimationFrame:fn=>{fn();return 1;},
  MessageChannel:class{constructor(){this.port1={onmessage:null,close(){}};this.port2={postMessage:value=>queueMicrotask(()=>this.port1.onmessage?.({data:value}))};}},
  APP_VERSION:359,APP_UPDATED_AT:'2026-10-14',APP_CHANGES:['Старая версия'],APP_ANNOUNCEMENT:{version:359,date:'2026-10-14',changes:['Старая версия']},t,getLocale,subscribeLanguage,isPublicReleaseChange,createUpdateDownloadProgress,
  esc:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),modal:()=>{prompts++;},illustratedReleaseMarkup:()=>'',bindIllustratedRelease:()=>{}});
 vm.runInContext(code,context);
 await context.fixture.registerAppWorker({canAutoUpdate:()=>autoSafe,canApplyUpdate:()=>applySafe,showRelease:()=>{prompts++;}});await settle();
 async function advance(ms){now+=ms;for(const [id,timer] of [...timeouts])if(timer.at<=now){timeouts.delete(id);timer.fn();}await settle();}
 async function tick(){for(const timer of [...intervals.values()])timer.fn();await settle();}
 return{win,doc,values,baseline,sessionValues,timeline,upcoming,registration,
  get applyMessages(){return applyMessages;},get reloads(){return reloads;},get checkpoint(){return checkpoint;},get prompts(){return prompts;},get networkChecks(){return networkChecks;},
  setAutoSafe:value=>{autoSafe=value;},setApplySafe:value=>{applySafe=value;},
  setVisibility:value=>{visibility=value;doc.dispatchEvent(new win.Event('visibilitychange'));},
  interact:()=>doc.dispatchEvent(new win.Event('pointerdown')),
  activate:async()=>{registration.waiting=null;workerEvents.get('controllerchange')();await settle();},
  workerMessage:(data,source)=>workerEvents.get('message')?.({data,source}),
  check:()=>context.fixture.checkAppUpdate(),advance,tick,close:()=>win.happyDOM.close()};
}

// An old shell already uses the existing idle activation mechanism; no new age
// threshold, prompt, receipt or consent bypass is needed to reach the latest.
{
 const f=await setup();assert.equal(f.applyMessages,1,'359 automatically requests the available 502 worker at a resting screen');assert.equal(f.prompts,0);
 await f.activate();assert.equal(f.reloads,0,'The visual transition must complete first');await f.advance(359);assert.equal(f.reloads,0);await f.advance(1);
 assert.equal(f.reloads,1);assert.equal(f.checkpoint,1);assert.deepEqual(f.timeline,['activate','checkpoint','reload']);
 await f.tick();await f.activate();assert.equal(f.reloads,1,'Repeated worker signals cannot reload twice');assert.deepEqual([...f.values],f.baseline,'Settings, history, player checkpoint and announcement receipts are preserved');await f.close();
}

const blockers=[
 ['new text form',f=>{const input=f.doc.createElement('textarea');f.doc.body.append(input);input.focus();return()=>input.remove();}],
 ['new dialog',f=>{const dialog=f.doc.createElement('dialog');dialog.setAttribute('open','');f.doc.body.append(dialog);return()=>dialog.remove();}],
 ['reader or lesson',f=>{f.setAutoSafe(false);return()=>f.setAutoSafe(true);}],
 ['recitation or recording',f=>{f.setApplySafe(false);return()=>f.setApplySafe(true);}],
 ['hidden document',f=>{f.setVisibility('hidden');return()=>f.setVisibility('visible');}],
 ...['quranDownload','quranTextDownload','mushafDownload','qrLogin'].map(key=>[key,f=>{f.doc.documentElement.dataset[key]='active';return()=>delete f.doc.documentElement.dataset[key];}]),
 ['prayer download',f=>{const element=f.doc.createElement('aside');element.dataset.prayerOfflineBusy='';f.doc.body.append(element);return()=>element.remove();}],
 ['fresh trusted interaction',f=>{f.interact();return async()=>f.advance(5000);}]
];
for(const [name,block] of blockers){
 // Guard an automatic request that was already sent before a new activity.
 const f=await setup(),release=block(f);await f.activate();await f.advance(360);assert.equal(f.reloads,0,name+' starting before controllerchange must retain the page');assert.equal(f.checkpoint,0,name+' cannot trigger an early recovery checkpoint');assert.equal(f.doc.documentElement.classList.contains('salah-update-leaving'),false);
 await release();await f.tick();await f.advance(360);assert.equal(f.reloads,1,name+' resumes automatically at a safe screen');assert.equal(f.checkpoint,1);assert.equal(f.applyMessages,1,'The activated worker must not be messaged again');assert.deepEqual([...f.values],f.baseline);await f.close();
 // The same protection must hold if the activity begins during the 360ms fade.
 const g=await setup();await g.activate();assert.equal(g.doc.documentElement.classList.contains('salah-update-leaving'),true);const unblock=block(g);await g.advance(360);
 assert.equal(g.reloads,0,name+' starting during the fade must cancel reload');assert.equal(g.checkpoint,0);assert.equal(g.sessionValues.has('salah:update-reload-transition-v1'),false,'A canceled transition is not persisted');assert.equal(g.doc.documentElement.classList.contains('salah-update-leaving'),false);assert.equal(g.doc.documentElement.classList.contains('salah-update-leaving-active'),false);
 await unblock();await g.tick();await g.advance(360);assert.equal(g.reloads,1);assert.equal(g.checkpoint,1);assert.deepEqual([...g.values],g.baseline);await g.close();
}

// Each genuine foreground entry can discover a new build sooner than the normal
// five-minute poll. Duplicate visibility/pageshow events remain bounded and silent.
{
 const f=await setup({waitingOnEntry:false});assert.equal(f.networkChecks,1);
 f.setVisibility('hidden');await f.advance(31000);f.setVisibility('visible');await settle();assert.equal(f.networkChecks,2,'Returning after30s checks the server without waiting5min');
 f.win.dispatchEvent(new f.win.Event('pageshow'));f.setVisibility('visible');await settle();assert.equal(f.networkChecks,2,'Duplicate entry events do not issue repeated requests');
 await f.tick();assert.equal(f.networkChecks,2,'Periodic polls retain their five-minute network interval');
 await f.advance(30000);f.win.dispatchEvent(new f.win.Event('pageshow'));await settle();assert.equal(f.networkChecks,3,'Restoring a visible cached page also checks for a release');
 f.setVisibility('hidden');await f.advance(30000);f.win.dispatchEvent(new f.win.Event('pageshow'));await settle();assert.equal(f.networkChecks,3,'A hidden pageshow does not poll');
 assert.equal(f.prompts,0,'Automatic entry checks never turn into manual update announcements');assert.deepEqual([...f.values],f.baseline);await f.close();
}

// Deliberate manual checking still exposes the waiting release immediately.
// A manual request retains its existing semantics, including playback safety.
{
 const f=await setup({interactAtRegistration:true,initialAutoSafe:false});assert.equal(f.applyMessages,0);assert.equal(await f.check(),'available');await settle();
 const notice=f.doc.querySelector('.app-update'),button=notice.querySelector('.app-update-actions button');assert.ok(notice,'Manual checking still shows the update inside SALAH');assert.match(notice.textContent,/15 ноября 2026/,'The old shell uses the waiting worker metadata');
 const input=f.doc.createElement('input');f.doc.body.append(input);input.focus();button.click();assert.equal(f.applyMessages,1,'An explicit request can update despite the automatic-only reader/focus guard');
 f.setApplySafe(false);await f.activate();await f.advance(360);assert.equal(f.reloads,0,'Manual activation still cannot interrupt audio');f.setApplySafe(true);await f.tick();await f.advance(360);assert.equal(f.reloads,1);assert.equal(f.checkpoint,1);assert.deepEqual([...f.values],f.baseline);await f.close();
}
console.log('PASS: supported old shell updates to latest at safe idle; form/reader/audio/download/visibility/interaction guards are rechecked at controllerchange and after the 360ms fade; manual notices, checkpoint ordering and personal storage stay intact.');

// Exercise the real manual check -> installing worker -> scoped progress UI path.
{
 const f=await setup({waitingOnEntry:false,initialAutoSafe:false});let changed;
 const worker={state:'installing',addEventListener:(type,fn)=>changed=fn,postMessage(message,ports){if(message.type==='SALAH_UPDATE_PROGRESS_REQUEST')ports[0].postMessage(null);else if(message.type==='SALAH_RELEASE_INFO')ports[0].postMessage({version:534,date:'2026-11-19',changes:['Улучшена работа приложения']});}};
 f.registration.installing=worker;assert.equal(f.doc.querySelector('.app-download-progress'),null);
 assert.equal(await f.check(),'loading');assert.ok(f.doc.querySelector('.app-download-progress'));
 const data={type:'SALAH_UPDATE_PROGRESS',schema:1,version:534,sequence:1,stage:'loading',loaded:370,total:1000,completedFiles:2,totalFiles:8};
 f.workerMessage(data,{});assert.equal(f.doc.querySelector('progress').hasAttribute('value'),false);
 f.workerMessage(data,worker);assert.equal(f.doc.querySelector('progress').value,37);assert.equal(f.applyMessages,0);
 f.registration.installing=null;f.registration.waiting=worker;worker.state='installed';changed();await Promise.resolve();
 assert.equal(f.doc.querySelector('.app-download-progress'),null);assert.equal(f.applyMessages,0,'A progress notice cannot bypass the safe activation gate');
 assert.deepEqual([...f.values],f.baseline);await f.close();
}
console.log('PASS: real manual updater binds progress only to its installing worker and removes it at installation without bypassing activation or changing data.');
