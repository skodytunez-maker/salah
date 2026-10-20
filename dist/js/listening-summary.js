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
export function listeningSummaryMarkup(seconds,{personal=false}={}){
 const value=Number.isSafeInteger(seconds)&&seconds>=0?formatListeningTime(seconds):'…';
 return '<div class="listening-summary'+(personal?' reciter-personal-total':'')+'" data-listening-summary><span>'+(personal?'Всего прослушано':'Вместе прослушали')+'</span><strong data-listening-total aria-live="off">'+esc(value)+'</strong></div>';
}
export function updateListeningSummary(host,seconds){const element=host.querySelector('[data-listening-total]');if(!element)return;const value=Number.isSafeInteger(seconds)&&seconds>=0?formatListeningTime(seconds):'…';if(element.textContent!==value)element.textContent=value;}
