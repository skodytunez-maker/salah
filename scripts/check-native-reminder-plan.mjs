import assert from 'node:assert/strict';
import {buildNativeReminderPlan} from '../dist/js/native-reminder-plan.js';
import {localTimestamp,shiftDay} from '../dist/js/reminder-events.js';
const zone='Asia/Yekaterinburg',today='2026-10-08',now=localTimestamp(today,'04:00',zone);
const prefs={enabled:true,voice:'mishary',prayers:{Fajr:{atTime:true,beforeMinutes:10,adhan:true}},adhkar:{morning:{enabled:true,mode:'time',time:'07:00'}},jumuah:{enabled:true}};
const context={today,cityKey:'test-city',timeZone:zone,timingsFor:day=>Object.fromEntries([['Fajr','05:00'],['Dhuhr','12:00'],['Asr','15:00'],['Maghrib','18:00'],['Isha','20:00']].map(([key,time])=>[key,localTimestamp(day,time,zone)]))};
const plan=buildNativeReminderPlan(prefs,context,{now});
assert.ok(plan.events.length>35);assert.equal(new Set(plan.events.map(e=>e.id)).size,plan.events.length);
assert.ok(plan.events.every(e=>e.at>now&&e.at<localTimestamp(shiftDay(today,7),'00:00',zone)));
assert.equal(plan.events.filter(e=>e.kind==='jumuah').length,1);
assert.equal(plan.events.find(e=>e.kind==='jumuah').at,localTimestamp('2026-10-09','09:00',zone));
assert.ok(plan.events.filter(e=>e.adhan).every(e=>e.key==='Fajr'&&e.voice==='mishary'));
assert.equal(plan.events.find(e=>e.key==='Fajr'&&e.at===localTimestamp(today,'04:50',zone)).adhan,false);
const limited=buildNativeReminderPlan(prefs,context,{now,limit:2});assert.equal(limited.events.length,2);assert.equal(limited.nextUnscheduledAt,plan.events[2].at);
assert.deepEqual(buildNativeReminderPlan({...prefs,enabled:false},context,{now}).events,[]);
for(const options of [{now:NaN},{now,days:0},{now,days:15},{now,limit:513}])assert.deepEqual(buildNativeReminderPlan(prefs,context,options).events,[]);
for(const invalid of [{...context,today:'2026-10-07'},{...context,timeZone:'invalid'},{...context,timingsFor:()=>{throw Error('Missing timetable')}}]){
 const result=buildNativeReminderPlan({...prefs,adhkar:{},jumuah:{}},invalid,{now});assert.deepEqual(result.events,[]);
}
const dstZone='America/New_York',dstToday='2026-03-08';
const dst=buildNativeReminderPlan({enabled:true,prayers:{},adhkar:{morning:{enabled:true,mode:'time',time:'02:30'}}},{today:dstToday,cityKey:'ny',timeZone:dstZone,timingsFor:()=>({})},{now:localTimestamp(dstToday,'00:01',dstZone),days:2});
assert.equal(dst.events.length,1,'Skipped DST minute is not silently shifted');
assert.equal(dst.events[0].at,localTimestamp('2026-03-09','02:30',dstZone));
const changed=buildNativeReminderPlan(prefs,{...context,cityKey:'other-city'},{now});assert.ok(changed.events.every(e=>!plan.events.some(old=>old.id===e.id)));
console.log('PASS: future-only native plan, distinct city identity, no duplicates, exact prayer/before phases, voice, Friday, disabled/stale/invalid inputs, bounded queue and DST gap. No alarms or permissions were installed.');
