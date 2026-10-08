import assert from 'node:assert/strict';
import {buildPrayerWidgetSnapshot,syncNativePrayerWidget} from '../dist/js/native-widget.js';

const city={name:'Тюмень',timezone:'Asia/Yekaterinburg',latitude:57.15,longitude:65.53};
const base=Date.parse('2026-10-04T00:00:00+05:00');
const dayTimes=offset=>({
  Fajr:base+offset*86400000+5*3600000,
  Sunrise:base+offset*86400000+7*3600000,
  Dhuhr:base+offset*86400000+13*3600000,
  Asr:base+offset*86400000+16*3600000,
  Maghrib:base+offset*86400000+19*3600000,
  Isha:base+offset*86400000+21*3600000
});
const days={
  '2026-10-04':{hijri:{day:'22',year:'1448',month:{number:4,en:'Rabi Al-Akhar',ar:'ربيع الآخر'}}},
  '2026-10-05':{hijri:{day:'23',year:'1448',month:{number:4,en:'Rabi Al-Akhar'}}}
};
const timingsFor=(day)=>{
  if(day==='2026-10-04')return dayTimes(0);
  if(day==='2026-10-05')return dayTimes(1);
  return null;
};
const snapshot=buildPrayerWidgetSnapshot({city,method:3,school:1,startDay:'2026-10-04',days,timingsFor,generatedAt:base,maxDays:7});
assert.equal(snapshot.schemaVersion,1);
assert.equal(snapshot.cityName,'Тюмень');
assert.equal(snapshot.timezone,'Asia/Yekaterinburg');
assert.deepEqual(snapshot.calculation,{method:3,school:1});
assert.equal(snapshot.days.length,2);
assert.equal(snapshot.days[0].prayers.Asr,dayTimes(0).Asr);
assert.equal(snapshot.days[0].hijri.month.number,4);
assert.ok(!JSON.stringify(snapshot).includes('latitude'));
assert.ok(!JSON.stringify(snapshot).includes('longitude'));

assert.equal(buildPrayerWidgetSnapshot({city:null,startDay:'2026-10-04',days,timingsFor}),null);
assert.equal(buildPrayerWidgetSnapshot({city,startDay:'bad',days,timingsFor}),null);
assert.equal(buildPrayerWidgetSnapshot({city,startDay:'2026-10-04',days:{},timingsFor}),null);

const calls=[];
const cap={Plugins:{SalahWidget:{updateSnapshot:async value=>calls.push(['update',value]),clearSnapshot:async()=>calls.push(['clear'])}}};
let result=await syncNativePrayerWidget({city,method:3,school:1,startDay:'2026-10-04',days,timingsFor,generatedAt:base},{cap});
assert.equal(result.status,'updated');assert.equal(calls.length,1);
result=await syncNativePrayerWidget({city,method:3,school:1,startDay:'2026-10-04',days,timingsFor,generatedAt:base},{cap});
assert.equal(result.status,'unchanged');assert.equal(calls.length,1);
result=await syncNativePrayerWidget({city:null,startDay:'2026-10-04',days,timingsFor},{cap});
assert.equal(result.status,'cleared');assert.equal(calls.at(-1)[0],'clear');

console.log('PASS: widget snapshot is bounded, privacy-safe, versioned and bridge delivery deduplicates.');

// Metadata timestamps do not change the displayed schedule.
await syncNativePrayerWidget({city,method:3,school:1,startDay:'2026-10-04',days,timingsFor,generatedAt:base},{cap});
const count=calls.length;
assert.equal((await syncNativePrayerWidget({city,method:3,school:1,startDay:'2026-10-04',days,timingsFor,generatedAt:base+10000},{cap})).status,'unchanged');assert.equal(calls.length,count);
let unblock,shown=null;
const slowCap={Plugins:{SalahWidget:{updateSnapshot:async({snapshot})=>{if(!unblock)await new Promise(resolve=>unblock=resolve);shown=snapshot.cityName;},clearSnapshot:async()=>{shown=null;}}}};
const old=syncNativePrayerWidget({city:{...city,name:'Old city'},startDay:'2026-10-04',days,timingsFor,generatedAt:base},{cap:slowCap});
await new Promise(resolve=>setTimeout(resolve,0));
const latest=syncNativePrayerWidget({city:{...city,name:'Latest city'},startDay:'2026-10-04',days,timingsFor,generatedAt:base},{cap:slowCap});
unblock();await old;await latest;assert.equal(shown,'Latest city','A slow old-city update cannot win over the new one');
let finish;
const clearingCap={Plugins:{SalahWidget:{updateSnapshot:async({snapshot})=>{await new Promise(resolve=>finish=resolve);shown=snapshot.cityName;},clearSnapshot:async()=>{shown=null;}}}};
const writing=syncNativePrayerWidget({city,startDay:'2026-10-04',days,timingsFor,generatedAt:base},{cap:clearingCap});await new Promise(resolve=>setTimeout(resolve,0));
const clearing=syncNativePrayerWidget({city:null,startDay:'2026-10-04',days,timingsFor},{cap:clearingCap});finish();await writing;await clearing;assert.equal(shown,null,'Clearing after a slow update leaves the widget empty');
let isolated=0;const separate={Plugins:{SalahWidget:{updateSnapshot:async()=>isolated++}}};
assert.equal((await syncNativePrayerWidget({city,method:3,school:1,startDay:'2026-10-04',days,timingsFor,generatedAt:base},{cap:separate})).status,'updated');assert.equal(isolated,1,'Delivery state is isolated per native bridge');
console.log('PASS: timestamp-only changes deduplicate, city updates serialize, late writes cannot undo clearing and independent bridges do not share receipts. Native delivery mocked.');

assert.equal((await syncNativePrayerWidget({city:null,startDay:'2026-10-04',days,timingsFor},{cap:separate})).status,'unavailable','Missing clear method must not claim deletion');
let attempts=0;const failing={Plugins:{SalahWidget:{updateSnapshot:async()=>{attempts++;if(attempts===1)throw Error('bridge failure');}}}};
await assert.rejects(syncNativePrayerWidget({city,startDay:'2026-10-04',days,timingsFor,generatedAt:base},{cap:failing}));
assert.equal((await syncNativePrayerWidget({city,startDay:'2026-10-04',days,timingsFor,generatedAt:base},{cap:failing})).status,'updated');assert.equal(attempts,2,'Failed bridge calls do not poison the retry queue');
