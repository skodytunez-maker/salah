import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const table=JSON.parse(await readFile(new URL('dist/data/tyumen-october-2026.json',root),'utf8'));
const historical=JSON.parse(await readFile(new URL('dist/data/al-hakk-tyumen.json',root),'utf8'));
const days=Object.keys(table.days);
assert.equal(days.length,31);
for(let n=1;n<=31;n++){
 const day='2026-10-'+String(n).padStart(2,'0'),row=table.days[day];
 assert.ok(row,day);
 const values=[row.timings.Fajr,row.timings.Sunrise,row.timings.Dhuhr,row.asrFirst,row.timings.Asr,row.timings.Maghrib,row.timings.Isha];
 for(const value of values)assert.ok(value.startsWith(day+'T')&&value.endsWith('+05:00'),day+' timezone');
 for(let i=1;i<values.length;i++)assert.ok(Date.parse(values[i])>Date.parse(values[i-1]),day+' chronological order');
 assert.equal(row.asrFirstKind,'published');
}
const short=row=>[row.timings.Fajr,row.timings.Sunrise,row.timings.Dhuhr,row.asrFirst,row.timings.Asr,row.timings.Maghrib,row.timings.Isha].map(x=>x.slice(11,16));
assert.deepEqual(short(table.days['2026-10-01']),['04:47','06:41','12:32','15:23','16:10','18:13','19:58']);
assert.deepEqual(short(table.days['2026-10-31']),['05:50','07:46','12:25','14:24','15:01','16:56','18:44']);
const memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
let remoteCalls=0;
globalThis.fetch=async url=>{
 if(String(url).startsWith('https:')){remoteCalls++;throw Error('Offline test');}
 return {ok:true,json:async()=>JSON.parse(await readFile(new URL('dist/'+String(url).replace(/^.\//,''),root),'utf8'))};
};
const {settings,write}=await import('../dist/js/storage.js');
const {loadMonth,timingsFor,asrInfo,nextPrayer,cacheKey}=await import('../dist/js/prayers.js');
settings.city={name:'Тюмень',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'};
settings.school=0;
write('tyumen-first-asr-v1',{'2026-10-01':{time:'2026-10-01T15:26:00+05:00',kind:'calculated'}});
const loaded=await loadMonth('2026-10-01',true);
assert.equal(remoteCalls,0,'Published October must remain available offline, even on force refresh');
assert.deepEqual(loaded['2026-09-30'].timings,historical.days['2026-09-30'].timings);
assert.ok(cacheKey().includes('tyumen-table-v2'));
for(const day of days){
 settings.school=0;
 assert.equal(timingsFor(day,loaded).Asr,Date.parse(table.days[day].asrFirst),day+' first Asr');
 settings.school=1;
 assert.equal(timingsFor(day,loaded).Asr,Date.parse(table.days[day].timings.Asr),day+' mosque Asr');
 assert.equal(asrInfo(day,loaded).kind,'published');
}
settings.school=0;
assert.equal(nextPrayer(Date.parse('2026-10-01T13:00:00+05:00'),'2026-10-01',loaded).time,Date.parse('2026-10-01T15:23:00+05:00'));
settings.school=1;
settings.offsets.Asr=20;settings.mosque=true;settings.mosqueTimes.Asr='17:00';
assert.equal(timingsFor('2026-10-01',loaded).Asr,Date.parse('2026-10-01T16:10:00+05:00'),'Published local table must not be shifted by calculation overrides');
assert.equal(asrInfo('2026-10-01',loaded).sourceUrl,'./assets/tyumen-october-2026.png');
console.log('PASS: all 31 Tyumen dates, both Asr columns, offline refresh, stale-cache precedence and unchanged September');
