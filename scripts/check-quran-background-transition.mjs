import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createQuranSession} from '../dist/js/quran-session.js';
import {createQuranPlayer} from '../dist/js/quran-audio.js';
import {reciterRecording} from '../dist/js/quran-reciter-recording.js';
const catalog=JSON.parse(await readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
class Audio {
 constructor(src){this.src=src;this.paused=true;this.playCalls=0;this.currentTime=0;this.duration=60;}
 play(){this.playCalls++;this.paused=false;this.ended=false;return Promise.resolve();}
 pause(){this.paused=true;}
}
for(const {offline,pendingCache} of [{offline:false},{offline:true},{offline:false,pendingCache:true}]){
 let blocked=false,audio,cacheReads=0,metadataReads=0,category='auto';const categories=[],sources=[];
 const nav={audioSession:{get type(){return category;},set type(value){categories.push(value);category=value;}}};
 const session=createQuranSession({
  loadCatalog:async()=>{metadataReads++;assert.equal(blocked,false,'No catalog wait at the chapter boundary');return catalog;},
  load:async n=>{metadataReads++;assert.equal(blocked,false,'No recording lookup at the chapter boundary');return reciterRecording(catalog,n);},
  loadSaved:async()=>[{surah:7},{surah:8}],
  getAudio:async()=>{cacheReads++;assert.equal(blocked,false,'Next cache lookup happens while audio is running');return pendingCache?new Promise(()=>{}):offline?new Blob(['test']):null;},
  createAudio:src=>{audio=new Audio(src);let value=src;Object.defineProperty(audio,'src',{get:()=>value,set:next=>{sources.push(next);value=next;}});return audio;},
  createPlayer:opts=>createQuranPlayer({...opts,audioNavigator:nav,loadTimings:async()=>null,getAudio:async()=>{cacheReads++;assert.equal(blocked,false,'No IndexedDB wait after ended');return offline?new Blob(['test']):null;}})
 });
 await session.start(reciterRecording(catalog,7),'ar.alafasycontinuous',0,true,offline);await flush();
 assert.equal(session.state.status,'playing');const original=audio,reads=cacheReads,lookups=metadataReads;
 categories.length=0;sources.length=0;blocked=true;audio.ended=true;audio.paused=true;audio.onended();
 assert.equal(session.state.surah.number,8,'The next chapter is selected in the ended handler');
 assert.equal(audio,original,'Keep the media element already allowed by the listener');
 assert.equal(audio.playCalls,2,'Start the next audio synchronously, before any async continuation');
 assert.equal(cacheReads,reads);assert.equal(metadataReads,lookups);
 assert.deepEqual(categories,[],'A chapter boundary must not release/reacquire the OS playback category');
 assert.ok(!sources.includes(''),'The background media element must not be unloaded between chapters');
 session.pause();assert.equal(audio.paused,true);await flush();assert.equal(session.state.status,'paused','A late play promise cannot undo Pause');
 session.stop();assert.equal(category,'auto','Stop releases the OS playback category');assert.equal(audio.src,'');
}
console.log('PASS: 7 → 8 starts on the same media element before any asynchronous callback; online/offline, no storage/catalog wait at ended, pause wins over late play completion.');
// A retained queue must still release the category on terminal completion and
// cancellation. Returning to the foreground does not recreate the track.
{
 const doc=new EventTarget();doc.hidden=false;doc.hasFocus=()=>true;
 const win=new EventTarget(),nav={standalone:true,audioSession:{type:'auto'}};let audio,creates=0;
 const session=createQuranSession({loadCatalog:async()=>catalog,createAudio:src=>{creates++;return audio=new Audio(src);},createPlayer:opts=>createQuranPlayer({...opts,audioNavigator:nav,audioDocument:doc,audioWindow:win,loadTimings:async()=>null,getAudio:async()=>null})});
 await session.start(reciterRecording(catalog,113),'ar.yasseraldossaricontinuous');await flush();
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));audio.ended=true;audio.paused=true;audio.onended();await flush();
 assert.equal(session.state.surah.number,114);assert.equal(nav.audioSession.type,'playback');audio.currentTime=59;
 doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));win.dispatchEvent(new Event('pageshow'));await flush();
 assert.equal(audio.currentTime,59,'Foreground return keeps the next chapter position');assert.equal(creates,1);
 audio.ended=true;audio.paused=true;audio.onended();assert.equal(session.state.status,'ended');assert.equal(nav.audioSession.type,'auto','Final chapter releases its category');
 session.stop();await session.start(reciterRecording(catalog,113),'ar.yasseraldossaricontinuous');await flush();
 session.pause();const plays=audio.playCalls;doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));await flush();
 assert.equal(audio.playCalls,plays,'Manual pause remains authoritative after a chapter handoff');session.stop();assert.equal(nav.audioSession.type,'auto');
}
console.log('PASS: Daussari 113 → 114, foreground position retained, final completion releases category, queue restart and manual pause precedence.');
