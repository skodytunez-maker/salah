import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {upcomingIslamicDates,remainingDaysLabel} from '../dist/js/calendar-occasions.js';
const events=upcomingIslamicDates('2026-10-04');
assert.equal(events.length,6);assert.ok(!events.some(e=>/мавлид/i.test(e.name)));
const ramadan=events.find(e=>e.id==='ramadan');assert.equal(ramadan.uncertaintyDays,1);
assert.ok(events.filter(e=>e.id!=='ramadan').every(e=>!e.uncertaintyDays));
assert.match(remainingDaysLabel(ramadan.daysLeft,1),/^Примерно через /);
const shifted=(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
for(const delta of [-1,0,1]){
 const near=upcomingIslamicDates(shifted(ramadan.date,delta)).find(e=>e.id==='ramadan');
 assert.equal(near.date,ramadan.date,'Keep this Ramadan throughout its uncertainty window');
 assert.equal(near.daysLeft,delta===0?0:-delta);assert.equal(remainingDaysLabel(near.daysLeft,1),'В эти дни');
}
assert.notEqual(upcomingIslamicDates(shifted(ramadan.date,2)).find(e=>e.id==='ramadan').date,ramadan.date);
for(const offset of [-1,1])assert.equal(upcomingIslamicDates('2026-10-04',offset).find(e=>e.id==='ramadan').date,shifted(ramadan.date,-offset));
assert.deepEqual(upcomingIslamicDates('2026-02-30'),[]);
assert.equal(remainingDaysLabel(0),'Сегодня');assert.equal(remainingDaysLabel(1),'Завтра');assert.equal(remainingDaysLabel(21),'Через 21 день');
const source=await readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');
assert.ok(source.includes("event.uncertaintyDays?' · ±'"));assert.ok(source.includes('remainingDaysLabel(event.daysLeft,event.uncertaintyDays)'));
console.log('PASS: Ramadan ±1 day, approximate countdown, near-date window, saved Hijri offset and unchanged other occasions.');
