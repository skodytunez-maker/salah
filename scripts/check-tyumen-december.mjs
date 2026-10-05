import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildPrayerWidgetSnapshot} from '../dist/js/native-widget.js';
import {serverTimings,preferences} from '../supabase/functions/background-reminders/core.mjs';
const table=JSON.parse(await readFile(new URL('../dist/data/al-hakk-tyumen.json',import.meta.url),'utf8'));
const days=Object.keys(table.days).filter(x=>x.startsWith('2026-12-'));
assert.equal(days.length,31);
for(let day=1;day<=31;day++){
 const key='2026-12-'+String(day).padStart(2,'0'),row=table.days[key];assert.ok(row,key+' present');assert.equal(row.source,'al-hakk');assert.equal(row.timezone,'Asia/Yekaterinburg');
 const values=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].map(k=>row.timings[k]);
 for(const value of values){assert.ok(value.startsWith(key+'T'));assert.ok(value.endsWith('+05:00'));assert.ok(Number.isFinite(Date.parse(value)));}
 for(let i=1;i<values.length;i++)assert.ok(Date.parse(values[i])>Date.parse(values[i-1]),key+' chronological order');
}
assert.equal(table.days['2026-12-01'].timings.Fajr,'2026-12-01T06:27:00+05:00');
assert.equal(table.days['2026-12-31'].timings.Isha,'2026-12-31T18:08:00+05:00');
assert.equal(table.days['2026-10-05'].timings.Fajr,'2026-10-05T04:40:00+05:00','Earlier verified timetable unchanged');
assert.equal(table.days['2026-11-01'],undefined,'Conflicting-year November source remains unpublished');
const p=preferences({city:{name:'Тюмень',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'},method:3,highLatitude:3,school:1,tyumenTimeSource:'al-hakk'});
const timingsFor=day=>serverTimings(day,table.days,p);
const native=buildPrayerWidgetSnapshot({city:p.city,school:1,method:3,startDay:'2026-12-01',days:table.days,timingsFor});
assert.equal(native.days[0].prayers.Fajr,timingsFor('2026-12-01').Fajr,'Widget and background reminder use the same December source');
assert.equal(serverTimings('2026-12-01',table.days,{...p,tyumenTimeSource:'calendar'}),null,'Official site table cannot impersonate user calendar');
console.log('PASS: December 31 days, source/date/timezone/order integrity, earlier times preserved, November withheld, widget/server consistency, source isolation.');
