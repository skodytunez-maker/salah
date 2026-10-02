// Small GeoNames/Open-Meteo seed list gives useful suggestions from two letters, also offline.
export const commonCities=[
  {
    "name": "Тюмень",
    "latitude": 57.15222,
    "longitude": 65.52722,
    "timezone": "Asia/Yekaterinburg",
    "country": "Россия",
    "admin1": "Тюмень"
  },
  {
    "name": "Медина",
    "latitude": 24.46861,
    "longitude": 39.61417,
    "timezone": "Asia/Riyadh",
    "country": "Саудовская Аравия",
    "admin1": "Medina Region"
  },
  {
    "name": "Москва",
    "latitude": 55.75204,
    "longitude": 37.61781,
    "timezone": "Europe/Moscow",
    "country": "Россия",
    "admin1": "Москва"
  },
  {
    "name": "Санкт-Петербург",
    "latitude": 59.93863,
    "longitude": 30.31413,
    "timezone": "Europe/Moscow",
    "country": "Россия",
    "admin1": "Санкт-Петербург"
  },
  {
    "name": "Казань",
    "latitude": 55.78874,
    "longitude": 49.12214,
    "timezone": "Europe/Moscow",
    "country": "Россия",
    "admin1": "Татарстан"
  },
  {
    "name": "Екатеринбург",
    "latitude": 56.85733,
    "longitude": 60.61529,
    "timezone": "Asia/Yekaterinburg",
    "country": "Россия",
    "admin1": "Свердловская Область"
  },
  {
    "name": "Душанбе",
    "latitude": 38.53575,
    "longitude": 68.77905,
    "timezone": "Asia/Dushanbe",
    "country": "Таджикистан",
    "admin1": "Душанбе"
  },
  {
    "name": "Ташкент",
    "latitude": 41.26465,
    "longitude": 69.21627,
    "timezone": "Asia/Tashkent",
    "country": "Узбекистан",
    "admin1": "Ташкент"
  },
  {
    "name": "Мекка",
    "latitude": 21.42664,
    "longitude": 39.82563,
    "timezone": "Asia/Riyadh",
    "country": "Саудовская Аравия",
    "admin1": "Mecca Region"
  },
  {
    "name": "Алматы",
    "latitude": 43.25249,
    "longitude": 76.9115,
    "timezone": "Asia/Almaty",
    "country": "Казахстан",
    "admin1": "Алматы"
  },
  {
    "name": "Уфа",
    "latitude": 54.74306,
    "longitude": 55.96779,
    "timezone": "Asia/Yekaterinburg",
    "country": "Россия",
    "admin1": "Башкортостан"
  },
  {
    "name": "Дубай",
    "latitude": 25.07725,
    "longitude": 55.30927,
    "timezone": "Asia/Dubai",
    "country": "ОАЭ",
    "admin1": "Dubai"
  },
  {
    "name": "Тюкалинск",
    "latitude": 55.87245,
    "longitude": 72.19796,
    "timezone": "Asia/Omsk",
    "country": "Россия",
    "admin1": "Омская Область"
  },
  {
    "name": "Тюльган",
    "latitude": 52.34127,
    "longitude": 56.16157,
    "timezone": "Asia/Yekaterinburg",
    "country": "Россия",
    "admin1": "Оренбургская Область"
  },
  {
    "name": "Тюп",
    "latitude": 42.7276,
    "longitude": 78.36476,
    "timezone": "Asia/Bishkek",
    "country": "Кыргызстан",
    "admin1": "Issyk-Kul’skaya Oblast’"
  },
  {
    "name": "Тюмень",
    "latitude": 58.41553,
    "longitude": 49.23639,
    "timezone": "Europe/Kirov",
    "country": "Россия",
    "admin1": "Кировская Область"
  },
  {
    "name": "Тюмень",
    "latitude": 58.8742,
    "longitude": 54.9044,
    "timezone": "Asia/Yekaterinburg",
    "country": "Россия",
    "admin1": "Пермский край"
  },
  {
    "name": "Тюмень",
    "latitude": 52.9333,
    "longitude": 84.5915,
    "timezone": "Asia/Barnaul",
    "country": "Россия",
    "admin1": "Алтайский Край"
  }
];
const normal=value=>String(value||'').trim().toLocaleLowerCase('ru').replaceAll('ё','е');
export function validTimezone(value){try{if(typeof value!=='string'||!value)return false;new Intl.DateTimeFormat('ru',{timeZone:value});return true}catch{return false}}
export function validCoordinates(latitude,longitude){return typeof latitude==='number'&&Number.isFinite(latitude)&&Math.abs(latitude)<=90&&typeof longitude==='number'&&Number.isFinite(longitude)&&Math.abs(longitude)<=180}
export function cleanCity(value){if(!value||typeof value.name!=='string'||!value.name.trim()||!validCoordinates(value.latitude,value.longitude)||!validTimezone(value.timezone))return null;return {name:value.name.trim().slice(0,160),country:String(value.country||'').slice(0,160),admin1:String(value.admin1||'').slice(0,160),latitude:value.latitude,longitude:value.longitude,timezone:value.timezone}}
export function mergeCities(...groups){const cities=[];for(const value of groups.flat()){const city=cleanCity(value);if(city&&!cities.some(other=>normal(other.name)===normal(city.name)&&normal(other.country)===normal(city.country)&&Math.abs(other.latitude-city.latitude)<.01&&Math.abs(other.longitude-city.longitude)<.01))cities.push(city)}return cities.slice(0,10)}
export function localCities(query,currentCity){const text=normal(query);return text.length<2?[]:mergeCities([...commonCities,currentCity].filter(city=>city&&normal(city.name).startsWith(text)).sort((a,b)=>a.name.localeCompare(b.name,'ru')||String(a.admin1||'').localeCompare(String(b.admin1||''),'ru')))}
async function json(url,signal,fetcher){const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();const timer=setTimeout(abort,12000);try{const response=await fetcher(url,{signal:controller.signal,credentials:'omit',cache:'no-store'});if(!response.ok)throw Error('City lookup unavailable');return await response.json()}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}}
export async function searchCities(query,{signal,fetcher=fetch}={}){const text=String(query||'').trim();if(text.length<2)return [];const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name:text,count:'10',language:'ru',format:'json'});const data=await json(url,signal,fetcher);return mergeCities(Array.isArray(data.results)?data.results:[])}
// Display a settlement, never a region/district returned as the provider's city field.
export function settlementName(value){
 if(typeof value!=='string')return '';let name=value.trim();
 name=name.replace(/^(?:муниципальное образование\s+)?городской округ(?:\s*[-—]\s*город)?\s+/iu,'').replace(/^(?:город|г\.)\s+/iu,'').replace(/\s*[,—-]?\s+городской округ$/iu,'').trim();
 if(!name||/(?:округ|район|область|муниципальн|district|county|borough|region|oblast|okrug)/iu.test(name))return '';
 return name;
}
export function cityFromLocation(place,zone,coords){
 const namedPlaces=[...(place.localityInfo?.informative||[]),...(place.localityInfo?.administrative||[])];
 const settlement=namedPlaces.find(item=>/(?:city|town|village|settlement|город|село|деревня|пос[её]лок)/iu.test(String(item.description||''))&&!/(?:district|county|borough|municipal|район|округ|муниципальн)/iu.test(String(item.description||''))&&settlementName(item.name));
 const city=settlementName(place.city),locality=settlementName(place.locality),named=settlementName(settlement?.name);
 const administrativeCity=/(?:округ|район|область|муниципальн|district|county|borough|region|oblast|okrug)/iu.test(String(place.city||''));
 const name=administrativeCity?(named||locality||city):(city||named||locality);
 return cleanCity({name,country:place.countryName,admin1:place.principalSubdivision,latitude:coords.latitude,longitude:coords.longitude,timezone:zone.timezone});
}
// Only call from the current device's fresh, consented Geolocation position. No IP fallback.
export async function locateCity(coords,{signal,fetcher=fetch}={}){if(!validCoordinates(coords.latitude,coords.longitude))throw Error('Invalid coordinates');const reverse=new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');reverse.search=new URLSearchParams({latitude:String(coords.latitude),longitude:String(coords.longitude),localityLanguage:'ru'});const timezone=new URL('https://api.open-meteo.com/v1/forecast');timezone.search=new URLSearchParams({latitude:String(coords.latitude),longitude:String(coords.longitude),timezone:'auto'});const [place,zone]=await Promise.all([json(reverse,signal,fetcher),json(timezone,signal,fetcher)]);const city=cityFromLocation(place,zone,coords);if(!city)throw Error('City not resolved');return city}
// Every new query invalidates the previous request, even if a provider ignores cancellation.
export function latestRequest(){let version=0,controller;return {start(){controller?.abort();controller=new AbortController();const id=++version;return {signal:controller.signal,current:()=>id===version&&!controller.signal.aborted}},cancel(){version++;controller?.abort()}}}
