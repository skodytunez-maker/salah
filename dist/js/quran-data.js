import{loadAyahTimings}from './quran-timing.js';
import{arabicReadingKey}from './quran-transcription.js';
import{reciterInfo,reciterHasSurah}from './quran-reciters.js';
export const TEXT_CACHE='salah-quran-text-v1';
export const AUDIO_CACHE='salah-quran-audio-v1';
let indexPromise=null,searchPromise=null;
const surahPromises=new Map();
export function validPosition(index,value){return !!value&&Number.isInteger(value.surah)&&Number.isInteger(value.ayah)&&value.surah>=1&&value.surah<=114&&value.ayah>=1&&value.ayah<=index.surahs[value.surah-1].ayahs}
export function normalizeQuery(text){return String(text).toLocaleLowerCase('ru').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ё/g,'е').replace(/[‘’'«»]/g,'').trim()}
export async function loadIndex(){
 if(!indexPromise)indexPromise=(async()=>{const r=await fetch('./data/quran-index.json');if(!r.ok)throw Error('Библиотека недоступна');const j=await r.json();if(j.surahs?.length!==114||j.juz?.length!==30||j.surahs.some((s,i)=>s.number!==i+1||!Number.isInteger(s.ayahs)||s.ayahs<1))throw Error('Неполная библиотека');audioPositions={};let global=1;for(const s of j.surahs)for(let a=1;a<=s.ayahs;a++)audioPositions[global++]={surah:s.number,ayah:a};return j})().catch(e=>{indexPromise=null;throw e});return indexPromise
}
async function verifiedResponse(response,hash,validate){
 if(!response?.ok)throw Error('Файл недоступен');
 const bytes=await response.arrayBuffer();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(digest!==hash)throw Error('Не удалось проверить текст. Повторите загрузку.');
 const result=JSON.parse(new TextDecoder().decode(bytes));
 validate?.(result);
 return {bytes,result}
}
async function verifiedFile(path,hash,{validate,cachedFirst=false,requireStored=false,timeoutMs=0}={}){
 const url=new URL(path,location.href).href;let cache=null,cached=null;
 if('caches'in window)try{cache=await caches.open(TEXT_CACHE)}catch{}
 if(requireStored&&!cache)throw Error('Офлайн-хранилище недоступно');
 if(cache)try{const response=await cache.match(url);if(response)cached=await verifiedResponse(response,hash,validate)}catch{/* An old or damaged file cannot be used as Quran text. */}
 if(cachedFirst&&cached)return cached.result;
 let file;
 const controller=timeoutMs?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
 try{file=await verifiedResponse(await fetch(url,{cache:'no-cache',...(controller?{signal:controller.signal}:{})}),hash,validate)}catch(error){if(cached)return cached.result;throw error}finally{if(timer)clearTimeout(timer)}
 if(cache)try{
  // Keep the original verified bytes: serializing JSON again can change its hash.
  await cache.put(url,new Response(file.bytes,{headers:{'Content-Type':'application/json'}}));
  if(requireStored)await verifiedResponse(await cache.match(url),hash,validate);
 }catch{if(requireStored)throw Error('Не удалось сохранить тексты. Проверьте свободное место.')}
 return file.result
}
function verifySurah(data,meta){if(data.number!==meta.number||data.verses?.length!==meta.ayahs||data.verses.some((v,i)=>v.ayah!==i+1||!Number.isInteger(v.number)||!Number.isInteger(v.juz)||v.juz<1||v.juz>30||!v.arabic||!v.translation||!v.transliteration))throw Error('Неполный текст суры')}
function verifySearch(rows,index){if(!Array.isArray(rows)||rows.length!==6236||rows.some(v=>!validPosition(index,v)||typeof v.text!=='string'))throw Error('Поиск недоступен')}
function verifyReading(data,meta,surah){if(data?.edition!=='salah-reading-v2'||data.number!==meta.number||data.sourceSha256!==meta.sha256||data.verses?.length!==surah.verses.length||data.verses.some((v,i)=>v.ayah!==surah.verses[i].ayah||v.arabicKey!==arabicReadingKey(surah.verses[i].arabic)||typeof v.text!=='string'||!v.text.trim()))throw Error('Транскрипция не соответствует арабскому тексту')}
async function loadReading(surah,meta,{requireStored=false}={}){if(!meta.readingSha256)return surah;const data=await verifiedFile('./data/quran-reading/'+meta.number+'.json',meta.readingSha256,{validate:data=>verifyReading(data,meta,surah),cachedFirst:true,requireStored,timeoutMs:3000});return {...surah,salahReading:data}}
export async function loadSurah(number){
 const index=await loadIndex();const meta=index.surahs[number-1];if(!meta||meta.number!==number)throw Error('Неизвестная сура');
 if(!surahPromises.has(number))surahPromises.set(number,verifiedFile('./data/quran/'+number+'.json',meta.sha256,{validate:data=>verifySurah(data,meta)}).then(async data=>{try{return await loadReading(data,meta)}catch{return data}}).catch(e=>{surahPromises.delete(number);throw e}));
 return surahPromises.get(number)
}
export async function loadSearch(){
 const index=await loadIndex();if(!searchPromise)searchPromise=verifiedFile('./data/quran-search.json',index.searchSha256,{validate:rows=>verifySearch(rows,index)}).catch(e=>{searchPromise=null;throw e});return searchPromise
}
export function searchSurahs(index,query){const q=normalizeQuery(query);return index.surahs.filter(s=>[s.name,s.arabicName,s.englishName,s.meaning,String(s.number)].some(x=>normalizeQuery(x).includes(q)))}
export function searchTranslation(rows,query,limit=50){const q=normalizeQuery(query);return rows.filter(v=>normalizeQuery(v.text).includes(q)).slice(0,limit)}
export async function offlineTextCount(index){
 if(!('caches'in window))return 0;const cache=await caches.open(TEXT_CACHE);let count=0;
 for(const surah of index.surahs)try{const response=await cache.match(new URL('./data/quran/'+surah.number+'.json',location.href).href);if(response){const stored=await verifiedResponse(response,surah.sha256,data=>verifySurah(data,surah));if(surah.readingSha256)await verifiedResponse(await cache.match(new URL('./data/quran-reading/'+surah.number+'.json',location.href).href),surah.readingSha256,data=>verifyReading(data,surah,stored.result));count++}}catch{}return count
}
export async function saveAllTexts(index,onProgress){
 if(!('caches'in window))throw Error('Офлайн-хранилище недоступно');let next=1,done=0;
 const results=await Promise.allSettled(Array.from({length:3},async()=>{while(next<=114){const number=next++,meta=index.surahs[number-1];const source=await verifiedFile('./data/quran/'+number+'.json',meta.sha256,{validate:data=>verifySurah(data,meta),cachedFirst:true,requireStored:true});await loadReading(source,meta,{requireStored:true});onProgress(++done)}}));
 const failed=results.find(result=>result.status==='rejected');if(failed)throw failed.reason;
 // The translation search is part of offline reading, so save it with the texts.
 await verifiedFile('./data/quran-search.json',index.searchSha256,{validate:rows=>verifySearch(rows,index),cachedFirst:true,requireStored:true});
}
export function audioUrl(number,reciter,surahNumber){if(!Number.isInteger(number)||number<1||number>6236)throw Error('Неизвестная аудиозапись');const r=reciterInfo(reciter);if(r.format==='surah'){if(!Number.isInteger(surahNumber)||surahNumber<1||surahNumber>114||!reciterHasSurah(reciter,surahNumber))throw Error('Неизвестная сура');return r.server+String(surahNumber).padStart(3,'0')+'.mp3'}if(r.folder){const s=numberToPosition(number);return 'https://everyayah.com/data/'+r.folder+'/'+String(s.surah).padStart(3,'0')+String(s.ayah).padStart(3,'0')+'.mp3'}return 'https://cdn.islamic.network/quran/audio/128/'+reciter+'/'+number+'.mp3'}
function numberToPosition(number){if(!audioPositions)throw Error('Библиотека не загружена');return audioPositions[number]}
let audioPositions=null;

export function estimatedAudioBytes(surah){return Math.round(surah.verses.reduce((sum,v)=>sum+[...v.arabic].length,0)/15*16000)}
export async function saveSurahAudio(surah,reciter,onProgress,signal){
 if(!('caches'in window))throw Error('Офлайн-хранилище недоступно');const cache=await caches.open(AUDIO_CACHE);let next=0,done=0,bytes=0;const verses=reciterInfo(reciter).format==='surah'?[surah.verses[0]]:surah.verses;
 await Promise.all(Array.from({length:2},async()=>{while(next<verses.length){if(signal.aborted)throw new DOMException('Загрузка отменена','AbortError');const v=verses[next++],url=audioUrl(v.number,reciter,surah.number);let r=await cache.match(url);if(!r){r=await fetch(url,{signal});if(!r.ok||r.type==='opaque'||!r.headers.get('Content-Type')?.startsWith('audio/'))throw Error('Аудио не удалось загрузить');const blob=await r.blob();bytes+=blob.size;await cache.put(url,new Response(blob,{headers:{'Content-Type':'audio/mpeg'}}))}else bytes+=(await r.blob()).size;onProgress(++done,bytes)}}));await loadAyahTimings(surah,reciter,{signal});if(signal.aborted)throw new DOMException('Загрузка отменена','AbortError');return bytes
}
