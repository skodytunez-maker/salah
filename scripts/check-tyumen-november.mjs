import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {monthRows} from '../dist/js/calendar-pdf.js';
import {buildPrayerWidgetSnapshot} from '../dist/js/native-widget.js';
import {preferences,serverTimings,scheduleRows,eventsFor} from '../supabase/functions/background-reminders/core.mjs';
const root=new URL('../',import.meta.url),read=async file=>JSON.parse(await readFile(new URL('dist/data/'+file,root),'utf8'));
const table=await read('tyumen-november-2026.json'),october=await read('tyumen-october-2026.json'),official=await read('al-hakk-tyumen.json');
assert.equal(table.sourceYear,2025);assert.equal(table.targetYear,2026);assert.match(table.dateMapping,/not independently confirmed/);
assert.equal(Object.keys(table.days).length,30);assert.equal(official.days['2026-11-01'],undefined,'Do not relabel the ambiguous official November source');
for(let n=1;n<=30;n++){
 const day='2026-11-'+String(n).padStart(2,'0'),row=table.days[day];assert.ok(row,day);assert.equal(row.sourceYear,2025);assert.equal(row.source,'tyumen-table');
 const values=[row.timings.Fajr,row.timings.Sunrise,row.timings.Dhuhr,row.asrFirst,row.timings.Asr,row.timings.Maghrib,row.timings.Isha];
 for(const value of values)assert.ok(value.startsWith(day+'T')&&value.endsWith('+05:00')&&Number.isFinite(Date.parse(value)),day+' time/zone');
 for(let i=1;i<values.length;i++)assert.ok(Date.parse(values[i])>Date.parse(values[i-1]),day+' order');
}
assert.equal(table.days['2026-11-01'].timings.Fajr,'2026-11-01T05:53:00+05:00');
assert.equal(table.days['2026-11-30'].asrFirst,'2026-11-30T13:46:00+05:00');
assert.equal(table.days['2026-11-30'].timings.Asr,'2026-11-30T14:13:00+05:00');
assert.equal(table.days['2026-11-30'].timings.Isha,'2026-11-30T18:03:00+05:00');
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
let external=0;globalThis.fetch=async url=>{if(String(url).startsWith('https:')){external++;throw Error('Offline');}return {ok:true,json:()=>read(String(url).split('/').at(-1))};};
const {settings,updateSettings}=await import('../dist/js/storage.js');
const {loadMonth,timingsFor,nextPrayer,formatTime,tyumenSource}=await import('../dist/js/prayers.js');
const city={name:'Тюмень',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'};
updateSettings({city,school:1,tyumenTimeSource:'calendar',reminders:{enabled:true,adhkar:{morning:{enabled:true,mode:'prayer'}}}});
const loaded=await loadMonth('2026-10-31',true);assert.equal(external,0);assert.deepEqual(loaded['2026-10-31'].timings,october.days['2026-10-31'].timings);
assert.equal(nextPrayer(Date.parse('2026-10-31T23:59:00+05:00'),'2026-10-31',loaded).time,Date.parse(table.days['2026-11-01'].timings.Fajr),'Month-boundary Fajr stays available');
assert.match(tyumenSource('2026-11-01',loaded).label,/ноябрь 2026/);assert.match(tyumenSource('2026-11-01',loaded).label,/таблица 2025/);assert.equal(tyumenSource('2026-11-01',loaded).url,table.source);
for(const school of [0,1]){updateSettings({school});const p=preferences({...settings,city});for(const day of Object.keys(table.days)){const web=timingsFor(day,loaded),server=serverTimings(day,loaded,p);for(const key of ['Fajr','Dhuhr','Asr','Maghrib','Isha'])assert.equal(web[key],server[key],day+' web/server '+school+' '+key);assert.equal(web.Asr,Date.parse(school===0?table.days[day].asrFirst:table.days[day].timings.Asr));}}
const rows=monthRows('2026-11',day=>({...timingsFor(day,loaded),AsrFirst:timingsFor(day,loaded,0).Asr,AsrHanafi:timingsFor(day,loaded,1).Asr}),t=>formatTime(t,'Asia/Yekaterinburg'));
assert.equal(rows[0].weekday,'вс');assert.equal(rows[29].weekday,'пн');assert.deepEqual(rows.filter(r=>r.friday).map(r=>r.date),['06','13','20','27']);assert.equal(rows[0].values[3],'14:22');assert.equal(rows[0].values[4],'14:59');
const p=preferences({...settings,city}),cacheRows=new Map(),rowsForServer=await scheduleRows(p,Date.parse('2026-11-01T00:00:00+05:00'),{cache:{get:async k=>cacheRows.get(k),put:async(k,v)=>cacheRows.set(k,v)},fetcher:async url=>new Response(JSON.stringify(await read(url.split('/').at(-1))))});
const events=eventsFor(p,rowsForServer,Date.parse('2026-11-01T00:00:00+05:00'));assert.equal(events.find(e=>e.day==='2026-11-01'&&e.kind==='prayer'&&e.key==='Fajr').at,Date.parse(table.days['2026-11-01'].timings.Fajr));
const widget=buildPrayerWidgetSnapshot({city,school:settings.school,method:settings.method,startDay:'2026-11-01',days:loaded,timingsFor});assert.equal(widget.days[0].prayers.Fajr,timingsFor('2026-11-01',loaded).Fajr);
await assert.rejects(loadMonth('2026-12-01'),/нет данных/,'Calendar cannot silently fall back to official December');
updateSettings({tyumenTimeSource:'al-hakk'});await assert.rejects(loadMonth('2026-11-01'),/нет данных/,'Official source cannot use the user calendar');assert.equal(timingsFor('2026-11-01',loaded),null);
console.log('PASS: 30 November rows, honest year provenance, both Asr times, offline October/November boundary, 2026 weekdays, PDF rows, widget/server/reminders and source isolation.');
