import{QURAN_TRANSLATION_IDS}from './quran-translations.js';
import{t}from './i18n.js';
import{validAlphabetProgress}from './arabic-alphabet-core.js';
import{freeRound}from './free-counter.js';
import{validNamesProgress}from './allah-names-core.js';
import{isRecord,validDay,jsonCopy,normalizeSettings,normalizeHistory,replacePersonalState,storageWarnings,storageProblem}from './storage.js';
import{RECITERS}from './quran-reciters.js';
import{validPosition as validLesson}from './learning-state.js';

import{validUmrahProgress}from './umrah-content.js';

const MAX_BYTES=5*1024*1024;
const PERSONAL_KEYS=new Set(['quran-tafsir-edition','quran-preferences','quran-bookmarks','quran-last-position','quran-reading-positions','quran-mushaf-last-page','quran-mushaf-bookmarks','quran-mushaf-tajweed-bookmarks','quran-mushaf-preferences','learning-progress','umrah-progress','allah-names-progress','arabic-alphabet-progress','learning-font-size','adhkar-progress-v2','adhkar-favorites','adhkar-selected','adhkar-font-size','adhkar-arabic','adhkar-translit','adhkar-translation','adhkar-focus','adhkar-design','dhikr-free']);
const GROUPS=['morning','evening','all','favorites'];
const AYAH_COUNTS=[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const preparedBackups=new WeakMap();
const fail=message=>{throw Error(message)};
function exactKeys(value,allowed,label){
 if(!isRecord(value))fail(t('backupUi.invalidData',{name:label}));
 if(Object.keys(value).some(key=>!allowed.includes(key)))fail(t('backupUi.unknownField',{name:label}));
}
const count=value=>Number.isSafeInteger(value)&&value>=0;
const id=value=>typeof value==='string'&&value.length<=80&&/^[\w-]+$/.test(value);
function position(value,label){
 exactKeys(value,['surah','ayah'],label);
 if(!Number.isInteger(value.surah)||value.surah<1||value.surah>114||!Number.isInteger(value.ayah)||value.ayah<1||value.ayah>AYAH_COUNTS[value.surah-1])fail(t('backupUi.position'));
 return value;
}
function counts(value,label){
 if(!isRecord(value)||Object.entries(value).some(([key,n])=>!id(key)||!count(n)))fail(t('backupUi.counters',{name:label}));
}
function progress(value,label){
 exactKeys(value,['cursor','counts','extraCounts','_day'],label);
 if(value.extraCounts!==undefined)counts(value.extraCounts,label);
 if(!count(value.cursor)||!isRecord(value.counts)||Object.hasOwn(value,'_day')&&!validDay(value._day))fail(t('backupUi.adhkarProgress'));
 counts(value.counts,label);
}
function legacyKey(key){const match=/^adhkar:(\d{4}-\d{2}-\d{2}):(morning|evening|all|favorites)$/.exec(key);return match&&validDay(match[1])?match:null}
function allowedKey(key){return PERSONAL_KEYS.has(key)||!!legacyKey(key)}
function personalValue(key,value){
 if(!allowedKey(key))fail(t('backupUi.unknownPersonal',{name:key}));
 if(key==='quran-tafsir-edition'){if(!['saadi','ibn-kathir'].includes(value))fail(t('backupUi.tafsir'));
 }else if(key==='quran-preferences'){
  const fields=['translationEdition','arabicEdition','transcriptionEdition','hints','arabic','translation','transliteration','numbers','arabicSize','textSize','theme','reciter'];
  exactKeys(value,fields,key);
  for(const field of ['hints','arabic','translation','transliteration','numbers'])if(Object.hasOwn(value,field)&&typeof value[field]!=='boolean')fail(t('backupUi.readingSetting'));
  for(const [field,allowed]of [['translationEdition',QURAN_TRANSLATION_IDS],['arabicEdition',['quran-uthmani']],['transcriptionEdition',['source','salah-preview']],['arabicSize',[28,34,40,48]],['textSize',[18,20,24,28]],['theme',['light','dark','system']]])if(Object.hasOwn(value,field)&&!allowed.includes(value[field]))fail(t('backupUi.readingSetting'));
  if(Object.hasOwn(value,'reciter')&&!RECITERS.some(r=>r.id===value.reciter))fail(t('backupUi.reciter'));
 }else if(key==='quran-bookmarks'){
  if(!Array.isArray(value)||value.length>20000)fail(t('backupUi.quranBookmarks'));
  value.forEach(v=>position(v,key));
 }else if(key==='quran-last-position'){
  if(value!==null)position(value,key);
 }else if(key==='quran-reading-positions'){
  if(!isRecord(value)||Object.keys(value).length>114||Object.entries(value).some(([surah,ayah])=>!/^[1-9]\d{0,2}$/.test(surah)||Number(surah)>114||!Number.isInteger(ayah)||ayah<1||ayah>AYAH_COUNTS[Number(surah)-1]))fail(t('backupUi.positions'));
 }else if(key==='quran-mushaf-last-page'){
  if(!Number.isInteger(value)||value<1||value>604)fail(t('backupUi.mushafPage'));
 }else if((key==='quran-mushaf-bookmarks'||key==='quran-mushaf-tajweed-bookmarks')){
  if(!Array.isArray(value)||value.length>604||value.some(p=>!Number.isInteger(p)||p<1||p>604)||new Set(value).size!==value.length)fail(t('backupUi.mushafBookmarks'));
 }else if(key==='quran-mushaf-preferences'){
  exactKeys(value,['size','theme','edition','editionChosen','follow'],key);if(![26,30,34,40,46].includes(value.size)||!['paper','night'].includes(value.theme)||(Object.hasOwn(value,'edition')&&!['madani','tajweed'].includes(value.edition))||(Object.hasOwn(value,'editionChosen')&&typeof value.editionChosen!=='boolean')||(Object.hasOwn(value,'follow')&&typeof value.follow!=='boolean'))fail(t('backupUi.mushafSettings'));
 }else if(key==='learning-progress'){
  exactKeys(value,['kind','index','complete','returnTo'],key);
  if(!validLesson(value)||typeof value.complete!=='boolean')fail(t('backupUi.learningProgress'));
  if(Object.hasOwn(value,'returnTo')){exactKeys(value.returnTo,['kind','index'],key);if(value.kind!=='wudu'||!validLesson(value.returnTo)||value.returnTo.kind==='wudu')fail(t('backupUi.lessonReturn'))}
 }else if(key==='umrah-progress'){
  exactKeys(value,['edition','index','complete'],key);if(!validUmrahProgress(value))fail(t('backupUi.umrahPosition'));
 }else if(key==='allah-names-progress'){
  if(!validNamesProgress(value))fail(t('backupUi.namesProgress'));
 }else if(key==='arabic-alphabet-progress'){
  if(!validAlphabetProgress(value))fail(t('backupUi.alphabetProgress'));
 }else if(key==='learning-font-size'){
  if(![18,20,24,28].includes(value))fail(t('backupUi.lessonTextSize'));
 }else if(key==='adhkar-font-size'){
  if(![16,18,20,22,24,28].includes(value))fail(t('backupUi.adhkarTextSize'));
 }else if(key==='adhkar-progress-v2'){
  exactKeys(value,['version','totals','days'],key);
  if(value.version!==2||!isRecord(value.days)||Object.keys(value.days).length>20000)fail(t('backupUi.adhkarCounter'));
  counts(value.totals,key);
  for(const [day,groups]of Object.entries(value.days)){
   if(!validDay(day))fail(t('backupUi.adhkarDate'));
   exactKeys(groups,GROUPS,key);for(const [group,session]of Object.entries(groups))progress(session,group);
  }
 }else if(key==='adhkar-favorites'){
  if(!Array.isArray(value)||value.length>1000||value.some(v=>!id(v)))fail(t('backupUi.adhkarFavorites'));
 }else if(key==='adhkar-selected'){
  if(!GROUPS.includes(value))fail(t('backupUi.adhkarGroup'));
 }else if(['adhkar-arabic','adhkar-translit','adhkar-translation','adhkar-focus'].includes(key)){
  if(typeof value!=='boolean')fail(t('backupUi.adhkarSetting'));
 }else if(key==='adhkar-design'){
  if(!['classic','hybrid','salah','signature'].includes(value))fail(t('backupUi.adhkarDesign'));
 }else if(key==='dhikr-free'){
  exactKeys(value,['count','target','selected','rounds','custom'],key);
  try{freeRound(JSON.stringify(value));}catch{fail(t('backupUi.freeCounter'));}
 }else progress(value,key);
 return value;
}
function byteSize(value){return new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)).byteLength}
function validDocument(input){
 if(typeof input==='string'&&byteSize(input)>MAX_BYTES)fail(t('backupUi.fileSize'));
 let value;
 try{value=typeof input==='string'?JSON.parse(input):input}catch{fail(t('backupUi.json'))}
 value=jsonCopy(value);
 if(byteSize(value)>MAX_BYTES)fail(t('backupUi.fileSize'));
 exactKeys(value,['version','app','exportedAt','settings','history','personal','warnings'],t('backupUi.document'));
 if(![1,2].includes(value.version))fail(t('backupUi.version'));
 if(Object.hasOwn(value,'app')&&value.app!=='SALAH')fail(t('backupUi.notSalah'));
 if(!Object.hasOwn(value,'settings')||!Object.hasOwn(value,'history'))fail(t('backupUi.missingSettings'));
 if(Object.hasOwn(value,'exportedAt')&&(typeof value.exportedAt!=='string'||!Number.isFinite(Date.parse(value.exportedAt))))fail(t('backupUi.date'));
 if(value.version===2&&!Object.hasOwn(value,'personal'))fail(t('backupUi.missingPersonal'));
 const settings=normalizeSettings(value.settings,{strict:true}),history=normalizeHistory(value.history,{strict:true}),personal=value.personal??{};
 if(!isRecord(personal))fail(t('backupUi.personalObject'));
 for(const [key,item]of Object.entries(personal))personalValue(key,item);
 if(Object.hasOwn(value,'warnings')&&(!Array.isArray(value.warnings)||value.warnings.length>20000||value.warnings.some(w=>typeof w!=='string'||w.length>1000)))fail(t('backupUi.warnings'));
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
 catch{warnings.push(t('backupUi.storageWarning'))}
 for(const fullKey of keys){
  const key=fullKey.slice(6);
  try{const raw=storage.getItem(fullKey);if(raw!==null)personal[key]=personalValue(key,jsonCopy(JSON.parse(raw)))}
  catch{warnings.push(t('backupUi.damagedWarning',{name:key}))}
 }
 const backup={version:2,app:'SALAH',exportedAt:now.toISOString(),settings:nextSettings,history:nextHistory,personal,warnings:[...new Set(warnings)]};
 if(byteSize(backup)>MAX_BYTES)fail(t('backupUi.exportSize'));
 return backup;
}
// Only the prepared object that was shown to the user may be applied.
export function restoreBackup(prepared,{storage=localStorage,confirmed=false}={}){
 if(confirmed!==true)fail(t('backupUi.confirmFirst'));
 const fingerprint=preparedBackups.get(prepared);
 if(!fingerprint||fingerprint!==JSON.stringify(prepared))fail(t('backupUi.changed'));
 const backup=validDocument(prepared.backup);
 // Restoring an older file must not subtract account-backed lifetime totals.
 if(storage.getItem('salah:counter-active-account')&&storage.getItem('salah:counter-active-account')!=='guest'){
  const current=storage.getItem('salah:adhkar-progress-v2');
  if(current){const old=JSON.parse(current);counts(old.totals,t('backupUi.accountCounters'));const incoming=backup.personal['adhkar-progress-v2']||{version:2,totals:{},days:{}};for(const [id,n]of Object.entries(old.totals))incoming.totals[id]=Math.max(incoming.totals[id]||0,n);backup.personal['adhkar-progress-v2']=incoming;}
 }
 const writes=[['salah:settings',JSON.stringify(backup.settings)],['salah:history',JSON.stringify(backup.history)],...Object.entries(backup.personal).map(([key,value])=>['salah:'+key,JSON.stringify(value)])];
 const previous=[];
 try{for(const [key]of writes)previous.push([key,storage.getItem(key)])}
 catch{storageProblem(t('backupUi.restoreStorage'));fail(t('backupUi.restoreStorage'))}
 let attempted=0;
 try{for(const [key,raw]of writes){attempted++;storage.setItem(key,raw)}}
 catch{
  let rollbackFailed=false;
  // Free the newly written bytes first, then put back the original raw values.
  for(const [key]of previous.slice(0,attempted))try{storage.removeItem(key)}catch{rollbackFailed=true}
  for(const [key,raw]of previous.slice(0,attempted))if(raw!==null)try{storage.setItem(key,raw)}catch{rollbackFailed=true}
  storageProblem(t('backupUi.restoreFailed'));
  const error=Error(rollbackFailed?t('backupUi.rollbackFailed'):t('backupUi.rollbackOk'));
  error.rollbackFailed=rollbackFailed;throw error;
 }
 replacePersonalState(backup.settings,backup.history);preparedBackups.delete(prepared);
 return {ok:true,warnings:[...backup.warnings]};
}
