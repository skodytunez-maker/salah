import assert from 'node:assert/strict';
import {createQuranSession} from '../dist/js/quran-session.js';
import {createQuranPlayer} from '../dist/js/quran-audio.js';

globalThis.window={};
const catalog={surahs:Array.from({length:114},(_,i)=>({number:i+1,name:'Сура '+(i+1)}))};
const surah=number=>({number,verses:[{number:1,ayah:1},{number:2,ayah:2}]});
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve))};
const tracks=[];
class FakeAudio{
 constructor(url){this.src=url;this.paused=true;this.playCalls=0;this.pauseCalls=0;tracks.push(this)}
 async play(){this.playCalls++;this.paused=false}
 pause(){this.pauseCalls++;this.paused=true}
}
const options={load:async n=>surah(n),loadCatalog:async()=>catalog,createPlayer:opts=>createQuranPlayer({...opts,createAudio:url=>new FakeAudio(url)})};
const session=createQuranSession(options);
let screenUpdates=0;
const detachReader=session.subscribe(()=>screenUpdates++);
await session.start(surah(1),'ar.alafasy');await flush();
assert.equal(session.state.status,'playing');
const first=tracks.at(-1),beforePause=first.pauseCalls;
detachReader();
assert.equal(first.pauseCalls,beforePause,'Leaving a reader must not pause its audio');
first.onended();await flush();
assert.equal(session.state.index,1,'Continuous ayah playback must work without a mounted reader');
assert.equal(session.state.status,'playing');
const running=tracks.at(-1),updates=screenUpdates;
session.pause();assert.equal(session.state.status,'paused');assert.equal(running.paused,true);
session.toggle();await flush();assert.equal(session.state.status,'playing');assert.equal(tracks.at(-1),running,'Resume must retain the current audio and position');
assert.equal(screenUpdates,updates,'Detached reader must not receive playback events');
await session.changeSurah(1);await flush();
assert.equal(session.state.surah.number,2);assert.equal(session.state.index,0);assert.equal(session.state.reciter,'ar.alafasy');assert.equal(session.state.status,'playing');
await session.changeSurah(-1);await flush();assert.equal(session.state.surah.number,1);
await session.changeSurah(-1);assert.equal(session.state.surah.number,1,'No surah before Al-Fatiha');
await session.start(surah(114),'ar.alafasy');await flush();assert.equal(session.state.canNext,false);
await session.changeSurah(1);assert.equal(session.state.surah.number,114);
tracks.at(-1).onended();await flush();tracks.at(-1).onended();await flush();assert.equal(session.state.status,'ended');assert.equal(session.state.surah.number,114,'The final surah ends without wrapping to the beginning');
await session.start(surah(2),'ar.badralturki');await flush();
assert.ok(tracks.at(-1).src.endsWith('/002.mp3'));
await session.changeSurah(1);await flush();assert.ok(tracks.at(-1).src.endsWith('/003.mp3'),'Whole-surah reciters must also switch surahs');
tracks.at(-1).onerror();assert.equal(session.state.status,'error');
session.toggle();await flush();assert.equal(session.state.status,'playing','Retry audio after an error');
const playing=tracks.at(-1);session.stop();assert.equal(playing.paused,true);assert.equal(session.state.status,'stopped');assert.equal(session.state.surah,null);

const deferred=new Map();
const racing=createQuranSession({...options,load:n=>new Promise(resolve=>deferred.set(n,resolve))});
await racing.start(surah(1),'ar.alafasy');await flush();
const slow=racing.changeSurah(1),latest=racing.changeSurah(1);
deferred.get(3)(surah(3));await latest;await flush();
deferred.get(2)(surah(2));await slow;await flush();
assert.equal(racing.state.surah.number,3,'A late load must not replace the latest surah');
const closing=racing.changeSurah(1);racing.stop();deferred.get(4)(surah(4));await closing;await flush();assert.equal(racing.state.status,'stopped','Closing while loading must not restart audio');
await racing.start(surah(1),'ar.alafasy');await flush();const pending=racing.changeSurah(1);racing.pause();deferred.get(2)(surah(2));await pending;await flush();assert.equal(racing.state.status,'paused','Pause must cancel an in-flight surah start');
let resumed=racing.toggle();deferred.get(2)(surah(2));await flush();assert.equal(racing.state.status,'playing');racing.stop();
for(const reciter of ['ar.alafasy','ar.badralturki','ar.tariqmuhammad']){
 const automatic=createQuranSession(options);await automatic.start(surah(1),reciter);await flush();
 tracks.at(-1).onended();await flush();if(reciter==='ar.alafasy'){assert.equal(automatic.state.index,1);tracks.at(-1).onended();await flush()}
 assert.equal(automatic.state.surah.number,2,'Al-Fatiha must continue automatically to Al-Baqara');
 assert.equal(automatic.state.reciter,reciter);assert.equal(automatic.state.status,'playing');assert.equal(automatic.state.index,0);automatic.stop();
}
const limited=createQuranSession(options);await limited.start(surah(2),'ar.tariqmuhammad');await flush();assert.ok(tracks.at(-1).src.endsWith('/002.mp3'));await limited.changeSurah(1);await flush();assert.equal(limited.state.surah.number,12,'Partial catalogs advance to the next available recording');await limited.start(surah(3),'ar.tariqmuhammad');assert.equal(limited.state.surah.number,12,'An absent recording must not replace current playback');await limited.start(surah(86),'ar.tariqmuhammad');await flush();assert.equal(limited.state.canNext,false);tracks.at(-1).onended();await flush();assert.equal(limited.state.status,'ended','The final available recording ends without error');limited.stop();
console.log('PASS: automatic surah continuation, persistent playback, continuous ayahs, pause/resume, previous/next surahs, reciter preservation, errors, boundaries and stale-load cancellation');
