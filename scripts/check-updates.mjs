import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {APP_VERSION,APP_UPDATED_AT,APP_CHANGES,APP_ANNOUNCEMENT} from '../dist/js/app-release.js';
import {releaseDate,validatedRelease,registerAppWorker,checkAppUpdate,hasSeenAnnouncement} from '../dist/js/pwa-updates.js';
assert.equal(validatedRelease({version:140,date:'2026-02-31',changes:['x']}),null);
assert.equal(validatedRelease({version:'140',date:'2026-10-03',changes:['x']}),null);
assert.equal(validatedRelease({version:140,date:'2026-10-03',changes:[{}]}),null);
assert.equal(validatedRelease({version:140,date:'2026-10-03',changes:['x'.repeat(241)]}),null);
assert.equal(releaseDate('2026-10-03'),'3 октября 2026');
const transitionSource=await readFile(new URL('../dist/js/pwa-updates.js',import.meta.url),'utf8');
const transitionStyles=await readFile(new URL('../dist/style.css',import.meta.url),'utf8');
assert.match(transitionSource,/const RESTORE_FAILSAFE_MS=1800/,'Restoring screen must have a fail-safe');
assert.match(transitionSource,/restoreTransitionTimer=setTimeout\(\(\)=>finishAppUpdateTransition\(\),RESTORE_FAILSAFE_MS\)/,'A failed app startup cannot leave the restoring overlay indefinitely');
assert.match(transitionSource,/clearTimeout\(restoreTransitionTimer\)/,'Normal startup cancels the fail-safe');
assert.match(transitionStyles,/salah-update-restoring::after\{[^}]*background:rgba\(13,19,38,\.12\)/,'Update overlay must remain translucent so the app stays visible');
const values=new Map([['salah:settings','{"school":0,"weather":false}'],['salah:adhkar-progress-v2','{"totals":{"tasbih":17}}']]);
const before=[...values];globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
const docEvents={},winEvents={},workerEvents={},elements=[];let reloads=0,updates=0,intervals=[],automaticMessages=0,toasts=0;
function element(tag){return{tag,children:[],attributes:{},className:'',textContent:'',append(...children){this.children.push(...children);},setAttribute(k,v){this.attributes[k]=v;},remove(){this.removed=true;}};}
globalThis.document={visibilityState:'visible',createElement:element,addEventListener:(k,f)=>docEvents[k]=f,removeEventListener:(k,f)=>{if(docEvents[k]===f)delete docEvents[k];},body:{append:x=>elements.push(x)}};
globalThis.window={addEventListener:(k,f)=>winEvents[k]=f,removeEventListener:(k,f)=>{if(winEvents[k]===f)delete winEvents[k];}};
globalThis.location={reload:()=>reloads++};
const realSetInterval=globalThis.setInterval,realClearInterval=globalThis.clearInterval;
globalThis.setInterval=(fn,ms)=>{const t={fn,ms};intervals.push(t);return t;};globalThis.clearInterval=t=>t.cleared=true;
const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
const oldMessageChannel=globalThis.MessageChannel;
// Deterministic worker-message delivery avoids an OS-thread timing race.
globalThis.MessageChannel=class{constructor(){this.port1={onmessage:null,close(){}};this.port2={postMessage:value=>queueMicrotask(()=>this.port1.onmessage?.({data:value})),close(){}}}};
const upcoming={version:APP_VERSION+1,date:'2026-10-04',changes:['Следующее улучшение']};
const waiting={postMessage(message,ports){if(message.type==='SALAH_RELEASE_INFO')ports[0].postMessage(upcoming);else automaticMessages++;},addEventListener(){}};
const registration={waiting,installing:null,addEventListener(){},update:async()=>updates++};
const serviceWorker={controller:{},addEventListener:(k,f)=>workerEvents[k]=f,register:async()=>{docEvents.pointerdown();return registration;}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker,onLine:true}});
await registerAppWorker({toast:()=>toasts++});await new Promise(r=>setTimeout(r,20));
assert.equal(automaticMessages,0,'Never apply an update after the user starts interacting');assert.equal(reloads,0);
assert.equal(elements.length,0,'Minor waiting builds must stay quiet');
workerEvents.controllerchange();assert.equal(toasts,0,'Silent minor activation must not create a toast');
assert.equal(await checkAppUpdate(),'available');await new Promise(r=>setTimeout(r,20));
const banner=elements.find(x=>x.attributes['aria-label']==='Обновление SALAH');assert.ok(banner,'Manual checking still offers minor builds');
assert.equal(banner.children[0].children[1].textContent,'4 октября 2026 · Что нового','Waiting worker supplies its own release date');
assert.deepEqual([...values],before,'Update detection cannot modify prayer settings or counters');
assert.equal(await checkAppUpdate(),'available');
banner.children[1].children[0].onclick();assert.equal(automaticMessages,1);
workerEvents.controllerchange();workerEvents.controllerchange();assert.equal(reloads,1,'Apply reloads only once');
document.visibilityState='hidden';docEvents.visibilitychange();assert.ok(intervals.at(-1).cleared,'No periodic checks in background');
registration.waiting=null;document.visibilityState='visible';docEvents.visibilitychange();await checkAppUpdate();assert.equal(updates,1);
navigator.onLine=false;assert.equal(await checkAppUpdate(),'offline');
// A dismissed major announcement stays dismissed after a later launch.
const major={version:APP_VERSION+1,date:'2026-10-05',changes:['Крупная функция']};
upcoming.announcement=major;registration.waiting=waiting;navigator.onLine=true;
const startMajor=elements.length;await registerAppWorker();await new Promise(r=>setTimeout(r,20));
assert.equal(elements.length,startMajor+1,'Major waiting feature is announced');
elements.at(-1).children[1].children.at(-1).onclick();
await registerAppWorker();await new Promise(r=>setTimeout(r,20));
assert.equal(elements.length,startMajor+1,'Dismissal survives relaunch');
assert.equal(hasSeenAnnouncement(major),true);
delete upcoming.announcement;registration.waiting=null;values.delete('salah:update-announcement-seen-v2');
// On a quiet launch the actual installed release opens once, without changing personal data.
let releaseDialogs=0;serviceWorker.register=async()=>registration;navigator.onLine=true;
values.delete('salah:update-last-seen-v1');
await registerAppWorker({showRelease:release=>{releaseDialogs++;assert.equal(release.version,APP_ANNOUNCEMENT.version)}});
assert.equal(releaseDialogs,1);assert.equal(values.get('salah:update-announcement-seen-v2'),String(APP_ANNOUNCEMENT.version));
await registerAppWorker({showRelease:()=>releaseDialogs++});assert.equal(releaseDialogs,1);
values.delete('salah:update-last-seen-v1');values.delete('salah:update-announcement-seen-v2');
await registerAppWorker({canShowRelease:()=>false,showRelease:()=>releaseDialogs++});assert.equal(releaseDialogs,1,'Onboarding must not be covered');
values.set('salah:update-last-seen-v1',String(APP_VERSION));values.delete('salah:update-announcement-seen-v2');
await registerAppWorker({showRelease:()=>releaseDialogs++});assert.equal(releaseDialogs,1,'Migration must not repeat already seen news');
values.set('salah:update-last-seen-v1',String(APP_ANNOUNCEMENT.version-1));
await registerAppWorker({showRelease:()=>releaseDialogs++});assert.equal(releaseDialogs,2,'Users who skip a major release see it even on a later minor build');
assert.equal(values.get('salah:settings'),before[0][1]);assert.equal(values.get('salah:adhkar-progress-v2'),before[1][1]);
// A build discovered after launch applies automatically at a resting screen, exactly once.
const realNow=Date.now;let fakeNow=100000,safe=true,installChanged,updateFound,automaticBefore=automaticMessages;
Date.now=()=>fakeNow;registration.waiting=null;registration.installing=null;
registration.addEventListener=(type,fn)=>{if(type==='updatefound')updateFound=fn;};
await registerAppWorker({canAutoUpdate:()=>safe});
const lateWorker={state:'installing',postMessage:waiting.postMessage,addEventListener:(type,fn)=>installChanged=fn};
registration.installing=lateWorker;updateFound();registration.installing=null;registration.waiting=lateWorker;lateWorker.state='installed';
safe=false;installChanged();assert.equal(automaticMessages,automaticBefore,'Reading, counting, forms and playback can block reload');
safe=true;document.visibilityState='hidden';intervals.at(-1).fn();assert.equal(automaticMessages,automaticBefore,'Never auto reload a hidden app');document.visibilityState='visible';
docEvents.pointerdown();fakeNow+=1000;intervals.at(-1).fn();assert.equal(automaticMessages,automaticBefore,'Recent touch delays activation');
fakeNow+=5000;document.activeElement={matches:()=>true};intervals.at(-1).fn();assert.equal(automaticMessages,automaticBefore,'Focused inputs are protected');document.activeElement=null;
document.querySelector=()=>({open:true});intervals.at(-1).fn();assert.equal(automaticMessages,automaticBefore,'An open dialog is protected');document.querySelector=()=>null;
document.documentElement={dataset:{qrLogin:'active'}};intervals.at(-1).fn();assert.equal(automaticMessages,automaticBefore,'An active QR login must not be interrupted by an update');delete document.documentElement.dataset.qrLogin;
intervals.at(-1).fn();assert.equal(automaticMessages,automaticBefore+1,'A late download applies without the Update button');intervals.at(-1).fn();assert.equal(automaticMessages,automaticBefore+1);
const reloadBefore=reloads;workerEvents.controllerchange();workerEvents.controllerchange();assert.equal(reloads,reloadBefore+1);
assert.equal(values.get('salah:settings'),before[0][1]);assert.equal(values.get('salah:adhkar-progress-v2'),before[1][1]);Date.now=realNow;
console.log('PASS: automatic late updates respect foreground, idle input, safe screens and dialogs; personal storage and single activation preserved.');
const events={};const context=vm.createContext({URL,Request,Response,Headers,Map,Set,setTimeout,clearTimeout,AbortController,self:{registration:{scope:'https://example.test/salah/'},location:{origin:'https://example.test'},addEventListener:(k,f)=>events[k]=f}});
vm.runInContext(await readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),context);
let release;events.message({data:{type:'SALAH_RELEASE_INFO'},ports:[{postMessage:v=>release=JSON.parse(JSON.stringify(v))}]});
assert.deepEqual(release,{version:APP_VERSION,date:APP_UPDATED_AT,changes:APP_CHANGES,announcement:APP_ANNOUNCEMENT});
assert.match(vm.runInContext('CACHE',context),new RegExp('v'+APP_VERSION+'$'));
globalThis.setInterval=realSetInterval;globalThis.clearInterval=realClearInterval;globalThis.MessageChannel=oldMessageChannel;Object.defineProperty(globalThis,'navigator',oldNavigator);
console.log('PASS: waiting release metadata, safe dates, visible-only checks, deliberate single reload, settings and counters preserved.');

assert.equal(validatedRelease({version:158,date:'2026-10-04',changes:['Кабинет владельца: список пользователей']}),null);
assert.deepEqual(validatedRelease({version:158,date:'2026-10-04',changes:['Улучшена погода','Изменения админа','Owner release']}).changes,['Улучшена погода']);
assert.ok(APP_CHANGES.every(x=>!/владел|админ|owner|admin/iu.test(x)));
console.log('PASS: private owner notes excluded from installed and waiting public update dialogs.');

// Exercise the actual app callback, not a mocked safe predicate.
const appSource=await readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');
const gateStart=appSource.indexOf('registerAppWorker({toast');
assert.ok(gateStart>=0);
const gateCall=appSource.slice(gateStart,appSource.indexOf('});',gateStart)+3);
let updateGate,reader=null,sync='saved',audio=false;
const gateScope={settings:{onboarded:true},currentRoute:'adhkar',toast(){},registerAppWorker:options=>updateGate=options,
 app:{querySelector:selector=>reader&&selector.split(',').includes(reader)?{}:null},
 counterSyncStatus:()=>({status:sync}),foregroundAudioBusy:()=>audio};
vm.runInNewContext(gateCall,gateScope);
for(const selector of ['.adhkar-shell','.dhikr-list-shell','.lesson-complete','.dua-reader','.quran-reader','.lesson-content']){
 reader=selector;assert.equal(updateGate.canAutoUpdate(),false,'A downloaded update must wait while reading '+selector);
}
reader=null;assert.equal(updateGate.canAutoUpdate(),true,'The collection menu still updates automatically');
gateScope.currentRoute='support';assert.equal(updateGate.canAutoUpdate(),false);
gateScope.currentRoute='home';sync='saving';assert.equal(updateGate.canAutoUpdate(),false);
sync='saved';audio=true;assert.equal(updateGate.canAutoUpdate(),false);
audio=false;assert.equal(updateGate.canAutoUpdate(),true);
console.log('PASS: actual app gate protects reading daily counters, Quran, lessons and support without disabling resting-screen updates.');
