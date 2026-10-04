const PRAYER_KEYS=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const MAX_DAYS=14;

function validCity(city){
  if(!city||typeof city!=='object')return false;
  if(typeof city.name!=='string'||!city.name.trim()||city.name.length>100)return false;
  if(typeof city.timezone!=='string'||!city.timezone.trim()||city.timezone.length>80)return false;
  try{new Intl.DateTimeFormat('en',{timeZone:city.timezone}).format(0)}catch{return false}
  return true;
}
function validDayKey(day){return typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)}
function addDay(day,amount){const date=new Date(day+'T12:00:00Z');if(!Number.isFinite(+date))return null;date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10)}
function safeHijri(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const result={};
  if(typeof value.day==='string'&&value.day.length<=4)result.day=value.day;
  if(typeof value.year==='string'&&value.year.length<=6)result.year=value.year;
  if(value.month&&typeof value.month==='object'){
    const month={};
    if(Number.isInteger(value.month.number)&&value.month.number>=1&&value.month.number<=12)month.number=value.month.number;
    if(typeof value.month.en==='string'&&value.month.en.length<=40)month.en=value.month.en;
    if(typeof value.month.ar==='string'&&value.month.ar.length<=80)month.ar=value.month.ar;
    if(Object.keys(month).length)result.month=month;
  }
  return Object.keys(result).length?result:null;
}

export function buildPrayerWidgetSnapshot({city,method,school,startDay,days,timingsFor,generatedAt=Date.now(),maxDays=7}={}){
  if(!validCity(city)||!validDayKey(startDay)||!days||typeof days!=='object'||typeof timingsFor!=='function')return null;
  const limit=Math.max(1,Math.min(MAX_DAYS,Number.isInteger(maxDays)?maxDays:7));
  const entries=[];
  for(let offset=0;offset<limit;offset++){
    const date=addDay(startDay,offset);
    if(!date)break;
    const source=days[date],times=timingsFor(date,days);
    if(!source||!times||!PRAYER_KEYS.every(key=>Number.isFinite(times[key])))continue;
    entries.push({
      date,
      hijri:safeHijri(source.hijri),
      prayers:{
        Fajr:times.Fajr,
        Sunrise:Number.isFinite(times.Sunrise)?times.Sunrise:null,
        Dhuhr:times.Dhuhr,
        Asr:times.Asr,
        Maghrib:times.Maghrib,
        Isha:times.Isha
      }
    });
  }
  if(!entries.length)return null;
  const stamp=new Date(generatedAt);
  if(!Number.isFinite(+stamp))return null;
  return {
    schemaVersion:1,
    generatedAt:stamp.toISOString(),
    timezone:city.timezone,
    cityName:city.name.trim(),
    calculation:{method,school},
    days:entries
  };
}

let lastSerialized='';
export async function syncNativePrayerWidget(input,{cap=globalThis.Capacitor}={}){
  const snapshot=buildPrayerWidgetSnapshot(input);
  const plugin=cap?.Plugins?.SalahWidget;
  if(!plugin||typeof plugin.updateSnapshot!=='function')return {status:'unavailable',snapshot};
  if(!snapshot){
    if(typeof plugin.clearSnapshot==='function')await plugin.clearSnapshot();
    lastSerialized='';
    return {status:'cleared',snapshot:null};
  }
  const serialized=JSON.stringify(snapshot);
  if(serialized===lastSerialized)return {status:'unchanged',snapshot};
  await plugin.updateSnapshot({snapshot});
  lastSerialized=serialized;
  return {status:'updated',snapshot};
}
