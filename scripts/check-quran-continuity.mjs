import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createQuranSession} from '../dist/js/quran-session.js';
import {createQuranPlayer} from '../dist/js/quran-audio.js';
import {reciterRecording} from '../dist/js/quran-reciter-recording.js';
import {RECITERS,reciterInfo} from '../dist/js/quran-reciters.js';
import {loadIndex} from '../dist/js/quran-data.js';
const catalog=JSON.parse(await readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>({ok:true,json:async()=>catalog});await loadIndex();globalThis.fetch=originalFetch;
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
const media={update(){}};
for(const id of ['ar.alafasy','ar.mahermuaiqly']){
 const elements=[];
 class MobileAudio{
  constructor(url){this.src=url;this.currentTime=0;this.duration=60;this.paused=true;this.playCalls=0;elements.push(this);}
  async play(){if(elements.length>1)throw Object.assign(new Error('A new media element needs a user gesture'),{name:'NotAllowedError'});this.playCalls++;this.paused=false;}
  pause(){this.paused=true;}
 }
 const session=createQuranSession({loadCatalog:async()=>catalog,createAudio:url=>new MobileAudio(url),media,
  createPlayer:opts=>createQuranPlayer({...opts,getAudio:async()=>null,loadTimings:async()=>null,loadDurations:async()=>null,setTimer:()=>null,clearTimer(){}})});
 await session.start(reciterRecording(catalog,112),id);await flush();
 assert.equal(session.state.reciter,reciterInfo(id).continuousReciter);
 assert.equal(session.state.status,'playing');assert.equal(elements.length,1);
 const element=elements[0];assert.ok(element.src.endsWith('/112.mp3'));
 const detached=session.subscribe(()=>{});detached();
 element.onended();await flush();
 assert.equal(session.state.surah.number,113);assert.equal(session.state.status,'playing');
 assert.equal(elements.length,1,'Next chapter reuses the already permitted media element');
 assert.ok(element.src.endsWith('/113.mp3'));
 assert.equal(session.state.surah.verses[0].number,6226,'Chapter advance builds correct global ayah positions without a text download');
 session.pause();assert.equal(session.state.status,'paused');session.toggle();await flush();assert.equal(session.state.status,'playing');
 element.onended();await flush();assert.equal(session.state.surah.number,114);assert.equal(session.state.status,'playing');
 element.onended();await flush();assert.equal(session.state.status,'ended');assert.equal(session.state.canNext,false);
 session.stop();assert.equal(element.paused,true);assert.equal(element.src,'');assert.equal(element.onended,null);
 const legacyOptions=[];
 const legacy=createQuranSession({loadCatalog:async()=>catalog,loadSaved:async()=>[{surah:112}],media,
  createPlayer:opts=>{legacyOptions.push(opts);return{play(){opts.onState({status:'playing',index:0,ayah:1});},playFromAyah(number){opts.onState({status:'playing',index:number-1,ayah:number});},destroy(){}};}});
 await legacy.start(reciterRecording(catalog,112),id,0,true,true);
 assert.equal(legacyOptions.at(-1).reciter,id,'Existing offline ayah downloads keep their recording IDs');legacy.stop();
 await legacy.start(reciterRecording(catalog,112),id,1,true,false,3);
 assert.equal(legacyOptions.at(-1).reciter,id,'Resuming an old ayah/time position must not switch to a different recording');legacy.stop();
 await legacy.startFromAyah(reciterRecording(catalog,112),id,1);
 assert.equal(legacyOptions.at(-1).reciter,id,'Explicit ayah playback keeps its exact segmented recording');legacy.stop();
 await legacy.start(reciterRecording(catalog,112),'ar.idrisabkar');
 await legacy.changeReciter(id);assert.equal(legacyOptions.at(-1).reciter,reciterInfo(id).continuousReciter,'Changing voice from a whole chapter selects smooth playback too');legacy.stop();
}
assert.equal(RECITERS.filter(r=>!r.variantOf).length,46,'Recording variants do not add duplicate public reader cards');
assert.equal(reciterInfo('ar.alafasycontinuous').variantOf,'ar.alafasy','Listening time uses the established reader identity');
assert.equal(reciterInfo('ar.mahermuaiqlycontinuous').variantOf,'ar.mahermuaiqly');
console.log('PASS: whole-surah Mishary/Maher, one permitted mobile Audio across 112→113→114, correct verse positions, detached screens, pause/resume, final stop, legacy downloads and playback offsets.');
