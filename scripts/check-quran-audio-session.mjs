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
native.change('interrupted');audio.pause();player.pause();native.change('active');await flush();assert.equal(audio.calls,calls+1,'User pause during interruption must win');assert.equal(native.type,'playback','Explicit pause keeps the playback category for Control Center resume');
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

// Safari's shipping type-only API: no state property and no statechange signal.
class Page extends EventTarget{hidden=false;focused=true;hasFocus(){return this.focused;}hide(){this.hidden=true;this.dispatchEvent(new Event('visibilitychange'));}show(){this.hidden=false;this.dispatchEvent(new Event('visibilitychange'));}}
function safariFixture(){
 const doc=new Page(),win=new EventTarget(),nav={standalone:true,audioSession:{type:'auto'}},tracks=[];
 const player=createQuranPlayer({surah:{number:1,verses:[{number:1,ayah:1}]},reciter:'ar.badralturki',audioNavigator:nav,audioDocument:doc,audioWindow:win,createAudio:src=>{const a=new Audio(src);tracks.push(a);return a;},getAudio:async()=>null,loadTimings:async()=>null,onState:()=>{},onVerse:()=>{},onError:()=>assert.fail('Interruption recovery must not switch sources')});
 return{doc,win,nav,tracks,player};
}
const sf=safariFixture();await sf.player.play();const sa=sf.tracks[0];sa.currentTime=83;
sf.doc.hide();sa.pause();await flush();const safariCalls=sa.calls;
assert.equal(sf.player.state.status,'paused');assert.equal(sa.calls,safariCalls,'No blind background retry while another app owns audio');
sf.doc.show();await flush();assert.equal(sa.calls,safariCalls+1,'Type-only Safari recovers on a foreground return');
assert.equal(sa.currentTime,83);assert.equal(sf.tracks.length,1,'No new audio element or recording URL');assert.equal(sf.player.state.status,'playing');
sf.win.dispatchEvent(new Event('focus'));sf.win.dispatchEvent(new Event('pageshow'));sf.doc.show();await flush();assert.equal(sa.calls,safariCalls+1,'Focus/pageshow cannot retry a consumed interruption');
// Foreground state and focus may arrive in either order.
sf.doc.hide();sa.pause();sf.doc.focused=false;sf.doc.show();await flush();assert.equal(sa.paused,true,'Visible background window cannot steal audio');
sf.doc.focused=true;sf.win.dispatchEvent(new Event('focus'));await flush();assert.equal(sa.paused,false);
// WebKit can deliver the pause event after the visibility event.
sf.doc.hide();sf.doc.show();sa.pause();await flush();assert.equal(sa.paused,false,'Late pause after return still recovers');
// A foreground pause without a background transition is not an interruption.
const beforeGeneric=sa.calls;sa.pause();sf.win.dispatchEvent(new Event('focus'));await flush();assert.equal(sa.calls,beforeGeneric,'Generic visible pause must not restart');
sf.player.toggle();await flush();
// Explicit pause while backgrounded cancels the recovery ticket.
sf.doc.hide();sa.pause();sf.player.pause();const manuallyPaused=sa.calls;sf.doc.show();sf.win.dispatchEvent(new Event('focus'));await flush();assert.equal(sa.calls,manuallyPaused,'User pause during a type-only interruption wins');assert.equal(sf.nav.audioSession.type,'playback','Manual pause keeps resumable system controls without playback intent');
// A queued foreground recovery is cancelled by an immediate manual pause.
sf.player.toggle();await flush();sf.doc.hide();sa.pause();sf.doc.show();sf.player.pause();await flush();assert.equal(sa.calls,manuallyPaused+1,'Manual pause cancels the queued promise');
sf.player.toggle();await flush();sf.doc.hide();sa.pause();sf.doc.show();sf.player.destroy();const destroyedCalls=sa.calls;await flush();sf.win.dispatchEvent(new Event('focus'));sf.doc.show();await flush();assert.equal(sa.calls,destroyedCalls,'Destroyed player and listeners cannot resume');
// Rejection consumes the ticket rather than retrying on every foreground event.
const blocked=safariFixture();await blocked.player.play();const ba=blocked.tracks[0];let blockedCalls=0;ba.play=async()=>{blockedCalls++;throw Object.assign(Error('not allowed'),{name:'NotAllowedError'});};blocked.doc.hide();ba.pause();blocked.doc.show();await flush();blocked.win.dispatchEvent(new Event('focus'));blocked.doc.show();await flush();assert.equal(blockedCalls,1);assert.equal(blocked.player.state.status,'paused');assert.equal(blocked.tracks.length,1);blocked.player.destroy();
// Desktop/browser tabs do not opt into this standalone-only recovery.
const ordinary=safariFixture();ordinary.player.destroy();ordinary.nav.standalone=false;let ordinaryPaused=false,ordinaryResumes=0;
const ordinaryController=createPlaybackAudioSession({nav:ordinary.nav,doc:ordinary.doc,win:ordinary.win,canResume:()=>ordinaryPaused,resume:()=>ordinaryResumes++});ordinaryController.setIntent(true);ordinary.doc.hide();ordinaryPaused=true;ordinaryController.notifyPause();ordinary.doc.show();await flush();assert.equal(ordinaryResumes,0);ordinaryController.destroy();
// Never reuse an old return as permission for an unrelated later foreground pause.
const lateDoc=new Page(),lateWin=new EventTarget();let clock=0,latePaused=false,lateResumes=0;
const late=createPlaybackAudioSession({nav:{standalone:true,audioSession:{type:'auto'}},doc:lateDoc,win:lateWin,now:()=>clock,canResume:()=>latePaused,resume:()=>lateResumes++});
late.setIntent(true);lateDoc.hide();lateDoc.show();clock=5000;latePaused=true;late.notifyPause();lateWin.dispatchEvent(new Event('focus'));await flush();assert.equal(lateResumes,0);late.destroy();
// Full implementations can report active before dispatching the media pause.
const orderSession=new Session(),orderTracks=[],orderPlayer=createQuranPlayer({surah:{number:1,verses:[{number:1,ayah:1}]},reciter:'ar.badralturki',audioNavigator:{audioSession:orderSession},createAudio:src=>{const a=new Audio(src);orderTracks.push(a);return a;},getAudio:async()=>null,loadTimings:async()=>null,onState:()=>{},onVerse:()=>{},onError:()=>assert.fail('No fallback expected')});
await orderPlayer.play();orderSession.change('interrupted');orderSession.change('active');await flush();const oa=orderTracks[0],beforeOrder=oa.calls;oa.pause();await flush();assert.equal(oa.calls,beforeOrder+1,'Active-before-pause is not lost');orderPlayer.destroy();
// Full API inactive is not permission to restart; no foreground fallback there.
let fullPaused=true,fullResumes=0;const fullState=new Session(),fullDoc=new Page(),fullWin=new EventTarget();const full=createPlaybackAudioSession({nav:{standalone:true,audioSession:fullState},doc:fullDoc,win:fullWin,canResume:()=>fullPaused,resume:()=>fullResumes++});full.setIntent(true);fullState.change('interrupted');full.notifyPause();fullState.change('inactive');fullDoc.hide();fullDoc.show();fullWin.dispatchEvent(new Event('focus'));await flush();assert.equal(fullResumes,0);full.destroy();
// A late lifecycle event from an old owner must not interrupt its replacement.
const ownedSession={type:'auto'},oldDoc=new Page(),oldWin=new EventTarget();let oldResumes=0;
const old=createPlaybackAudioSession({nav:{standalone:true,audioSession:ownedSession},doc:oldDoc,win:oldWin,canResume:()=>true,resume:()=>oldResumes++});
const newer=createPlaybackAudioSession({nav:{standalone:true,audioSession:ownedSession},doc:new Page(),win:new EventTarget(),canResume:()=>true});old.setIntent(true);oldDoc.hide();old.notifyPause();newer.setIntent(true);oldDoc.show();await flush();assert.equal(oldResumes,0);old.destroy();assert.equal(ownedSession.type,'playback');newer.destroy();assert.equal(ownedSession.type,'auto');
// Real MediaSession lock-screen/headphone pause commands retain priority.
const{createQuranSession}=await import('../dist/js/quran-session.js'),{createMediaSession}=await import('../dist/js/media-session.js');
const lockDoc=new Page(),lockWin=new EventTarget(),lockNav={standalone:true,audioSession:{type:'auto'}},lockActions={},lockTracks=[];
const lockMedia=createMediaSession({nav:{mediaSession:{setActionHandler(n,f){lockActions[n]=f;},setPositionState(){}}},Metadata:class{constructor(v){Object.assign(this,v);}}});
const lock=createQuranSession({media:lockMedia,load:async n=>({number:n,verses:[{number:1,ayah:1}]}),loadCatalog:async()=>({surahs:Array.from({length:114},(_,i)=>({number:i+1,name:'Сура '+(i+1)}))}),createPlayer:opts=>createQuranPlayer({...opts,audioNavigator:lockNav,audioDocument:lockDoc,audioWindow:lockWin,getAudio:async()=>null,loadTimings:async()=>null,createAudio:src=>{const a=new Audio(src);lockTracks.push(a);return a;}})});
await lock.start({number:1,verses:[{number:1,ayah:1}]},'ar.badralturki');await flush();const la=lockTracks[0];lockDoc.hide();la.pause();lockActions.pause();const lockCalls=la.calls;lockDoc.show();await flush();assert.equal(la.calls,lockCalls,'Headphone/lock-screen pause is never ignored');assert.equal(lock.state.status,'paused');lock.stop();
console.log('PASS: shipping Safari type-only PWA API,background/foreground/focus order,late pause,same-source seek position,one-shot rejection,no generic/tab retries,manual/lock-screen pause,ownership and full-API race');

// Paused playback retains its category, but never playback intent or old ownership.
const retainedSession=new Session(),retainedDoc=new Page();let retainedResumes=0;
const retained=createPlaybackAudioSession({nav:{standalone:true,audioSession:retainedSession},doc:retainedDoc,win:new EventTarget(),canResume:()=>true,resume:()=>retainedResumes++});
retained.setIntent(true);retained.setIntent(false,{retainPlayback:true});assert.equal(retainedSession.type,'playback');retainedSession.change('interrupted');retained.notifyPause();retainedSession.change('active');retainedDoc.hide();retainedDoc.show();await flush();assert.equal(retainedResumes,0,'Retaining controls is not permission to resume');
const replacement=createPlaybackAudioSession({nav:{audioSession:retainedSession}});replacement.setIntent(true);retained.destroy();assert.equal(retainedSession.type,'playback','Paused old player cannot clear replacement');replacement.destroy();assert.equal(retainedSession.type,'auto','Replacement restores original category');
console.log('PASS: paused category retained without autoplay or ownership theft; stop/destroy restore original category');

// A remote Play is explicit intent, even when iOS delayed the native pause event.
await lock.start({number:1,verses:[{number:1,ayah:1}]},'ar.badralturki');await flush();
const remoteAudio=lockTracks.at(-1),remoteSrc=remoteAudio.src;remoteAudio.currentTime=97;
remoteAudio.paused=true; // OS paused while the page was suspended; no onpause yet.
assert.equal(lock.state.status,'playing');const staleCalls=remoteAudio.calls;
lockActions.play();await flush();
assert.equal(remoteAudio.calls,staleCalls+1,'Control Center Play must inspect the retained media, not ignore a stale playing view');
assert.equal(remoteAudio.src,remoteSrc);assert.equal(remoteAudio.currentTime,97);assert.equal(lock.state.status,'playing');
const duplicateCalls=remoteAudio.calls;lockActions.play();await flush();assert.equal(remoteAudio.calls,duplicateCalls,'Repeated system Play never toggles into pause or restarts');
lockActions.pause();await flush();const pausedSrc=remoteAudio.src,savedPlay=remoteAudio.play;let rejectedRemote=0;
remoteAudio.play=async()=>{rejectedRemote++;throw Object.assign(Error('not allowed'),{name:'NotAllowedError'});};
lockActions.play();await flush();assert.equal(rejectedRemote,1);assert.equal(lock.state.status,'paused','Denied background resume stays paused instead of clearing system audio');
assert.equal(remoteAudio.src,pausedSrc,'Denied resume preserves native media source');assert.equal(remoteAudio.currentTime,97);
lockDoc.hide();lockDoc.show();await flush();assert.equal(rejectedRemote,1,'No automatic retry after a denied explicit command');
remoteAudio.play=savedPlay;lockActions.play();await flush();assert.equal(lock.state.status,'playing');assert.equal(remoteAudio.currentTime,97);
lockActions.pause();let resolveRemote;remoteAudio.play=()=>{remoteAudio.calls++;return new Promise(resolve=>resolveRemote=()=>{remoteAudio.paused=false;resolve();});};
const beforePendingRemote=remoteAudio.calls;lockActions.play();lockActions.play();assert.equal(remoteAudio.calls,beforePendingRemote+1,'Duplicate pending Play does not issue another native request');lockActions.pause();resolveRemote();await flush();
assert.equal(lock.state.status,'paused','Pause wins over a delayed remote play completion');assert.equal(remoteAudio.paused,true,'Cancelled play cannot continue silently behind a paused view');
lock.stop();console.log('PASS: Control Center explicit play, stale native pause, duplicate play, retained denied resume, gesture retry and delayed pause precedence');
