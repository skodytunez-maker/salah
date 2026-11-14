import{settings}from './storage.js';
import{natureVideoUrl,createNatureVideoCache}from './quran-nature-video-cache.js';

const TRANSITION_MS=220;
// Two visual slots share no audio ownership. Only compressed bytes may stay warm while closed.
export function mountNatureMotion(panel,{doc=document,win=window,isReduced=()=>settings.motion||settings.transitions===false,createVideo=()=>doc.createElement('video'),createCache=createNatureVideoCache,setTimer=(fn,ms)=>win.setTimeout(fn,ms),clearTimer=id=>win.clearTimeout(id)}={}){
 let disposed=false,pageHidden=false,wrapper=null,chosen=null,visual=null,front=null,pending=null,retiring=null,failedKind=null,generation=0,retireTimer=null,photoTimer=null,lastPointer=null;
 const slots=[],media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const selected=()=>natureVideoUrl(panel.dataset.nature)?panel.dataset.nature:null;
 const picture=()=>panel.dataset.natureVisual==='photo';
 const baseEligible=()=>!disposed&&!pageHidden&&!doc.hidden&&doc.visibilityState!=='hidden'&&panel.isConnected&&!panel.hidden&&panel.classList.contains('is-expanded')&&!!selected()&&!media?.matches&&!isReduced();
 const eligible=()=>baseEligible()&&!picture();
 const owns=entry=>!disposed&&entry.slot.entry===entry;
 const desired=entry=>owns(entry)&&entry.kind===selected()&&eligible();
 const resource=entry=>entry.slot.video.currentSrc===entry.url;
 const ready=entry=>resource(entry)&&entry.slot.video.readyState>=2&&!entry.slot.video.paused;
 const cache=createCache({canWarm:()=>eligible()&&!!front&&front.kind===selected()&&front.presented&&front.started&&!front.slot.video.paused,connection:()=>win.navigator?.connection});
 function wrapperReady(value){if(wrapper){wrapper.hidden=false;wrapper.toggleAttribute('data-ready',!!value);}}
 function unload(slot){
  const entry=slot.entry;if(!entry&&!slot.video.hasAttribute('src'))return;
  slot.entry=null;entry?.cleanup();if(entry?.frameId!=null)try{slot.video.cancelVideoFrameCallback?.(entry.frameId);}catch{}
  slot.video.removeAttribute('data-visible');slot.video.removeAttribute('data-layer');
  try{slot.video.pause();}catch{}slot.video.removeAttribute('src');try{slot.video.load();}catch{}
 }
 function finishRetire(){if(retireTimer!==null)clearTimer(retireTimer);retireTimer=null;if(retiring){unload(retiring.slot);retiring=null;}}
 function cancelPhoto(){if(photoTimer!==null)clearTimer(photoTimer);photoTimer=null;}
 function clearSources(){
  generation++;finishRetire();cancelPhoto();pending=null;front=null;for(const slot of slots)unload(slot);
  if(wrapper){wrapper.removeAttribute('data-ready');wrapper.hidden=true;}
 }
 function cancelPending(){if(pending){const old=pending;pending=null;unload(old.slot);}}
 function hold(entry){entry.attempt=(entry.attempt||0)+1;entry.attempting=false;entry.started=false;entry.resumeAllowed=true;try{entry.slot.video.pause();}catch{}}
 function fadeToPicture(){
  cache.stop();cancelPending();finishRetire();wrapperReady(false);
  if(front){hold(front);if(photoTimer===null)photoTimer=setTimer(()=>{photoTimer=null;if(front){unload(front.slot);front=null;}if(wrapper)wrapper.hidden=true;},TRANSITION_MS);}
  else if(wrapper)wrapper.hidden=true;
 }
 function warm(){if(front&&desired(front)&&front.started&&ready(front))void cache.warm(front.kind);}
 function present(entry){
  if(pending!==entry||!desired(entry)||!entry.started||!ready(entry))return;
  finishRetire();cancelPhoto();const previous=front;pending=null;front=entry;entry.presented=true;entry.slot.video.dataset.layer='incoming';entry.slot.video.setAttribute('data-visible','');wrapperReady(true);
  if(previous&&previous!==entry){hold(previous);previous.slot.video.dataset.layer='front';retiring=previous;}
  retireTimer=setTimer(()=>{retireTimer=null;if(retiring){unload(retiring.slot);retiring=null;}if(front===entry&&owns(entry))entry.slot.video.dataset.layer='front';},TRANSITION_MS);
  warm();
 }
 function maybePresent(entry){
  if(!desired(entry)||!entry.started||!ready(entry))return;
  if(front===entry&&entry.presented){wrapperReady(true);warm();return;}
  if(pending!==entry||entry.frameRequested)return;entry.frameRequested=true;
  if(typeof entry.slot.video.requestVideoFrameCallback==='function'){
   try{entry.frameId=entry.slot.video.requestVideoFrameCallback(()=>{entry.frameId=null;entry.frameRequested=false;present(entry);});return;}catch{}
  }
  present(entry);
 }
 function failed(entry){
  if(!desired(entry))return;failedKind=entry.kind;
  if(pending===entry){pending=null;unload(entry.slot);}else if(front===entry){front=null;unload(entry.slot);}
  fadeToPicture();
 }
 function play(entry){
  if(!desired(entry)||entry.attempting)return;entry.attempting=true;entry.resumeAllowed=false;const ticket=entry.attempt=(entry.attempt||0)+1;
  try{Promise.resolve(entry.slot.video.play()).then(()=>{if(ticket!==entry.attempt||!desired(entry))return;entry.attempting=false;if(!entry.slot.video.paused){entry.started=true;maybePresent(entry);}},()=>{if(ticket!==entry.attempt)return;entry.attempting=false;failed(entry);});}
  catch{if(ticket===entry.attempt){entry.attempting=false;failed(entry);}}
 }
 function makeSlot(){
  if(!wrapper){wrapper=doc.createElement('div');wrapper.className='quran-nature-motion';wrapper.hidden=true;wrapper.setAttribute('aria-hidden','true');panel.prepend(wrapper);}
  let video;try{video=createVideo();}catch{}if(!video)return null;
  video.className='quran-nature-video-slot';video.controls=false;video.autoplay=false;video.muted=true;video.defaultMuted=true;video.volume=0;video.playsInline=true;video.loop=true;video.preload='none';video.disablePictureInPicture=true;video.disableRemotePlayback=true;video.tabIndex=-1;
  for(const name of ['muted','playsinline','loop','disablepictureinpicture','disableremoteplayback'])video.setAttribute(name,'');
  video.setAttribute('x-webkit-airplay','deny');video.setAttribute('controlslist','nodownload nofullscreen noremoteplayback');video.setAttribute('aria-hidden','true');
  const slot={video,index:slots.length,entry:null};video.dataset.slot=String(slot.index);slots.push(slot);wrapper.append(video);return slot;
 }
 function start(kind){
  finishRetire();cancelPhoto();const slot=slots.find(s=>!s.entry||s.entry!==front)|| (slots.length<2?makeSlot():null);
  if(!slot){failedKind=kind;return;}unload(slot);
  const entry={slot,kind,url:cache.get(kind)||natureVideoUrl(kind),generation:++generation,started:false,presented:false,attempting:false,frameRequested:false,frameId:null,cleanup:()=>{}};
  pending=entry;slot.entry=entry;slot.video.dataset.kind=kind;slot.video.dataset.layer='incoming';slot.video.removeAttribute('data-visible');wrapper.hidden=false;
  slot.video.muted=true;slot.video.defaultMuted=true;slot.video.volume=0;
  const loaded=()=>maybePresent(entry),playing=()=>{if(!desired(entry)||!resource(entry)||slot.video.paused)return;entry.started=true;maybePresent(entry);};
  const paused=()=>{if(owns(entry)&&resource(entry)&&slot.video.paused){entry.started=false;if(front===entry)cache.stop();}};
  const error=()=>{if(desired(entry)&&slot.video.error&&(!slot.video.currentSrc||resource(entry)))failed(entry);};
  const listeners=[['loadeddata',loaded],['playing',playing],['pause',paused],['error',error]];
  for(const[type,fn]of listeners)slot.video.addEventListener(type,fn);entry.cleanup=()=>{for(const[type,fn]of listeners)slot.video.removeEventListener(type,fn);};
  slot.video.setAttribute('src',entry.url);play(entry);
 }
 function sync(){
  const next=selected(),nextVisual=picture()?'photo':'video';
  if(next!==chosen){chosen=next;failedKind=null;cache.stop();cancelPending();finishRetire();if(front)hold(front);}
  if(nextVisual!==visual){visual=nextVisual;failedKind=null;}
  if(!baseEligible()){cache.stop();clearSources();return;}
  if(picture()){fadeToPicture();return;}
  if(failedKind===next)return;
  cancelPhoto();
  if(front?.kind===next&&front.presented){cancelPending();wrapperReady(true);front.slot.video.dataset.layer='front';if(front.slot.video.paused&&front.resumeAllowed)play(front);else warm();return;}
  if(pending?.kind===next)return;
  cancelPending();start(next);
 }
 function retry(){
  if(disposed||!selected())return;failedKind=null;cache.retry?.(selected());
  if(!eligible())return;
  if(front?.kind===selected()&&front.started&&!front.slot.video.paused&&!front.slot.video.error)return;
  if(pending?.kind===selected()){if(pending.started&&ready(pending))maybePresent(pending);else{pending.attempting=false;play(pending);}return;}
  if(front?.kind===selected()&&front.presented){front.attempting=false;play(front);}else sync();
 }
 function target(event){
  if(!event.isTrusted||event.isPrimary===false)return null;const node=event.target?.closest?.('[data-nature],[data-nature-visual],[data-toggle],[data-expand],.quran-now-playing');
  if(!node||!panel.contains(node)||node.dataset.nature&&node.dataset.nature!==selected())return null;return node;
 }
 const pointer=event=>{const node=target(event);if(!node)return;lastPointer={node,time:event.timeStamp};retry();};
 const click=event=>{const node=target(event);if(!node)return;const recent=lastPointer&&lastPointer.node===node&&event.timeStamp-lastPointer.time>=0&&event.timeStamp-lastPointer.time<1200;lastPointer=null;if(!recent)retry();};
 const changed=event=>{if(event.isTrusted&&panel.contains(event.target))retry();},cancelled=()=>{lastPointer=null;};
 const observer=typeof win.MutationObserver==='function'?new win.MutationObserver(sync):null;observer?.observe(panel,{attributes:true,attributeFilter:['class','hidden','data-nature','data-nature-visual']});
 const hidePage=()=>{pageHidden=true;cache.stop();clearSources();},showPage=()=>{pageHidden=false;sync();};
 doc.addEventListener('visibilitychange',sync);win.addEventListener('pagehide',hidePage);win.addEventListener('pageshow',showPage);win.addEventListener('salah:settings-changed',sync);
 panel.addEventListener('pointerdown',pointer,{capture:true,passive:true});panel.addEventListener('click',click,true);panel.addEventListener('change',changed,true);panel.addEventListener('pointercancel',cancelled,true);
 if(media?.addEventListener)media.addEventListener('change',sync);else media?.addListener?.(sync);
 sync();
 return{sync,destroy(){if(disposed)return;disposed=true;cache.stop();clearSources();cache.destroy();observer?.disconnect();doc.removeEventListener('visibilitychange',sync);win.removeEventListener('pagehide',hidePage);win.removeEventListener('pageshow',showPage);win.removeEventListener('salah:settings-changed',sync);panel.removeEventListener('pointerdown',pointer,true);panel.removeEventListener('click',click,true);panel.removeEventListener('change',changed,true);panel.removeEventListener('pointercancel',cancelled,true);if(media?.removeEventListener)media.removeEventListener('change',sync);else media?.removeListener?.(sync);wrapper?.remove();wrapper=null;lastPointer=null;}};
}
