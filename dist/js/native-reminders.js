import {buildNativeReminderPlan} from './native-reminder-plan.js';

// Explicit enable() is the sole permission-request path. refresh() is safe on
// startup/resume and serializes replacement, so a slow old-city call cannot win.
export function createNativeReminderConnection({plugin,getPreferences,getContext,now=()=>Date.now()}={}){
 let sequence=0,tail=Promise.resolve(),signature='',latest={status:'unavailable',scheduled:0};
 const available=()=>plugin&&['getStatus','replaceSchedule','clearSchedule'].every(key=>typeof plugin[key]==='function');
 async function clear(){await plugin.clearSchedule();signature='';}
 function refresh(){
  const own=++sequence;
  const task=tail.then(async()=>{
   if(own!==sequence)return latest;
   if(!available())return latest={status:'unavailable',scheduled:0};
   let replacing=false;
   try{
    const status=await plugin.getStatus();
    if(own!==sequence)return latest;
    const preferences=getPreferences(status),context=getContext();
    if(preferences?.enabled!==true){await clear();return latest={status:'disabled',scheduled:0};}
    const plan=buildNativeReminderPlan(preferences,context,{now:now(),limit:256});
    if(!status.notifications||!status.exactAlarms){await clear();return latest={status:!status.notifications?'notification_permission':'alarm_permission',scheduled:0};}
    if(plan.events.some(event=>event.adhan)&&status.adhan!==true){await clear();return latest={status:'adhan_unavailable',scheduled:0};}
    const next=JSON.stringify(plan.events);
    // Even with identical inputs, restore a queue if Android cleared its state.
    if(signature===next&&status.pending===plan.events.length)return latest={status:plan.events.length?'connected':'no_future_events',scheduled:plan.events.length};
    replacing=true;const result=await plugin.replaceSchedule({events:plan.events});
    if(own!==sequence)return latest;
    const skipped=result.skippedExpired??0;
    if(!Number.isInteger(result.scheduled)||result.scheduled<0||!Number.isInteger(skipped)||skipped<0||result.scheduled+skipped!==plan.events.length||result.notifications===false||result.exactAlarms===false){signature='';return latest={status:'not_scheduled',scheduled:Number(result.scheduled)||0};}
    signature=skipped?'':next;return latest={status:result.scheduled?'connected':'no_future_events',scheduled:result.scheduled};
   }catch(error){
    signature='';let uncertain=false;
    if(replacing)try{await clear()}catch{uncertain=true;}
    return latest={status:'error',scheduled:null,uncertain,message:error?.message||'Не удалось подключить напоминания.'};
   }
  });
  tail=task.catch(()=>{});return task;
 }
 async function enable(){
  if(!available())return {status:'unavailable',scheduled:0};
  // Do not queue another permission prompt until the previous one finishes.
  if(enabling)return enabling;
  enabling=(async()=>{
   let status=await plugin.getStatus();
   if(!status.notifications){if(typeof plugin.requestNotificationPermission!=='function')return {status:'notification_permission',scheduled:0};status=await plugin.requestNotificationPermission();}
   if(!status.notifications)return refresh();
   if(!status.exactAlarms){if(typeof plugin.requestExactAlarmPermission!=='function')return {status:'alarm_permission',scheduled:0};status=await plugin.requestExactAlarmPermission();}
   if(!status.exactAlarms)return refresh();
   return refresh();
  })();
  try{return await enabling}finally{enabling=null;}
 }
 let enabling=null;
 return {refresh,enable,status:()=>({...latest})};
}
