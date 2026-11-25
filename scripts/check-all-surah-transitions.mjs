import assert from 'node:assert/strict';
import {readFile}from 'node:fs/promises';
import {createQuranSession}from '../dist/js/quran-session.js';
import {createQuranPlayer}from '../dist/js/quran-audio.js';
import {reciterRecording}from '../dist/js/quran-reciter-recording.js';
import {RECITERS,adjacentReciterSurah}from '../dist/js/quran-reciters.js';
import {loadIndex}from '../dist/js/quran-data.js';
const catalog=JSON.parse(await readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>catalog});await loadIndex();globalThis.fetch=originalFetch;
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
let transitions=0,voices=0;
for(const reciter of RECITERS.filter(r=>r.format==='surah')){
 for(const ending of ['natural','pause-before-end']){
  const elements=[];
  class NativeAudio{
   constructor(src){this.src=src;this.currentTime=0;this.duration=120;this.paused=true;this.ended=false;elements.push(this);}
   async play(){assert.equal(elements.length,1,'Keep the same permitted media element');this.paused=false;this.ended=false;this.onplay?.();}
   pause(){this.paused=true;this.onpause?.();}
  }
  const first=Array.from({length:114},(_,i)=>i+1).find(n=>!reciter.availableSurahs||reciter.availableSurahs.includes(n));
  const session=createQuranSession({loadCatalog:async()=>catalog,getAudio:async()=>null,createAudio:src=>new NativeAudio(src),media:{update(){}},
   createPlayer:options=>createQuranPlayer({...options,getAudio:async()=>null,loadTimings:async()=>null,loadDurations:async()=>null,setTimer:()=>null,clearTimer(){}})});
  await session.start(reciterRecording(catalog,first),reciter.id);await flush();
  for(let number=first;;){
   assert.equal(session.state.surah.number,number,reciter.id+' current surah');assert.equal(session.state.status,'playing',reciter.id+' playback');
   const audio=elements[0],next=adjacentReciterSurah(reciter.id,number,1);
   audio.currentTime=ending==='pause-before-end'?audio.duration-1.25:audio.duration;
   if(ending==='pause-before-end'){audio.paused=true;audio.onpause?.();assert.equal(session.state.surah.number,number,'Pause alone must never advance');}
   audio.currentTime=audio.duration;audio.ended=true;audio.paused=true;audio.onended?.();await flush();
   if(next===null){assert.equal(session.state.status,'ended',reciter.id+' final stop');break;}
   assert.equal(session.state.surah.number,next,reciter.id+' '+number+' to '+next);
   assert.equal(session.state.status,'playing',reciter.id+' '+number+' to '+next);
   transitions++;number=next;
  }
  session.stop();
 }
 voices++;
}
console.log('PASS: '+transitions+' normal and final-pause handoffs across '+voices+' whole-surah recordings, including Haitham 1→2→3 and every available next surah, one audio element and final stop.');
