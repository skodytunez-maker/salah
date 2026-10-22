import assert from 'node:assert/strict';
import{createQuranPlayer}from '../dist/js/quran-audio.js';
import{createPlaybackAudioSession}from '../dist/js/playback-audio-session.js';
class Session extends EventTarget{type='auto';state='inactive';change(state){this.state=state;this.dispatchEvent(new Event('statechange'));}}
class Audio{constructor(src){this.src=src;this.paused=true;this.ended=false;this.currentTime=0;this.duration=200;this.readyState=1;this.calls=0;}async play(){this.calls++;this.paused=false;this.onplay?.();}pause(){this.paused=true;this.onpause?.();}}
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));};
const native=new Session(),tracks=[],states=[],player=createQuranPlayer({surah:{number:1,verses:[{number:1,ayah:1}]},reciter:'ar.badralturki',audioNavigator:{audioSession:native},createAudio:src=>{const a=new Audio(src);tracks.push(a);return a;},getAudio:async()=>null,loadTimings:async()=>null,onState:s=>states.push(s),onVerse:()=>{},onError:()=>assert.fail('Interruption must not turn into a network error')});
await player.play();const audio=tracks[0];audio.currentTime=79;assert.equal(native.type,'playback');native.change('interrupted');audio.pause();assert.equal(player.state.status,'paused');const calls=audio.calls;await flush();assert.equal(audio.calls,calls,'Never resume while the OS still reports interruption');
native.change('active');await flush();assert.equal(audio.calls,calls+1);assert.equal(audio.currentTime,79,'Resume the same source and position');assert.equal(tracks.length,1);assert.equal(player.state.status,'playing');
native.change('active');await flush();assert.equal(audio.calls,calls+1,'No repeated retry loop');
native.change('interrupted');audio.pause();player.pause();native.change('active');await flush();assert.equal(audio.calls,calls+1,'User pause during interruption must win');assert.equal(native.type,'auto');
player.toggle();await flush();assert.equal(native.type,'playback');const before=audio.calls;
audio.pause();native.change('inactive');native.change('active');await flush();assert.equal(audio.calls,before,'A generic system pause with no interruption signal cannot auto-resume');
player.toggle();await flush();native.change('interrupted');audio.pause();native.change('active');player.destroy();await flush();assert.equal(native.type,'auto');assert.equal(audio.src,'');const after=audio.calls;native.change('interrupted');native.change('active');await flush();assert.equal(audio.calls,after,'Destroyed player cannot resume');
const unsupported=createPlaybackAudioSession({nav:{}});unsupported.setIntent(true);unsupported.setIntent(false);unsupported.destroy();
const inaccessible=createPlaybackAudioSession({nav:{get audioSession(){throw Error('Unavailable')}}});inaccessible.setIntent(true);inaccessible.destroy();
const first=createPlaybackAudioSession({nav:{audioSession:native}}),second=createPlaybackAudioSession({nav:{audioSession:native}});first.setIntent(true);second.setIntent(true);first.destroy();assert.equal(native.type,'playback','Old owner cleanup must not reset the new owner');second.destroy();assert.equal(native.type,'auto');
// Rejected recovery keeps a usable paused player and never switches recording hosts.
const deniedSession=new Session(),deniedTracks=[],denied=createQuranPlayer({surah:{number:1,verses:[{number:1,ayah:1}]},reciter:'ar.badralturki',audioNavigator:{audioSession:deniedSession},createAudio:src=>{const a=new Audio(src);deniedTracks.push(a);return a;},getAudio:async()=>null,loadTimings:async()=>null,onState:()=>{},onVerse:()=>{},onError:()=>assert.fail('No fallback on a permission rejection')});
await denied.play();deniedSession.change('interrupted');deniedTracks[0].pause();deniedTracks[0].play=async()=>{throw Object.assign(Error('blocked'),{name:'NotAllowedError'});};deniedSession.change('active');await flush();assert.equal(denied.state.status,'paused');assert.equal(deniedTracks.length,1);denied.destroy();
console.log('PASS: playback category, same-source OS interruption recovery, manual pause, no generic-pause retries, rejected resume, unsupported browser and owner cleanup');
