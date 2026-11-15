import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const memory=new Map(),NOW=Date.parse('2026-11-16T12:00:00Z');let quota=false,blocked=false,partialMonth=null,holdMonth=null,release=null,requests=[];
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>{if(quota)throw Error('fixture quota');memory.set(key,value)},removeItem:key=>memory.delete(key)};
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true,writable:true});
const moscow={name:'Москва',country:'Россия',latitude:55.75,longitude:37.61,timezone:'Europe/Moscow'},tokyo={name:'Знания',country:'Japan',latitude:35.68,longitude:139.69,timezone:'Asia/Tokyo'},tyumen={name:'Тюмень',country:'Россия',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'};
const readTable=async file=>JSON.parse(await readFile(new URL('../dist/data/'+file,import.meta.url),'utf8'));
function calendar(url){
 const parts=url.pathname.split('/'),year=Number(parts.at(-2)),month=Number(parts.at(-1)),key=String(year)+'-'+String(month).padStart(2,'0'),count=new Date(Date.UTC(year,month,0)).getUTCDate(),tokyo=Number(url.searchParams.get('latitude'))===35.68,zone=tokyo?'Asia/Tokyo':'Europe/Moscow',offset=tokyo?'+09:00':'+03:00';
 return{code:200,data:Array.from({length:count-(partialMonth===key?1:0)},(_,i)=>{const day=key+'-'+String(i+1).padStart(2,'0'),timings=Object.fromEntries([['Fajr','05:00'],['Sunrise','06:30'],['Dhuhr','12:00'],['Asr','15:00'],['Maghrib','18:00'],['Isha','20:00']].map(([p,time])=>[p,day+'T'+time+':00'+offset]));return{timings,date:{gregorian:{date:String(i+1).padStart(2,'0')+'-'+String(month).padStart(2,'0')+'-'+year},hijri:{day:String(i+1),month:{number:1},year:'1448'}},meta:{timezone:zone,method:{name:'Fixture method'}}}})};
}
globalThis.fetch=async(value,options={})=>{
 const text=String(value);requests.push(text);if(blocked)throw Error('fixture network blocked');
 if(text.startsWith('./data/'))return{ok:true,json:()=>readTable(text.split('/').at(-1))};
 const url=new URL(text);assert.equal(url.origin,'https://api.aladhan.com');assert.equal(url.searchParams.get('iso8601'),'true');
 const key=url.pathname.split('/').slice(-2).map((value,i)=>i?value.padStart(2,'0'):value).join('-');
 if(key===holdMonth){holdMonth=null;await new Promise(resolve=>release=resolve);}
 return{ok:true,json:async()=>calendar(url)};
};
const{settings,updateSettings}=await import('../dist/js/storage.js');
const{prayerContext,cacheKey,cachedDays,cachedPrayerDays,loadMonth,loadPrayerMonth,timingsFor,nextPrayer,countdown}=await import('../dist/js/prayers.js');
const{createPrayerOffline,prayerOfflineCoverage,prayerOfflineMonths}=await import('../dist/js/prayer-offline.js');
updateSettings({city:moscow,school:1,method:3,highLatitude:3,offsets:{Fajr:2}});
const controller=createPrayerOffline({clock:()=>NOW});assert.equal(requests.length,0,'opening offline settings does not prefetch');
let state=await controller.save();assert.equal(state.reason,'complete');assert.equal(state.coverage.ready,12);assert.equal(requests.length,12);assert.equal(state.coverage.months[0],'2026-11');assert.equal(state.coverage.months.at(-1),'2027-10');
for(const request of requests){const url=new URL(request);assert.equal(url.searchParams.get('latitude'),'55.75');assert.equal(url.searchParams.get('longitude'),'37.61');assert.equal(url.searchParams.get('method'),'3');assert.equal(url.searchParams.get('school'),'1');assert.equal(url.searchParams.get('latitudeAdjustmentMethod'),'3')}
assert.equal(timingsFor('2026-11-16',cachedDays()).Fajr,Date.parse('2026-11-16T05:02:00+03:00'),'offline keeps explicit personal correction');
const before=JSON.stringify([...memory]),loadedAgain=await import('../dist/js/prayers.js?offline502-update');assert.equal(Object.keys(loadedAgain.cachedDays()).length,Object.keys(cachedDays()).length);assert.equal(JSON.stringify([...memory]),before,'ordinary module update does not discard saved data');
blocked=true;requests=[];const offline=await loadMonth('2026-12-31'),january=await loadMonth('2027-01-01');assert.equal(requests.length,0,'full saved months require no fetch even across year rollover');
assert.ok(offline['2027-01-01']);assert.ok(january['2027-10-31']);
const next=nextPrayer(Date.parse('2026-12-31T23:59:00+03:00'),'2026-12-31',cachedDays());assert.equal(next.time,Date.parse('2027-01-01T05:02:00+03:00'));assert.equal(countdown(61000),'00:01:01');assert.equal(requests.length,0,'countdown stays local');
const januaryContext=prayerOfflineCoverage(prayerContext(),Date.parse('2026-12-31T21:30:00Z'));assert.equal(januaryContext.months[0],'2027-01','range follows saved city timezone, not UTC month');assert.equal(januaryContext.ready,10);
const savedKey=cacheKey();updateSettings({city:{...moscow,timezone:'Asia/Tokyo'}});assert.equal(Object.keys(cachedDays()).length,0,'same coordinates with wrong saved timezone do not borrow cached rows');assert.equal(prayerOfflineCoverage(prayerContext(),NOW).ready,0);
blocked=false;await assert.rejects(loadMonth('2026-11-16',true),/Нет проверенных/,'online wrong-zone response is rejected before write/return');assert.equal(Object.keys(cachedDays()).length,0);blocked=true;
controller.refresh();assert.equal(controller.getState().reason,'changed');assert.equal(controller.getState().coverage.ready,0);
updateSettings({city:moscow,method:1});blocked=false;holdMonth='2026-11';requests=[];const captured=prayerContext(),capturedLoad=loadPrayerMonth(captured,'2026-11-16',{force:true});while(!release)await new Promise(resolve=>setImmediate(resolve));
const wrongZone={...captured,city:{...captured.city,timezone:'Asia/Tokyo'}};await assert.rejects(loadPrayerMonth(wrongZone,'2026-11-16',{force:true}),/Нет проверенных/);assert.equal(requests.length,2,'same coordinates in different saved zones never share an in-flight promise');release();release=null;await capturedLoad;
const legacyMixed=JSON.parse(memory.get('salah:prayer-cache:'+captured.key)),badFuture=calendar(new URL('https://api.aladhan.com/v1/calendar/2026/12?latitude=35.68')).data[0];legacyMixed['2026-12-01']={timings:badFuture.timings,timezone:badFuture.meta.timezone,loadedAt:NOW};memory.set('salah:prayer-cache:'+captured.key,JSON.stringify(legacyMixed));
const cleanMerged=await loadPrayerMonth(captured,'2026-11-30',{force:true});assert.equal(cleanMerged['2026-12-01'],undefined,'successful online return cannot reintroduce a wrong-zone cached adjacent month');assert.equal(nextPrayer(Date.parse('2026-11-30T23:59:00+03:00'),'2026-11-30',cleanMerged),null);
updateSettings({city:moscow,method:4});assert.notEqual(cacheKey(),savedKey);assert.equal(prayerOfflineCoverage(prayerContext(),NOW).ready,0);
updateSettings({method:3,school:0});assert.equal(prayerOfflineCoverage(prayerContext(),NOW).ready,0);
updateSettings({school:1,highLatitude:2});assert.equal(prayerOfflineCoverage(prayerContext(),NOW).ready,0);
updateSettings({highLatitude:3,city:tokyo});assert.equal(prayerOfflineCoverage(prayerContext(),NOW).ready,0);assert.equal(prayerOfflineMonths(prayerContext(),Date.parse('2026-12-31T15:01:00Z'))[0],'2027-01');
// A partial month is visible as a gap and is the only request on resume.
blocked=false;partialMonth='2027-02';requests=[];const partial=createPrayerOffline({clock:()=>NOW});state=await partial.save();assert.equal(state.reason,'failed');assert.equal(state.coverage.ready,11);assert.ok(state.coverage.ranges.some(range=>range.until==='2027-02-27'));assert.ok(state.coverage.ranges.some(range=>range.from==='2027-03-01'));
partialMonth=null;requests=[];state=await partial.save();assert.equal(state.reason,'complete');assert.equal(state.coverage.ready,12);assert.equal(requests.length,1);assert.match(requests[0],/2027\/2[?]/);
// Fresh city/config snapshots: a late response cannot be written under or
// displayed as a newly selected city's timetable.
updateSettings({city:moscow,method:5});requests=[];holdMonth='2026-11';const race=createPrayerOffline({clock:()=>NOW}),racing=race.save();while(!release)await new Promise(resolve=>setImmediate(resolve));const oldKey=cacheKey();updateSettings({city:tokyo,method:5});release();release=null;await racing;assert.equal(race.getState().running,false);assert.equal(race.getState().reason,'changed');assert.equal(race.getState().coverage.ready,0);assert.equal(memory.has('salah:prayer-cache:'+oldKey),true,'late response may only retain its captured old cache');assert.equal(Object.keys(cachedDays()).length,0);
// Cancellation/removal cannot resurrect a deleted cache even when a fixture
// transport ignores AbortSignal and resolves late.
holdMonth='2026-11';requests=[];const cancel=createPrayerOffline({clock:()=>NOW}),saving=cancel.save();while(!release)await new Promise(resolve=>setImmediate(resolve));cancel.cancel();cancel.clear();const cancelledKey=cacheKey();release();release=null;await saving;assert.equal(memory.has('salah:prayer-cache:'+cancelledKey),false);assert.equal(cancel.getState().running,false);
// Quota failure reports storage failure without claiming twelve saved months.
updateSettings({city:tokyo,method:2});quota=true;const full=createPrayerOffline({clock:()=>NOW});state=await full.save();quota=false;assert.equal(state.reason,'storageFailed');assert.equal(state.coverage.ready,0);assert.equal(state.done,1);
// Approved Tyumen tables only: no calculation fills unpublished months.
updateSettings({city:tyumen,method:3,school:1,tyumenTimeSource:'auto'});requests=[];const published=createPrayerOffline({clock:()=>NOW});state=await published.save();assert.equal(state.reason,'published');assert.equal(state.coverage.ready,2);assert.deepEqual(state.coverage.ranges,[{from:'2026-11-01',until:'2026-12-31'}]);assert.ok(requests.every(url=>url.startsWith('./data/')));assert.equal(cachedDays()['2027-01-01'],undefined);
const original=await readTable('tyumen-november-2026.json');assert.deepEqual(cachedDays()['2026-11-16'].timings,original.days['2026-11-16'].timings);
blocked=true;requests=[];assert.ok((await loadMonth('2026-11-16'))['2026-12-31']);assert.equal(requests.length,0,'Tyumen now reads its valid saved timetable before network');
await assert.rejects(loadMonth('2027-01-01'));assert.equal(cachedDays()['2027-01-01'],undefined,'missing Tyumen publication never becomes calculated data');
updateSettings({tyumenTimeSource:'calendar'});assert.equal(prayerOfflineCoverage(prayerContext(),NOW).ready,0);blocked=false;requests=[];const calendarOnly=createPrayerOffline({clock:()=>NOW});state=await calendarOnly.save();assert.equal(state.coverage.ready,1);assert.equal(cachedDays()['2026-12-01'],undefined);assert.ok(!requests.some(url=>url.endsWith('al-hakk-tyumen.json')));
memory.set('salah:history',JSON.stringify({fixture:'personal history kept'}));const historyBefore=memory.get('salah:history'),settingsBefore=memory.get('salah:settings'),otherCityKey='salah:prayer-cache:'+savedKey;assert.ok(memory.has(otherCityKey));calendarOnly.clear();assert.equal(memory.get('salah:history'),historyBefore);assert.equal(memory.get('salah:settings'),settingsBefore);assert.ok(memory.has(otherCityKey),'removing selected schedule does not remove another city or personal data');
for(const item of [controller,partial,race,cancel,full,published,calendarOnly])item.stop();
// All eight real catalogues and the actual settings component: locale changes
// repaint only display leaves while a download/focused draft stays in place.
const catalogue=(await import('../dist/js/i18n/prayerOffline/index.js')).default,codes=['ru','en','az','tg','uz','kk','de','ar'],keys=Object.keys(catalogue.ru).sort(),parameters=text=>[...text.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map(match=>match[1]).sort();
assert.equal(keys.length,22);for(const code of codes){assert.deepEqual(Object.keys(catalogue[code]).sort(),keys);for(const key of keys){assert.equal(typeof catalogue[code][key],'string');assert.deepEqual(parameters(catalogue[code][key]),parameters(catalogue.ru[key]));if(code!=='ru')assert.notEqual(catalogue[code][key],catalogue.ru[key])}}
const w=new Window({url:'https://fixture.invalid/#settings?section=data'});globalThis.window=w;globalThis.document=w.document;globalThis.Event=w.Event;globalThis.MutationObserver=w.MutationObserver;
const{setInterfaceLanguage,t}=await import('../dist/js/i18n.js');setInterfaceLanguage('ru');
updateSettings({city:tokyo,method:13,school:1});blocked=false;holdMonth='2026-11';requests=[];const root=w.document.createElement('section'),draft=w.document.createElement('textarea');draft.value='untouched draft';w.document.body.append(root,draft);
const{mountPrayerOffline}=await import('../dist/js/prayer-offline-ui.js');let uiControl,uiNow=NOW;const dispose=mountPrayerOffline(root,{create:options=>(uiControl=createPrayerOffline({...options,clock:()=>uiNow}))});
assert.equal(requests.length,0);const button=root.querySelector('[data-prayer-offline-save]');button.click();while(!release)await new Promise(resolve=>setImmediate(resolve));draft.focus();const requestCount=requests.length;
for(const code of codes){setInterfaceLanguage(code);assert.equal(root.querySelector('[data-prayer-offline-save]'),button);assert.equal(root.querySelector('h3').textContent,catalogue[code]['prayerOfflineUi.title']);assert.equal(root.querySelector('[data-prayer-offline-city]').textContent,'Знания');assert.equal(w.document.activeElement,draft);assert.equal(draft.value,'untouched draft');assert.equal(requests.length,requestCount);assert.equal(uiControl.getState().running,true);assert.ok(root.querySelector('[data-prayer-offline-status]').textContent.includes(t('prayerOfflineUi.saving',{done:new Intl.NumberFormat((await import('../dist/js/i18n.js')).getLocale()).format(0),total:new Intl.NumberFormat((await import('../dist/js/i18n.js')).getLocale()).format(12)})))}
release();release=null;while(uiControl.getState().running)await new Promise(resolve=>setImmediate(resolve));assert.equal(uiControl.getState().coverage.ready,12);assert.equal(requests.length,12);assert.equal(button.disabled,false);
uiNow=Date.parse('2027-11-16T12:00:00Z');uiControl.refresh();assert.equal(uiControl.getState().coverage.days,0);assert.equal(uiControl.getState().coverage.hasSaved,true);assert.equal(root.querySelector('[data-prayer-offline-status]').textContent,t('prayerOfflineUi.empty'),'past-only cache cannot claim availability for current dates');assert.equal(root.querySelector('[data-prayer-offline-remove]').hidden,false,'past downloads can still be intentionally removed');
dispose();root.remove();await w.happyDOM.close();
const app=await readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');assert.ok(app.includes('id="prayer-offline-settings"'));assert.ok(app.includes("mountPrayerOffline(document.getElementById('prayer-offline-settings')"));assert.ok(app.includes('[data-prayer-offline-busy]'));
console.log('PASS: explicit/resumable twelve-month prayer downloads; blocked-network month/year rollover and local countdown; saved city/timezone/calculation/source isolation, cancellation/quota/removal, approved-only Tyumen dates and all eight in-place UI languages.');
