import{reciterInfo}from './quran-reciters.js';
export const TIMING_CACHE='salah-quran-timing-v1';
const MAX_TIME=24*60*60;
export function timingUrl(surah,reciter){
 const r=reciterInfo(reciter);
 if(r.format!=='surah'||!Number.isInteger(r.timingRead)||r.timingServer!==r.server||!Number.isInteger(surah?.number)||surah.number<1||surah.number>114)return null;
 return 'https://www.mp3quran.net/api/v3/ayat_timing?surah='+surah.number+'&read='+r.timingRead;
}
// Accept a complete, ordered table for this exact recording. Intro and gaps
// remain unlabelled; incomplete tables must never invent an ayah number.
export function normalizeTimings(rows,count){
 if(!Number.isInteger(count)||count<1||count>286||!Array.isArray(rows)||rows.length<count||rows.length>count+1)return null;
 const result=[];let previousEnd=0,nextAyah=1;
 for(const row of rows){
  const ayah=row?.ayah,start=row?.start_time/1000,end=row?.end_time/1000;
  if(!Number.isInteger(ayah)||ayah<0||ayah>count||typeof row.start_time!=='number'||typeof row.end_time!=='number'||!Number.isFinite(start)||!Number.isFinite(end)||start<previousEnd||end<=start||end>MAX_TIME)return null;
  if(ayah===0){if(result.length)return null}else if(ayah!==nextAyah++)return null;
  result.push({ayah,start,end});previousEnd=end;
 }
 return nextAyah===count+1?result:null;
}
export function ayahAtTime(timings,time){
 if(!Array.isArray(timings)||!Number.isFinite(time)||time<0)return null;
 let low=0,high=timings.length-1;
 while(low<=high){const mid=(low+high)>>1,row=timings[mid];if(time<row.start)high=mid-1;else if(time>=row.end)low=mid+1;else return row.ayah||null}
 return null;
}
export async function loadAyahTimings(surah,reciter,{signal,fetcher=globalThis.fetch,cacheStorage=globalThis.caches}={}){
 const url=timingUrl(surah,reciter),count=surah?.verses?.length;if(!url||signal?.aborted)return null;
 let cache;try{cache=await cacheStorage?.open(TIMING_CACHE);const saved=await cache?.match(url);if(saved){const table=normalizeTimings(await saved.json(),count);if(table)return signal?.aborted?null:table;await cache.delete(url)}}catch{}
 if(signal?.aborted)return null;
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});const timeout=setTimeout(abort,8000);
 try{
  const response=await fetcher(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok||controller.signal.aborted)return null;
  const text=await response.text();if(text.length>2000000||controller.signal.aborted)return null;
  const rows=JSON.parse(text),table=normalizeTimings(rows,count);if(!table)return null;
  // Store only the small validated timing fields, never provider HTML/SVG links.
  const safe=table.map(r=>({ayah:r.ayah,start_time:r.start*1000,end_time:r.end*1000}));
  try{if(!controller.signal.aborted)await cache?.put(url,new Response(JSON.stringify(safe),{headers:{'Content-Type':'application/json'}}))}catch{}
  return controller.signal.aborted?null:table;
 }catch{return null}finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort)}
}
