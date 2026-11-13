import{settings}from './storage.js';

const KINDS=new Set(['rain','wind','fire','forest','ocean']);
const VIDEO_BASE='https://skodytunez-maker.github.io/salah/assets/player-nature-video-495/';

// A decorative silent movie never owns Quran playback, its timer or the OS media session.
export function mountNatureMotion(panel,{doc=document,win=window,isReduced=()=>settings.motion||settings.transitions===false,createVideo=()=>doc.createElement('video')}={}){
 let disposed=false,pageHidden=false,wrapper=null,video=null,chosen=null,active=null,failedKind=null,generation=0,lastPointer=null;
 const media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const selected=()=>KINDS.has(panel.dataset.nature)?panel.dataset.nature:null;
 const eligible=()=>!disposed&&!pageHidden&&!doc.hidden&&doc.visibilityState!=='hidden'&&panel.isConnected&&!panel.hidden&&panel.classList.contains('is-expanded')&&!!selected()&&!media?.matches&&!isReduced();
 const current=entry=>!disposed&&active===entry&&entry.generation===generation&&entry.kind===selected()&&eligible()&&video?.getAttribute('src')===entry.url;
 const resourceMatches=entry=>video?.currentSrc===entry.url;
 function hide(){if(wrapper){wrapper.hidden=true;wrapper.removeAttribute('data-ready');}}
 function release(){
  if(!active&&!video?.getAttribute('src')){hide();return;}
  generation++;const previous=active;active=null;previous?.cleanup();hide();
  if(video){try{video.pause();}catch{}video.removeAttribute('src');try{video.load();}catch{}}
 }
 function fail(entry){if(!current(entry))return;failedKind=entry.kind;release();}
 function reveal(entry){if(current(entry)&&resourceMatches(entry)&&entry.started&&!video.paused&&video.readyState>=2){wrapper.hidden=false;wrapper.setAttribute('data-ready','');}}
 function ensureVideo(){
  if(video)return true;
  wrapper=doc.createElement('div');wrapper.className='quran-nature-motion';wrapper.hidden=true;wrapper.setAttribute('aria-hidden','true');
  try{video=createVideo();}catch{video=null;}
  if(!video){wrapper=null;return false;}
  video.controls=false;video.autoplay=false;video.muted=true;video.defaultMuted=true;video.volume=0;video.playsInline=true;video.loop=true;video.preload='none';video.disablePictureInPicture=true;video.disableRemotePlayback=true;video.tabIndex=-1;
  for(const attribute of ['muted','playsinline','loop','disablepictureinpicture','disableremoteplayback'])video.setAttribute(attribute,'');
  video.setAttribute('x-webkit-airplay','deny');video.setAttribute('controlslist','nodownload nofullscreen noremoteplayback');video.setAttribute('aria-hidden','true');
  wrapper.append(video);panel.prepend(wrapper);return true;
 }
 function start(kind){
  if(!ensureVideo()){failedKind=kind;return;}
  const entry={kind,url:VIDEO_BASE+kind+'.mp4',generation:++generation,started:false,cleanup:()=>{}};
  active=entry;wrapper.dataset.kind=kind;wrapper.hidden=false;wrapper.removeAttribute('data-ready');
  video.muted=true;video.defaultMuted=true;video.volume=0;video.preload='none';
  const loaded=()=>reveal(entry);
  const playing=()=>{if(!current(entry)||!resourceMatches(entry)||video.paused)return;entry.started=true;reveal(entry);};
  const paused=()=>{if(current(entry)&&resourceMatches(entry)&&video.paused){entry.started=false;wrapper.removeAttribute('data-ready');}};
  // An old queued error must not invalidate a new resource: load() resets MediaError.
  const error=()=>{if(current(entry)&&video.error&&(!video.currentSrc||resourceMatches(entry)))fail(entry);};
  const listeners=[['loadeddata',loaded],['playing',playing],['pause',paused],['error',error]];
  for(const[name,fn]of listeners)video.addEventListener(name,fn);
  entry.cleanup=()=>{for(const[name,fn]of listeners)video?.removeEventListener(name,fn);};
  video.setAttribute('src',entry.url);
  try{
   const attempt=video.play();
   Promise.resolve(attempt).then(()=>{if(!current(entry))return;if(!video.paused){entry.started=true;reveal(entry);}},()=>fail(entry));
  }catch{fail(entry);}
 }
 function sync(){
  const next=selected();
  if(next!==chosen){chosen=next;failedKind=null;release();}
  if(!eligible()){release();return;}
  if(failedKind===next||active?.kind===next)return;
  start(next);
 }
 function retry(){
  if(disposed||!selected())return;
  // An explicit opener/scene gesture can arm one retry before the dialog expands.
  failedKind=null;
  if(!eligible())return;
  if(active?.started&&!video.paused&&!video.ended&&!video.error)return;
  release();sync();
 }
 function gestureTarget(event){
  if(!event.isTrusted||event.isPrimary===false)return null;
  const target=event.target?.closest?.('[data-nature],[data-toggle],[data-expand],.quran-now-playing');
  if(!target||!panel.contains(target))return null;
  if(target.dataset.nature&&target.dataset.nature!==selected())return null;
  return target;
 }
 const pointer=event=>{const target=gestureTarget(event);if(!target)return;lastPointer={target,time:event.timeStamp};retry();};
 const click=event=>{const target=gestureTarget(event);if(!target)return;const recent=lastPointer&&lastPointer.target===target&&event.timeStamp-lastPointer.time>=0&&event.timeStamp-lastPointer.time<1200;lastPointer=null;if(!recent)retry();};
 const changed=event=>{if(event.isTrusted&&panel.contains(event.target))retry();};
 const cancelled=()=>{lastPointer=null;};
 const observer=typeof win.MutationObserver==='function'?new win.MutationObserver(sync):null;observer?.observe(panel,{attributes:true,attributeFilter:['class','hidden','data-nature']});
 const hidePage=()=>{pageHidden=true;release();},showPage=()=>{pageHidden=false;sync();};
 doc.addEventListener('visibilitychange',sync);win.addEventListener('pagehide',hidePage);win.addEventListener('pageshow',showPage);win.addEventListener('salah:settings-changed',sync);
 panel.addEventListener('pointerdown',pointer,{capture:true,passive:true});panel.addEventListener('click',click,true);panel.addEventListener('change',changed,true);panel.addEventListener('pointercancel',cancelled,true);
 if(media?.addEventListener)media.addEventListener('change',sync);else media?.addListener?.(sync);
 sync();
 return{sync,destroy(){if(disposed)return;disposed=true;release();observer?.disconnect();doc.removeEventListener('visibilitychange',sync);win.removeEventListener('pagehide',hidePage);win.removeEventListener('pageshow',showPage);win.removeEventListener('salah:settings-changed',sync);panel.removeEventListener('pointerdown',pointer,true);panel.removeEventListener('click',click,true);panel.removeEventListener('change',changed,true);panel.removeEventListener('pointercancel',cancelled,true);if(media?.removeEventListener)media.removeEventListener('change',sync);else media?.removeListener?.(sync);wrapper?.remove();wrapper=null;video=null;lastPointer=null;}};
}
