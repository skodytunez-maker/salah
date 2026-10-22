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
 const advance=time=>{if(!state)return null;const elapsed=Math.max(0,time-state.at);state.value=Math.min(state.target,state.value+elapsed*state.rate/1000);state.at=time;return Math.floor(state.value+1e-7);};
 return{reset(){state=null;},tick(){return advance(now());},sample(target,{key,server}={}){
  const time=now();
  if(!valid(target)||!valid(server)||!key){state=null;return null;}
  if(!state||state.key!==key||time<state.at||server<state.server||target<state.target){state={key,server,target,value:target,at:time,serverAt:time,rate:0};return target;}
  advance(time);const increase=target-state.target;
  if(server===state.server)state.value=Math.min(target,state.value+increase);
  else{if(increase>0)state.rate=(target-state.value)*1000/Math.max(1000,Math.min(15000,time-state.serverAt));state.serverAt=time;}
  state.target=target;state.server=server;
  return Math.floor(state.value+1e-7);
 }};
}
export function listeningSummaryMarkup(seconds,{personal=false}={}){
 const value=Number.isSafeInteger(seconds)&&seconds>=0?formatListeningTime(seconds):'…';
 return '<div class="listening-summary'+(personal?' reciter-personal-total':'')+'" data-listening-summary><span>'+(personal?'Всего прослушано':'Вместе прослушали')+'</span><strong data-listening-total aria-live="off">'+esc(value)+'</strong></div>';
}
export function updateListeningSummary(host,seconds){const element=host.querySelector('[data-listening-total]');if(!element)return;const value=Number.isSafeInteger(seconds)&&seconds>=0?formatListeningTime(seconds):'…';if(element.textContent!==value)element.textContent=value;}
