import {buildReminderEvents,localTimestamp,normalizeReminders,shiftDay} from './reminder-events.js';

// Pure planning only: this module never requests permissions, writes storage,
// installs alarms or claims that native delivery is connected.
export function buildNativeReminderPlan(preferences,context,{now=Date.now(),days=7,limit=64}={}){
 const empty={events:[],nextUnscheduledAt:null};
 const settings=normalizeReminders(preferences);
 if(!settings.enabled||!Number.isFinite(now)||!context?.cityKey||typeof context.timingsFor!=='function'||!shiftDay(context.today,0))return empty;
 if(!Number.isInteger(days)||days<1||days>14||!Number.isInteger(limit)||limit<1||limit>512)return empty;
 try{
  const cityToday=new Intl.DateTimeFormat('en-CA',{timeZone:context.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  if(cityToday!==context.today)return empty;
 }catch{return empty;}
 const end=localTimestamp(shiftDay(context.today,days),'00:00',context.timeZone);
 if(!Number.isFinite(end)||end<=now)return empty;
 const unique=new Map();
 for(let offset=0;offset<days;offset++){
  const today=shiftDay(context.today,offset);
  const events=buildReminderEvents(settings,{...context,today,tomorrow:shiftDay(today,1)});
  for(const event of events){
   if(typeof event.id!=='string'||event.id.length>1024||!Number.isFinite(event.at)||event.at<=now||event.at>=end)continue;
   unique.set(event.id,{id:event.id,at:event.at,kind:event.kind,key:event.key,title:'SALAH',message:event.message,adhan:event.kind==='prayer'&&event.phase==='at'&&event.adhan===true,voice:settings.voice});
  }
 }
 const ordered=[...unique.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 return {events:ordered.slice(0,limit),nextUnscheduledAt:ordered[limit]?.at??null};
}
