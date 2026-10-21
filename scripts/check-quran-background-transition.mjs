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
 let blocked=false,audio,cacheReads=0,metadataReads=0;
 const session=createQuranSession({
  loadCatalog:async()=>{metadataReads++;assert.equal(blocked,false,'No catalog wait at the chapter boundary');return catalog;},
  load:async n=>{metadataReads++;assert.equal(blocked,false,'No recording lookup at the chapter boundary');return reciterRecording(catalog,n);},
  loadSaved:async()=>[{surah:7},{surah:8}],
  getAudio:async()=>{cacheReads++;assert.equal(blocked,false,'Next cache lookup happens while audio is running');return pendingCache?new Promise(()=>{}):offline?new Blob(['test']):null;},
  createAudio:src=>(audio=new Audio(src)),
  createPlayer:opts=>createQuranPlayer({...opts,loadTimings:async()=>null,getAudio:async()=>{cacheReads++;assert.equal(blocked,false,'No IndexedDB wait after ended');return offline?new Blob(['test']):null;}})
 });
 await session.start(reciterRecording(catalog,7),'ar.alafasycontinuous',0,true,offline);await flush();
 assert.equal(session.state.status,'playing');const original=audio,reads=cacheReads,lookups=metadataReads;
 blocked=true;audio.ended=true;audio.paused=true;audio.onended();
 assert.equal(session.state.surah.number,8,'The next chapter is selected in the ended handler');
 assert.equal(audio,original,'Keep the media element already allowed by the listener');
 assert.equal(audio.playCalls,2,'Start the next audio synchronously, before any async continuation');
 assert.equal(cacheReads,reads);assert.equal(metadataReads,lookups);
 session.pause();assert.equal(audio.paused,true);await flush();assert.equal(session.state.status,'paused','A late play promise cannot undo Pause');
 session.stop();
}
console.log('PASS: 7 → 8 starts on the same media element before any asynchronous callback; online/offline, no storage/catalog wait at ended, pause wins over late play completion.');
