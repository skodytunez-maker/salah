import assert from 'node:assert/strict';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';

const w=new Window({url:'https://salah.invalid/salah/#settings'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,location:w.location});
globalThis.matchMedia=()=>({matches:false});globalThis.isSecureContext=true;globalThis.PushManager=function(){};
let permissionRequests=0,settingsWrites=0,posted=0;
globalThis.Notification={permission:'granted',requestPermission:async()=>{permissionRequests++;return 'granted';}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Chrome',platform:'Win32',serviceWorker:{getRegistration:async()=>({active:true,pushManager:{getSubscription:async()=>null}})}}});
globalThis.fetch=async(_url,options={})=>{if(options.method==='POST')posted++;return new Response(JSON.stringify({publicKey:Buffer.from([4,...Array(64).fill(1)]).toString('base64url')}));};
const{createReminders}=await import('../dist/js/reminders.js');
const host=doc.createElement('main');doc.body.append(host);
const quietPrayers=Object.fromEntries(['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(key=>[key,{atTime:false,beforeMinutes:0,adhan:false}]));
let settings={city:{name:'Тюмень',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'},school:0,reminders:{enabled:true,prayers:quietPrayers,dhikr:{enabled:false,days:3,since:0}}};
const before=JSON.stringify(settings);
const make=()=>createReminders({getSettings:()=>settings,updateSettings:patch=>{settingsWrites++;settings={...settings,...patch};return true;},getContext:()=>({today:'2026-11-14',cityKey:'fixture',timeZone:settings.city.timezone,timingsFor:()=>({})})});
let reminders=make();reminders.mountSettings(host);
for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(host.querySelector('[data-reminder-control="dhikr-days"]'),null,'Daily reminders have no frequency selector');
assert.match(host.querySelector('.reminder-dhikr').textContent,/кажд|ежеднев/i);
assert.equal(host.querySelector('[data-reminder-control="dhikr-enabled"]').checked,false,'Rendering retains the existing category opt-out');
assert.equal(JSON.stringify(settings),before);assert.equal(settingsWrites,0,'Rendering does not silently opt anyone in');
assert.equal(permissionRequests,0,'Opening daily settings never asks for permission');assert.equal(posted,0);
for(const enabled of [true,false]){
 const control=host.querySelector('[data-reminder-control="dhikr-enabled"]');control.checked=enabled;control.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(settings.reminders.dhikr.enabled,enabled);assert.equal(settings.reminders.dhikr.days,1);assert.equal(settings.reminders.enabled,true);
 assert.equal(permissionRequests,0,'Changing the existing daily toggle does not ask for OS permission');
 assert.equal(host.querySelector('[data-reminder-control="dhikr-days"]'),null);
}
const master=host.querySelector('[data-reminder-control="enabled"]');master.checked=false;master.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(settings.reminders.enabled,false);assert.equal(settings.reminders.dhikr.enabled,false);
reminders.destroy();reminders=make();reminders.mountSettings(host);
assert.equal(host.querySelector('[data-reminder-control="enabled"]').checked,false);assert.equal(host.querySelector('[data-reminder-control="dhikr-enabled"]').checked,false);assert.equal(host.querySelector('[data-reminder-control="dhikr-enabled"]').disabled,true);
assert.equal(permissionRequests,0);assert.equal(posted,0,'Changing local choices never sends an unsolicited test push');
reminders.destroy();host.remove();await w.happyDOM.close();
console.log('PASS: daily information replaces the interval selector; existing category/master opt-outs survive rendering, edits and remounting without automatic permission requests or push messages. Isolated DOM only.');
