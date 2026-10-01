import {settings,read,write} from './storage.js';
import {firstAsrValid,parseFirstAsrCalendar,mergeFirstAsr,firstAsrSourceUrl} from './asr-first.js';
export function usesAlHakk(){return /^(Тюмень|Tyumen)$/i.test(settings.city?.name||'')&&Math.abs(Number(settings.city?.latitude)-57.1522)<0.2&&Math.abs(Number(settings.city?.longitude)-65.5272)<0.3}
export function isTyumenTable(data){return data?.source==='al-hakk'||data?.source==='tyumen-table'}
export function tyumenSource(day,days={}){return days[day]?.source==='tyumen-table'||day?.startsWith('2026-10-')?{label:'Тюмень · октябрь 2026',url:'./assets/tyumen-october-2026.png'}:{label:'Аль-Хакк · Тюмень',url:'https://al-hakk.ru/namaz/'}}
export const prayers=[['Fajr','Фаджр'],['Dhuhr','Зухр'],['Asr','Аср'],['Maghrib','Магриб'],['Isha','Иша']];
export const methods={3:'Muslim World League',4:'Umm al-Qura',5:'Egyptian General Authority',1:'Karachi',2:'ISNA',13:'Diyanet'};
export function dateKey(date=new Date(),zone=settings.city?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
export function addDays(day,amount){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10)}
export function cacheKey(){return JSON.stringify([usesAlHakk()?'tyumen-table-v2':'calculated',settings.city?.latitude,settings.city?.longitude,settings.method,settings.school,settings.highLatitude])}
export function cachedDays(){return read('prayer-cache:'+cacheKey(),{})}
let inflight=new Map();
export async function loadMonth(day,force=false){if(!settings.city)return {};if(usesAlHakk())return loadTyumenDays(day,force,cacheKey());const month=day.slice(0,7),key=cacheKey(),requestKey=key+month;let cache=cachedDays();if(!force&&cache[day]&&cache[month+'-01'])return cache;if(inflight.has(requestKey))return inflight.get(requestKey);const promise=(async()=>{const params=new URLSearchParams({latitude:settings.city.latitude,longitude:settings.city.longitude,method:settings.method,school:settings.school,latitudeAdjustmentMethod:settings.highLatitude,iso8601:'true'});const response=await fetch('https://api.aladhan.com/v1/calendar/'+day.slice(0,4)+'/'+Number(day.slice(5,7))+'?'+params,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Расписание временно недоступно');const json=await response.json();if(json.code!==200||!Array.isArray(json.data))throw Error('Некорректный ответ расписания');let fetched={};for(const row of json.data){const d=row.date.gregorian.date.split('-').reverse().join('-');if(prayers.every(([p])=>Number.isFinite(Date.parse(row.timings[p])))){fetched[d]={timings:row.timings,timezone:row.meta.timezone,hijri:row.date.hijri,method:row.meta.method.name,loadedAt:Date.now()}}}if(!fetched[day])throw Error('Нет проверенных времён на эту дату');const merged={...read('prayer-cache:'+key,{}),...fetched};write('prayer-cache:'+key,merged);return merged;})();inflight.set(requestKey,promise);try{return await promise}finally{inflight.delete(requestKey)}}
export function timingsFor(day,days){const data=days[day];if(!data)return null;let times={};for(const p of ['Sunrise',...prayers.map(p=>p[0])]){let stamp=Date.parse(data.timings[p]);if(isTyumenTable(data)&&p==='Asr'&&Number(settings.school)===0){stamp=firstAsrValid(day,data,data.asrFirst)?Date.parse(data.asrFirst):null}if(!isTyumenTable(data)&&settings.mosque&&p!=='Sunrise'){const input=settings.mosqueTimes[p];if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input||''))return null;const iso=data.timings[p];stamp=Date.parse(day+'T'+input+':00'+iso.slice(-6))}if(!isTyumenTable(data)&&p!=='Sunrise')stamp+=Number(settings.offsets[p]||0)*60000;times[p]=stamp}return times}
export function nextPrayer(now,day,days){let entries=[];for(const d of [day,addDays(day,1)]){const t=timingsFor(d,days);if(t&&t.Asr===null&&now>=t.Dhuhr&&now<t.Maghrib)return null;if(t)for(const [key,name]of prayers)if(Number.isFinite(t[key]))entries.push({key,name,time:t[key],day:d})}return entries.sort((a,b)=>a.time-b.time).find(p=>p.time>now)||null}
export function formatTime(time,zone=settings.city?.timezone){if(!Number.isFinite(time))return '—';return new Intl.DateTimeFormat('ru-RU',{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(new Date(time))}
export function countdown(ms){let s=Math.max(0,Math.ceil(ms/1000));return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':')}
export function bearing(lat,lon){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return NaN;
 const r=Math.PI/180,p1=lat*r,p2=21.422487*r,d=(39.826206-lon)*r;
 const east=Math.sin(d)*Math.cos(p2),north=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(d);
 if(Math.hypot(east,north)<1e-12)return NaN;
 return (Math.atan2(east,north)/r+360)%360;
}

const FIRST_ASR_CACHE='tyumen-first-asr-v1';
async function loadTyumenDays(day,force,key){
  const school=Number(settings.school);
  const [response,monthlyResponse,bundled]=await Promise.all([
    fetch('./data/al-hakk-tyumen.json'),
    fetch('./data/tyumen-october-2026.json'),
    fetch('./data/tyumen-first-asr.json').then(r=>r.ok?r.json():{}).catch(()=>({}))
  ]);
  if(!response.ok||!monthlyResponse.ok)throw Error('Расписание Тюмени недоступно');
  const historical=await response.json(),monthly=await monthlyResponse.json();
  const local={days:{...historical.days,...monthly.days}};
  if(!local.days?.[day])throw Error('На эту дату расписание Тюмени ещё не подключено.');
  let supplement={...bundled.days,...read(FIRST_ASR_CACHE,{})};
  let result=mergeFirstAsr(local.days,supplement);
  if(school===0){
    const required=[day,addDays(day,1)].filter(d=>local.days[d]);
    const months=[...new Set(required.filter(d=>result[d].source!=='tyumen-table'&&(force||!firstAsrValid(d,result[d],result[d].asrFirst))).map(d=>d.slice(0,7)))];
    for(const month of months){
      try{
        const fetched=await fetchFirstAsrMonth(month);
        supplement={...supplement,...fetched};
        result=mergeFirstAsr(local.days,supplement);
      }catch{/* Keep saved times. A missing first Asr is reported separately in the UI. */}
    }
  }
  write(FIRST_ASR_CACHE,supplement);
  write('prayer-cache:'+key,result);
  return result;
}
async function fetchFirstAsrMonth(month){
  const requestKey='tyumen-first-asr:'+month;
  if(inflight.has(requestKey))return inflight.get(requestKey);
  const promise=(async()=>{
    const params=new URLSearchParams({latitude:57.1522,longitude:65.5272,method:3,school:0,latitudeAdjustmentMethod:3,iso8601:'true'});
    const response=await fetch('https://api.aladhan.com/v1/calendar/'+month.slice(0,4)+'/'+Number(month.slice(5,7))+'?'+params,{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Расчёт первого Асра временно недоступен');
    const fetched=parseFirstAsrCalendar(await response.json(),month);
    if(!Object.keys(fetched).length)throw Error('Нет проверенного расчёта первого Асра');
    return fetched;
  })();
  inflight.set(requestKey,promise);
  try{return await promise}finally{inflight.delete(requestKey)}
}
export function asrInfo(day,days){
  const data=days[day];
  if(!isTyumenTable(data))return null;
  if(data.source==='tyumen-table')return {kind:'published',label:Number(settings.school)===1?'Аср в мечетях · таблица Тюмени':'Первое время Асра · таблица Тюмени',sourceUrl:data.sourceUrl};
  if(Number(settings.school)===1)return {kind:'published',label:'Ханафитский · Аль-Хакк',sourceUrl:'https://al-hakk.ru/namaz/'};
  if(!firstAsrValid(day,data,data.asrFirst))return {kind:'missing',label:'Первое время Асра недоступно',sourceUrl:firstAsrSourceUrl};
  if(data.asrFirstKind==='calculated')return {kind:'calculated',label:'Первое время · расчёт Aladhan',sourceUrl:data.asrFirstSourceUrl||firstAsrSourceUrl};
  return {kind:'user',label:data.asrFirstSource||'Первое время · уточнено пользователем',sourceUrl:data.asrFirstSourceUrl||null};
}
