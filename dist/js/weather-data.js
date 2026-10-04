import{settings,read,write}from './storage.js';

const minute=60000;
export const WEATHER_REFRESH_INTERVAL=5*minute;
const cacheAge=WEATHER_REFRESH_INTERVAL,maxAge=120*minute,clockTolerance=5*minute;
const pending=new Map();
const codes={
 0:['Ясно','clear'],1:['Преимущественно ясно','clear'],2:['Переменная облачность','clouds'],3:['Пасмурно','overcast'],
 45:['Туман','fog'],48:['Изморозь и туман','fog'],
 51:['Небольшая морось','rain'],53:['Морось','rain'],55:['Сильная морось','rain'],
 56:['Замерзающая морось','rain'],57:['Сильная замерзающая морось','rain'],
 61:['Небольшой дождь','rain'],63:['Дождь','rain'],65:['Сильный дождь','rain'],
 66:['Ледяной дождь','rain'],67:['Сильный ледяной дождь','rain'],
 71:['Небольшой снег','snow'],73:['Снег','snow'],75:['Сильный снег','snow'],77:['Снежные зёрна','snow'],
 80:['Небольшой ливень','rain'],81:['Ливень','rain'],82:['Сильный ливень','rain'],
 85:['Снежный ливень','snow'],86:['Сильный снежный ливень','snow'],
 95:['Гроза','storm'],96:['Гроза с градом','storm'],97:['Сильная гроза','storm'],99:['Сильная гроза с градом','storm']
};
const bounded=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const clamp=value=>Math.max(0,Math.min(1,value));

export function weatherName(code){return codes[code]?.[0]||'Нет данных'}

function coordinates(city){
 const latitude=city?.latitude,longitude=city?.longitude;
 return bounded(latitude,-90,90)&&bounded(longitude,-180,180)?{latitude,longitude}:null;
}
export function weatherKey(city=settings.city){const point=coordinates(city);return point?'weather:'+JSON.stringify([point.latitude,point.longitude]):null}

function validWeather(value){
 return value&&typeof value==='object'&&
  bounded(value.temperature_2m,-150,100)&&bounded(value.apparent_temperature,-180,100)&&
  Number.isInteger(value.weather_code)&&bounded(value.weather_code,0,999)&&
  bounded(value.cloud_cover,0,100)&&bounded(value.precipitation,0,1000)&&bounded(value.wind_speed_10m,0,200)&&
  bounded(value.interval,1,3600)&&Number.isFinite(value.dataAt)&&Number.isFinite(value.fetchedAt);
}

// Data time is the model's current interval; fetching an old response does not make it fresh.
export function weatherFrame(weather,now=Date.now()){
 const unknown={kind:'unknown',clouds:0,precipitation:0,fresh:false};
 if(!Number.isFinite(now)||!validWeather(weather))return unknown;
 const dataAge=now-weather.dataAt,fetchedAge=now-weather.fetchedAt;
 if(dataAge < -clockTolerance||dataAge>=maxAge||fetchedAge < -clockTolerance||fetchedAge>=maxAge)return unknown;
 const kind=codes[weather.weather_code]?.[1]||'unknown';
 const wet=['rain','snow','storm'].includes(kind);
 // Current precipitation is a sum over interval seconds, not necessarily over one hour.
 const hourlyPrecipitation=weather.precipitation*3600/weather.interval;
 return {kind,clouds:clamp(weather.cloud_cover/100),precipitation:wet?Math.max(kind==='snow'?.28:.48,clamp(hourlyPrecipitation/8)):0,fresh:true};
}

export function cachedWeather(city=settings.city){
 const key=weatherKey(city);if(!key)return null;
 const value=read(key,null);
 if(!validWeather(value)||(value.locationKey&&value.locationKey!==key))return null;
 return {...value,locationKey:key};
}

function utcTimestamp(value){
 if(typeof value!=='string')return NaN;
 const bare=value.replace(/Z$/,'');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(bare))return NaN;
 const time=Date.parse(bare+'Z');
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,bare.length)===bare?time:NaN;
}

async function requestWeather(point,key){
 const query=new URLSearchParams({...point,current:'temperature_2m,apparent_temperature,weather_code,cloud_cover,precipitation,wind_speed_10m',timezone:'UTC',temperature_unit:'celsius',wind_speed_unit:'ms',precipitation_unit:'mm'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch('https://api.open-meteo.com/v1/forecast?'+query,{signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('Погода временно недоступна');
  const json=await response.json(),current=json?.current;
  if(!current||json.utc_offset_seconds!==0)throw Error('Нет данных погоды');
  const value={
   temperature_2m:current.temperature_2m,apparent_temperature:current.apparent_temperature,
   weather_code:current.weather_code,cloud_cover:current.cloud_cover,precipitation:current.precipitation,
   wind_speed_10m:current.wind_speed_10m,interval:current.interval,time:current.time,
   dataAt:utcTimestamp(current.time),fetchedAt:Date.now(),locationKey:key,source:'Open-Meteo',windUnit:'м/с'
  };
  const units=json.current_units;
  if(units&&(units.temperature_2m!=='°C'||units.apparent_temperature!=='°C'||units.cloud_cover!=='%'||units.precipitation!=='mm'||units.wind_speed_10m!=='m/s'))throw Error('Нет данных погоды');
  if(!validWeather(value)||!weatherFrame(value,value.fetchedAt).fresh)throw Error('Нет свежих данных погоды');
  write(key,value);
  return value;
 }finally{clearTimeout(timer)}
}

export async function loadWeather(city=settings.city,{force=false}={}){
 if(!settings.weather)return null;
 const point=coordinates(city),key=weatherKey(city);if(!point||!key)return null;
 const old=cachedWeather(city),now=Date.now();
 if(!force&&old&&now-old.fetchedAt>=0&&now-old.fetchedAt<cacheAge&&weatherFrame(old,now).fresh)return old;
 if(pending.has(key))return pending.get(key);
 const task=requestWeather(point,key);pending.set(key,task);
 try{return await task}finally{if(pending.get(key)===task)pending.delete(key)}
}