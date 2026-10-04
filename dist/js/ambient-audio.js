import{settings}from './storage.js';
import{foregroundAudioBusy,subscribeForegroundAudio}from './audio-focus.js';

export const AMBIENT_MAX_VOLUME=60;
export function ambientPreferences(value){return {enabled:value?.ambientEnabled===true,sound:value?.ambientSound==='wind'?'wind':'rain',volume:Number.isInteger(value?.ambientVolume)&&value.ambientVolume>=0&&value.ambientVolume<=AMBIENT_MAX_VOLUME?value.ambientVolume:18}}
export function createAmbientAudio({getSettings=()=>settings,AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext,visible=()=>!document.hidden,route=()=>location.hash.slice(1).split('?')[0]||'home',busy=foregroundAudioBusy,schedule=setTimeout,cancel=clearTimeout,random=Math.random}={}){
 let context=null,source=null,low=null,high=null,gain=null,armed=false,arming=null,disposed=false,sequence=0,stopTimer=null,target=0,tone=null,volumePreview=null,error=false;
 const listeners=new Set(),preferences=()=>ambientPreferences(getSettings());
 const volume=()=>volumePreview??preferences().volume;
 const allowed=()=>visible()&&['home','settings'].includes(route());
 function state(){const p=preferences();return {enabled:p.enabled,sound:p.sound,volume:volume(),supported:typeof AudioContext==='function',armed,playing:target>0&&context?.state==='running',reason:!p.enabled?'off':typeof AudioContext!=='function'?'unsupported':error?'error':!armed?'tap':!visible()?'hidden':!allowed()?'paused':busy()?'foreground':volume()===0?'quiet':'playing'}}
 const notify=()=>{const value=state();for(const listener of listeners)try{listener(value)}catch{}};
 function graph(){
  if(context&&context.state!=='closed')return;
  tone=null;target=0;
  context=new AudioContext({latencyHint:'playback'});
  gain=context.createGain();gain.gain.setValueAtTime(0,context.currentTime);
  high=context.createBiquadFilter();high.type='highpass';high.frequency.value=110;high.Q.value=.6;
  low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=2600;low.Q.value=.6;
  const buffer=context.createBuffer(2,Math.ceil(context.sampleRate*8),context.sampleRate),seam=512;
  for(let channel=0;channel<2;channel++){
   const data=buffer.getChannelData(channel);let brown=0;
   for(let i=0;i<data.length;i++){const white=random()*2-1;brown=(brown+.035*white)/1.035;data[i]=Math.max(-.8,Math.min(.8,brown*2.8+white*.12))}
   // Crossfade the tail into the excluded prefix, then wrap to its next sample.
   for(let i=0;i<seam;i++){const t=i/(seam-1),end=data.length-seam+i;data[end]=data[end]*(1-t)+data[i]*t}
  }
  source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.loopStart=seam/context.sampleRate;source.loopEnd=buffer.duration;
  source.connect(high);high.connect(low);low.connect(gain);gain.connect(context.destination);source.start(0,source.loopStart);
 }
 function ramp(value,seconds){
  if(!gain||!context)return;
  const parameter=gain.gain,now=context.currentTime;
  if(parameter.cancelAndHoldAtTime)parameter.cancelAndHoldAtTime(now);else{const current=parameter.value;parameter.cancelScheduledValues(now);parameter.setValueAtTime(current,now)}
  parameter.linearRampToValueAtTime(value,now+seconds);target=value;
 }
 async function sync(){
  if(disposed)return;
  const p=preferences(),wanted=p.enabled&&armed&&allowed()&&!busy()&&volume()>0,level=wanted?volume()/100*.35:0;
  if(wanted&&context?.state==='running'&&target===level&&tone===p.sound){notify();return}
  const id=++sequence;if(stopTimer!==null){cancel(stopTimer);stopTimer=null}
  if(!context){notify();return}
  if(!wanted){
   const quick=!visible()||busy()||!allowed();ramp(0,quick ? .12 : 1.5);notify();
   stopTimer=schedule(()=>{stopTimer=null;if(!disposed&&id===sequence&&target===0)void context.suspend().catch(()=>{})},quick?180:1600);return;
  }
  try{
   await context.resume();if(disposed||id!==sequence)return;
   if(tone!==p.sound){tone=p.sound;low.frequency.setTargetAtTime(tone==='rain'?2600:650,context.currentTime,.8);high.frequency.setTargetAtTime(tone==='rain'?110:85,context.currentTime,.8)}
   // Every entrance starts quietly; foreground audio always has priority.
   ramp(level,target===0?6:.7);error=false;notify();
  }catch{if(!disposed&&id===sequence){armed=false;error=true;ramp(0,.1);notify()}}
 }
 async function unlock(){
  if(disposed||!preferences().enabled||typeof AudioContext!=='function')return;
  if(armed)return sync();if(arming)return arming;
  try{graph();const resumed=context.resume();arming=Promise.resolve(resumed).then(()=>{if(disposed)return;armed=true;error=false;return sync()}).catch(()=>{if(!disposed){armed=false;error=true;ramp(0,.1);notify()}}).finally(()=>{arming=null});return arming}
  catch{error=true;notify()}
 }
 function destroy(){disposed=true;sequence++;if(stopTimer!==null)cancel(stopTimer);listeners.clear();try{source?.stop();source?.disconnect();high?.disconnect();low?.disconnect();gain?.disconnect();void context?.close().catch(()=>{})}catch{}context=null}
 return {unlock,sync,destroy,previewVolume:value=>{volumePreview=Number.isInteger(value)?Math.max(0,Math.min(AMBIENT_MAX_VOLUME,value)):null;return sync()},subscribe:listener=>{listeners.add(listener);listener(state());return()=>listeners.delete(listener)},get state(){return state()}};
}

let controller=null,dispose=null;
export function initAmbientAudio(){
 if(controller)return controller;
 let pageHidden=false;
 controller=createAmbientAudio({visible:()=>!document.hidden&&!pageHidden});
 const sync=()=>void controller.sync();
 const hide=()=>{pageHidden=true;sync()},show=()=>{pageHidden=false;sync()};
 const gesture=event=>{if(event.isTrusted&&settings.ambientEnabled&&['home','settings'].includes(location.hash.slice(1).split('?')[0]||'home'))void controller.unlock()};
 document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
 document.addEventListener('keydown',gesture,{capture:true});
 document.addEventListener('visibilitychange',sync);window.addEventListener('hashchange',sync);window.addEventListener('salah:settings-changed',sync);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
 const unsubscribe=subscribeForegroundAudio(sync);
 dispose=()=>{document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);document.removeEventListener('visibilitychange',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('salah:settings-changed',sync);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);unsubscribe();controller.destroy();controller=null};
 return controller;
}
export function destroyAmbientAudio(){dispose?.();dispose=null}
