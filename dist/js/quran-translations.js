// Meaning translations are independent of the interface language and Arabic
// Quran edition. Every downloaded publisher response is pinned to this release.
export const QURAN_TRANSLATION_CACHE='salah-quran-translations-v1';
export const BUNDLED_TRANSLATION_ID='ru.kuliev';
export const QURAN_TRANSLATION_IDS=Object.freeze([BUNDLED_TRANSLATION_ID,'quranenc.azeri_musayev','quranenc.german_bubenheim','quranenc.kazakh_altai','quranenc.uzbek_sadiq','quranenc.uzbek_mansour','quranenc.tajik_arifi','quranenc.english_saheeh']);
export const TRANSLATION_MANIFEST_SHA256='05394d9dc4a7c068aa6b85ac40316eb3aa8345cf132d723a0fd81f05b0470a6c';
const TRANSLATION_LIMIT=2_000_000;
const activeTranslationDownloads=new Set();
const reflectTranslationDownloads=()=>{const data=globalThis.document?.documentElement?.dataset;if(data){if(activeTranslationDownloads.size)data.translationTextDownload='active';else delete data.translationTextDownload;}};
export async function pauseTranslationDownloads(){const active=[...activeTranslationDownloads];for(const entry of active)entry.controller.abort();await Promise.allSettled(active.map(entry=>entry.task));}

const translationFailure=code=>{const error=Error(code);error.code=code;return error;};
const translationRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const translationHex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const translationInteger=value=>typeof value==='string'&&/^[1-9]\d*$/.test(value)?Number(value):Number.isInteger(value)?value:NaN;
function translationManifestValid(value){
 if(!translationRecord(value)||value.format!=='salah-quran-translations-v1'||!/^\d{4}-\d{2}-\d{2}$/.test(value.verifiedAt||'')||value.surahAyahs?.length!==114||value.surahAyahs.some(n=>!Number.isInteger(n)||n<1||n>286)||value.surahAyahs.reduce((n,v)=>n+v,0)!==6236||!Array.isArray(value.editions)||!value.editions.length||value.editions.length>32)throw translationFailure('translation_manifest_invalid');
 const ids=new Set();
 for(const row of value.editions){
  if(!translationRecord(row)||!/^[a-z][a-z_]{2,70}$/.test(row.providerKey||'')||row.id!=='quranenc.'+row.providerKey||ids.has(row.id)||!['en','az','tg','uz','kk','de'].includes(row.language)||!['Latn','Cyrl'].includes(row.script)||row.direction!=='ltr'||typeof row.author!=='string'||!row.author.trim()||row.author.length>200||!/^\d+[.]\d+[.]\d+$/.test(row.version||'')||row.format!=='publisher-api-v1'||row.publisher!=='QuranEnc.com'||row.source!=='https://quranenc.com/en/browse/'+row.providerKey||row.terms!=='https://quranenc.com/en/home'||row.surahSha256?.length!==114||!row.surahSha256.every(translationHex))throw translationFailure('translation_manifest_invalid');
  ids.add(row.id);
 }
 return value;
}
async function translationBytes(response,maximum=TRANSLATION_LIMIT){
 if(!response?.ok)throw translationFailure('translation_unavailable');
 const length=Number(response.headers?.get('Content-Length'));if(Number.isFinite(length)&&length>maximum)throw translationFailure('translation_too_large');
 if(!response.body?.getReader){const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength>maximum)throw translationFailure('translation_too_large');return bytes;}
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const{value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();throw translationFailure('translation_too_large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}return bytes;
}
// Dependencies are injectable for offline/corruption/cancellation verification.
// This library never changes settings, reading positions, audio or permissions.
export function createQuranTranslationLibrary({fetcher=(...args)=>fetch(...args),cacheStorage=globalThis.caches,cryptography=globalThis.crypto,baseURL=globalThis.location?.href||'https://skodytunez-maker.github.io/salah/',timeoutMs=25000}={}){
 let manifestPromise=null;
 const digest=async bytes=>Array.from(new Uint8Array(await cryptography.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 async function verify(response,hash,maximum=TRANSLATION_LIMIT){const bytes=await translationBytes(response,maximum);if(await digest(bytes)!==hash)throw translationFailure('translation_integrity_failed');let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw translationFailure('translation_invalid');}return{bytes,value};}
 async function requestFile(url,hash,maximum=TRANSLATION_LIMIT,signal){
  if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
  const controller=new AbortController(),abort=()=>controller.abort(signal.reason),timer=setTimeout(()=>controller.abort(),timeoutMs);
  signal?.addEventListener('abort',abort,{once:true});
  try{return await verify(await fetcher(url,{mode:'cors',credentials:'omit',cache:'no-cache',redirect:'error',signal:controller.signal}),hash,maximum);}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
 async function manifest(){
  if(!manifestPromise)manifestPromise=(async()=>{
   const file=await requestFile(new URL('./data/quran-translation-manifest.json',baseURL).href,TRANSLATION_MANIFEST_SHA256,200000);
   return translationManifestValid(file.value);
  })().catch(error=>{manifestPromise=null;throw error;});
  return manifestPromise;
 }
 async function edition(id){const data=await manifest(),found=data.editions.find(row=>row.id===id);if(!found)throw translationFailure('translation_unknown');return{data,row:found};}
 async function openCache(required=false){try{const cache=await cacheStorage?.open(QURAN_TRANSLATION_CACHE);if(cache)return cache;}catch{}if(required)throw translationFailure('translation_storage_unavailable');return null;}
 function validateSurah(value,data,row,surah){
  const count=data.surahAyahs[surah-1],start=data.surahAyahs.slice(0,surah-1).reduce((n,v)=>n+v,0);
  if(!translationRecord(value)||!Array.isArray(value.result)||value.result.length!==count)throw translationFailure('translation_incomplete');
  const verses=value.result.map((item,i)=>{
   if(!translationRecord(item)||translationInteger(item.id)!==start+i+1||translationInteger(item.sura)!==surah||translationInteger(item.aya)!==i+1||typeof item.translation!=='string'||!item.translation.trim()||typeof item.arabic_text!=='string'||!item.arabic_text.trim()||!Object.hasOwn(item,'footnotes')||item.footnotes!==null&&typeof item.footnotes!=='string')throw translationFailure('translation_incomplete');
   // Preserve the publisher's numbering, whitespace, footnote markers and text.
   return Object.freeze({number:start+i+1,ayah:i+1,translation:item.translation,footnotes:item.footnotes,sourceArabic:item.arabic_text});
  });
  return Object.freeze({edition:row.id,number:surah,language:row.language,script:row.script,direction:row.direction,author:row.author,version:row.version,publisher:row.publisher,source:row.source,verifiedAt:data.verifiedAt,verses:Object.freeze(verses)});
 }
 function cacheKey(row,surah){return new URL('./data/translation-cache/'+row.providerKey+'/'+row.version+'/'+row.surahSha256[surah-1]+'/'+surah+'.json',baseURL).href;}
 async function cachedSurah(cache,row,data,surah){
  if(!cache)return null;
  const key=cacheKey(row,surah);
  try{const response=await cache.match(key);if(!response)return null;const file=await verify(response,row.surahSha256[surah-1]);return validateSurah(file.value,data,row,surah);}catch{try{await cache.delete(key);}catch{}return null;}
 }
 async function loadSurah(id,surah,{requireStored=false,signal}={}){
  if(!Number.isInteger(surah)||surah<1||surah>114)throw translationFailure('translation_surah_invalid');
  const{data,row}=await edition(id),cache=await openCache(requireStored),stored=await cachedSurah(cache,row,data,surah);
  if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
  if(stored)return stored;
  const file=await requestFile('https://quranenc.com/api/v1/translation/sura/'+row.providerKey+'/'+surah,row.surahSha256[surah-1],TRANSLATION_LIMIT,signal);
  const result=validateSurah(file.value,data,row,surah);
  if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
  if(cache)try{await cache.put(cacheKey(row,surah),new Response(file.bytes,{headers:{'Content-Type':'application/json; charset=utf-8'}}));if(requireStored&&!await cachedSurah(cache,row,data,surah))throw Error();}catch{if(requireStored)throw translationFailure('translation_store_failed');}
  return result;
 }
 function saveAll(id,{onProgress=()=>{},signal:outerSignal,concurrency=3,yieldWork=()=>Promise.resolve()}={}){
  const controller=new AbortController(),signal=controller.signal,abort=()=>controller.abort();if(outerSignal?.aborted)abort();else outerSignal?.addEventListener('abort',abort,{once:true});
  const entry={controller,task:null};entry.task=(async()=>{
   if(signal.aborted)throw new DOMException('Paused','AbortError');await edition(id);await openCache(true);let next=1,done=0;
   const results=await Promise.allSettled(Array.from({length:Math.max(1,Math.min(3,Math.floor(Number(concurrency)||3)))},async()=>{while(next<=114){const surah=next++;await yieldWork();if(signal.aborted)throw new DOMException('Paused','AbortError');await loadSurah(id,surah,{requireStored:true,signal});onProgress(++done,114);}}));
   const failed=results.find(row=>row.status==='rejected');if(failed)throw failed.reason;return done;
  })().finally(()=>{outerSignal?.removeEventListener('abort',abort);activeTranslationDownloads.delete(entry);reflectTranslationDownloads();});activeTranslationDownloads.add(entry);reflectTranslationDownloads();return entry.task;
 }

 async function searchRows(id,{signal,onProgress=()=>{}}={}){
  const rows=[];for(let number=1;number<=114;number++){
   const surah=await loadSurah(id,number,{signal});for(const verse of surah.verses)rows.push({surah:number,ayah:verse.ayah,text:verse.translation});onProgress(number,114);
  }
  if(rows.length!==6236)throw translationFailure('translation_incomplete');return rows;
 }
 async function savedCount(id){const{data,row}=await edition(id),cache=await openCache();if(!cache)return 0;let count=0;for(let surah=1;surah<=114;surah++)if(await cachedSurah(cache,row,data,surah))count++;return count;}
 async function list(){const data=await manifest();return data.editions.map(({surahSha256,databaseComparisonSha256,...row})=>Object.freeze({...row,verifiedAt:data.verifiedAt}));}
 return Object.freeze({list,loadSurah,saveAll,searchRows,savedCount});
}
export const quranTranslations=createQuranTranslationLibrary();
