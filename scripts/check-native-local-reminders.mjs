import assert from 'node:assert/strict';
import {buildNativeLocalNotifications,createNativeLocalReminders,nativeLocalNotificationsAvailable} from '../dist/js/native-local-reminders.js';

const DAY=86400000,base=Date.parse('2026-10-04T00:00:00+05:00'),keys=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const hours=[5,13,16,19,21],days={};
for(let offset=0;offset<9;offset++){
 const day=new Date(Date.parse('2026-10-04T12:00:00Z')+offset*DAY).toISOString().slice(0,10);
 days[day]={};
}
const timingsFor=day=>{
 const index=Math.round((Date.parse(day+'T12:00:00Z')-Date.parse('2026-10-04T12:00:00Z'))/DAY);
 if(index<0||index>8)return null;
 return Object.fromEntries(keys.map((key,i)=>[key,base+index*DAY+hours[i]*3600000]));
};
let setting={
 city:{name:'Тюмень',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'},
 reminders:{enabled:true,prayers:Object.fromEntries(keys.map(key=>[key,{atTime:true,beforeMinutes:key==='Fajr'?10:0,adhan:key==='Fajr'}])),adhkar:{morning:{enabled:true,mode:'prayer'},evening:{enabled:true,mode:'prayer'}},jumuah:{enabled:true},tahajjud:{enabled:true}}
};
const context={today:'2026-10-04',timeZone:'Asia/Yekaterinburg',cityKey:'contains-private-coordinates:57.1522:65.5272',days,timingsFor};
const now=base+3*3600000;
const built=buildNativeLocalNotifications(setting,context,{now});
assert.ok(built.length>10&&built.length<=48);
assert.deepEqual(built.map(x=>+x.schedule.at),built.map(x=>+x.schedule.at).sort((a,b)=>a-b));
assert.equal(new Set(built.map(x=>x.id)).size,built.length);
assert.ok(built.every(x=>Number.isInteger(x.id)&&x.id>0&&x.id<=2147483647));
assert.ok(built.every(x=>x.title==='SALAH'&&x.extra.salahReminder===true&&['#home','#adhkar'].includes(x.extra.route)));
const serialized=JSON.stringify(built);
for(const forbidden of ['57.1522','65.5272','latitude','longitude','cityKey'])assert.ok(!serialized.includes(forbidden),forbidden+' must stay out of scheduled notification payloads');
assert.deepEqual(built.map(x=>x.id),buildNativeLocalNotifications(setting,context,{now}).map(x=>x.id),'IDs are stable');
assert.equal(buildNativeLocalNotifications({...setting,reminders:{enabled:false}},context,{now}).length,0);

let permission='prompt',permissionRequests=0,scheduleCalls=0,pending=[{id:2000000000,title:'Another feature',extra:{other:true}}],cancelled=[];
const plugin={
 checkPermissions:async()=>({display:permission}),
 requestPermissions:async()=>{permissionRequests++;permission='granted';return{display:'granted'}},
 getPending:async()=>({notifications:pending.map(x=>({...x}))}),
 cancel:async({notifications})=>{const ids=new Set(notifications.map(x=>x.id));cancelled.push(...ids);pending=pending.filter(x=>!ids.has(x.id))},
 schedule:async({notifications})=>{scheduleCalls++;pending.push(...notifications.map(x=>({...x})));return{notifications:notifications.map(x=>({id:x.id}))}}
};
const cap={Plugins:{LocalNotifications:plugin}};
assert.equal(nativeLocalNotificationsAvailable(cap),true);
const native=createNativeLocalReminders({getSettings:()=>setting,getContext:()=>context,cap});
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(permissionRequests,0,'Opening native SALAH never prompts for notification permission');
assert.equal(scheduleCalls,0,'schedule() is never called before permission is granted because plugin 8.3+ may prompt itself');

let result=await native.requestPermission();
assert.equal(permissionRequests,1,'Only the explicit user action requests permission');
assert.equal(result.status,'updated');
assert.equal(scheduleCalls,1);
assert.ok(pending.some(x=>x.id===2000000000),'Unrelated pending notification is preserved');
assert.ok(pending.some(x=>x.extra?.salahReminder===true));
assert.ok(pending.filter(x=>x.extra?.salahReminder===true).length<=48);

result=await native.sync();
assert.equal(result.status,'unchanged');
assert.equal(scheduleCalls,1,'No repeated reschedule when managed IDs already match');

const managedBefore=pending.filter(x=>x.extra?.salahReminder===true).map(x=>x.id);
setting={...setting,reminders:{...setting.reminders,enabled:false}};
result=await native.sync();
assert.equal(result.status,'cleared');
assert.ok(managedBefore.every(id=>cancelled.includes(id)),'Master-off removes SALAH pending notifications');
assert.ok(pending.some(x=>x.id===2000000000),'Master-off never cancels unrelated pending notifications');
assert.equal(scheduleCalls,1);

setting={...setting,reminders:{...setting.reminders,enabled:true}};
permission='denied';
result=await native.sync(true);
assert.equal(result.status,'permission');
assert.equal(scheduleCalls,1,'Denied permission never reaches schedule()');

permission='granted';
const previousPending=[{id:2000000001,title:'Other',extra:{other:true}},{...built[0]}];pending=previousPending.map(x=>({...x}));
const emptyContext={...context,timingsFor:()=>null};
const noData=createNativeLocalReminders({getSettings:()=>setting,getContext:()=>emptyContext,cap});
await new Promise(resolve=>setTimeout(resolve,0));
assert.ok(pending.some(x=>x.extra?.salahReminder===true),'Missing fresh schedule does not erase a previously valid device reminder set');
noData.destroy();native.destroy();

const pkg=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../mobile/package.json',import.meta.url),'utf8'));
assert.equal(pkg.dependencies['@capacitor/local-notifications'],'8.3.1');
const entry=await (await import('node:fs/promises')).readFile(new URL('../mobile/native/native-entry.js',import.meta.url),'utf8');
assert.match(entry,/registerPlugin\('LocalNotifications'\)/);

console.log('PASS: native local reminders are bounded, private, opt-in only, idempotent, preserve unrelated notifications and never call schedule before permission.');
