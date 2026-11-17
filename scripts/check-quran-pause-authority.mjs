import assert from 'node:assert/strict';
import {createQuranSession} from '../dist/js/quran-session.js';
import {createQuranPlayer} from '../dist/js/quran-audio.js';
import {createMediaSession} from '../dist/js/media-session.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
class Page extends EventTarget{hidden=true;hasFocus(){return!this.hidden;}show(){this.hidden=false;this.dispatchEvent(new Event('visibilitychange'));}}
class NativeSession extends EventTarget{type='auto';state='inactive';change(state){this.state=state;this.dispatchEvent(new Event('statechange'));}}
class Audio{
 constructor(src){this.src=src;this.paused=true;this.ended=false;this.readyState=1;this.currentTime=2559;this.duration=4261;this.plays=0;this.pauses=0;this.pending=[];this.nextPlay='immediate';}
 play(){this.plays++;if(this.nextPlay==='deny'){this.nextPlay='immediate';return Promise.reject(Object.assign(Error('Denied'),{name:'NotAllowedError'}));}
  if(this.nextPlay==='pending'||this.nextPlay==='pending-started'){const started=this.nextPlay==='pending-started';this.nextPlay='immediate';const task=deferred();this.pending.push({fail:error=>task.reject(error),finish:({event=true}={})=>{this.paused=false;this.ended=false;if(event)this.onplay?.();task.resolve();}});if(started){this.paused=false;this.onplay?.();}return task.promise;}
  this.paused=false;this.ended=false;this.onplay?.();return Promise.resolve();
 }
 pause(){this.pauses++;this.paused=true;this.onpause?.();}
}
function fixture({typeOnly=false,load}={}){
 const doc=new Page(),win=new EventTarget(),native=typeOnly?{type:'auto'}:new NativeSession(),tracks=[],actions={},metadata={setActionHandler(k,fn){actions[k]=fn;},setPositionState(){}};
 const media=createMediaSession({nav:{mediaSession:metadata},Metadata:class{constructor(v){Object.assign(this,v);}}}),data=n=>({number:n,verses:[{number:954,ayah:1}]});
 const session=createQuranSession({media,load:load||(async(n)=>data(n)),createAudio:src=>{const a=new Audio(src);tracks.push(a);return a;},loadCatalog:async()=>({surahs:Array.from({length:114},(_,i)=>({number:i+1,name:'Сура '+(i+1)}))}),createPlayer:opts=>createQuranPlayer({...opts,audioNavigator:{standalone:true,audioSession:native},audioDocument:doc,audioWindow:win,getAudio:async()=>null,loadTimings:async()=>null})});
 return{session,doc,win,native,tracks,actions,metadata,data};
}
for(const typeOnly of [false,true]){
 const f=fixture({typeOnly});await f.session.start(f.data(7),'ar.yasseraldossaricontinuous');await flush();const a=f.tracks[0],source=a.src,before=a.plays;
 if(!typeOnly)f.native.change('interrupted');a.pause();assert.equal(f.session.state.status,'paused');assert.equal(f.metadata.playbackState,'paused');
 if(!typeOnly)f.native.change('active');await flush();f.doc.show();f.win.dispatchEvent(new Event('focus'));f.win.dispatchEvent(new Event('pageshow'));await flush();
 assert.equal(a.plays,before,'Native pause cannot auto-resume after OS/lifecycle recovery');assert.equal(a.paused,true);assert.equal(f.session.state.status,'paused');assert.equal(a.src,source);assert.equal(a.currentTime,2559);
 f.actions.play();await flush();assert.equal(a.plays,before+1);assert.equal(a.paused,false);assert.equal(f.session.state.status,'playing');assert.equal(a.src,source);assert.equal(a.currentTime,2559,'Explicit Play preserves the existing position');
 f.actions.pause();a.ended=true;a.onended?.();await flush();assert.equal(f.session.state.surah.number,7,'A queued ended event cannot advance after a newer MediaSession pause');assert.equal(a.paused,true);assert.equal(a.plays,before+1);assert.equal(f.metadata.playbackState,'paused');f.session.stop();
}

// A real initial play promise can settle after pause detached its old element.
{
 const f=fixture(),initial=new Audio(''),states=[];initial.nextPlay='pending';
 const p=createQuranPlayer({surah:f.data(7),reciter:'ar.yasseraldossaricontinuous',createAudio:()=>initial,getAudio:async()=>null,loadTimings:async()=>null,onState:s=>states.push(s),onVerse(){},onError(){assert.fail('No host fallback');}});
 const pending=p.play();await flush();assert.equal(initial.pending.length,1);p.pause();initial.pending[0].finish({event:false});await pending;await flush();assert.equal(initial.paused,true,'Late initial play is physically paused, not only hidden behind paused UI');assert.equal(p.state.status,'paused');p.destroy();
}

// Older promises cannot cancel a newer explicit Play on the same retained media.
{
 const f=fixture();await f.session.start(f.data(7),'ar.yasseraldossaricontinuous');await flush();const a=f.tracks[0];f.actions.pause();a.nextPlay='pending';f.actions.play();f.actions.pause();a.nextPlay='pending';f.actions.play();assert.equal(a.pending.length,2);const pauses=a.pauses;
 a.pending[0].finish({event:false});await flush();assert.equal(a.pauses,pauses,'An old attempt cannot pause a newer explicit Play');a.pending[1].finish();await flush();assert.equal(a.paused,false);assert.equal(f.session.state.status,'playing');
 f.actions.pause();a.nextPlay='pending';f.actions.play();f.actions.pause();a.nextPlay='deny';f.actions.play();await flush();a.pending[2].finish({event:false});await flush();assert.equal(a.paused,true,'A stale attempt is stopped when the latest explicit attempt was denied and intent is paused');assert.equal(f.session.state.status,'paused');f.session.stop();
}

// A whole-surah handoff reuses the exact native element. An old player's late
// play result must neither continue after Pause nor stop the new chapter.
{
 const f=fixture();await f.session.start(f.data(7),'ar.yasseraldossaricontinuous');await flush();const a=f.tracks[0];f.actions.pause();a.nextPlay='pending';f.actions.play();await f.session.changeSurah(1);await flush();assert.equal(f.tracks.length,1);assert.equal(f.session.state.surah.number,8);assert.equal(a.paused,false);const pauses=a.pauses;a.pending[0].finish({event:false});await flush();assert.equal(a.pauses,pauses,'Old player completion cannot pause a new chapter lease');assert.equal(f.session.state.status,'playing');f.session.stop();
}
// Both unresolved app calls remain ambiguous after Pause, even when the newest
// lease settles before the older call. Once all settle, a fresh native Play is
// authoritative without issuing another programmatic play() request.
for(const order of [[0,1],[1,0]]){
 const f=fixture();await f.session.start(f.data(7),'ar.yasseraldossaricontinuous');await flush();const a=f.tracks[0],source=a.src;f.actions.pause();
 for(let i=0;i<2;i++){a.nextPlay='pending';f.actions.play();f.actions.pause();}
 const plays=a.plays;assert.equal(a.pending.length,2);
 for(const index of order){a.pending[index].finish();await flush();assert.equal(a.paused,true,'A late native onplay from any unresolved app attempt cannot override Pause');assert.equal(f.session.state.status,'paused');assert.equal(f.metadata.playbackState,'paused');}
 a.paused=false;a.onplay();assert.equal(a.paused,false);assert.equal(f.session.state.status,'playing','A new native OS Play is accepted after every app attempt has settled');assert.equal(f.metadata.playbackState,'playing');assert.equal(a.plays,plays,'The OS already started media; no duplicate app play()');assert.equal(a.src,source);assert.equal(a.currentTime,2559);
 a.pause();f.native.change('interrupted');f.native.change('active');f.doc.show();f.win.dispatchEvent(new Event('pageshow'));await flush();assert.equal(a.paused,true);assert.equal(f.session.state.status,'paused');assert.equal(a.plays,plays,'Native Play does not grant future lifecycle autoplay');f.session.stop();
}
// onplay may precede its play() promise settlement. A rejected old promise is
// not an error in a newer explicit resume of the same unchanged native source.
{
 const audio=new Audio('');audio.nextPlay='pending-started';let errors=0;
 const player=createQuranPlayer({surah:{number:7,verses:[{number:954,ayah:1}]},reciter:'ar.yasseraldossaricontinuous',createAudio:src=>{audio.src=src;return audio;},getAudio:async()=>null,loadTimings:async()=>null,onState(){},onVerse(){},onError(){errors++;}});
 const initial=player.play();await flush();assert.equal(player.state.status,'playing');player.pause();await player.resume();const currentSource=audio.src,plays=audio.plays;audio.pending[0].fail(Error('Old native play rejection'));await initial;await flush();assert.equal(player.state.status,'playing','A superseded initial rejection cannot fail or recover a newer explicit Play');assert.equal(audio.src,currentSource);assert.equal(audio.plays,plays);assert.equal(errors,0);player.destroy();
}
{
 const next=deferred(),f=fixture({load:n=>n===8?next.promise:Promise.resolve({number:n,verses:[{number:954,ayah:1}]})});await f.session.start(f.data(7),'ar.yasseraldossaricontinuous');await flush();const a=f.tracks[0],before=a.plays;
 const handoff=f.session.changeSurah(1,true);assert.equal(a.paused,false,'Automatic handoff retains the native element while the next chapter loads');f.actions.pause();assert.equal(a.paused,true,'Pause also stops the retained chapter when no current player exists');next.resolve(f.data(8));await handoff;await flush();assert.equal(a.plays,before);assert.equal(f.session.state.status,'paused');f.session.stop();
}

// Natural ends still advance when there has been no later pause intent.
{
 const f=fixture();await f.session.start(f.data(7),'ar.yasseraldossaricontinuous');await flush();const a=f.tracks[0],before=a.plays;a.ended=true;a.paused=true;a.onpause?.();a.onended?.();await flush();assert.equal(f.session.state.surah.number,8);assert.equal(f.session.state.status,'playing');assert.equal(a.plays,before+1);assert.equal(f.tracks.length,1);f.session.stop();
}
console.log('PASS: native and lockscreen pause authority, no recovery/queued-ended override, same-source explicit resume, delayed initial/remote play ownership, retained chapter handoff pause and unchanged natural continuation.');
