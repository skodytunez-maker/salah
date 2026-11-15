import{t}from './i18n.js';
import{uiError}from './ui.js';
import{settings,read,write}from './storage.js';

const minute=60000;
export const WEATHER_REFRESH_INTERVAL=5*minute;
const cacheAge=WEATHER_REFRESH_INTERVAL,maxAge=120*minute,clockTolerance=5*minute;
const pending=new Map();
const codes={
 0:['weatherUi.clear','clear'],1:['weatherUi.mainlyClear','clear'],2:['weatherUi.partlyCloudy','clouds'],3:['weatherUi.overcast','overcast'],
 45:['weatherUi.fog','fog'],48:['weatherUi.rimeFog','fog'],
 51:['weatherUi.lightDrizzle','rain'],53:['weatherUi.drizzle','rain'],55:['weatherUi.heavyDrizzle','rain'],
 56:['weatherUi.freezingDrizzle','rain'],57:['weatherUi.heavyFreezingDrizzle','rain'],
 61:['weatherUi.lightRain','rain'],63:['weatherUi.rain','rain'],65:['weatherUi.heavyRain','rain'],
 66:['weatherUi.freezingRain','rain'],67:['weatherUi.heavyFreezingRain','rain'],
 71:['weatherUi.lightSnow','snow'],73:['weatherUi.snow','snow'],75:['weatherUi.heavySnow','snow'],77:['weatherUi.snowGrains','snow'],
 80:['weatherUi.lightShowers','rain'],81:['weatherUi.showers','rain'],82:['weatherUi.heavyShowers','rain'],
 85:['weatherUi.snowShowers','snow'],86:['weatherUi.heavySnowShowers','snow'],
 95:['weatherUi.thunderstorm','storm'],96:['weatherUi.thunderHail','storm'],97:['weatherUi.heavyThunderstorm','storm'],99:['weatherUi.heavyThunderHail','storm']
};
const bounded=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const clamp=value=>Math.max(0,Math.min(1,value));

export function weatherName(code){return t(codes[code]?.[0]||'weatherUi.noData')}

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
  if(!response.ok)throw uiError('weatherUi.providerUnavailable');
  const json=await response.json(),current=json?.current;
  if(!current||json.utc_offset_seconds!==0)throw uiError('weatherUi.providerNoData');
  const value={
   temperature_2m:current.temperature_2m,apparent_temperature:current.apparent_temperature,
   weather_code:current.weather_code,cloud_cover:current.cloud_cover,precipitation:current.precipitation,
   wind_speed_10m:current.wind_speed_10m,interval:current.interval,time:current.time,
   dataAt:utcTimestamp(current.time),fetchedAt:Date.now(),locationKey:key,source:'Open-Meteo',windUnit:'м/с'
  };
  const units=json.current_units;
  if(units&&(units.temperature_2m!=='°C'||units.apparent_temperature!=='°C'||units.cloud_cover!=='%'||units.precipitation!=='mm'||units.wind_speed_10m!=='m/s'))throw uiError('weatherUi.providerNoData');
  if(!validWeather(value)||!weatherFrame(value,value.fetchedAt).fresh)throw uiError('weatherUi.providerNoFresh');
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