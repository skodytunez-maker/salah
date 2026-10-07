import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{createOfflineAudioStore,AUDIO_CACHE}from '../dist/js/quran-offline-store.js';
import{downloadAudioFiles,createQuranDownloadQueue}from '../dist/js/quran-offline-core.js';
import{filterDuas,validateDuaCatalogue,cleanDuaFavorites}from '../dist/js/daily-dua-core.js';
import{commonBeforeMinutes,withBeforeMinutes}from '../dist/js/reminder-before.js';
import{buildReminderEvents,normalizeReminders,PRAYER_KEYS}from '../dist/js/reminder-events.js';
const responses=new Map();
const cache={async match(url){return responses.get(String(url))?.clone();},async put(url,response){responses.set(String(url),response.clone());},async keys(){return [...responses.keys()].map(url=>({url}));},async delete(url){return responses.delete(String(url));}};
const cacheStorage={async open(name){assert.equal(name,AUDIO_CACHE);return cache;},async delete(name){assert.equal(name,AUDIO_CACHE);responses.clear();return true;}};
const store=createOfflineAudioStore({idb:null,cacheStorage,baseUrl:'https://salah.test/salah/'});
const urls=['https://audio.test/1.mp3','https://audio.test/2.mp3','https://audio.test/3.mp3'];
let calls=0;
const fetcher=async()=>{calls++;return new Response(new Uint8Array([1,2,3,4]),{headers:{'Content-Type':'audio/mpeg','Content-Length':'4'}});};
assert.equal(await downloadAudioFiles({urls,store,fetcher}),12);
assert.equal(calls,3);
assert.equal(await downloadAudioFiles({urls,store,fetcher:async()=>{throw Error('Offline');}}),12,'Saved audio needs no network');
await store.saveRecording({id:'ar.test:1',reciter:'ar.test',surah:1,urls,bytes:12,savedAt:1});
assert.equal((await store.listRecordings('ar.test')).length,1);
responses.delete(urls[1]);
assert.equal((await store.listRecordings('ar.test')).length,0,'Evicted files are not advertised as complete');
calls=0;assert.equal(await downloadAudioFiles({urls,store,fetcher}),12);assert.equal(calls,1,'Resume downloads only the missing file');
for(const response of [
 new Response('partial',{status:206,headers:{'Content-Type':'audio/mpeg','Content-Range':'bytes 0-6/20'}}),
 new Response('not audio',{headers:{'Content-Type':'text/html'}}),
 new Response('',{headers:{'Content-Type':'audio/mpeg'}}),
 new Response('short',{headers:{'Content-Type':'audio/mpeg','Content-Length':'99'}})
]){const url='https://audio.test/bad-'+calls++ +'.mp3';await assert.rejects(downloadAudioFiles({urls:[url],store,fetcher:async()=>response}));assert.equal(await store.getAudio(url),null,'Partial/empty/error responses are never saved');}
await assert.rejects(downloadAudioFiles({urls:[urls[0],urls[0]],store,fetcher}),/Неизвестная/);
const quota=Object.assign(Error('quota'),{name:'QuotaExceededError'});
await assert.rejects(downloadAudioFiles({urls:['https://audio.test/quota.mp3'],store:{getAudio:async()=>null,putAudio:async()=>{throw quota;}},fetcher}),{name:'QuotaExceededError'});
const aborted=new AbortController();aborted.abort();await assert.rejects(downloadAudioFiles({urls,store,fetcher,signal:aborted.signal}),{name:'AbortError'});

// An in-flight worker that ignores cancellation cannot write after its peer fails.
let resolveSecond,started=0;
const race=downloadAudioFiles({urls:['https://audio.test/race-a.mp3','https://audio.test/race-b.mp3'],store,fetcher:url=>{started++;return url.endsWith('a.mp3')?Promise.resolve(new Response('error',{status:500})):new Promise(resolve=>{resolveSecond=resolve;});}});
while(!resolveSecond)await Promise.resolve();
resolveSecond(new Response(new Uint8Array([4]),{headers:{'Content-Type':'audio/mpeg'}}));
await assert.rejects(race);assert.equal(await store.getAudio('https://audio.test/race-b.mp3'),null);

let released,completed=[];
const queue=createQuranDownloadQueue({loadSurah:async number=>({number}),hasSurah:(_,n)=>n!==3,saveSurah:async(surah,reciter,progress,signal)=>{if(surah.number===2)await new Promise((resolve,reject)=>{released=resolve;signal.addEventListener('abort',()=>reject(new DOMException('paused','AbortError')),{once:true});});progress(1,4);completed.push(surah.number);return 4;}});
const active=queue.start('ar.test',[1,2,3]);
assert.equal(queue.busy,true);
assert.equal(queue.start('ar.test',[4]),active,'There is only one foreground queue');
while(!released)await Promise.resolve();queue.pause();assert.equal((await active).status,'paused');assert.deepEqual(completed,[1]);assert.equal(queue.busy,false);
const synchronousFailure=createQuranDownloadQueue({loadSurah(){throw Error('unavailable');},saveSurah:async()=>0});
assert.equal((await synchronousFailure.start('ar.test',[1])).status,'error');
assert.equal(synchronousFailure.busy,false,'A synchronous loader failure cannot leave the queue locked');
await synchronousFailure.start('ar.test',[1]);assert.equal(synchronousFailure.busy,false);

await store.clearAll();assert.equal(responses.size,0,'Clear touches only the dedicated public-audio cache');
console.log('PASS: saved audio without network, partial-file resume, eviction, invalid/empty/ranged responses, quota failure, cancellation, settled workers and restartable queues.');

const catalogue=validateDuaCatalogue(JSON.parse(await fs.readFile(new URL('../dist/data/daily-dua.json',import.meta.url),'utf8')));
for(const [query,id]of [['за маму','for-parents'],['беспокоюсь','anxiety-and-grief'],['когда болею','for-healing'],['в самолете','starting-journey'],['хочу учиться','asking-for-knowledge'],['нужно выбрать','dua-istikhara']])assert.ok(filterDuas(catalogue,{query}).some(item=>item.id===id),query);
assert.deepEqual(filterDuas(catalogue,{query:'беспокоюсь',favoritesOnly:true},['for-parents']),[]);
assert.deepEqual(cleanDuaFavorites(['for-parents','missing','for-parents','starting-journey'],catalogue),['for-parents','starting-journey']);

const current=normalizeReminders({enabled:true,prayers:{Fajr:{atTime:false,adhan:false,beforeMinutes:5},Dhuhr:{atTime:true,adhan:true,beforeMinutes:10}},tahajjud:{enabled:true},jumuah:{enabled:true}});
assert.equal(commonBeforeMinutes(current),null);
for(const minutes of [5,10,15]){
 const next=withBeforeMinutes(current,minutes);assert.equal(commonBeforeMinutes(next),minutes);assert.equal(next.prayers.Fajr.atTime,false);assert.equal(next.prayers.Dhuhr.adhan,true);assert.deepEqual(next.tahajjud,current.tahajjud);assert.deepEqual(next.jumuah,current.jumuah);
 const times=Object.fromEntries(PRAYER_KEYS.map((key,i)=>[key,Date.parse('2026-10-07T05:00:00+05:00')+i*3*3600000]));
 const events=buildReminderEvents(next,{cityKey:'tyumen',today:'2026-10-07',timeZone:'Asia/Yekaterinburg',timingsFor:day=>day==='2026-10-07'?times:{}});
 for(const key of PRAYER_KEYS)assert.equal(events.find(e=>e.key===key&&e.phase==='before:'+minutes).at,times[key]-minutes*60000);
}
assert.deepEqual(withBeforeMinutes(current,-10),current);
console.log('PASS: situation search, retained favorite IDs and accurate 5/10/15-minute reminders without changing at-time/azan/tahajjud preferences.');
