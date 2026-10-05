import assert from 'node:assert/strict';
const data=new Map(),requests=[];
globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
globalThis.window=new EventTarget();globalThis.document=new EventTarget();document.visibilityState='visible';
globalThis.matchMedia=()=>({matches:false});globalThis.isSecureContext=true;globalThis.PushManager=function(){};
let permissionRequests=0;
globalThis.Notification={permission:'granted',requestPermission:()=>{permissionRequests++;return Promise.resolve('granted');}};
const sub={toJSON:()=>({endpoint:'https://web.push.apple.com/client-fixture',keys:{p256dh:'fixture',auth:'fixture'}})};
Object.defineProperty(globalThis,'navigator',{value:{userAgent:'Chrome',platform:'Win32',serviceWorker:{getRegistration:async()=>({active:true,pushManager:{getSubscription:async()=>sub}})}},configurable:true});
let prefs={city:{name:'Тюмень',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'},method:3,school:0,highLatitude:3,offsets:{Asr:2},reminders:{enabled:true},weather:true};
data.set('salah:settings',JSON.stringify(prefs));
data.set('salah:push-install-v1',JSON.stringify({id:'7e3c95b2-feba-4c41-9de4-1260d0201d11',token:'a'.repeat(64),saved:true,lastSync:0}));
let outage=false,configOutage=false,waitForConfig=null,configCalls=0,waitForSave=null;
globalThis.fetch=async(url,options)=>{assert.ok(url.startsWith('https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/background-reminders/'));if(outage)throw Error('offline');if(url.endsWith('/config')){configCalls++;if(configOutage)throw Error('config_unavailable');if(waitForConfig)await waitForConfig;}const body=options.body?JSON.parse(options.body):null;requests.push({url,body});if(waitForSave&&body?.preferences){const gate=waitForSave;waitForSave=null;await gate;}return new Response(JSON.stringify(url.endsWith('/config')?{publicKey:Buffer.from([4,...Array(64).fill(1)]).toString('base64url')}:{saved:true}),{status:200});};
const {createPushReminders}=await import('../dist/js/push-reminders.js');
const background=createPushReminders({getSettings:()=>prefs});
for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(permissionRequests,0,'Never prompt when opening the app');
assert.equal(background.active(),true);
assert.equal(requests.find(r=>r.body?.preferences).body.preferences.school,0,'Three-imam setting reaches server unchanged');
const before=requests.length;prefs={...prefs,weather:false};await background.sync();assert.equal(requests.length,before,'Unrelated atmosphere change cannot replace the timetable');
prefs={...prefs,school:1};await background.sync();assert.equal(requests.at(-1).body.preferences.school,1);
prefs={...prefs,reminders:{...prefs.reminders,enabled:false}};await background.sync();assert.equal(requests.at(-1).body.preferences.reminders.enabled,false,'Global off is synchronized');
const chosen=JSON.parse(data.get('salah:settings'));assert.equal(chosen.school,0);assert.equal(chosen.weather,true,'Push synchronization never overwrites local settings');
outage=true;prefs={...prefs,school:0};await background.sync();assert.equal(background.active(),false,'A failed sync must not claim success');
assert.equal(JSON.parse(data.get('salah:push-install-v1')).signature.includes('"school":1'),true,'Failed sync cannot mark new preferences as delivered');
outage=false;await background.sync();assert.equal(background.active(),true);assert.equal(requests.at(-1).body.preferences.school,0,'Retry preserves the unsent choice');
console.log('PASS: no permission prompts at startup, separate device subscription, saved Asr synchronization, unrelated preferences unchanged, master off reaches server, failed writes stay pending and reconnect retry.');

let releaseSave;waitForSave=new Promise(resolve=>{releaseSave=resolve;});
prefs={...prefs,school:1};const firstSave=background.sync();
for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
prefs={...prefs,school:0};await background.sync();
releaseSave();await firstSave;
assert.equal(background.active(),false,'The late acknowledgement cannot claim the newest preference was saved');
await new Promise(resolve=>setTimeout(resolve,1400));
assert.equal(requests.at(-1).body.preferences.school,0,'A choice changed during an in-flight request must be sent next');
assert.equal(background.active(),true);
console.log('PASS: a settings change during a slow save is queued and cannot be lost.');

prefs={...prefs,reminders:{...prefs.reminders,enabled:true,jumuah:{enabled:true}}};await background.sync();
assert.equal(requests.at(-1).body.preferences.reminders.jumuah.enabled,true);
assert.equal(requests.at(-1).body.preferences.reminders.jumuah.time,'09:00');
assert.equal(JSON.parse(data.get('salah:settings')).reminders.jumuah,undefined,'Push sync must never replace existing local choices');
console.log('PASS: Friday choice reaches the private delivery service without changing unrelated settings.');

// A force-check can fail while its saved signature is unchanged. A foreground
// return must confirm the subscription again instead of skipping that retry.
const subscriptions=()=>requests.filter(r=>r.body?.preferences).length;
outage=true;await background.sync(true);assert.equal(background.active(),false);outage=false;
const retryBefore=subscriptions();document.dispatchEvent(new Event('visibilitychange'));
for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(background.active(),true);assert.equal(subscriptions(),retryBefore+1);
assert.equal(permissionRequests,0);
// Recover the public configuration on foreground return, with bounded retries
// and one in-flight request, even if the network never emits another online event.
const controls=new Map(),panel={isConnected:true,innerHTML:'',querySelector:s=>{if(!controls.has(s))controls.set(s,{});return controls.get(s)}};
configOutage=true;const retryConfig=createPushReminders({getSettings:()=>prefs});retryConfig.mount(panel);
for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));
assert.match(panel.innerHTML.match(/<button[^>]*data-push-enable[^>]*>/)[0],/disabled/,'Failed public configuration disables the enable button');
const failedCalls=configCalls;document.dispatchEvent(new Event('visibilitychange'));
for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(configCalls,failedCalls,'No rapid retry loop');
const clock=Date.now;Date.now=()=>clock()+31000;configOutage=false;let releaseConfig;waitForConfig=new Promise(resolve=>releaseConfig=resolve);
try{
 document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('visibilitychange'));
 for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(configCalls,failedCalls+1,'One configuration request in flight');
 releaseConfig();waitForConfig=null;for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.doesNotMatch(panel.innerHTML,/Сервис доставки пока недоступен/);
 assert.doesNotMatch(panel.innerHTML.match(/<button[^>]*data-push-enable[^>]*>/)[0],/disabled/);
 assert.equal(permissionRequests,0,'Retry never asks for new notification permission');
}finally{Date.now=clock}
console.log('PASS: unchanged subscription retries after an outage; failed public configuration recovers on return without an online event, duplicate requests or permission prompts.');

const {pushConnectionReport,waitForPushOperation}=await import('../dist/js/push-reminders.js');
const healthy={supported:true,enabled:true,city:true,permission:'granted',subscription:true,saved:true,current:true,service:true};
assert.equal(pushConnectionReport(healthy).ready,true);
assert.equal(pushConnectionReport({...healthy,saved:false}).checks.at(-1).detail,'Подключите фоновые уведомления.');
for(const missing of [{current:false},{subscription:false},{service:false},{permission:'denied'},{enabled:false},{city:false},{supported:false},{saved:false}])assert.equal(pushConnectionReport({...healthy,...missing}).ready,false);
assert.ok(!JSON.stringify(pushConnectionReport({...healthy,token:'private',email:'private'})).includes('private'));
assert.equal(await waitForPushOperation(Promise.resolve('ready'),5),'ready');
await assert.rejects(waitForPushOperation(Promise.reject(Error('fixture')),5),/fixture/);
await assert.rejects(waitForPushOperation(new Promise(()=>{}),5),/Телефон не ответил/);
const readsBefore=requests.length;
await controls.get('[data-push-diagnose]').onclick();
assert.match(panel.innerHTML,/Подключение готово/);
assert.match(panel.innerHTML,/Доставку проверьте тестовым уведомлением/);
assert.equal(permissionRequests,0,'Connection diagnosis must not ask for permission');
assert.deepEqual(requests.slice(readsBefore).map(r=>r.url.split('/').at(-1)),['config'],'Connection diagnosis cannot subscribe, remove or send a notification');
const originalRegistration=navigator.serviceWorker.getRegistration,originalTimer=globalThis.setTimeout;
navigator.serviceWorker.getRegistration=()=>new Promise(()=>{});
globalThis.setTimeout=(fn,ms,...args)=>originalTimer(fn,ms===10000?5:ms,...args);
try{
 await controls.get('[data-push-diagnose]').onclick();
 assert.match(panel.innerHTML,/Подключение требует внимания/);
 assert.doesNotMatch(panel.innerHTML.match(/<button[^>]*data-push-diagnose[^>]*>/)[0],/disabled/,'A stalled platform API must release the checking button');
}finally{navigator.serviceWorker.getRegistration=originalRegistration;globalThis.setTimeout=originalTimer;}
console.log('PASS: diagnosis detects missing prerequisites, exposes no secrets, only reads configuration, never claims actual delivery, and recovers from a stalled platform API.');
