import{esc}from './ui.js';
import{formatListeningTime}from './reciter-popularity-core.js';
// Display real, locally metered audio progress while its server snapshot is in
// flight. Never persist this preview or use it to calculate a rank or award.
export function createLiveListeningTotal(){
 let previous=null;
 const reset=()=>{previous=null;};
 return {reset,sample(server,totals,{key,eligible=false}={}){
  if(!Number.isSafeInteger(server)||server<0){reset();return null;}
  const local=Object.values(totals||{}).reduce((sum,n)=>sum+(Number.isFinite(n)&&n>=0?n:0),0);
  if(!eligible||!key||!Number.isSafeInteger(Math.floor(local))){reset();return server;}
  if(!previous||previous.key!==key||local<previous.local||server<previous.server){previous={key,local,server,shown:server};return server;}
  const shown=Math.max(server,previous.shown+Math.max(0,local-previous.local));
  previous={key,local,server,shown};
  return Number.isSafeInteger(Math.floor(shown))?Math.floor(shown):server;
 }};
}
// Animate only an already confirmed backlog; a clock never creates listening time.
export function createSharedListeningMotion({now=()=>globalThis.performance?.now?.()??Date.now()}={}){
 let state=null;
 const valid=value=>Number.isSafeInteger(value)&&value>=0;
 const advance=time=>{
  if(!state)return null;
  const elapsed=Math.max(0,time-state.at)/1000;
  const local=Math.min(state.localPending,elapsed),remote=Math.min(state.remotePending,elapsed*state.remoteRate);
  state.localPending=Math.max(0,state.localPending-local);state.remotePending=Math.max(0,state.remotePending-remote);
  state.value=Math.min(state.target,state.value+local+remote);state.at=time;
  return Math.floor(state.value+1e-7);
 };
 return{reset(){state=null;},tick(){return advance(now());},sample(target,{key,server}={}){
  const time=now();
  if(!valid(target)||!valid(server)||!key){state=null;return null;}
  if(!state||state.key!==key||time<state.at||server<state.server||target<state.target){
   state={key,server,target,value:target,at:time,serverAt:time,localPending:0,remotePending:0,remoteRate:0};return target;
  }
  advance(time);const increase=target-state.target;
  if(server===state.server){
   // A normal measured second remains immediate. A delayed batch gets one
   // immediate second and replays the rest at 1x, never as a large jump.
   const immediate=state.localPending===0?Math.min(1,increase):0;
   state.value+=immediate;state.localPending+=increase-immediate;
  }else{
   if(increase>0){state.remotePending+=increase;state.remoteRate=increase*1000/Math.max(1000,time-state.serverAt);}
   state.serverAt=time;
  }
  state.target=target;state.server=server;
  return Math.floor(state.value+1e-7);
 }};
}
const validSeconds=seconds=>Number.isSafeInteger(seconds)&&seconds>=0;
const summaryValue=seconds=>validSeconds(seconds)?formatListeningTime(seconds):'…';
function sharedTimeMarkup(seconds){
 // Preserve the original text and spacing; animate digits and slightly reduce unit labels.
 return summaryValue(seconds).replace(/(\d+)(?= (ч|мин|с))/g,(part,number,unit)=>[...part].map((digit,place)=>'<span class="listening-digit" data-listening-place="'+unit+'-'+(part.length-place-1)+'"><span>'+digit+'</span></span>').join('')).replace(/ (ч|мин|с)(?= |$)/g,' <span class="listening-time-unit">$1</span>');
}
export function listeningSummaryMarkup(seconds,{personal=false}={}){
 const value=summaryValue(seconds);
 return '<div class="listening-summary'+(personal?' reciter-personal-total':'')+'" data-listening-summary><span>'+(personal?'Всего прослушано':'Вместе прослушали')+'</span><strong data-listening-total aria-live="off"'+(personal?'':' data-listening-animated data-listening-seconds="'+(validSeconds(seconds)?seconds:'')+'" aria-label="'+esc(value)+'"')+'>'+(personal?esc(value):'<span class="listening-time-visual" aria-hidden="true">'+sharedTimeMarkup(seconds)+'</span>')+'</strong></div>';
}
export function updateListeningSummary(host,seconds){
 const element=host.querySelector('[data-listening-total]');if(!element)return;
 if(!element.hasAttribute('data-listening-animated')){const value=validSeconds(seconds)?formatListeningTime(seconds):'…';if(element.textContent!==value)element.textContent=value;return;}
 const value=summaryValue(seconds),previous=element.dataset.listeningSeconds;
 if(value===element.getAttribute('aria-label'))return;
 const visual=element.querySelector('.listening-time-visual'),next=sharedTimeMarkup(seconds),template=element.ownerDocument.createElement('span');template.innerHTML=next;
 const oldDigits=[...visual.querySelectorAll('[data-listening-place]')],oldValues=new Map(oldDigits.map(digit=>[digit.dataset.listeningPlace,digit.textContent]));
 // Corrections, scope changes and a fresh snapshot replace the number quietly.
 // Only small forward steps animate, using the already measured total above.
 const animate=previous!==''&&validSeconds(seconds)&&seconds>Number(previous)&&seconds-Number(previous)<=10;
 if(!animate)visual.innerHTML=next;
 else{
  if(visual.textContent.replace(/\d/g,'#')!==value.replace(/\d/g,'#'))visual.innerHTML=next;
  element.style.setProperty('--listening-step',seconds-Number(previous)>1?'180ms':'280ms');
  const nextValues=new Map([...template.querySelectorAll('[data-listening-place]')].map(digit=>[digit.dataset.listeningPlace,digit.textContent]));
  for(const digit of visual.querySelectorAll('[data-listening-place]')){const glyph=digit.firstElementChild,old=oldValues.get(digit.dataset.listeningPlace),nextDigit=nextValues.get(digit.dataset.listeningPlace);
   if(old===nextDigit)continue;
   digit.dataset.previous=old||'';glyph.textContent=nextDigit;
   digit.classList.toggle('listening-step-a');digit.classList.toggle('listening-step-b',!digit.classList.contains('listening-step-a'));
  }
 }
 element.dataset.listeningSeconds=validSeconds(seconds)?String(seconds):'';element.setAttribute('aria-label',value);
}
