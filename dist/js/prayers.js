import {settings,read,write,storageProblem} from './storage.js';
import {normalizeTyumenSource,tyumenSourceFiles,matchesTyumenSource} from './tyumen-source.js';
import {firstAsrValid,parseFirstAsrCalendar,mergeFirstAsr,firstAsrSourceUrl} from './asr-first.js';
const tyumenCity=city=>/^(Тюмень|Tyumen)$/i.test(city?.name||'')&&Math.abs(Number(city?.latitude)-57.1522)<0.2&&Math.abs(Number(city?.longitude)-65.5272)<0.3;
export function usesAlHakk(){return tyumenCity(settings.city)}
export function isTyumenTable(data){return data?.source==='al-hakk'||data?.source==='tyumen-table'}
export function tyumenSource(day,days={}){const source=normalizeTyumenSource(settings.tyumenTimeSource),row=days[day];if(source==='calendar'||source==='auto'&&(row?.source==='tyumen-table'||day?.startsWith('2026-10-'))){const month=/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(day||'')?new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z')).replace(/ г\.$/,''):'';return {label:'Календарь Тюмени'+(month?' · '+month:'')+(row?.sourceYear&&String(row.sourceYear)!==day?.slice(0,4)?' · таблица '+row.sourceYear:''),url:row?.sourceUrl||(day?.startsWith('2026-10-')?'./assets/tyumen-october-2026.png':null)}}return {label:'Аль-Хакк · Тюмень',url:'https://al-hakk.ru/namaz/'}}
export const prayers=[['Fajr','Фаджр'],['Dhuhr','Зухр'],['Asr','Аср'],['Maghrib','Магриб'],['Isha','Иша']];
export const methods={3:'Muslim World League',4:'Umm al-Qura',5:'Egyptian General Authority',1:'Karachi',2:'ISNA',13:'Diyanet'};
export function dateKey(date=new Date(),zone=settings.city?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
export function addDays(day,amount){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10)}
export function prayerContext(school=settings.school){
 const city=settings.city?Object.freeze({...settings.city}):null,source=normalizeTyumenSource(settings.tyumenTimeSource),tyumen=tyumenCity(city);
 const key=JSON.stringify([tyumen?'tyumen-table-v3:'+source:'calculated',city?.latitude,city?.longitude,settings.method,Number(school),settings.highLatitude]);
 return Object.freeze({city,source,tyumen,method:settings.method,school:Number(school),highLatitude:settings.highLatitude,key});
}
export function cacheKey(school=settings.school){return prayerContext(school).key}
const prayerZones=new Map();
function canonicalPrayerZone(zone){
 if(typeof zone!=='string'||zone.length>80)return null;if(prayerZones.has(zone))return prayerZones.get(zone);
 let value=null;try{value=new Intl.DateTimeFormat('en',{timeZone:zone}).resolvedOptions().timeZone}catch{}
 if(prayerZones.size>=64)prayerZones.delete(prayerZones.keys().next().value);prayerZones.set(zone,value);return value;
}
const prayerDayKey=day=>typeof day==='string'&&/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T12:00:00Z'))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;
const prayerIsoFor=(day,value)=>typeof value==='string'&&value.startsWith(day+'T')&&/(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
export function savedPrayerDay(context,day,row,{complete=true}={}){
 if(!context?.city||!prayerDayKey(day)||!row||!row.timings||!['Sunrise',...prayers.map(([key])=>key)].every(key=>prayerIsoFor(day,row.timings[key])))return false;
 const zone=canonicalPrayerZone(context.city.timezone);if(!zone||canonicalPrayerZone(row.timezone)!==zone)return false;
 if(context.tyumen){if(!isTyumenTable(row)||!matchesTyumenSource(context.source,row))return false;if(complete&&context.school===0&&!firstAsrValid(day,row,row.asrFirst))return false;}
 else if(isTyumenTable(row))return false;
 return true;
}
export function cachedPrayerDays(context=prayerContext()){
 const rows=read('prayer-cache:'+context.key,{});
 return Object.fromEntries(Object.entries(rows).filter(([day,row])=>savedPrayerDay(context,day,row,{complete:false})));
}
export function cachedDays(){return cachedPrayerDays()}
export function removeCachedPrayerDays(context=prayerContext()){
 try{localStorage.removeItem('salah:prayer-cache:'+context.key);return true}
 catch{storageProblem('Не удалось удалить сохранённое расписание. Проверьте доступ к хранилищу.');return false}
}
export function prayerMonthComplete(context,month,rows=cachedPrayerDays(context)){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||''))return false;
 const count=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
 return Array.from({length:count},(_,i)=>month+'-'+String(i+1).padStart(2,'0')).every(day=>savedPrayerDay(context,day,rows[day]));
}
let inflight=new Map();
async function prayerJson(url,{signal,timeout=20000}={}){
 const controller=new AbortController(),abort=()=>controller.abort(signal?.reason),timer=setTimeout(()=>controller.abort(),timeout);
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('Расписание временно недоступно');return await response.json();}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
export function loadMonth(day,force=false,school=settings.school){return loadPrayerMonth(prayerContext(school),day,{force})}
export async function loadPrayerMonth(context,day,{force=false,signal,prefetchMonths=null}={}){
 if(!context?.city)return{};if(!prayerDayKey(day))throw Error('Некорректная дата расписания');
 if(context.tyumen)return loadTyumenDays(context,day,{force,signal,prefetchMonths});
 const month=day.slice(0,7),key=context.key,requestKey=key+':'+context.city.timezone+':'+month+(signal?':offline-save':''),cache=cachedPrayerDays(context);
 if(!force&&prayerMonthComplete(context,month,cache))return cache;
 if(inflight.has(requestKey))return inflight.get(requestKey);
 const promise=(async()=>{
  try{
   const params=new URLSearchParams({latitude:context.city.latitude,longitude:context.city.longitude,method:context.method,school:context.school,latitudeAdjustmentMethod:context.highLatitude,iso8601:'true'});
   const json=await prayerJson('https://api.aladhan.com/v1/calendar/'+month.slice(0,4)+'/'+Number(month.slice(5,7))+'?'+params,{signal});
   if(json.code!==200||!Array.isArray(json.data)||json.data.length>31)throw Error('Некорректный ответ расписания');
   const fetched={};
   for(const row of json.data){
    const date=row?.date?.gregorian?.date,actual=typeof date==='string'?date.split('-').reverse().join('-'):'';
    if(!prayerDayKey(actual)||!actual.startsWith(month+'-')||!row.timings||!['Sunrise',...prayers.map(([p])=>p)].every(p=>prayerIsoFor(actual,row.timings[p]))||!canonicalPrayerZone(row.meta?.timezone))continue;
    const candidate={timings:row.timings,timezone:row.meta.timezone,hijri:row.date.hijri,method:row.meta.method?.name||methods[context.method],loadedAt:Date.now()};
    if(savedPrayerDay(context,actual,candidate))fetched[actual]=candidate;
   }
   if(!fetched[day])throw Error('Нет проверенных времён на эту дату');
   if(signal?.aborted)throw signal.reason||Error('cancelled');
   const merged={...cachedPrayerDays(context),...fetched};write('prayer-cache:'+key,merged);return merged;
  }catch(error){if(cache[day]&&!signal?.aborted)return cache;throw error}
 })();
 inflight.set(requestKey,promise);try{return await promise}finally{inflight.delete(requestKey)}
}
export function timingsFor(day,days,school=settings.school){const data=days[day];if(!data||usesAlHakk()&&!matchesTyumenSource(settings.tyumenTimeSource,data))return null;let times={};for(const p of ['Sunrise',...prayers.map(p=>p[0])]){let stamp=Date.parse(data.timings[p]);if(isTyumenTable(data)&&p==='Asr'&&Number(school)===0){stamp=firstAsrValid(day,data,data.asrFirst)?Date.parse(data.asrFirst):null}if(!isTyumenTable(data)&&settings.mosque&&p!=='Sunrise'){const input=settings.mosqueTimes[p];if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input||''))return null;const iso=data.timings[p];stamp=Date.parse(day+'T'+input+':00'+iso.slice(-6))}if(p!=='Sunrise'&&Number.isFinite(stamp))stamp+=Number((isTyumenTable(data)?settings.tableOffsets:settings.offsets)?.[p]||0)*60000;times[p]=stamp}return times}
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
async function loadTyumenDays(context,day,{force=false,signal,prefetchMonths=null}={}){
 const {source,key,school}=context,cache=cachedPrayerDays(context);
 if(!force&&savedPrayerDay(context,day,cache[day]))return cache;
 try{
  const [tables,bundled]=await Promise.all([
   Promise.all(tyumenSourceFiles(source).map(file=>prayerJson('./data/'+file,{signal}))),
   prayerJson('./data/tyumen-first-asr.json',{signal}).catch(()=>({}))
  ]);
  const published=Object.assign({},...tables.map(table=>table.days||{}));
  const local={days:{...cache,...Object.fromEntries(Object.entries(published).filter(([date,row])=>savedPrayerDay(context,date,row,{complete:false})))}};
  if(!local.days[day])throw Error(source==='calendar'?'В календаре Тюмени нет данных на эту дату.':source==='al-hakk'?'В расписании «Аль-Хакк» нет данных на эту дату.':'На эту дату расписание Тюмени ещё не подключено.');
  let supplement={...bundled.days,...read(FIRST_ASR_CACHE,{})},result=mergeFirstAsr(local.days,supplement);
  if(school===0){
   const monthsRequested=Array.isArray(prefetchMonths)&&prefetchMonths.length<=12&&prefetchMonths.every(month=>/^\d{4}-(0[1-9]|1[0-2])$/.test(month))?prefetchMonths:null;
   const required=monthsRequested?Object.keys(local.days).filter(date=>monthsRequested.includes(date.slice(0,7))):[day,addDays(day,1)].filter(date=>local.days[date]);
   const months=[...new Set(required.filter(date=>result[date].source!=='tyumen-table'&&(force||!firstAsrValid(date,result[date],result[date].asrFirst))).map(date=>date.slice(0,7)))];
   for(const month of months){
    try{const fetched=await fetchFirstAsrMonth(month,{signal});supplement={...supplement,...fetched};result=mergeFirstAsr(local.days,supplement);}
    catch{/* Keep saved times. A missing first Asr is reported separately in the UI. */}
   }
  }
  if(signal?.aborted)throw signal.reason||Error('cancelled');
  write(FIRST_ASR_CACHE,supplement);write('prayer-cache:'+key,result);return result;
 }catch(error){if(cache[day]&&!signal?.aborted)return cache;throw error}
}
async function fetchFirstAsrMonth(month,{signal}={}){
  const requestKey='tyumen-first-asr:'+month+(signal?':offline-save':'');
  if(inflight.has(requestKey))return inflight.get(requestKey);
  const promise=(async()=>{
    const params=new URLSearchParams({latitude:57.1522,longitude:65.5272,method:3,school:0,latitudeAdjustmentMethod:3,iso8601:'true'});
    const json=await prayerJson('https://api.aladhan.com/v1/calendar/'+month.slice(0,4)+'/'+Number(month.slice(5,7))+'?'+params,{signal,timeout:15000});
    const fetched=parseFirstAsrCalendar(json,month);
    if(!Object.keys(fetched).length)throw Error('Нет проверенного расчёта первого Асра');
    return fetched;
  })();
  inflight.set(requestKey,promise);
  try{return await promise}finally{inflight.delete(requestKey)}
}
export function asrInfo(day,days){
  const data=days[day];
  if(!isTyumenTable(data)||!matchesTyumenSource(settings.tyumenTimeSource,data))return null;
  if(data.source==='tyumen-table')return {kind:'published',label:Number(settings.school)===1?'Аср в мечетях · таблица Тюмени':'Первое время Асра · таблица Тюмени',sourceUrl:data.sourceUrl};
  if(Number(settings.school)===1)return {kind:'published',label:'Ханафитский · Аль-Хакк',sourceUrl:'https://al-hakk.ru/namaz/'};
  if(!firstAsrValid(day,data,data.asrFirst))return {kind:'missing',label:'Первое время Асра недоступно',sourceUrl:firstAsrSourceUrl};
  if(data.asrFirstKind==='calculated')return {kind:'calculated',label:'Первое время · расчёт Aladhan',sourceUrl:data.asrFirstSourceUrl||firstAsrSourceUrl};
  return {kind:'user',label:data.asrFirstSource||'Первое время · уточнено пользователем',sourceUrl:data.asrFirstSourceUrl||null};
}
