// Short excerpts; the hadith wording below is a Russian rendering of its meaning.
import{DAILY_REMINDER_MESSAGES}from './daily-reminder-messages.js';
export const DHIKR_MESSAGES=DAILY_REMINDER_MESSAGES;
export const DHIKR_ACTIVITY_KEY='salah:dhikr-last-use-v1';
const DHIKR_DAY=86400000;
export function dhikrTimestamp(value){return Number.isSafeInteger(value)&&value>0&&value<4102444800000?value:0;}
export function normalizeDhikrReminder(value){return {enabled:value?.enabled===true,days:1,time:'12:00',mode:'prayer',prayer:'Dhuhr',since:dhikrTimestamp(value?.since)};}
export function dhikrAllowedAt(at,zone){
 try{const parts=new Intl.DateTimeFormat('en',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(at));const hour=Number(parts.find(p=>p.type==='hour')?.value);return hour>=8&&hour<22;}catch{return false;}
}
export function readDhikrActivity(storage=globalThis.localStorage){try{return dhikrTimestamp(Number(storage.getItem(DHIKR_ACTIVITY_KEY)));}catch{return 0;}}
export function markDhikrActivity(now=Date.now(),storage=globalThis.localStorage,target=globalThis.window){
 if(!dhikrTimestamp(now))return false;
 try{storage.setItem(DHIKR_ACTIVITY_KEY,String(Math.max(now,readDhikrActivity(storage))));target?.dispatchEvent(new Event('salah:dhikr-activity'));return true;}catch{return false;}
}
// Daily calendar scheduling is independent of activity inside or outside SALAH.
// Keep the lastUse argument for older callers; it never postpones a daily reminder.
export function dhikrEventForDay(value,lastUse,day,zone,{localTimestamp,shiftDay,cityDay,timingsFor=()=>null}){
 const row=normalizeDhikrReminder(value),baseline=row.since;
 if(!row.enabled||!baseline||!shiftDay(day,0)||!DHIKR_MESSAGES.length)return null;
 try{cityDay(baseline,zone);}catch{return null;}
 // Use the selected timetable's Dhuhr; unavailable or out-of-window times fall back to noon.
 const timeFor=date=>{let raw;try{raw=timingsFor(date)?.Dhuhr;}catch{}const prayer=typeof raw==='number'?raw:typeof raw==='string'?Date.parse(raw):NaN;
  try{if(Number.isFinite(prayer)&&cityDay(prayer,zone)===date&&dhikrAllowedAt(prayer,zone))return prayer;}catch{}
  return localTimestamp(date,row.time,zone);};
 const at=timeFor(day);
 if(!Number.isFinite(at)||at<baseline||!dhikrAllowedAt(at,zone))return null;
 const calendarIndex=Math.floor(Date.parse(day+'T00:00:00Z')/DHIKR_DAY);
 const slot=((calendarIndex%DHIKR_MESSAGES.length)+DHIKR_MESSAGES.length)%DHIKR_MESSAGES.length;
 return {id:JSON.stringify(['dhikr',day,at]),day,kind:'dhikr',key:'return',phase:'at',at,timeZone:zone,adhan:false,message:DHIKR_MESSAGES[slot].text};
}
