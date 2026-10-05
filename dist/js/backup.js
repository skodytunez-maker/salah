import{isRecord,validDay,jsonCopy,normalizeSettings,normalizeHistory,replacePersonalState,storageWarnings,storageProblem}from './storage.js';
import{RECITERS}from './quran-reciters.js';
import{validPosition as validLesson}from './learning-state.js';

import{validUmrahProgress}from './umrah-content.js';

const MAX_BYTES=5*1024*1024;
const PERSONAL_KEYS=new Set(['quran-preferences','quran-bookmarks','quran-last-position','learning-progress','umrah-progress','learning-font-size','adhkar-progress-v2','adhkar-favorites','adhkar-selected','adhkar-font-size','adhkar-arabic','adhkar-translit','adhkar-translation','adhkar-focus','adhkar-design','dhikr-free']);
const GROUPS=['morning','evening','all','favorites'];
const AYAH_COUNTS=[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const preparedBackups=new WeakMap();
const fail=message=>{throw Error(message)};
function exactKeys(value,allowed,label){
 if(!isRecord(value))fail('Некорректные данные «'+label+'».');
 if(Object.keys(value).some(key=>!allowed.includes(key)))fail('Неизвестное поле в «'+label+'».');
}
const count=value=>Number.isSafeInteger(value)&&value>=0;
const id=value=>typeof value==='string'&&value.length<=80&&/^[\w-]+$/.test(value);
function position(value,label){
 exactKeys(value,['surah','ayah'],label);
 if(!Number.isInteger(value.surah)||value.surah<1||value.surah>114||!Number.isInteger(value.ayah)||value.ayah<1||value.ayah>AYAH_COUNTS[value.surah-1])fail('Некорректное место чтения Корана.');
 return value;
}
function counts(value,label){
 if(!isRecord(value)||Object.entries(value).some(([key,n])=>!id(key)||!count(n)))fail('Некорректные счётчики «'+label+'».');
}
function progress(value,label){
 exactKeys(value,['cursor','counts','_day'],label);
 if(!count(value.cursor)||!isRecord(value.counts)||Object.hasOwn(value,'_day')&&!validDay(value._day))fail('Некорректный прогресс азкаров.');
 counts(value.counts,label);
}
function legacyKey(key){const match=/^adhkar:(\d{4}-\d{2}-\d{2}):(morning|evening|all|favorites)$/.exec(key);return match&&validDay(match[1])?match:null}
function allowedKey(key){return PERSONAL_KEYS.has(key)||!!legacyKey(key)}
function personalValue(key,value){
 if(!allowedKey(key))fail('Неизвестные личные данные «'+key+'».');
 if(key==='quran-preferences'){
  const fields=['transcriptionEdition','hints','arabic','translation','transliteration','numbers','arabicSize','textSize','theme','reciter'];
  exactKeys(value,fields,key);
  for(const field of ['hints','arabic','translation','transliteration','numbers'])if(Object.hasOwn(value,field)&&typeof value[field]!=='boolean')fail('Некорректная настройка чтения.');
  for(const [field,allowed]of [['transcriptionEdition',['source','salah-preview']],['arabicSize',[28,34,40,48]],['textSize',[18,20,24,28]],['theme',['light','dark','system']]])if(Object.hasOwn(value,field)&&!allowed.includes(value[field]))fail('Некорректная настройка чтения.');
  if(Object.hasOwn(value,'reciter')&&!RECITERS.some(r=>r.id===value.reciter))fail('Неизвестный чтец.');
 }else if(key==='quran-bookmarks'){
  if(!Array.isArray(value)||value.length>20000)fail('Некорректные закладки Корана.');
  value.forEach(v=>position(v,key));
 }else if(key==='quran-last-position'){
  if(value!==null)position(value,key);
 }else if(key==='learning-progress'){
  exactKeys(value,['kind','index','complete','returnTo'],key);
  if(!validLesson(value)||typeof value.complete!=='boolean')fail('Некорректный прогресс обучения.');
  if(Object.hasOwn(value,'returnTo')){exactKeys(value.returnTo,['kind','index'],key);if(value.kind!=='wudu'||!validLesson(value.returnTo)||value.returnTo.kind==='wudu')fail('Некорректное место возврата в урок.')}
 }else if(key==='umrah-progress'){
  exactKeys(value,['edition','index','complete'],key);if(!validUmrahProgress(value))fail('Некорректное место урока Умры.');
 }else if(key==='learning-font-size'){
  if(![18,20,24,28].includes(value))fail('Некорректный размер текста урока.');
 }else if(key==='adhkar-font-size'){
  if(![16,18,20,22,24,28].includes(value))fail('Некорректный размер текста азкаров.');
 }else if(key==='adhkar-progress-v2'){
  exactKeys(value,['version','totals','days'],key);
  if(value.version!==2||!isRecord(value.days)||Object.keys(value.days).length>20000)fail('Некорректные данные счётчика азкаров.');
  counts(value.totals,key);
  for(const [day,groups]of Object.entries(value.days)){
   if(!validDay(day))fail('Некорректная дата азкаров.');
   exactKeys(groups,GROUPS,key);for(const [group,session]of Object.entries(groups))progress(session,group);
  }
 }else if(key==='adhkar-favorites'){
  if(!Array.isArray(value)||value.length>1000||value.some(v=>!id(v)))fail('Некорректное избранное азкаров.');
 }else if(key==='adhkar-selected'){
  if(!GROUPS.includes(value))fail('Неизвестный набор азкаров.');
 }else if(['adhkar-arabic','adhkar-translit','adhkar-translation','adhkar-focus'].includes(key)){
  if(typeof value!=='boolean')fail('Некорректная настройка азкаров.');
 }else if(key==='adhkar-design'){
  if(!['classic','hybrid','salah','signature'].includes(value))fail('Некорректный вариант оформления азкаров.');
 }else if(key==='dhikr-free'){
  exactKeys(value,['count','target'],key);
  if(!count(value.count)||!Number.isInteger(value.target)||value.target<0||value.target>100000)fail('Некорректный свободный счётчик.');
 }else progress(value,key);
 return value;
}
function byteSize(value){return new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)).byteLength}
function validDocument(input){
 if(typeof input==='string'&&byteSize(input)>MAX_BYTES)fail('Файл резервной копии больше 5 МБ.');
 let value;
 try{value=typeof input==='string'?JSON.parse(input):input}catch{fail('Файл не является корректной резервной копией JSON.')}
 value=jsonCopy(value);
 if(byteSize(value)>MAX_BYTES)fail('Файл резервной копии больше 5 МБ.');
 exactKeys(value,['version','app','exportedAt','settings','history','personal','warnings'],'резервная копия');
 if(![1,2].includes(value.version))fail('Эта версия резервной копии не поддерживается.');
 if(Object.hasOwn(value,'app')&&value.app!=='SALAH')fail('Это не резервная копия SALAH.');
 if(!Object.hasOwn(value,'settings')||!Object.hasOwn(value,'history'))fail('В резервной копии отсутствуют настройки или история.');
 if(Object.hasOwn(value,'exportedAt')&&(typeof value.exportedAt!=='string'||!Number.isFinite(Date.parse(value.exportedAt))))fail('Некорректная дата резервной копии.');
 if(value.version===2&&!Object.hasOwn(value,'personal'))fail('В резервной копии отсутствуют личные данные.');
 const settings=normalizeSettings(value.settings,{strict:true}),history=normalizeHistory(value.history,{strict:true}),personal=value.personal??{};
 if(!isRecord(personal))fail('Личные данные должны быть объектом.');
 for(const [key,item]of Object.entries(personal))personalValue(key,item);
 if(Object.hasOwn(value,'warnings')&&(!Array.isArray(value.warnings)||value.warnings.length>20000||value.warnings.some(w=>typeof w!=='string'||w.length>1000)))fail('Некорректные предупреждения резервной копии.');
 return {version:2,app:'SALAH',...(value.exportedAt?{exportedAt:value.exportedAt}:{}),settings,history,personal,warnings:value.warnings||[]};
}
function stats(backup){
 let adhkarRepetitions=0;
 const add=value=>{adhkarRepetitions=Math.min(Number.MAX_SAFE_INTEGER,adhkarRepetitions+value)};
 if(backup.personal['adhkar-progress-v2'])Object.values(backup.personal['adhkar-progress-v2'].totals).forEach(add);
 else for(const [key,value]of Object.entries(backup.personal))if(legacyKey(key))Object.values(value.counts).forEach(add);
 return {days:Object.keys(backup.history).length,prayerMarks:Object.values(backup.history).reduce((n,d)=>n+Object.values(d).filter(Boolean).length,0),bookmarks:backup.personal['quran-bookmarks']?.length||0,adhkarRepetitions,personalEntries:Object.keys(backup.personal).length,city:backup.settings.city?.name||null};
}
// Validation is read-only; the app shows this concrete preview before confirmation.
export function validateBackup(input){
 const backup=validDocument(input),prepared={backup,preview:stats(backup),warnings:[...backup.warnings]};
 preparedBackups.set(prepared,JSON.stringify(prepared));return prepared;
}
export function createBackup({storage,settings,history,now=new Date()}){
 const warnings=[...storageWarnings],personal={};
 const nextSettings=normalizeSettings(settings,{warnings}),nextHistory=normalizeHistory(history,{warnings});
 let keys=[];
 try{for(let index=0;index<storage.length;index++){const fullKey=storage.key(index);if(fullKey?.startsWith('salah:')&&allowedKey(fullKey.slice(6)))keys.push(fullKey)}}
 catch{warnings.push('Хранилище недоступно: в файл включены только доступные настройки и история.')}
 for(const fullKey of keys){
  const key=fullKey.slice(6);
  try{const raw=storage.getItem(fullKey);if(raw!==null)personal[key]=personalValue(key,jsonCopy(JSON.parse(raw)))}
  catch{warnings.push('Данные «'+key+'» повреждены или недоступны и не включены в копию.')}
 }
 const backup={version:2,app:'SALAH',exportedAt:now.toISOString(),settings:nextSettings,history:nextHistory,personal,warnings:[...new Set(warnings)]};
 if(byteSize(backup)>MAX_BYTES)fail('Резервная копия больше 5 МБ. Импорт такого файла не поддерживается.');
 return backup;
}
// Only the prepared object that was shown to the user may be applied.
export function restoreBackup(prepared,{storage=localStorage,confirmed=false}={}){
 if(confirmed!==true)fail('Сначала подтвердите восстановление показанной резервной копии.');
 const fingerprint=preparedBackups.get(prepared);
 if(!fingerprint||fingerprint!==JSON.stringify(prepared))fail('Резервная копия изменилась. Проверьте её ещё раз перед восстановлением.');
 const backup=validDocument(prepared.backup);
 // Restoring an older file must not subtract account-backed lifetime totals.
 if(storage.getItem('salah:counter-active-account')&&storage.getItem('salah:counter-active-account')!=='guest'){
  const current=storage.getItem('salah:adhkar-progress-v2');
  if(current){const old=JSON.parse(current);counts(old.totals,'счётчики аккаунта');const incoming=backup.personal['adhkar-progress-v2']||{version:2,totals:{},days:{}};for(const [id,n]of Object.entries(old.totals))incoming.totals[id]=Math.max(incoming.totals[id]||0,n);backup.personal['adhkar-progress-v2']=incoming;}
 }
 const writes=[['salah:settings',JSON.stringify(backup.settings)],['salah:history',JSON.stringify(backup.history)],...Object.entries(backup.personal).map(([key,value])=>['salah:'+key,JSON.stringify(value)])];
 const previous=[];
 try{for(const [key]of writes)previous.push([key,storage.getItem(key)])}
 catch{storageProblem('Хранилище недоступно. Восстановление не выполнено.');fail('Хранилище недоступно. Восстановление не выполнено.')}
 let attempted=0;
 try{for(const [key,raw]of writes){attempted++;storage.setItem(key,raw)}}
 catch{
  let rollbackFailed=false;
  // Free the newly written bytes first, then put back the original raw values.
  for(const [key]of previous.slice(0,attempted))try{storage.removeItem(key)}catch{rollbackFailed=true}
  for(const [key,raw]of previous.slice(0,attempted))if(raw!==null)try{storage.setItem(key,raw)}catch{rollbackFailed=true}
  storageProblem('Не удалось восстановить копию. Проверьте свободное место и доступ к хранилищу.');
  const error=Error(rollbackFailed?'Не удалось восстановить копию и полностью вернуть прежние данные. Сохраните исходный файл и проверьте хранилище.':'Не удалось восстановить копию. Прежние данные сохранены; проверьте свободное место и доступ к хранилищу.');
  error.rollbackFailed=rollbackFailed;throw error;
 }
 replacePersonalState(backup.settings,backup.history);preparedBackups.delete(prepared);
 return {ok:true,warnings:[...backup.warnings]};
}
