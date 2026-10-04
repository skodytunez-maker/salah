import assert from 'node:assert/strict';
import {lastThirdNight} from '../dist/js/tahajjud.js';
import {buildReminderEvents,normalizeReminders,createReminderTracker} from '../dist/js/reminder-events.js';
import {eventsFor,preferences,notification} from '../supabase/functions/background-reminders/core.mjs';
import {pushPreferences} from '../dist/js/push-reminders.js';
const stamp=Date.parse;
assert.equal(normalizeReminders({enabled:true}).tahajjud.enabled,false,'No night notification is enabled by an update');
assert.equal(normalizeReminders({tahajjud:{enabled:'true'}}).tahajjud.enabled,false);
const cases=[
 ['2026-10-03T18:00:00+05:00','2026-10-04T06:00:00+05:00','2026-10-04T02:00:00+05:00'],
 ['2026-10-03T18:00:00+05:00','2026-10-04T04:00:00+05:00','2026-10-04T00:40:00+05:00'],
 ['2026-10-03T22:00:00+05:00','2026-10-04T02:00:00+05:00','2026-10-04T00:40:00+05:00'],
 ['2026-10-31T18:00:00-04:00','2026-11-01T06:00:00-05:00','2026-11-01T01:40:00-05:00'],
 ['2026-03-07T18:00:00-05:00','2026-03-08T06:00:00-04:00','2026-03-08T01:20:00-05:00'],
 ['2026-12-31T19:00:00+13:00','2027-01-01T05:00:00+13:00','2027-01-01T01:40:00+13:00']
];
for(const [maghrib,fajr,expected] of cases)assert.equal(lastThirdNight(stamp(maghrib),stamp(fajr)),stamp(expected));
assert.equal(lastThirdNight(stamp('2026-10-03T18:00:01Z'),stamp('2026-10-04T06:00:00Z')),stamp('2026-10-04T02:01:00Z'),'Round into, never before, the last third');
for(const [a,b] of [[NaN,0],[0,NaN],[0,0],[1,0],[0,86400000],[0,1000]])assert.equal(lastThirdNight(a,b),null);
const rows={
 '2026-10-03':{timings:{Maghrib:'2026-10-03T18:00:00+05:00'}},
 '2026-10-04':{timings:{Fajr:'2026-10-04T06:00:00+05:00',Maghrib:'2026-10-04T18:01:00+05:00'}},
 '2026-10-05':{timings:{Fajr:'2026-10-05T06:01:00+05:00'}}
};
const settings={city:{name:'Example',latitude:50,longitude:60,timezone:'Asia/Yekaterinburg'},method:3,school:0,highLatitude:3,offsets:{},reminders:{enabled:true,tahajjud:{enabled:true}}};
const context={today:'2026-10-04',cityKey:'fixture',timeZone:settings.city.timezone,timingsFor:day=>Object.fromEntries(Object.entries(rows[day]?.timings||{}).map(([k,v])=>[k,stamp(v)]))};
const nights=value=>value.filter(e=>e.kind==='tahajjud');
const events=nights(buildReminderEvents(settings.reminders,context));
assert.equal(events.length,2);assert.equal(events[0].at,stamp(cases[0][2]));assert.equal(events[0].adhan,false);
assert.equal(nights(buildReminderEvents({enabled:true},context)).length,0);
assert.equal(nights(buildReminderEvents({...settings.reminders,enabled:false},context)).length,0);
assert.equal(nights(buildReminderEvents(settings.reminders,{...context,timingsFor:()=>({})})).length,0);
const server=nights(eventsFor(preferences(settings),rows,stamp('2026-10-04T01:00:00+05:00')));
assert.deepEqual(server.map(e=>[e.day,e.at,e.message]),events.map(e=>[e.day,e.at,e.message]),'Phone and background server schedule the same night');
assert.equal(notification({...events[0],hash:'fixture'},events[0].at).url,'#home');
assert.equal(pushPreferences({...settings,showTahajjud:false}).reminders.tahajjud.enabled,true,'Reminder and display choices are independent');
const adjusted=preferences({...settings,offsets:{Fajr:5,Maghrib:-5}});
assert.equal(nights(eventsFor(adjusted,rows,stamp('2026-10-04T01:00:00+05:00')))[0].at,stamp('2026-10-04T02:02:00+05:00'),'Use the user-adjusted Maghrib and next Fajr');
let seen={};const tracker=createReminderTracker({read:()=>seen,write:v=>seen=v}),at=events[0].at;
assert.equal(tracker.tick(at-1000,events).length,0);assert.equal(tracker.tick(at,events).length,1);assert.equal(tracker.tick(at+1000,events).length,0);
const resumed=createReminderTracker({read:()=>seen,write:v=>seen=v});resumed.tick(at-1000,events);assert.equal(resumed.tick(at+1000,events).length,0,'Reload cannot replay a delivered night reminder');
const late=createReminderTracker();late.tick(at-100000,events);assert.equal(late.tick(at+1000,events).length,0,'Returning after a long pause does not replay the reminder');
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
const storage=await import('../dist/js/storage.js?tahajjud-first');storage.updateSettings({...settings,showTahajjud:false});
const reload=await import('../dist/js/storage.js?tahajjud-reload');assert.equal(reload.settings.reminders.tahajjud.enabled,true);assert.equal(reload.settings.showTahajjud,false);assert.equal(reload.settings.school,0);
console.log('PASS: optional Tahajjud, adjusted Maghrib/next Fajr, DST and date boundaries, no missing-data guesses, client/server parity, no duplicate/stale reminders, settings persist.');
