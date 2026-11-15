import{esc,uiLeaf}from './ui.js';
import{t,translateUi}from './i18n.js';
import{listeningTime}from './ranking-ui.js';
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
// Only the glyph transition animates. Never replay a backlog of seconds.
export function createSharedListeningMotion(){let value=null;return{reset(){value=null;},tick(){return value;},sample(target,{key,server}={}){value=Number.isSafeInteger(target)&&target>=0&&Number.isSafeInteger(server)&&server>=0&&key?target:null;return value;}};}
const validSeconds=seconds=>Number.isSafeInteger(seconds)&&seconds>=0;
const summaryValue=seconds=>validSeconds(seconds)?listeningTime(seconds):'…';
const numberDigits=(value,unit)=>[...String(value)].map((digit,place)=>'<span class="listening-digit" data-listening-place="'+unit+'-'+(String(value).length-place-1)+'"><span>'+digit+'</span></span>').join('');
export function listeningCountMarkup(count){return '<strong data-listening-total data-listening-count data-listening-animated data-listening-seconds="'+count+'" aria-label="'+count+'"><span class="listening-time-visual" aria-hidden="true">'+numberDigits(count,'count')+'</span></strong>';}
function sharedTimeMarkup(seconds){
 if(!validSeconds(seconds))return '…';
 // Canonical place identifiers stay stable across languages, so repainting
 // translated units never replaces digits or restarts their transitions.
 const minutes=Math.floor(seconds/60),rest=seconds%60,parts=minutes?[[Math.floor(minutes/60),'ч','hourUnit'],[minutes%60,'мин','minuteUnit'],...(rest?[[rest,'с','secondUnit']]:[])]:seconds?[[seconds,'с','secondUnit']]:[[0,'ч','hourUnit'],[0,'мин','minuteUnit']];
 return parts.map(([number,place,key])=>numberDigits(number,place)+' <span class="listening-time-unit" data-i18n="rankingUi.'+key+'">'+esc(t('rankingUi.'+key))+'</span>').join(' ');
}
export function listeningSummaryMarkup(seconds,{personal=false}={}){
 const value=summaryValue(seconds);
 return '<div class="listening-summary'+(personal?' reciter-personal-total':'')+'" data-listening-summary><span>'+uiLeaf(personal?'rankingUi.totalListened':'rankingUi.togetherListened')+'</span><strong data-listening-total dir="ltr" data-listening-seconds="'+(validSeconds(seconds)?seconds:'')+'" aria-live="off"'+(personal?'':' data-listening-animated aria-label="'+esc(value)+'"')+'>'+(personal?esc(value):'<span class="listening-time-visual" aria-hidden="true">'+sharedTimeMarkup(seconds)+'</span>')+'</strong></div>';
}
export function translateListeningSummary(host){
 for(const element of host?.querySelectorAll?.('[data-listening-total]')||[]){
  if(element.hasAttribute('data-listening-count'))continue;
  const stored=element.dataset.listeningSeconds,value=summaryValue(stored===''?null:Number(stored));
  if(element.hasAttribute('data-listening-animated')){translateUi(element);element.setAttribute('aria-label',value);}
  else if(element.textContent!==value)element.textContent=value;
 }
}
export function updateListeningSummary(host,seconds,{count=false}={}){
 const element=host.querySelector('[data-listening-total]');if(!element)return;
 if(!element.hasAttribute('data-listening-animated')){element.dataset.listeningSeconds=validSeconds(seconds)?String(seconds):'';const value=summaryValue(seconds);if(element.textContent!==value)element.textContent=value;return;}
 const value=count?String(seconds):summaryValue(seconds),previous=element.dataset.listeningSeconds;
 if(value===element.getAttribute('aria-label'))return;
 const visual=element.querySelector('.listening-time-visual'),next=count?numberDigits(seconds,'count'):sharedTimeMarkup(seconds),template=element.ownerDocument.createElement('span');template.innerHTML=next;
 const oldDigits=[...visual.querySelectorAll('[data-listening-place]')],oldValues=new Map(oldDigits.map(digit=>[digit.dataset.listeningPlace,digit.textContent]));
 // Corrections, scope changes and a fresh snapshot replace the number quietly.
 // Only small forward steps animate, using the already measured total above.
 const animate=previous!==''&&validSeconds(seconds)&&(count?seconds!==Number(previous):seconds>Number(previous))&&Math.abs(seconds-Number(previous))<=10;
 if(!animate)visual.innerHTML=next;
 else{
  if(visual.textContent.replace(/\d/g,'#')!==value.replace(/\d/g,'#'))visual.innerHTML=next;
  element.style.setProperty('--listening-step','280ms');
  const nextValues=new Map([...template.querySelectorAll('[data-listening-place]')].map(digit=>[digit.dataset.listeningPlace,digit.textContent]));
  for(const digit of visual.querySelectorAll('[data-listening-place]')){const glyph=digit.firstElementChild,old=oldValues.get(digit.dataset.listeningPlace),nextDigit=nextValues.get(digit.dataset.listeningPlace);
   if(old===nextDigit)continue;
   digit.dataset.previous=old||'';glyph.textContent=nextDigit;
   digit.classList.toggle('listening-step-a');digit.classList.toggle('listening-step-b',!digit.classList.contains('listening-step-a'));
  }
 }
 element.dataset.listeningSeconds=validSeconds(seconds)?String(seconds):'';element.setAttribute('aria-label',value);
}
