import assert from 'node:assert/strict';
import {createQuranSession} from '../dist/js/quran-session.js';
import {createQuranPlayer} from '../dist/js/quran-audio.js';
import {createMediaSession} from '../dist/js/media-session.js';
import {createQuranNatureAudio} from '../dist/js/quran-nature-audio.js';

const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
const deferred=()=>{let resolve,reject;return{promise:new Promise((r,j)=>{resolve=r;reject=j;}),resolve:value=>resolve(value),reject:error=>reject(error)};};
// Real native state changes synchronously; media events arrive in later tasks.
class Audio{
 constructor(src){Object.assign(this,{src,paused:true,ended:false,readyState:1,duration:100,currentTime:0,plays:0,pauses:0});}
 play(){this.plays++;this.paused=false;queueMicrotask(()=>this.onplay?.());return Promise.resolve();}
 pause(){this.pauses++;this.paused=true;queueMicrotask(()=>this.onpause?.());}
}
const data=n=>({number:n,verses:[{number:954,ayah:1},{number:955,ayah:2}]});
function fixture({load=async n=>data(n)}={}){
 const tracks=[],actions={},native={setActionHandler(key,fn){actions[key]=fn;},setPositionState(){}};
 const media=createMediaSession({nav:{mediaSession:native},Metadata:class{constructor(info){Object.assign(this,info);}}});
 const session=createQuranSession({media,load,createAudio:src=>{const track=new Audio(src);tracks.push(track);return track;},loadCatalog:async()=>({surahs:Array.from({length:114},(_,i)=>({number:i+1,name:'Surah '+(i+1)}))}),
  createPlayer:opts=>createQuranPlayer({...opts,getAudio:async()=>null,loadTimings:async()=>[{ayah:1,start:0,end:40},{ayah:2,start:40,end:100}],loadDurations:async()=>null})});
 return{tracks,actions,native,session};
}
const previousReport=globalThis.reportError,reported=[];
globalThis.reportError=error=>reported.push(error.message);
try{
 {
  const f=fixture();await f.session.start(data(7),'ar.alafasycontinuous');await flush();const track=f.tracks[0];let armed=false,healthy=0;
  const offBad=f.session.subscribe(()=>{if(armed)throw Error('UI observer failure');}),offGood=f.session.subscribe(()=>healthy++);
  track.currentTime=50;armed=true;const before=healthy;
  assert.doesNotThrow(()=>f.actions.pause());
  assert.equal(track.paused,true,'Timed ayah notifications cannot precede the physical pause');
  assert.equal(f.session.state.status,'paused');assert.equal(f.native.playbackState,'paused');assert.ok(healthy>before,'A failed observer does not prevent other views receiving Pause');
  await flush();assert.equal(track.plays,1,'Observer errors cannot schedule a recovery or new recording');assert.equal(track.currentTime,50);
  assert.ok(reported.includes('UI observer failure'),'Observer errors remain reportable');
  armed=false;offBad();offGood();f.actions.play();await flush();assert.equal(track.paused,false);assert.equal(track.currentTime,50);assert.equal(f.tracks.length,1);f.session.stop();await flush();
 }
 {
  const next=deferred(),f=fixture({load:n=>n===8?next.promise:Promise.resolve(data(n))});await f.session.start(data(7),'ar.alafasycontinuous');await flush();const track=f.tracks[0];
  const handoff=f.session.changeSurah(1,true);await flush();let armed=false;const nativeStates=[];
  const off=f.session.subscribe(state=>{if(armed&&state.status==='paused'){nativeStates.push(track.paused);throw Error('Handoff observer failure');}});armed=true;
  assert.doesNotThrow(()=>f.actions.pause());assert.equal(track.paused,true,'Retained audio stops even when its player has been released for a chapter handoff');assert.equal(f.session.state.status,'paused');
  assert.ok(nativeStates.length>0);assert.ok(nativeStates.every(Boolean),'A retained source is already silent inside every paused observer');
  next.resolve(data(8));await handoff;await flush();assert.equal(track.plays,1,'A pending chapter lookup cannot undo the newer Pause');assert.equal(track.paused,true);
  armed=false;off();f.session.stop();await flush();
 }
}finally{if(previousReport===undefined)delete globalThis.reportError;else globalThis.reportError=previousReport;}

{
 const handlers={},registrations=[],native={metadata:null,setActionHandler(action,fn){registrations.push(action);handlers[action]=fn;},setPositionState(){}},Metadata=class{constructor(info){Object.assign(this,info);}};
 const first=createMediaSession({nav:{mediaSession:native},Metadata});let latest=-1,oldCalls=0;
 const info={title:'First',artist:'Reciter',status:'playing',duration:100,position:0};
 first.update(info,{play:()=>oldCalls++,pause:()=>oldCalls++,seekto:()=>latest=0});const originalPlay=handlers.play,originalSeek=handlers.seekto;
 for(let i=1;i<=40;i++)first.update({...info,position:i},{play:()=>oldCalls++,pause:()=>oldCalls++,seekto:()=>latest=i});
 assert.equal(registrations.length,8,'Position updates retain the same platform command registrations');assert.equal(handlers.play,originalPlay);assert.equal(handlers.seekto,originalSeek);originalSeek({seekTime:30});assert.equal(latest,40,'A stable handler still calls the latest recording controls');
 const second=createMediaSession({nav:{mediaSession:native},Metadata});let currentCalls=0;
 second.update({...info,title:'Second'},{play:()=>currentCalls++,pause:()=>currentCalls++});const secondPause=handlers.pause;
 originalPlay();originalSeek({seekTime:50});assert.equal(oldCalls,0,'A queued old-owner command cannot start the previous player');assert.equal(latest,40);
 first.clear();assert.equal(handlers.pause,secondPause,'Clearing an old controller cannot clear the current player');secondPause();assert.equal(currentCalls,1);
 second.clear();secondPause();assert.equal(currentCalls,1,'A command retained after Stop has no authority');assert.equal(native.metadata,null);
}
{
 const handlers={};let attempts=0,pauses=0;
 const native={setActionHandler(action,fn){if(action==='pause'&&++attempts===1)throw Error('Temporary platform registration failure');handlers[action]=fn;},setPositionState(){}};
 const media=createMediaSession({nav:{mediaSession:native}}),info={status:'playing',title:'Quran',artist:'Reciter',duration:100,position:1},controls={play(){},pause(){pauses++;}};
 media.update(info,controls);media.update({...info,position:2},controls);assert.equal(attempts,2);handlers.pause();assert.equal(pauses,1,'A failed registration is retried; Pause cannot silently stay unregistered');media.clear();
}

{
 let context,loads=0;
 class Context{
  state='suspended';currentTime=0;destination={};suspends=0;resumes=0;sources=[];pending=null;
  constructor(){context=this;}
  createGain(){return{gain:{value:0,cancelScheduledValues(){},setValueAtTime(value){this.value=value;},linearRampToValueAtTime(value){this.value=value;}},connect(){},disconnect(){}};}
  createBufferSource(){const node={connect(){},disconnect(){},start(){},stop(){}};this.sources.push(node);return node;}
  resume(){this.resumes++;this.state='running';return Promise.resolve();}
  suspend(){this.suspends++;this.pending=deferred();return this.pending.promise.then(()=>{this.state='suspended';this.onstatechange?.();});}
  close(){this.state='closed';return Promise.resolve();}
 }
 const nature=createQuranNatureAudio({AudioContext:Context,load:async()=>{loads++;return{duration:34,numberOfChannels:2};}});
 await nature.select('rain');await nature.sync(true);assert.equal(nature.state.playing,true);
 await nature.sync(false);assert.equal(context.suspends,1,'The native suspend request is issued before the paused command returns');assert.equal(nature.state.playing,false);
 for(let i=0;i<10;i++)await nature.sync(false);assert.equal(context.suspends,1,'Repeated paused emissions cannot postpone or duplicate the native pause');
 const resumes=context.resumes,restart=nature.sync(true);await flush();assert.equal(context.resumes,resumes,'An explicit restart waits for an in-flight native suspension');
 await nature.sync(false);context.pending.resolve();await restart;await flush();assert.equal(context.resumes,resumes,'A newer Pause cancels the pending restart');assert.equal(context.state,'suspended');
 await nature.sync(true);assert.equal(nature.state.playing,true);assert.equal(loads,1);assert.equal(context.sources.length,1,'Explicit restart keeps the selected recording and loop phase');nature.destroy();
}
{
 let context;
 class Context{
  state='suspended';currentTime=0;destination={};calls=0;first=deferred();
  constructor(){context=this;}
  createGain(){return{gain:{value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}},connect(){},disconnect(){}};}
  createBufferSource(){return{connect(){},disconnect(){},start(){},stop(){}};}
  resume(){if(++this.calls===1)return this.first.promise;this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
 }
 const nature=createQuranNatureAudio({AudioContext:Context,load:async()=>({duration:34,numberOfChannels:2})});
 await nature.select('rain');const old=nature.sync(true);await flush();await nature.sync(false);await nature.sync(true);assert.equal(nature.state.playing,true);
 context.first.reject(Error('Old resume failed'));await old;assert.equal(nature.state.error,false,'An obsolete unlock rejection cannot poison the newer selected recording');
 await nature.sync(false);await nature.sync(true);assert.equal(nature.state.playing,true);nature.destroy();
}
console.log('PASS: physical Quran pause precedes failing UI observers; retained handoff source stops; stable owned system commands; timer-independent ambience suspension and latest Pause wins over a pending restart. Real iOS delivery still requires phone verification.');
