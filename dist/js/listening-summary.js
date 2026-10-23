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
export function listeningSummaryMarkup(seconds,{personal=false}={}){
 const value=Number.isSafeInteger(seconds)&&seconds>=0?formatListeningTime(seconds):'…';
 return '<div class="listening-summary'+(personal?' reciter-personal-total':'')+'" data-listening-summary><span>'+(personal?'Всего прослушано':'Вместе прослушали')+'</span><strong data-listening-total aria-live="off">'+esc(value)+'</strong></div>';
}
export function updateListeningSummary(host,seconds){const element=host.querySelector('[data-listening-total]');if(!element)return;const value=Number.isSafeInteger(seconds)&&seconds>=0?formatListeningTime(seconds):'…';if(element.textContent!==value)element.textContent=value;}
