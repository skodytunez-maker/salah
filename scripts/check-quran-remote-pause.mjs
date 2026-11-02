import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createQuranSession} from '../dist/js/quran-session.js';
import {createQuranPlayer} from '../dist/js/quran-audio.js';
import {createMediaSession} from '../dist/js/media-session.js';
import {reciterRecording} from '../dist/js/quran-reciter-recording.js';

const catalog=JSON.parse(await readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
const systemStates=[];let systemState='none';
const handlers={},native={get playbackState(){return systemState;},set playbackState(value){systemState=value;systemStates.push(value);},setActionHandler(name,handler){handlers[name]=handler;},setPositionState(value){this.position=value;}};
const doc=new EventTarget();doc.hidden=true;doc.hasFocus=()=>false;
const nav={standalone:true,audioSession:{type:'auto'}},tracks=[];
class Audio{
 constructor(src){this.src=src;this.paused=true;this.ended=false;this.currentTime=0;this.duration=100;this.readyState=1;this.calls=0;tracks.push(this);}
 play(){this.calls++;if(this.delayNext){this.delayNext=false;return new Promise(resolve=>{this.finish=()=>{this.paused=false;this.ended=false;this.onplay?.();resolve();};});}this.paused=false;this.ended=false;this.onplay?.();return Promise.resolve();}
 pause(){this.paused=true;this.onpause?.();}
 end(){this.currentTime=this.duration;this.paused=true;this.ended=true;this.onended?.();}
}
const media=createMediaSession({nav:{mediaSession:native},Metadata:class{constructor(value){Object.assign(this,value);}}});
const session=createQuranSession({media,loadCatalog:async()=>catalog,load:async n=>reciterRecording(catalog,n),getAudio:async()=>null,createAudio:src=>new Audio(src),createPlayer:options=>createQuranPlayer({...options,audioNavigator:nav,audioDocument:doc,audioWindow:new EventTarget(),getAudio:async()=>null,loadTimings:async()=>null})});
await session.start(reciterRecording(catalog,69),'ar.yasseraldossaricontinuous');await flush();
const audio=tracks[0],source=audio.src;audio.currentTime=43;audio.ontimeupdate();
handlers.pause();assert.equal(audio.paused,true);assert.equal(native.playbackState,'paused');
audio.delayNext=true;handlers.play();const pending=audio.finish;handlers.pause();
assert.equal(session.state.status,'paused');assert.equal(audio.paused,true);
// Native completion must deliver the real play event as well as resolve play().
// Omitting that event misses a state overwrite inside the onplay callback.
pending();await flush();
assert.equal(audio.paused,true,'A delayed native play event must not cancel a later explicit Pause');
assert.equal(session.state.status,'paused');assert.equal(native.playbackState,'paused');
assert.equal(audio.currentTime,43);assert.equal(audio.src,source);assert.equal(tracks.length,1);
assert.equal(nav.audioSession.type,'playback','The paused recording stays available to system Play');
audio.onended();await flush();assert.equal(session.state.surah.number,69,'A stale end event while explicitly paused cannot advance the queue');
handlers.play();await flush();assert.equal(audio.paused,false);assert.equal(session.state.status,'playing');assert.equal(native.playbackState,'playing');assert.equal(audio.currentTime,43);
systemStates.length=0;audio.end();await flush();assert.ok(!systemStates.includes('paused'),'Automatic chapter handoff must not tell the OS playback has paused');assert.equal(session.state.surah.number,70);assert.equal(session.state.status,'playing');assert.equal(tracks.length,1);assert.equal(tracks[0],audio);
handlers.pause();await flush();assert.equal(audio.paused,true);handlers.play();await flush();assert.equal(audio.paused,false);
systemStates.length=0;audio.end();await flush();assert.ok(!systemStates.includes('paused'),'Repeated handoff stays active after remote pause/resume');assert.equal(session.state.surah.number,71);assert.equal(session.state.status,'playing');assert.equal(native.playbackState,'playing');assert.equal(tracks.length,1);
session.stop();assert.equal(nav.audioSession.type,'auto');assert.equal(native.metadata,null);
console.log('PASS: real delayed play event cannot undo remote Pause; retained source/position/category, no paused end advance, explicit Play and 69→70→71 continuation after remote controls.');

// Retaining system playback during an automatic handoff cannot suppress an
// explicit cancellation or leave the system playing after a failed next load.
for(const action of ['pause','stop','error']){
 let finishNext,track;const pendingNext=new Promise((resolve,reject)=>{finishNext=()=>action==='error'?reject(Error('next unavailable')):resolve(reciterRecording(catalog,70));});
 const commands={},remote={setActionHandler(n,f){commands[n]=f;},setPositionState(){}};
 const queue=createQuranSession({media:createMediaSession({nav:{mediaSession:remote},Metadata:class{constructor(v){Object.assign(this,v);}}}),loadCatalog:async()=>catalog,load:n=>n===70?pendingNext:Promise.resolve(reciterRecording(catalog,n)),getAudio:async()=>null,createAudio:src=>track=new Audio(src),createPlayer:options=>createQuranPlayer({...options,audioNavigator:nav,audioDocument:doc,audioWindow:new EventTarget(),getAudio:async()=>null,loadTimings:async()=>null})});
 await queue.start(reciterRecording(catalog,69),'ar.yasseraldossaricontinuous');await flush();track.end();assert.equal(queue.state.status,'loading');assert.equal(remote.playbackState,'playing');
 if(action!=='error')commands[action]();finishNext();await flush();
 if(action==='stop'){assert.equal(queue.state.status,'stopped');assert.equal(remote.metadata,null);assert.equal(remote.playbackState,'none');}
 else{assert.equal(queue.state.status,action==='error'?'error':'paused');assert.equal(remote.playbackState,'paused');}
 queue.stop();
}
console.log('PASS: remote Pause/Stop during a pending chapter handoff win; failed continuation clears system playback.');
