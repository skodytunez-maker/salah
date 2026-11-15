import{prayerContext,cachedPrayerDays,savedPrayerDay,prayerMonthComplete,loadPrayerMonth,removeCachedPrayerDays,dateKey,addDays}from './prayers.js';
export const PRAYER_OFFLINE_MONTHS=12;
export function prayerOfflineIdentity(context){return JSON.stringify([context?.key,context?.city?.name,context?.city?.country,context?.city?.timezone])}
export function prayerOfflineMonths(context,now=Date.now()){
 if(!context?.city)return[];
 try{const day=dateKey(new Date(now),context.city.timezone),year=Number(day.slice(0,4)),month=Number(day.slice(5,7))-1;return Array.from({length:PRAYER_OFFLINE_MONTHS},(_,i)=>new Date(Date.UTC(year,month+i,1)).toISOString().slice(0,7))}
 catch{return[]}
}
export function prayerOfflineCoverage(context,now=Date.now(),readDays=cachedPrayerDays){
 const months=prayerOfflineMonths(context,now),rows=readDays(context),dates=Object.keys(rows).filter(day=>months.includes(day.slice(0,7))&&savedPrayerDay(context,day,rows[day])).sort(),ranges=[];
 for(const day of dates){const last=ranges.at(-1);if(last&&addDays(last.until,1)===day)last.until=day;else ranges.push({from:day,until:day})}
 const available=new Set(dates),ready=months.filter(month=>{const count=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();return Array.from({length:count},(_,i)=>month+'-'+String(i+1).padStart(2,'0')).every(day=>available.has(day))}).length;
 return{months,ready,total:months.length,ranges,days:dates.length,hasSaved:Object.keys(rows).length>0};
}
export function createPrayerOffline({
 getContext=prayerContext,readDays=cachedPrayerDays,load=loadPrayerMonth,remove=removeCachedPrayerDays,
 clock=Date.now,online=()=>globalThis.navigator?.onLine!==false,onChange=()=>{}
}={}){
 let revision=0,abort=null,disposed=false,context=getContext(),identity=prayerOfflineIdentity(context),state={running:false,done:0,reason:'',context,coverage:prayerOfflineCoverage(context,clock(),readDays)};
 const listeners=new Set();
 const emit=()=>{if(!disposed)for(const listener of [...listeners])listener(state)};
 function refresh(){
  if(disposed)return state;
  const next=getContext(),changed=prayerOfflineIdentity(next)!==identity;
  if(changed){abort?.abort();abort=null;revision++;context=next;identity=prayerOfflineIdentity(next);state={...state,running:false,done:0,reason:'changed'};}
  const coverage=prayerOfflineCoverage(next,clock(),readDays);
  if(!state.running&&['complete','partial','published'].includes(state.reason))state={...state,reason:!coverage.days?'':coverage.ready===coverage.total?'complete':next?.tyumen?'published':'partial'};
  state={...state,context:next,coverage};emit();return state;
 }
 function cancel(reason='cancelled'){if(disposed)return;abort?.abort();abort=null;revision++;state={...state,running:false,reason};refresh()}
 async function save(){
  refresh();if(disposed||state.running)return state;
  context=getContext();identity=prayerOfflineIdentity(context);
  if(!context?.city){state={...state,reason:'chooseCity'};emit();return state}
  if(!online()){state={...state,reason:'offline'};emit();return state}
  const id=++revision,current=context,signature=identity,months=prayerOfflineMonths(current,clock()),controller=new AbortController();abort=controller;
  const live=()=>!disposed&&id===revision&&signature===prayerOfflineIdentity(getContext())&&!controller.signal.aborted;
  const interrupted=()=>{if(live())return false;if(!disposed&&signature!==prayerOfflineIdentity(getContext()))refresh();return true};
  let failed=0,storageFailed=false;
  state={...state,running:true,done:0,reason:'',context:current};emit();
  try{
   if(current.tyumen){
    const today=dateKey(new Date(clock()),current.city.timezone),loaded=await load(current,today,{force:true,signal:controller.signal,prefetchMonths:months});
    if(interrupted())return state;
    const loadedDates=Object.keys(loaded).filter(day=>months.includes(day.slice(0,7))&&savedPrayerDay(current,day,loaded[day]));
    const actual=readDays(current);storageFailed=loadedDates.some(day=>!savedPrayerDay(current,day,actual[day]));
    state={...state,done:months.length,coverage:prayerOfflineCoverage(current,clock(),readDays)};emit();
   }else{
    for(let i=0;i<months.length;i++){
     const month=months[i];if(interrupted())return state;
     if(!prayerMonthComplete(current,month,readDays(current))){
      try{
       const loaded=await load(current,month+'-01',{signal:controller.signal});
       if(interrupted())return state;
       if(!prayerMonthComplete(current,month,readDays(current))){
        if(prayerMonthComplete(current,month,loaded))storageFailed=true;else failed++;
       }
      }catch{if(interrupted())return state;failed++;}
     }
     if(interrupted())return state;
     state={...state,done:i+1,coverage:prayerOfflineCoverage(current,clock(),readDays)};emit();
     if(storageFailed||!online())break;
    }
   }
  }catch{if(interrupted())return state;failed++;}
  if(!live()){if(!disposed&&signature!==prayerOfflineIdentity(getContext()))refresh();return state}
  abort=null;const coverage=prayerOfflineCoverage(current,clock(),readDays);
  state={...state,running:false,coverage,reason:storageFailed?'storageFailed':!online()?'offline':failed?'failed':current.tyumen&&coverage.ready<coverage.total?'published':coverage.ready===coverage.total?'complete':'partial'};
  emit();onChange();return state;
 }
 function clear(){
  cancel('');const current=getContext(),removed=remove(current);state={...state,reason:removed?'removed':'storageFailed',coverage:prayerOfflineCoverage(current,clock(),readDays)};emit();if(removed)onChange();return removed;
 }
 return{save,cancel,clear,refresh,getState:()=>state,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)},stop(){if(disposed)return;disposed=true;abort?.abort();abort=null;revision++;listeners.clear()}};
}
