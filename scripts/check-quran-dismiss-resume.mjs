import{createImagePresenter}from '../dist/js/image-presentation.js';
import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{runInNewContext}from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{createQuranSession}from '../dist/js/quran-session.js';
import{createQuranPlayer}from '../dist/js/quran-audio.js';
import{createQuranNatureAudio}from '../dist/js/quran-nature-audio.js';
import{initQuranSessionRecovery,QURAN_SESSION_KEY}from '../dist/js/quran-session-recovery.js';
import{bindMiniPlayerDismiss}from '../dist/js/quran-mini-dismiss.js';
import{durationTimeline}from '../dist/js/quran-duration.js';
import{RECITERS,reciterInfo,reciterHasSurah,groupedReciters}from '../dist/js/quran-reciters.js';
const w=new Window({url:'https://fixture.invalid/#home'}),memory=new Map();
Object.assign(globalThis,{window:w,document:w.document,location:w.location,Event:w.Event,localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)}});
const catalog=JSON.parse(await readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
globalThis.fetch=async()=>({ok:true,json:async()=>catalog});await(await import('../dist/js/quran-data.js')).loadIndex();globalThis.fetch=async()=>{throw Error('No network in dismiss/resume fixture')};
const{read,write}=await import('../dist/js/storage.js'),{t,translateUi,subscribeLanguage}=await import('../dist/js/i18n.js');
const{mountQuranPlayerExtras}=await import('../dist/js/quran-player-extras.js');
const{initQuranListeningProgress,readListeningPosition,markListeningDismissed,readResumeAfterDismiss}=await import('../dist/js/quran-listening-progress.js');
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve))};
const tracks=[],contexts=[];let mediaUpdates=[],claims=0;
class Audio{
 constructor(url){this._src=url;this.currentTime=0;this.duration=200;this.readyState=1;this.paused=true;this.playCalls=0;tracks.push(this)}
 set src(value){this._src=value;this.currentTime=0}get src(){return this._src}
 async play(){this.playCalls++;this.paused=false;this.onplay?.()}pause(){this.paused=true;this.onpause?.()}load(){}
}
class Param{value=0;cancelScheduledValues(){}setValueAtTime(value){this.value=value}linearRampToValueAtTime(value){this.value=value}}
class Context{
 state='suspended';currentTime=0;destination={};sources=[];gains=[];resumeCalls=0;
 constructor(){contexts.push(this)}
 createGain(){const gain={gain:new Param(),connect(){},disconnect(){}};this.gains.push(gain);return gain}
 createBufferSource(){const node={connect(){},disconnect(){this.disconnected=true},stop(){this.stopped=true},start(){this.started=true}};this.sources.push(node);return node}
 async resume(){this.resumeCalls++;this.state='running';this.onstatechange?.()}async suspend(){this.state='suspended';this.onstatechange?.()}async close(){this.state='closed'}
}
const surah=number=>({number,verses:[{number:494,ayah:1},{number:495,ayah:2},{number:496,ayah:3}]}),timings=[{ayah:1,start:0,end:20},{ayah:2,start:20,end:80},{ayah:3,start:80,end:200}],durations=durationTimeline([20,60,120]);
const options={load:async number=>surah(number),loadCatalog:async()=>catalog,getAudio:async()=>null,loadSaved:async()=>[],media:{update:value=>mediaUpdates.push(value)},claim:()=>claims++,createAudio:url=>new Audio(url),createPlayer:config=>createQuranPlayer({...config,getAudio:async()=>null,loadTimings:async()=>timings,loadDurations:async()=>durations,createAudio:config.createAudio||((url)=>new Audio(url))})};
const session=createQuranSession(options);let progressSample,clock=100000,currentAccount={identityKnown:true,userId:'fixture-user'};
const realInterval=globalThis.setInterval;globalThis.setInterval=callback=>{progressSample=callback;return 1};
initQuranListeningProgress({playback:session,getAccount:()=>currentAccount,now:()=>clock});
globalThis.setInterval=realInterval;
write('quran-nature-kind','ocean');write('quran-nature-volume',63);write('quran-nature-visual','photo');
const source=await readFile(new URL('../dist/js/quran-player-bar.js',import.meta.url),'utf8'),resumeSource=await readFile(new URL('../dist/js/quran.js',import.meta.url),'utf8');
const resumeHandler=resumeSource.split(/\r?\n/).find(line=>line.includes("const resume=host.querySelector('#quran-resume-listening');if(resume)resume.onclick"));
assert.ok(resumeHandler,'Exercise the existing Continue Listening handler, not a replacement');
const readerHandler=resumeSource.split(/\r?\n/).find(line=>line.includes("host.querySelector('#quran-play-surah').onclick="));assert.ok(readerHandler,'Exercise the actual Listen button beside Live');
let nature;
const ruqyah={state:{record:null},subscribe(callback){callback();return()=>{}},stop(){throw Error('No ruqyah playing')}},
 context={createImagePresenter,document:w.document,window:w,location:w.location,innerHeight:900,getComputedStyle:()=>({display:'none',bottom:'0px'}),quranPlayback:session,ruqyahPlayback:ruqyah,RECITERS,reciterInfo,reciterHasSurah,groupedReciters,read,write,t,translateUi,subscribeLanguage,initQuranSessionRecovery,bindMiniPlayerDismiss,markListeningDismissed,
  reciterImageUrl:value=>value,ruqyahDuration:value=>Number.isFinite(value)?String(value):'',actionIcon:()=>'',toast:()=>{},showTvOutput:()=>{},showListeningShare:()=>{},RECITER_FAVORITES_KEY:'favorites',
  mountPlayerWindow:()=>({isOpen:false,open(){this.isOpen=true},close(){this.isOpen=false},destroy(){}}),
  mountQuranPlayerExtras:(panel,props)=>mountQuranPlayerExtras(panel,{...props,doc:w.document,win:w,createNature:config=>(nature=createQuranNatureAudio({...config,AudioContext:Context,load:async kind=>({kind,duration:34,numberOfChannels:2})}))})};
const api=runInNewContext(source.replace(/^import.*$/gm,'').replaceAll('export ','')+';({mountQuranPlayer});',context);
let unmount=api.mountQuranPlayer();await flush();
const activeTrack=()=>tracks.filter(track=>track.playCalls>0).at(-1),playCalls=()=>tracks.reduce((sum,track)=>sum+track.playCalls,0);
assert.equal(nature.state.kind,'ocean');assert.equal(nature.state.volume,63);assert.equal(contexts.length,0,'Saved preference alone never creates an audio graph');
const continueListening=async()=>{
 const host=w.document.createElement('section');host.innerHTML='<button id="quran-resume-listening">Listen</button>';w.document.body.append(host);
 runInNewContext(resumeHandler,{host,readListeningPosition,listened:readListeningPosition(),loadSurah:async number=>surah(number),quranPlayback:session,positionUrl:(number,ayah)=>'#quran?surah='+number+'&ayah='+ayah,location:w.location,t,toast:message=>{throw Error(message)}});
 await host.querySelector('button').onclick();await flush();host.remove();
};
const resume=async(reciter,number=4)=>{
 const host=w.document.createElement('section');host.innerHTML='<button id="quran-play-surah">Listen</button>';w.document.body.append(host);
 runInNewContext(readerHandler,{host,readResumeAfterDismiss,surah:surah(number),p:{reciter},offlineOnly:false,quranPlayback:session});await host.querySelector('button').onclick();await flush();host.remove();
};
write('quran-preferences',{reciter:'ar.yasseraldossaricontinuous'});
await session.start(surah(4),'ar.yasseraldossaricontinuous',0,true,false,0,false);await flush();
assert.equal(session.state.status,'playing');assert.equal(nature.state.playing,true);assert.equal(nature.state.kind,'ocean');assert.equal(readListeningPosition().seconds,0);
const whole=activeTrack();whole.currentTime=89.875;clock+=250;const claimsBeforeClose=claims;
w.document.querySelector('[data-dismiss-player]').click();
assert.equal(whole.paused,true);assert.equal(session.state.surah,null);assert.equal(nature.state.kind,'ocean');assert.equal(nature.state.volume,63);assert.equal(nature.state.playing,false);assert.ok(contexts.every(ctx=>ctx.sources.every(node=>node.stopped)),'Cross immediately stops all nature sources');
assert.equal(read('quran-nature-kind',null),'ocean');assert.equal(read('quran-nature-volume',0),63);assert.equal(read('quran-nature-visual','video'),'photo');
let last=readListeningPosition();assert.equal(last.seconds,89.875,'Close samples the actual media offset without waiting for a progress timer');assert.equal(last.index,0);assert.equal(last.ayah,3,'Whole-surah pause samples the fresh ayah boundary');assert.equal(claims,claimsBeforeClose,'Closing cannot claim playing focus or synthetic listening');
assert.equal(JSON.parse(memory.get(QURAN_SESSION_KEY)).closed,true);const closedCalls=playCalls(),resumeCalls=contexts.reduce((sum,ctx)=>sum+ctx.resumeCalls,0);
w.dispatchEvent(new w.Event('pageshow'));w.dispatchEvent(new w.Event('focus'));progressSample();await flush();assert.equal(playCalls(),closedCalls);assert.equal(contexts.reduce((sum,ctx)=>sum+ctx.resumeCalls,0),resumeCalls);assert.equal(session.state.surah,null,'Lifecycle/history samples cannot revive an intentionally closed player');
assert.equal(readResumeAfterDismiss(surah(5),'ar.yasseraldossaricontinuous'),null);assert.equal(readResumeAfterDismiss(surah(4),'ar.idrisabkar'),null);assert.equal(readResumeAfterDismiss(surah(4),'ar.yasseraldossaricontinuous',true),null);
currentAccount={identityKnown:true,userId:'another-user'};assert.equal(readResumeAfterDismiss(surah(4),'ar.yasseraldossaricontinuous'),null,'A different account cannot read the dismissal position');currentAccount={identityKnown:true,userId:'fixture-user'};
assert.equal(readResumeAfterDismiss(surah(4),'ar.yasseraldossaricontinuous').seconds,89.875);
write('quran-last-listening-v1:fixture-user',{...last,seconds:112.25,updatedAt:last.updatedAt+1});assert.equal(readResumeAfterDismiss(surah(4),'ar.yasseraldossaricontinuous'),null,'A stale dismissal marker cannot rewind newer listening history written by another tab');write('quran-last-listening-v1:fixture-user',last);
await resume('ar.yasseraldossaricontinuous');assert.equal(activeTrack().currentTime,89.875);assert.equal(session.state.ayah,3);assert.equal(session.state.reciter,'ar.yasseraldossaricontinuous');assert.equal(nature.state.playing,true);assert.equal(nature.state.kind,'ocean');assert.equal(nature.state.volume,63);
assert.equal(read('quran-dismissed-listening-v1:fixture-user','not-cleared'),null,'A real start clears the manual dismissal marker');
activeTrack().currentTime=95.125;clock+=250;w.document.querySelector('[data-dismiss-player]').click();await continueListening();assert.equal(activeTrack().currentTime,95.125,'Existing Continue Listening retains its exact behavior');
// A swipe closes the same real mini-player callback. Verse offsets are local to
// their own source and must not be replaced by aggregate surah elapsed seconds.
write('quran-preferences',{reciter:'ar.husary'});await session.start(surah(4),'ar.husary',1,true,false,5,false);await flush();const verse=activeTrack();verse.currentTime=17.625;clock+=250;
const panel=w.document.querySelector('#quran-global-player'),portrait=panel.querySelector('img'),pointer=(target,type,x,y)=>target.dispatchEvent(new w.PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,isPrimary:true,button:0,clientX:x,clientY:y}));
pointer(portrait,'pointerdown',100,100);pointer(panel,'pointermove',210,103);pointer(panel,'pointerup',210,103);
assert.equal(session.state.surah,null);assert.equal(verse.paused,true);assert.equal(nature.state.playing,false);last=readListeningPosition();assert.equal(last.reciter,'ar.husary');assert.equal(last.index,1);assert.equal(last.ayah,2);assert.equal(last.seconds,17.625);assert.equal(last.elapsed,37.625);assert.equal(JSON.parse(memory.get(QURAN_SESSION_KEY)).closed,true);
await resume('ar.husary');assert.equal(session.state.index,1);assert.equal(session.state.ayah,2);assert.equal(activeTrack().currentTime,17.625);assert.equal(session.state.positionSeconds,37.625);assert.equal(nature.state.playing,true);assert.equal(nature.state.kind,'ocean');
clock+=250;w.document.querySelector('[data-dismiss-player]').click();await resume('ar.husary',5);assert.equal(session.state.surah.number,5);assert.equal(session.state.index,0);assert.equal(activeTrack().currentTime,0,'A different surah keeps its ordinary start behavior');session.stop();assert.equal(readResumeAfterDismiss(surah(5),'ar.husary'),null,'An ordinary stop is not an explicit mini-player dismissal');await resume('ar.idrisabkar',5);assert.equal(session.state.reciter,'ar.idrisabkar');assert.equal(activeTrack().currentTime,0,'A different reciter starts its own recording at zero');
session.stop();await flush();unmount();const closedCount=playCalls(),reopened=createQuranSession(options);context.quranPlayback=reopened;unmount=api.mountQuranPlayer();await flush();
assert.equal(reopened.state.surah,null);assert.equal(playCalls(),closedCount);assert.equal(nature.state.kind,'ocean');assert.equal(nature.state.playing,false);assert.equal(nature.state.volume,63);assert.equal(w.document.querySelector('#quran-global-player').dataset.natureVisual,'photo');assert.equal(JSON.parse(memory.get(QURAN_SESSION_KEY)).closed,true,'A saved nature choice cannot resurrect the session checkpoint');
unmount();reopened.stop();await w.happyDOM.close();
console.log('PASS: actual cross/right-swipe stop immediately, retain Ocean/volume/visual preference, exact unsampled whole/verse offsets via ordinary reader Listen and existing Continue, explicit account-scoped dismissal only, unchanged new surah/reciter starts and no automatic resurrection or synthetic focus.');
