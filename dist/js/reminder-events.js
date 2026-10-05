import {normalizeDhikrReminder,dhikrEventForDay} from './dhikr-reminder.js';
import {lastThirdNight} from './tahajjud.js';
// Reminder scheduling is independent of the next-prayer display and browser APIs.
export const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export const BEFORE_MINUTES = [0, 5, 10, 15, 30];
export const PRAYER_NAMES = {Fajr:'Фаджр',Dhuhr:'Зухр',Asr:'Аср',Maghrib:'Магриб',Isha:'Иша'};
const PRAYER_GENITIVE = {Fajr:'Фаджра',Dhuhr:'Зухра',Asr:'Асра',Maghrib:'Магриба',Isha:'Иша'};
const DAY = 86400000;

export const reminderDefaults = {
  enabled:false, voice:'mansour', browserNotifications:false,
  prayers:Object.fromEntries(PRAYER_KEYS.map(key=>[key,{atTime:true,beforeMinutes:0,adhan:false}])),
  adhkar:{morning:{enabled:false,mode:'prayer',time:'07:00'},evening:{enabled:false,mode:'prayer',time:'18:00'}},
  jumuah:{enabled:false,time:'09:00'},
  tahajjud:{enabled:false},dhikr:normalizeDhikrReminder(null)
};

export function validLocalTime(value){return typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);}

export function normalizeReminders(value){
  const saved=value&&typeof value==='object'?value:{};
  const prayers=Object.fromEntries(PRAYER_KEYS.map(key=>{
    const row=saved.prayers?.[key]||{};
    const atTime=row.atTime===undefined?true:row.atTime===true;
    const before=typeof row.beforeMinutes==='number'||typeof row.beforeMinutes==='string'?Number(row.beforeMinutes):0;
    return [key,{atTime,beforeMinutes:BEFORE_MINUTES.includes(before)?before:0,adhan:atTime&&row.adhan===true}];
  }));
  const adhkar=Object.fromEntries(['morning','evening'].map(key=>{
    const row=saved.adhkar?.[key]||{};
    const mode=row.mode==='prayer'?'prayer':row.mode==='time'||validLocalTime(row.time)?'time':'prayer';
    return [key,{enabled:row.enabled===true,mode,time:validLocalTime(row.time)?row.time:reminderDefaults.adhkar[key].time}];
  }));
  return {enabled:saved.enabled===true,voice:saved.voice==='mishary'?'mishary':'mansour',browserNotifications:saved.browserNotifications===true,prayers,adhkar,jumuah:{enabled:saved.jumuah?.enabled===true,time:'09:00'},tahajjud:{enabled:saved.tahajjud?.enabled===true},dhikr:normalizeDhikrReminder(saved.dhikr)};
}

export function shiftDay(day,amount){
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;
  const time=Date.parse(day+'T12:00:00Z');
  if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==day)return null;
  return new Date(time+amount*DAY).toISOString().slice(0,10);
}

function partsAt(time,zone){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(time));
  return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
}

// Resolve a wall-clock HH:mm in the selected city's zone; a skipped DST minute
// stays unavailable rather than being silently moved to another hour.
export function localTimestamp(day,time,zone){
  if(!shiftDay(day,0)||!validLocalTime(time)||typeof zone!=='string'||!zone)return NaN;
  const [year,month,date]=day.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
  const target=Date.UTC(year,month-1,date,hour,minute,0);
  let result=target;
  try{
    for(let attempt=0;attempt<4;attempt++){
      const p=partsAt(result,zone);
      const represented=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute),Number(p.second));
      const correction=target-represented;
      result+=correction;
      if(correction===0)break;
    }
    const p=partsAt(result,zone);
    return p.year+'-'+p.month+'-'+p.day===day&&p.hour+':'+p.minute===time?result:NaN;
  }catch{return NaN;}
}

function timestamp(value){
  if(typeof value==='number')return Number.isFinite(value)?value:NaN;
  if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value))return Date.parse(value);
  return NaN;
}

export function buildReminderEvents(value,context){
  const settings=normalizeReminders(value);
  if(!settings.enabled||!context?.cityKey||!shiftDay(context.today,0)||typeof context.timingsFor!=='function')return [];
  const dates=[shiftDay(context.today,-1),context.today,context.tomorrow||shiftDay(context.today,1)];
  const events=[];
  for(const day of new Set(dates.filter(Boolean))){
    let times;
    try{times=context.timingsFor(day)||{};}catch{times={};}
    for(const key of PRAYER_KEYS){
      const prayerAt=timestamp(times[key]);
      if(!Number.isFinite(prayerAt))continue;
      const row=settings.prayers[key];
      const phases=[];
      if(row.beforeMinutes>0)phases.push({phase:'before:'+row.beforeMinutes,at:prayerAt-row.beforeMinutes*60000,message:'До '+PRAYER_GENITIVE[key]+' осталось '+row.beforeMinutes+' минут',adhan:false});
      if(row.atTime)phases.push({phase:'at',at:prayerAt,message:'Наступило время '+PRAYER_GENITIVE[key],adhan:row.adhan});
      for(const phase of phases)events.push({...phase,id:JSON.stringify([String(context.cityKey),day,'prayer',key,prayerAt,phase.phase]),day,kind:'prayer',key,prayerAt});
    }
    for(const key of ['morning','evening']){
      const row=settings.adhkar[key];
      if(!row.enabled)continue;
      const at=row.mode==='prayer'?timestamp(times[key==='morning'?'Fajr':'Maghrib']):localTimestamp(day,row.time,context.timeZone);
      if(!Number.isFinite(at))continue;
      events.push({id:JSON.stringify([String(context.cityKey),day,'adhkar',key,at,'at']),day,kind:'adhkar',key,phase:'at',at,adhan:false,message:key==='morning'?'Время утренних азкаров':'Время вечерних азкаров'});
    }
    // Anchor to the night ending with this day's Fajr, even across a month or DST boundary.
    if(settings.tahajjud.enabled){
      let previous;try{previous=context.timingsFor(shiftDay(day,-1))||{};}catch{previous={};}
      const at=lastThirdNight(timestamp(previous.Maghrib),timestamp(times.Fajr));
      if(Number.isFinite(at))events.push({id:JSON.stringify([String(context.cityKey),day,'tahajjud',at,'at']),day,kind:'tahajjud',key:'tahajjud',phase:'at',at,adhan:false,message:'Тахаджуд: началась последняя треть ночи'});
    }
    // The city's calendar day determines Friday; prayer data is not required.
    if(settings.jumuah.enabled&&new Date(day+'T12:00:00Z').getUTCDay()===5){
      const at=localTimestamp(day,settings.jumuah.time,context.timeZone);
      if(Number.isFinite(at))events.push({id:JSON.stringify([String(context.cityKey),day,'jumuah',at,'at']),day,kind:'jumuah',key:'jumuah',phase:'at',at,adhan:false,message:'Сегодня Джума'});
    }
  }
  for(const day of new Set(dates.filter(Boolean))){
    const event=dhikrEventForDay(settings.dhikr,context.dhikrLastAt,day,context.timeZone,{localTimestamp,shiftDay,timingsFor:context.timingsFor,cityDay:(at,zone)=>{const p=partsAt(at,zone);return p.year+'-'+p.month+'-'+p.day;}});
    if(event)events.push(event);
  }
  return events.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
}

export function createReminderTracker({read=()=>({}),write=()=>{},maxGap=65000,freshness=60000,retention=7*DAY}={}){
  let previous=null,remembered={};
  function mergeSeen(){
    try{
      const raw=read(),events=raw?.events||{};
      if(events&&typeof events==='object')for(const [id,at]of Object.entries(events))if(typeof at==='number'&&Number.isFinite(at))remembered[id]=at;
    }catch{}
  }
  mergeSeen();
  function reset(){previous=null;}
  function tick(now,events){
    if(!Number.isFinite(now))return [];
    const before=previous;previous=now;
    if(before===null||now<before||now-before>maxGap)return [];
    mergeSeen();
    const due=[];
    for(const event of events||[]){
      if(typeof event?.id!=='string'||!Number.isFinite(event.at)||event.at<=before||event.at>now||now-event.at>freshness||Object.hasOwn(remembered,event.id))continue;
      remembered[event.id]=event.at;due.push(event);
    }
    if(due.length){
      remembered=Object.fromEntries(Object.entries(remembered).filter(([,at])=>at>=now-retention));
      try{write({version:1,events:{...remembered}});}catch{}
    }
    return due;
  }
  return {tick,reset};
}
