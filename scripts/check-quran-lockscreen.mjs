import assert from 'node:assert/strict';
import{createQuranSession}from '../dist/js/quran-session.js';
import{createQuranPlayer}from '../dist/js/quran-audio.js';
import{createMediaSession}from '../dist/js/media-session.js';
const handlers={},native={setActionHandler(n,f){handlers[n]=f;},setPositionState(v){this.position=v;}};class Metadata{constructor(info){Object.assign(this,info);}}
const appleAudioSession={type:'auto'},appleDoc=new EventTarget(),appleWin=new EventTarget();appleDoc.hidden=false;appleDoc.hasFocus=()=>!appleDoc.hidden;
const tracks=[],surah=n=>({number:n,verses:[{number:1,ayah:1}]}),catalog={surahs:Array.from({length:114},(_,i)=>({number:i+1,name:'Сура '+(i+1)}))};
class Audio{constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.duration=100;this.readyState=1;this.plays=0;tracks.push(this);}async play(){this.plays++;this.paused=false;this.onplay?.();}pause(){this.paused=true;this.onpause?.();}}
const media=createMediaSession({nav:{mediaSession:native},Metadata});const session=createQuranSession({media,load:async n=>surah(n),loadCatalog:async()=>catalog,createPlayer:opts=>createQuranPlayer({...opts,audioNavigator:{standalone:true,audioSession:appleAudioSession},audioDocument:appleDoc,audioWindow:appleWin,getAudio:async()=>null,loadTimings:async()=>null,createAudio:src=>new Audio(src)})});
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));};
await session.start(surah(1),'ar.badralturki');await flush();const first=tracks.at(-1);assert.equal(native.metadata.title,'Сура 1');assert.equal(native.playbackState,'playing');first.currentTime=20;first.ontimeupdate();assert.equal(native.position.position,20);assert.equal(native.position.duration,100);
appleDoc.hidden=true;appleDoc.dispatchEvent(new Event('visibilitychange'));
const controlCenter=action=>{if(appleAudioSession.type!=='playback'||!native.metadata||typeof handlers[action]!=='function')return false;handlers[action]();return true;};
assert.equal(controlCenter('pause'),true);assert.equal(first.paused,true);assert.equal(appleAudioSession.type,'playback');assert.equal(native.playbackState,'paused');await flush();assert.equal(first.paused,true,'No automatic resume after pause');assert.equal(controlCenter('play'),true,'System play must remain routable');await flush();assert.equal(first.paused,false);assert.equal(first.currentTime,20);assert.equal(tracks.at(-1),first);assert.equal(controlCenter('pause'),true);assert.equal(first.paused,true);
handlers.seekto({seekTime:30});assert.equal(first.currentTime,30);assert.equal(first.paused,true,'Seeking paused media cannot auto-play');handlers.play();await flush();assert.equal(first.paused,false);assert.equal(tracks.at(-1),first);handlers.seekforward({seekOffset:10});assert.equal(first.currentTime,40);handlers.nexttrack();await flush();assert.equal(session.state.surah.number,2);assert.equal(first.src,'');assert.equal(native.metadata.title,'Сура 2');handlers.previoustrack();await flush();assert.equal(session.state.surah.number,1);
const current=tracks.at(-1),nativePlays=current.plays,source=current.src;current.currentTime=47;
current.paused=true;current.onpause();assert.equal(session.state.status,'paused');await flush();assert.equal(current.plays,nativePlays,'Native pause does not schedule recovery');
current.paused=false;current.onplay();assert.equal(session.state.status,'playing');assert.equal(native.playbackState,'playing');assert.equal(current.plays,nativePlays,'Direct native Play needs no second app play() call');assert.equal(current.currentTime,47);assert.equal(current.src,source);assert.equal(appleAudioSession.type,'playback');
current.pause();await flush();assert.equal(session.state.status,'paused','A subsequent native Pause remains authoritative after native Play');assert.equal(native.playbackState,'paused');assert.equal(current.plays,nativePlays);
handlers.stop();assert.equal(session.state.status,'stopped');assert.equal(native.metadata,null);assert.equal(appleAudioSession.type,'auto');assert.ok(Object.values(handlers).every(v=>v===null));console.log('PASS: Quran lock-screen pause/resume, same audio, elapsed time, paused seek, previous/next surah, direct native Play without duplicate play(), authoritative native Pause and owner cleanup');

// iOS can acknowledge Play while the buffered element is still frozen.
for(const scenario of ['command','native','pause','seek']){
 const nativePlay=scenario==='native';
 let timerId=0;
 const timers=new Map(),systems={};
 const nav={standalone:true,audioSession:{type:'auto',state:'active'}};
 const page=new EventTarget();page.hidden=false;
 const playHistory=[];
 class BufferedAudio extends Audio{
  readyState=4;
  play(){playHistory.push(this.currentTime);return super.play();}
 }
 const fixture=createQuranSession({
  media:createMediaSession({nav:{mediaSession:{setActionHandler(n,fn){systems[n]=fn;},setPositionState(){}}},Metadata}),
  load:async n=>surah(n),loadCatalog:async()=>catalog,
  createPlayer:opts=>createQuranPlayer({...opts,audioNavigator:nav,audioDocument:page,audioWindow:new EventTarget(),getAudio:async()=>null,loadTimings:async()=>null,
   createAudio:src=>new BufferedAudio(src),setTimer(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimer:id=>timers.delete(id)})
 });
 await fixture.start(surah(1),'ar.badralturki');await flush();
 const element=tracks.at(-1),originalSource=element.src;
 page.hidden=true;page.dispatchEvent(new Event('visibilitychange'));
 element.currentTime=37;systems.pause();
 if(nativePlay){element.paused=false;element.onplay();}
 else systems.play();
 await flush();
 assert.equal(fixture.state.status,'loading','Acknowledging a background Play does not prove playback restarted');
 const tick=async()=>{
  assert.equal(timers.size,1,'At most one watchdog is scheduled');
  const [id,timer]=timers.entries().next().value;timers.delete(id);timer.fn();await flush();
 };
 if(scenario==='pause'){
  const stale=[...timers.values()][0].fn;
  systems.pause();stale();await flush();
  assert.equal(fixture.state.status,'paused','A later explicit Pause cancels verification and retry');
  assert.equal(playHistory.length,2);
  fixture.stop();
  assert.equal(timers.size,0);
  continue;
 }
 if(scenario==='seek'){
  element.seeking=true;element.currentTime=50;element.ontimeupdate();
  assert.equal(fixture.state.status,'loading');
  element.seeking=false;element.onseeked();
  assert.equal(fixture.state.status,'loading','A seek updates the position without confirming playback');
  element.currentTime=50.25;element.ontimeupdate();
  assert.equal(fixture.state.status,'playing');
  assert.equal(playHistory.length,2,'An advancing audio track needs no replay');
  fixture.stop();
  continue;
 }
 const firstCount=playHistory.length;
 assert.equal([...timers.values()][0].ms,4000);
 await tick();
 assert.equal(playHistory.length,firstCount+1,'Retry a buffered false start once');
 assert.equal(playHistory.at(-1),37);
 assert.equal(element.src,originalSource,'Do not reload the file or discard the position');
 assert.equal(tracks.at(-1),element);
 if(nativePlay){
  await tick();
  assert.equal(fixture.state.status,'paused','A second false start leaves the track paused');
  assert.equal(element.paused,true);
  assert.equal(playHistory.length,firstCount+1);
 }else{
  element.currentTime=37.25;element.ontimeupdate();
  assert.equal(fixture.state.status,'playing','Advancing the actual media clock confirms playback');
  assert.equal([...timers.values()][0].ms,15000,'Normal playback uses the existing watchdog');
 }
 fixture.stop();
 assert.equal(timers.size,0);
}
console.log('PASS: frozen lock-screen starts hidden, one same-source replay, verified media time and bounded fallback.');
