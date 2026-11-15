import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {monthRows} from '../dist/js/calendar-pdf.js';
import {buildPrayerWidgetSnapshot} from '../dist/js/native-widget.js';
import {buildNativeReminderPlan} from '../dist/js/native-reminder-plan.js';
import {preferences,serverTimings,scheduleRows,eventsFor} from '../supabase/functions/background-reminders/core.mjs';
const root=new URL('../',import.meta.url),read=async file=>JSON.parse(await readFile(new URL('dist/data/'+file,root),'utf8'));
const table=await read('tyumen-november-2026.json'),october=await read('tyumen-october-2026.json'),official=await read('al-hakk-tyumen.json');
const evidence=JSON.parse(await readFile(new URL('docs/tyumen-november-2026.json',root),'utf8')),sourceImage=await readFile(new URL(evidence.sourceImage,root));
assert.equal(table.sourceYear,2026);assert.equal(table.targetYear,2026);assert.match(table.dateMapping,/Not independently confirmed/);assert.equal(evidence.printedSourceYear,2026);assert.equal(evidence.rows.length,30);
assert.equal(sourceImage.length,evidence.sourceBytes);assert.equal(createHash('sha256').update(sourceImage).digest('hex'),evidence.sourceSha256,'The supplied timetable image remains byte-for-byte unchanged');assert.equal(table.source,'./assets/tyumen-november-source-2026.jpg');
assert.equal(Object.keys(table.days).length,30);assert.equal(official.days['2026-11-01'],undefined,'Do not relabel the ambiguous official November source');
for(let n=1;n<=30;n++){
 const day='2026-11-'+String(n).padStart(2,'0'),row=table.days[day];assert.ok(row,day);assert.equal(row.sourceYear,2026);assert.equal(row.source,'tyumen-table');assert.equal(row.sourceUrl,table.source);assert.equal(row.asrFirstSourceUrl,table.source);
 const values=[row.timings.Fajr,row.timings.Sunrise,row.timings.Dhuhr,row.asrFirst,row.timings.Asr,row.timings.Maghrib,row.timings.Isha];
 for(const value of values)assert.ok(value.startsWith(day+'T')&&value.endsWith('+05:00')&&Number.isFinite(Date.parse(value)),day+' time/zone');
 for(let i=1;i<values.length;i++)assert.ok(Date.parse(values[i])>Date.parse(values[i-1]),day+' order');
 assert.deepEqual(values.map(value=>value.slice(11,16)),evidence.rows[n-1],day+' all seven columns match the independently cross-checked 2026 photo transcription');
}
assert.equal(table.days['2026-11-01'].timings.Fajr,'2026-11-01T05:52:00+05:00');
assert.equal(table.days['2026-11-30'].asrFirst,'2026-11-30T13:46:00+05:00');
assert.equal(table.days['2026-11-30'].timings.Asr,'2026-11-30T14:14:00+05:00');
assert.equal(table.days['2026-11-30'].timings.Isha,'2026-11-30T18:02:00+05:00');
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
let external=0;globalThis.fetch=async url=>{if(String(url).startsWith('https:')){external++;throw Error('Offline');}return {ok:true,json:()=>read(String(url).split('/').at(-1))};};
const {settings,updateSettings}=await import('../dist/js/storage.js');
const {loadMonth,timingsFor,nextPrayer,formatTime,tyumenSource,cacheKey,cachedDays}=await import('../dist/js/prayers.js');
const city={name:'Тюмень',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'};
updateSettings({city,school:1,tyumenTimeSource:'calendar',reminders:{enabled:true,adhkar:{morning:{enabled:true,mode:'prayer'}}}});
const stale={'2026-11-01':{...table.days['2026-11-01'],timings:{...table.days['2026-11-01'].timings,Fajr:'2026-11-01T05:53:00+05:00'}}};
assert.ok(cacheKey().includes('tyumen-table-v3'));memory.set('prayer-cache:'+cacheKey().replace('tyumen-table-v3','tyumen-table-v2'),JSON.stringify(stale));assert.equal(cachedDays()['2026-11-01'],undefined,'The old installed timetable cache is not shown as the corrected November source');
const loaded=await loadMonth('2026-10-31',true);assert.equal(external,0);assert.deepEqual(loaded['2026-10-31'].timings,october.days['2026-10-31'].timings);
assert.equal(nextPrayer(Date.parse('2026-10-31T23:59:00+05:00'),'2026-10-31',loaded).time,Date.parse(table.days['2026-11-01'].timings.Fajr),'Month-boundary Fajr stays available');
assert.match(tyumenSource('2026-11-01',loaded).label,/ноябрь 2026/);assert.doesNotMatch(tyumenSource('2026-11-01',loaded).label,/2025/);assert.equal(tyumenSource('2026-11-01',loaded).url,table.source);
for(const school of [0,1]){updateSettings({school});const p=preferences({...settings,city});for(const day of Object.keys(table.days)){const web=timingsFor(day,loaded),server=serverTimings(day,loaded,p);for(const key of ['Fajr','Dhuhr','Asr','Maghrib','Isha'])assert.equal(web[key],server[key],day+' web/server '+school+' '+key);assert.equal(web.Asr,Date.parse(school===0?table.days[day].asrFirst:table.days[day].timings.Asr));}}
const corrections={Fajr:2,Dhuhr:-1,Asr:3,Maghrib:-2,Isha:1};
updateSettings({tableOffsets:corrections,offsets:{Fajr:9,Dhuhr:9,Asr:9,Maghrib:9,Isha:9}});
for(const school of [0,1]){updateSettings({school});const pref=preferences({...settings,city});for(const day of Object.keys(table.days)){const web=timingsFor(day,loaded),server=serverTimings(day,loaded,pref);for(const key of ['Fajr','Dhuhr','Asr','Maghrib','Isha']){const published=key==='Asr'&&school===0?table.days[day].asrFirst:table.days[day].timings[key];assert.equal(web[key],Date.parse(published)+corrections[key]*60000,day+' keeps personal table correction '+school+' '+key);assert.equal(web[key],server[key]);}assert.equal(web.Sunrise,Date.parse(table.days[day].timings.Sunrise),'Sunrise is not shifted by personal prayer corrections');}}
updateSettings({school:1,tableOffsets:{Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0},offsets:{Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0}});
const rows=monthRows('2026-11',day=>({...timingsFor(day,loaded),AsrFirst:timingsFor(day,loaded,0).Asr,AsrHanafi:timingsFor(day,loaded,1).Asr}),t=>formatTime(t,'Asia/Yekaterinburg'));
assert.equal(rows[0].weekday,'вс');assert.equal(rows[29].weekday,'пн');assert.deepEqual(rows.filter(r=>r.friday).map(r=>r.date),['06','13','20','27']);assert.equal(rows[0].values[3],'14:22');assert.equal(rows[0].values[4],'14:59');
const p=preferences({...settings,city}),cacheRows=new Map([['tyumen-published-v3:calendar',stale]]),serverRequests=[],rowsForServer=await scheduleRows(p,Date.parse('2026-11-01T00:00:00+05:00'),{cache:{get:async k=>cacheRows.get(k),put:async(k,v)=>cacheRows.set(k,v)},fetcher:async url=>{serverRequests.push(new URL(url));return new Response(JSON.stringify(await read(new URL(url).pathname.split('/').at(-1))));}});
assert.ok(cacheRows.has('tyumen-published-v4:calendar'));assert.equal(rowsForServer['2026-11-01'].timings.Fajr,table.days['2026-11-01'].timings.Fajr,'The old six-hour server cache cannot mask corrected times');assert.equal(serverRequests.find(url=>url.pathname.endsWith('/tyumen-november-2026.json')).searchParams.get('source'),'2026-11-15','The server fetch bypasses the old unversioned public JSON CDN response');
const events=eventsFor(p,rowsForServer,Date.parse('2026-11-01T00:00:00+05:00'));assert.equal(events.find(e=>e.day==='2026-11-01'&&e.kind==='prayer'&&e.key==='Fajr').at,Date.parse(table.days['2026-11-01'].timings.Fajr));
const widget=buildPrayerWidgetSnapshot({city,school:settings.school,method:settings.method,startDay:'2026-11-01',days:loaded,timingsFor});assert.equal(widget.days[0].prayers.Fajr,timingsFor('2026-11-01',loaded).Fajr);
for(const school of [0,1])for(const day of Object.keys(table.days)){const times=timingsFor(day,loaded,school),plan=buildNativeReminderPlan(p.reminders,{today:day,cityKey:'tyumen-november-2026:'+school,timeZone:city.timezone,timingsFor:d=>timingsFor(d,loaded,school)},{now:Date.parse(day+'T00:00:00+05:00'),days:1});for(const key of ['Fajr','Asr'])assert.ok(plan.events.some(event=>event.kind==='prayer'&&event.key===key&&event.at===times[key]),day+' native reminders follow corrected '+school+' '+key);}
await assert.rejects(loadMonth('2026-12-01'),/нет данных/,'Calendar cannot silently fall back to official December');
updateSettings({tyumenTimeSource:'al-hakk'});await assert.rejects(loadMonth('2026-11-01'),/нет данных/,'Official source cannot use the user calendar');assert.equal(timingsFor('2026-11-01',loaded),null);
console.log('PASS: all 210 November 2026 photo values, unchanged source-image hash, both Asr times and personal corrections, offline October/November boundary, 2026 weekdays, PDF rows, widget/server/reminders and source isolation.');
