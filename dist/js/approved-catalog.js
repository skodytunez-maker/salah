const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const PREFIX=PROJECT+'/storage/v1/object/public/salah-curated/';
const knownAudio=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&(/^server\d{1,2}\.mp3quran\.net$/.test(u.hostname)||['cdn.mp3quran.net','archive.org','ummah.su'].includes(u.hostname)||/^ia\d+\.(?:us\.)?archive\.org$/.test(u.hostname));}catch{return false;}};
export function curatedAsset(value,kind,id,extension){return typeof value==='string'&&value.startsWith(PREFIX+kind+'/'+id+'/')&&new RegExp('^'+PREFIX.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+kind+'/'+id.replace(/\./g,'\\.')+'/[0-9a-f-]{36}/[a-z-]+\\.'+extension+'$').test(value);}
export function reciterImageUrl(value){return typeof value==='string'&&value.startsWith(PROJECT+'/storage/v1/object/public/salah-curated/reciter/')?value:'./'+(value||'assets/person.svg');}
export function validateApprovedCatalog(data){
 if(data?.version!==1||!Array.isArray(data.entries)||data.entries.length>200)return[];
 return data.entries.filter(x=>{
  if(!Number.isSafeInteger(x?.revision)||x.revision<1||!x.payload||x.payload.id!==x.id||typeof x.payload.name!=='string'||!x.payload.name||x.payload.name.length>120)return false;
  const p=x.payload;
  if(x.kind==='reciter')return /^ar\.[a-z][a-z0-9-]{1,70}$/.test(x.id)&&['verse','surah'].includes(p.format)&&(!p.server||knownAudio(p.server))&&(!p.folder||/^[A-Za-z0-9_-]{1,100}$/.test(p.folder))&&(!p.availableSurahs||Array.isArray(p.availableSurahs)&&p.availableSurahs.length<=114&&p.availableSurahs.every(n=>Number.isInteger(n)&&n>=1&&n<=114))&&(!p.group||['makkah','madinah'].includes(p.group))&&typeof p.portrait==='string'&&(/^assets\/reciters\/[a-z0-9-]+\.(?:jpg|png|webp)$/.test(p.portrait)||curatedAsset(p.portrait,'reciter',x.id,'jpg'));
  return x.kind==='wallpaper'&&/^[a-z0-9][a-z0-9-]{1,59}$/.test(x.id);
 }).map(x=>({kind:x.kind,id:x.id,payload:x.payload,revision:x.revision}));
}
let task=null,loadedAt=0,entries=[];
export async function approvedCatalog(){
 if(typeof window==='undefined')return[];
 if(task)return task;if(Date.now()-loadedAt<60000)return entries;
 task=(async()=>{const url=PROJECT+'/functions/v1/approved-catalog';let cache;try{cache=await globalThis.caches?.open('salah-approved-catalog-v1');}catch{}try{const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-cache',signal:AbortSignal.timeout(2500)});if(!response.ok)throw Error();const text=await response.text();if(text.length>500000)throw Error();const data=JSON.parse(text);entries=validateApprovedCatalog(data);if(data.version!==1||!Array.isArray(data.entries)||entries.length!==data.entries.length)throw Error();await cache?.put(url,new Response(text,{headers:{'Content-Type':'application/json'}}));loadedAt=Date.now();}catch{if(!entries.length){try{const saved=await cache?.match(url);if(saved)entries=validateApprovedCatalog(await saved.json());}catch{}}loadedAt=Date.now();}return entries;})();try{return await task;}finally{task=null;}
}
export async function applyApprovedReciters(reciters,{updateExisting=true}={}){const rows=await approvedCatalog();for(const row of rows.filter(x=>x.kind==='reciter')){const existing=reciters.find(x=>x.id===row.id);if(existing&&updateExisting){for(const key of Object.keys(existing))delete existing[key];Object.assign(existing,row.payload);}else if(!existing)reciters.push({...row.payload});}return rows;}
export async function applyApprovedWallpapers(cities,validate){const rows=await approvedCatalog(),merged=[...cities];for(const row of rows.filter(x=>x.kind==='wallpaper')){if(!validate({version:1,cities:[row.payload]}).length)continue;const index=merged.findIndex(x=>x.id===row.id);if(index>=0)merged[index]=row.payload;else merged.push(row.payload);}return merged;}
