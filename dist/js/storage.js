import{backgroundMode}from './day-night.js';
import{personalTime}from './tahajjud.js';

export let storageAvailable=true;
export const storageWarnings=[];
export function storageProblem(message){storageAvailable=false;if(!storageWarnings.includes(message))storageWarnings.push(message)}
const warn=(warnings,message)=>{if(!warnings.includes(message))warnings.push(message)};
export const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function validDay(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function jsonCopy(value){
 let nodes=0;
 function check(item,depth){
  if(++nodes>250000||depth>24)throw Error('Слишком сложные данные');
  if(item===null||typeof item==='boolean')return;
  if(typeof item==='string'){if(item.length>4000)throw Error('Слишком длинная строка');return}
  if(typeof item==='number'){if(!Number.isFinite(item))throw Error('Недопустимое число');return}
  if(Array.isArray(item)){if(item.length>20000)throw Error('Слишком длинный список');for(const child of item)check(child,depth+1);return}
  if(!isRecord(item))throw Error('Ожидались данные JSON');
  const proto=Object.getPrototypeOf(item);if(proto!==null&&proto!==Object.prototype)throw Error('Ожидался обычный объект JSON');
  for(const [key,child]of Object.entries(item)){
   if(['__proto__','prototype','constructor'].includes(key))throw Error('Недопустимый ключ данных');
   check(child,depth+1);
  }
 }
 check(value,0);return JSON.parse(JSON.stringify(value));
}
export function read(key,fallback){
 let raw;try{raw=localStorage.getItem('salah:'+key)}catch{storageProblem('Хранилище недоступно. Данные сохраняются только в текущем сеансе.');return fallback}
 if(raw===null)return fallback;
 try{
  const value=JSON.parse(raw);
  if(fallback!==null&&typeof fallback==='object'&&(value===null||typeof value!=='object'||Array.isArray(value)!==Array.isArray(fallback)))throw Error('shape');
  return value;
 }catch{warn(storageWarnings,'Повреждённые данные «'+key+'» не загружены.');return fallback}
}
export function write(key,value){
 try{localStorage.setItem('salah:'+key,JSON.stringify(value));return true}catch{storageProblem('Не удалось сохранить данные. Проверьте свободное место и доступ к хранилищу.');return false}
}
export const defaults={madhhab:'general',city:null,method:3,school:1,highLatitude:3,offsets:{Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0},weather:false,weatherAnimation:true,dynamic:true,backgroundMode:'auto',transitions:true,motion:false,haptic:true,mosque:false,mosqueTimes:{},juma:'',showTahajjud:false,tahajjudTime:'',onboarded:false,hijriOffset:0};
const PRAYERS=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const BOOLEAN_FIELDS=['weather','weatherAnimation','dynamic','transitions','motion','haptic','mosque','showTahajjud','onboarded'];
const SETTINGS_KEYS=new Set([...Object.keys(defaults),'reminders']);
const validTime=value=>typeof value==='string'&&(value===''||personalTime(value)!=='');
export function normalizeSettings(value,{strict=false,warnings=[]}={}){
 const result={...defaults,offsets:{...defaults.offsets},mosqueTimes:{}};
 const bad=(message)=>{if(strict)throw Error(message);warn(warnings,message)};
 if(!isRecord(value)){bad('Настройки должны быть объектом.');return result}
 for(const key of Object.keys(value))if(!SETTINGS_KEYS.has(key))bad('Неизвестная настройка «'+key+'».');
 for(const key of BOOLEAN_FIELDS)if(Object.hasOwn(value,key)){
  if(typeof value[key]==='boolean')result[key]=value[key];else bad('Некорректная настройка «'+key+'».');
 }
 for(const [key,allowed]of [['method',[1,2,3,4,5,13]],['school',[0,1]],['highLatitude',[1,2,3]],['hijriOffset',[-1,0,1]]])if(Object.hasOwn(value,key)){
  if(allowed.includes(value[key]))result[key]=value[key];else bad('Некорректная настройка «'+key+'».');
 }
 if(Object.hasOwn(value,'madhhab')){
  if(typeof value.madhhab==='string'&&/^[a-z][a-z-]{0,29}$/.test(value.madhhab))result.madhhab=value.madhhab;else bad('Некорректное значение мазхаба.');
 }
 if(Object.hasOwn(value,'backgroundMode')&&!['dark','light','auto'].includes(value.backgroundMode))bad('Некорректный режим фона.');
 result.backgroundMode=backgroundMode(value.backgroundMode,result.dynamic);result.dynamic=result.backgroundMode==='auto';
 if(Object.hasOwn(value,'city')&&value.city!==null){
  try{
   const city=value.city;
   if(!isRecord(city)||Object.keys(city).some(k=>!['name','country','latitude','longitude','timezone'].includes(k)))throw Error();
   if(typeof city.name!=='string'||!city.name.trim()||city.name.length>160||Object.hasOwn(city,'country')&&(typeof city.country!=='string'||city.country.length>160))throw Error();
   if(!Number.isFinite(city.latitude)||Math.abs(city.latitude)>90||!Number.isFinite(city.longitude)||Math.abs(city.longitude)>180)throw Error();
   if(typeof city.timezone!=='string'||city.timezone.length>80)throw Error();
   new Intl.DateTimeFormat('ru',{timeZone:city.timezone}).format(0);
   result.city={name:city.name.trim(),country:city.country??'',latitude:city.latitude,longitude:city.longitude,timezone:city.timezone};
  }catch{bad('Некорректный город, координаты или часовой пояс.')}
 }
 for(const key of ['offsets','mosqueTimes'])if(Object.hasOwn(value,key)){
  if(!isRecord(value[key])){bad('Некорректные данные «'+key+'».');continue}
  for(const [prayer,item]of Object.entries(value[key])){
   if(!PRAYERS.includes(prayer)){bad('Неизвестный намаз в «'+key+'».');continue}
   if(key==='offsets'?Number.isInteger(item)&&Math.abs(item)<=60:validTime(item))result[key][prayer]=item;
   else bad('Некорректное время «'+prayer+'».');
  }
 }
 for(const key of ['juma','tahajjudTime'])if(Object.hasOwn(value,key)){
  if(validTime(value[key]))result[key]=value[key];else bad('Некорректное время «'+key+'».');
 }
 // Retain legacy fields for backup compatibility; the removed manual schedule is inactive.
 result.mosque=false;
 if(Object.hasOwn(value,'reminders')){
  try{if(!isRecord(value.reminders))throw Error();result.reminders=jsonCopy(value.reminders)}catch{bad('Некорректные настройки напоминаний.')}
 }
 return result;
}
export function normalizeHistory(value,{strict=false,warnings=[]}={}){
 const result={},bad=message=>{if(strict)throw Error(message);warn(warnings,message)};
 if(!isRecord(value)){bad('История намазов должна быть объектом.');return result}
 const entries=Object.entries(value);if(entries.length>20000)bad('История намазов слишком велика.');
 for(const [day,prayers]of entries.slice(0,20000)){
  if(!validDay(day)||!isRecord(prayers)){bad('Некорректный день в истории намазов.');continue}
  const record={};
  for(const [key,mark]of Object.entries(prayers)){
   if(!PRAYERS.includes(key)||!['done','ontime','later',null,true,false].includes(mark)){bad('Некорректная отметка намаза.');continue}
   record[key]=mark===true?'done':mark===false?null:mark;
  }
  result[day]=record;
 }
 return result;
}
export const settings=normalizeSettings(read('settings',{}),{warnings:storageWarnings});
export const history=normalizeHistory(read('history',{}),{warnings:storageWarnings});
const replace=(target,value)=>{for(const key of Object.keys(target))delete target[key];Object.assign(target,value)};
// Keep live references used by the app and other modules when restoring data.
export function replacePersonalState(nextSettings,nextHistory){replace(settings,nextSettings);replace(history,nextHistory)}
export function updateSettings(value){
 if(!isRecord(value))return false;
 const merged={...settings,...value,offsets:{...settings.offsets,...(isRecord(value.offsets)?value.offsets:{})},mosqueTimes:{...settings.mosqueTimes,...(isRecord(value.mosqueTimes)?value.mosqueTimes:{})}};
 if(!Object.hasOwn(value,'backgroundMode')&&Object.hasOwn(value,'dynamic'))merged.backgroundMode=value.dynamic===false?'dark':'auto';
 const normalized=normalizeSettings(merged,{warnings:storageWarnings});replace(settings,normalized);return write('settings',settings);
}
export function markPrayer(day,key,value){
 if(!validDay(day)||!PRAYERS.includes(key)||!['done','ontime','later',null].includes(value))return false;
 if(!history[day])history[day]={};history[day][key]=value;return write('history',history);
}
