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
const CATALOG_URL=PROJECT+'/functions/v1/approved-catalog';
function completeCatalog(text){
 if(typeof text!=='string'||text.length>500000)throw Error('invalid_catalogue');
 const data=JSON.parse(text),rows=validateApprovedCatalog(data);
 if(data.version!==1||!Array.isArray(data.entries)||rows.length!==data.entries.length)throw Error('invalid_catalogue');
 return rows;
}
export function createApprovedCatalogLoader({fetcher=(...args)=>globalThis.fetch(...args),getCacheStorage=()=>globalThis.caches,now=()=>Date.now(),schedule=(...args)=>globalThis.setTimeout(...args),cancel=id=>globalThis.clearTimeout(id)}={}){
 let task=null,loadedAt=-Infinity,entries=[],opening=null,writing=false,queuedWrite=null;
 // CacheStorage has no abort contract. Share an outstanding open and never let
 // optional persistence own the network result or accumulate competing writes.
 const openCache=()=>{
  if(opening)return opening;
  const pending=Promise.resolve().then(()=>getCacheStorage()?.open('salah-approved-catalog-v1')).catch(()=>null);
  opening=pending;void pending.then(()=>{if(opening===pending)opening=null;});return pending;
 };
 const bounded=(start,ms,onTimeout=()=>{})=>{
  let timer;
  const deadline=new Promise((_,reject)=>{timer=schedule(()=>{try{onTimeout();}catch{}reject(Error('catalogue_timeout'));},ms);});
  return Promise.race([Promise.resolve().then(start),deadline]).finally(()=>cancel(timer));
 };
 const persist=(text,cache)=>{
  queuedWrite={text,cache};if(writing)return;writing=true;
  void(async()=>{try{while(queuedWrite){
   const current=queuedWrite;queuedWrite=null;
   try{const target=await current.cache;if(target)await target.put(CATALOG_URL,new Response(current.text,{headers:{'Content-Type':'application/json'}}));}catch{}
  }}finally{writing=false;}})();
 };
 return async function load(){
  if(task)return task;const age=now()-loadedAt;if(age>=0&&age<60000)return entries;
  const cache=openCache(),pending=(async()=>{
   try{
    const controller=new AbortController();
    const result=await bounded(async()=>{
     const response=await fetcher(CATALOG_URL,{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-cache',signal:controller.signal});
     if(!response.ok)throw Error('catalogue_unavailable');
     const text=await response.text();return{text,rows:completeCatalog(text)};
    },2500,()=>controller.abort());
    entries=result.rows;persist(result.text,cache);
   }catch{
    if(!entries.length)try{
     const saved=await bounded(async()=>{const target=await cache,response=await target?.match(CATALOG_URL);return response?completeCatalog(await response.text()):null;},1000);
     if(saved)entries=saved;
    }catch{}
   }
   loadedAt=now();return entries;
  })();task=pending;try{return await pending;}finally{if(task===pending)task=null;}
 };
}
const loadApprovedCatalog=createApprovedCatalogLoader();
export async function approvedCatalog(){return typeof window==='undefined'?[]:loadApprovedCatalog();}
export async function applyApprovedReciters(reciters,{updateExisting=true}={}){const rows=await approvedCatalog();for(const row of rows.filter(x=>x.kind==='reciter')){const existing=reciters.find(x=>x.id===row.id);if(existing&&updateExisting){for(const key of Object.keys(existing))delete existing[key];Object.assign(existing,row.payload);}else if(!existing)reciters.push({...row.payload});}return rows;}
export async function applyApprovedWallpapers(cities,validate){const rows=await approvedCatalog(),merged=[...cities];for(const row of rows.filter(x=>x.kind==='wallpaper')){if(!validate({version:1,cities:[row.payload]}).length)continue;const index=merged.findIndex(x=>x.id===row.id);if(index>=0)merged[index]=row.payload;else merged.push(row.payload);}return merged;}
