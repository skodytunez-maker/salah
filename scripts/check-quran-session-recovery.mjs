import assert from 'node:assert/strict';
import{createQuranSession}from '../dist/js/quran-session.js';
import{createQuranPlayer}from '../dist/js/quran-audio.js';
import{initQuranSessionRecovery,normalizeQuranSession,QURAN_SESSION_KEY}from '../dist/js/quran-session-recovery.js';
import{readFile}from 'node:fs/promises';
import{loadIndex}from '../dist/js/quran-data.js';
const catalog=JSON.parse(await readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
const oldFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>catalog});await loadIndex();globalThis.fetch=oldFetch;
const surah=n=>({number:n,verses:[{number:1,ayah:1},{number:2,ayah:2}]}),flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
let audioCalls=0,claimCalls=0;const tracks=[];
class Audio{constructor(url){this.src=url;this.paused=true;this.currentTime=0;this.duration=800;this.readyState=1;tracks.push(this);}async play(){audioCalls++;this.paused=false;}pause(){this.paused=true;}load(){}}
const options={load:async n=>surah(n),loadCatalog:async()=>catalog,getAudio:async()=>null,createAudio:url=>new Audio(url),claim:()=>claimCalls++,createPlayer:o=>createQuranPlayer({...o,getAudio:async()=>null,loadTimings:async()=>null,createAudio:url=>new Audio(url)})};
const saved={schema:1,surah:4,reciter:'ar.badralturki',index:0,seconds:73.25,elapsed:73.25,duration:800,ayah:null,name:'Ан-Ниса',expanded:true,offlineOnly:false,playlist:{index:1,tracks:[{surah:1,reciter:'ar.badralturki'},{surah:4,reciter:'ar.badralturki'},{surah:5,reciter:'ar.badralturki'}]}};
function environment(value=saved){const data=new Map(value?[[QURAN_SESSION_KEY,JSON.stringify(value)]]:[]),win=new EventTarget(),doc=new EventTarget();doc.hidden=false;return{data,win,doc,storage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};}
const env=environment(),session=createQuranSession(options);let expanded=0;const statuses=[];session.subscribe(s=>statuses.push(s.status));
const recovery=initQuranSessionRecovery({...env,playback:session,getExpanded:()=>true,restoreExpanded:()=>expanded++});
await recovery.ready;
assert.equal(session.state.status,'paused');assert.equal(session.state.surah.number,4);assert.equal(session.state.meta.name,catalog.surahs[3].name);assert.equal(session.state.reciter,saved.reciter);assert.equal(session.state.positionSeconds,73.25);assert.equal(session.state.durationSeconds,800);assert.equal(session.state.playlist.index,1);assert.equal(session.state.playlist.tracks.length,3);assert.equal(expanded,1);
assert.equal(audioCalls,0,'Reload restoration never starts audio');assert.equal(claimCalls,0,'Paused restoration never claims audio focus');assert.ok(!statuses.includes('playing')&&!statuses.includes('loading'),'No active status that could create presence or listening credit');
session.toggle();await flush();assert.equal(session.state.status,'playing');assert.equal(tracks.at(-1).currentTime,73.25,'Explicit play resumes the precise offset');assert.equal(session.state.playlist.index,1,'Resuming a restored queue must not restart its entry');
tracks.at(-1).currentTime=89.75;session.pause();env.win.dispatchEvent(new Event('salah:before-update-reload'));let persisted=JSON.parse(env.data.get(QURAN_SESSION_KEY));assert.equal(persisted.seconds,89.75);assert.equal(persisted.playlist.index,1);
session.toggle();await flush();tracks.at(-1).currentTime=102.5;env.doc.hidden=true;env.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(JSON.parse(env.data.get(QURAN_SESSION_KEY)).seconds,102.5,'Hidden/pagehide checkpoints read the current media position');
session.pause();session.stop();assert.equal(JSON.parse(env.data.get(QURAN_SESSION_KEY)).closed,true,'Explicit close leaves a tombstone so legacy progress cannot resurrect it');recovery.destroy();
const reopened=createQuranSession(options),empty=environment(null),off=initQuranSessionRecovery({...empty,playback:reopened});await off.ready;assert.equal(reopened.state.surah,null,'Closed player stays closed on next launch');off.destroy();

// Verse audio saves its per-file offset independently from total surah elapsed time.
const verse=createQuranSession(options);await verse.restoreSession({...saved,reciter:'ar.husary',index:1,seconds:5.5,elapsed:70.5,ayah:2,playlist:null});assert.equal(verse.state.positionSeconds,70.5);assert.equal(verse.state.trackPositionSeconds,5.5);verse.toggle();await flush();assert.equal(verse.state.index,1);assert.equal(tracks.at(-1).currentTime,5.5);verse.stop();
let release;const pending=createQuranSession({...options,load:()=>new Promise(r=>release=r)});const restore=pending.restoreSession(saved);await pending.start(surah(8),'ar.badralturki',0,false);release(surah(4));await restore;assert.equal(pending.state.surah.number,8,'A slow restore cannot replace a newer user selection');pending.stop();
const stopped=createQuranSession({...options,load:()=>new Promise(r=>release=r)}),wait=stopped.restoreSession(saved);stopped.stop();release(surah(4));await wait;assert.equal(stopped.state.surah,null,'Close during metadata loading cannot resurrect the card');
const unavailable=createQuranSession({...options,load:async()=>{throw Error('offline');}});await unavailable.restoreSession(saved);assert.equal(unavailable.state.status,'paused');assert.equal(unavailable.state.positionSeconds,73.25,'A temporary metadata failure retains the paused card and offset');unavailable.stop();
const offline=createQuranSession({...options,loadSaved:async()=>[{surah:4},{surah:5}]});await offline.restoreSession({...saved,offlineOnly:true});assert.equal(offline.state.offlineOnly,true);assert.equal(offline.state.canNext,true);assert.equal(offline.state.playlist,null);offline.stop();
for(const invalid of [{...saved,schema:0},{...saved,seconds:Infinity},{...saved,index:-1},{...saved,reciter:'https://bad.test/audio.mp3'},{...saved,surah:999}])assert.equal(normalizeQuranSession(invalid),null);
const denied=environment();denied.storage={getItem(){throw Error('denied');},setItem(){throw Error('full');},removeItem(){throw Error('denied');}};const safe=createQuranSession(options),safeRecovery=initQuranSessionRecovery({...denied,playback:safe});await safeRecovery.ready;await safe.start(surah(4),'ar.badralturki',0,false);safeRecovery.flush();safe.stop();safeRecovery.destroy();
console.log('PASS: exact paused restoration, no automatic audio/focus/listening credit, queue/verse offsets, explicit close persistence, offline metadata, storage failures and cancellation races.');
