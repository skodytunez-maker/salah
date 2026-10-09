import{actionIcon,actionLabel}from '../dist/js/action-icons.js';
import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{Script,createContext}from 'node:vm';
import{UMRAH_EDITION,umrahSources,umrahHistory,umrahSteps,pilgrimTips,validUmrahProgress,umrahRoute}from '../dist/js/umrah-content.js';
import{umrahIllustration}from '../dist/js/umrah-illustrations.js';
import{scheduleSources,schedulePrayers,imamLabel,saudiDay,scheduleTime,validScheduleMonth,validScheduleDay,validateHaramainSchedule,scheduleForDay,scheduleDays}from '../dist/js/haramain-schedule.js';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
assert.equal(umrahSteps.length,10);assert.equal(new Set(umrahSteps.map(row=>row.id)).size,10);
for(const row of [...umrahSteps,...umrahHistory,...pilgrimTips]){assert.ok(row.refs.length);for(const id of row.refs){const url=new URL(umrahSources[id].url);assert.equal(url.protocol,'https:');assert.ok(['sunnah.com','haj.gov.sa','prh.gov.sa','umrah.nusuk.sa'].includes(url.hostname))}}
for(const row of umrahSteps){assert.match(umrahIllustration(row.image),/^<svg/);assert.doesNotMatch(umrahIllustration(row.image),/<(?:image|script|foreignObject)\b|(?:src|href)="https?:/);assert.ok(row.paragraphs.length)}
assert.match(umrahSteps.find(row=>row.id==='tawaf').caption,/Против часовой стрелки/);
assert.match(umrahSteps.find(row=>row.id==='sai').caption,/Седьмой заканчивается на Марве/);
assert.equal(validUmrahProgress({edition:1,index:5,complete:false}),true);
for(const value of [null,{}, {edition:2,index:5,complete:false},{edition:1,index:-1,complete:false},{edition:1,index:10,complete:false},{edition:1,index:5.2,complete:false},{edition:1,index:5,complete:'yes'}])assert.equal(validUmrahProgress(value),false);
assert.equal(umrahRoute('#umrah?step=tawaf').step,5);assert.equal(umrahRoute('#umrah?step=unknown').view,'home');
assert.equal(validScheduleDay('2026-02-30'),false);assert.equal(validScheduleDay('2028-02-29'),true);assert.equal(validScheduleMonth('2026-13'),false);
const data={edition:1,fetchedAt:'2026-10-04T05:00:00Z',rows:[{mosque:'mecca',prayer:'fajr',at:'2026-10-03T22:01:00Z',day:'2026-10-04',imam:'اسم الإمام'}]};
assert.equal(imamLabel('د.أحمد بن علي الحذيفي'),'Ахмад аль-Хузайфи');assert.equal(imamLabel('د.علي بن عبدالرحمن الحذيفي'),'Али аль-Хузайфи');assert.equal(imamLabel('أحمد بن حميد'),'أحمد بن حميد');
validateHaramainSchedule(data);assert.equal(saudiDay(data.rows[0].at),'2026-10-04');assert.equal(scheduleTime(data.rows[0].at),'01:01');
assert.equal(scheduleForDay(data,'mecca','2026-10-05').length,0,'Unknown future appointments remain empty');
assert.deepEqual(scheduleDays(data,'madinah','2026-10'),[]);
for(const mutate of [v=>v.rows.push(v.rows[0]),v=>v.rows[0].mosque='constructor',v=>v.rows[0].prayer='missing',v=>v.rows[0].day='2026-10-03',v=>v.rows[0].at='2026-10-04',v=>v.rows[0].imam=null]){const invalid=structuredClone(data);mutate(invalid);assert.throws(()=>validateHaramainSchedule(invalid))}
validateHaramainSchedule(JSON.parse(await read('dist/data/haramain-schedule.json')));
const fixture=await read('scripts/check-adhkar-resume.mjs');
const helpers=fixture.slice(fixture.indexOf('const decode='),fixture.indexOf('function browser('));
const{Storage,Element}=new Script(helpers+'\n;({Storage,Element});').runInNewContext();
const source=await read('dist/js/umrah.js'),executable=source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport (?=(?:async )?function)/g,'')+'\n;({showUmrah,stopUmrah});';
function browser(hash='#umrah',storage=new Storage(),fetchImpl=async()=>({ok:true,json:async()=>structuredClone(data)})){
 const host=new Element(),body=new Element('body'),location={hash},notices=[];
 const context=createContext({actionIcon,actionLabel,document:{body},location,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,console,Date,Intl,
  UMRAH_EDITION,umrahSources,umrahHistory,umrahSteps,pilgrimTips,validUmrahProgress,umrahRoute,umrahIllustration,
  scheduleSources,schedulePrayers,imamLabel,saudiDay,scheduleTime,validScheduleMonth,validScheduleDay,validateHaramainSchedule,scheduleForDay,scheduleDays,
  read:(key,fallback)=>{try{const value=storage.getItem('salah:'+key);return value===null?fallback:JSON.parse(value)}catch{return fallback}},
  write:(key,value)=>{storage.setItem('salah:'+key,JSON.stringify(value));return true},toast:value=>notices.push(value),
  esc:value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fetch:fetchImpl
 });
 const module=new Script(executable).runInContext(context);return{host,body,location,storage,module,open:()=>module.showUmrah(host)};
}
let page=browser('#umrah?step=tawaf');await page.open();assert.match(page.host.textContent,/семь полных кругов/);assert.ok(page.body.classList.contains('umrah-focus'));
assert.equal(JSON.parse(page.storage.getItem('salah:umrah-progress')).index,5);assert.equal(page.storage.getItem('salah:learning-progress'),null);assert.equal(page.storage.getItem('salah:adhkar-progress-v2'),null);
page=browser('#umrah',page.storage);await page.open();assert.match(page.host.textContent,/Продолжить · шаг 6/);assert.equal(page.body.classList.contains('umrah-focus'),false);
page=browser('#umrah?step=finish',page.storage);await page.open();await page.host.querySelector('#umrah-complete').click();assert.equal(JSON.parse(page.storage.getItem('salah:umrah-progress')).complete,true);
page=browser('#umrah?view=tips',page.storage,async()=>{throw Error('offline')});await page.open();assert.equal(page.host.querySelectorAll('.umrah-tip').length,6,'Lesson, history and tips work without network');
page.location.hash='#umrah?view=history';await page.open();assert.equal(page.host.querySelectorAll('.umrah-story').length,3);
page=browser('#umrah?view=imams&month=2026-11');await page.open();assert.match(page.host.textContent,/Даты пока не опубликованы/);assert.equal(page.host.querySelectorAll('.umrah-schedule-row').length,0);
page.location.hash='#umrah?view=imams&month=2026-10&day=2026-10-04';await page.open();assert.equal(page.host.querySelectorAll('.umrah-schedule-row').length,5);assert.match(page.host.textContent,/01:01/);
const malicious=structuredClone(data);malicious.rows[0].imam='<img src=x onerror=alert(1)>';
page=browser('#umrah?view=imams&month=2026-10&day=2026-10-04',new Storage(),async()=>({ok:true,json:async()=>malicious}));await page.open();assert.equal(page.host.querySelectorAll('img').length,0,'Untrusted source names are escaped');
let release;const gate=new Promise(resolve=>release=resolve);
page=browser('#umrah?view=imams',new Storage(),async()=>{await gate;return{ok:true,json:async()=>data}});const pending=page.open();page.module.stopUmrah();page.host.innerHTML='<p>Другой раздел</p>';release();await pending;assert.equal(page.host.textContent,'Другой раздел','Late schedule load never replaces another section');
page=browser('#umrah?view=imams',new Storage(),async()=>{throw Error('offline')});await page.open();assert.ok(page.host.querySelector('#umrah-retry'));assert.ok(page.host.querySelector('.umrah-back'));
const worker=await read('dist/sw.js');for(const file of ['umrah.js','umrah-content.js','umrah-illustrations.js','haramain-schedule.js'])assert.ok(worker.includes('./js/'+file));assert.ok(worker.includes('./umrah.css'));assert.equal(worker.includes('./data/haramain-schedule.json'),false,'Schedule snapshot is network-first, never frozen by shell cache');
assert.match(await read('dist/js/app.js'),/umrahRenderedHash!==requestedHash/,'Resume refresh does not rebuild the lesson');
assert.match(await read('.github/workflows/pages.yml'),/cron: '5 5 \* \* \*'/);assert.match(await read('dist/js/backup.js'),/key==='umrah-progress'/);
console.log('PASS: 10 sourced illustrated stages, local resume/backup, offline stories/tips, cancelled loads, escaped official records, Saudi dates/times and unknown appointments.');
