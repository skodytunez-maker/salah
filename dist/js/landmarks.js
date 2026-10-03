// The catalogue and chosen city's pair are fetched only when this mode is used.
export const LANDMARK_CACHE='salah-landmarks-v1';
const base=new URL('../',import.meta.url),catalogUrl=new URL('wallpapers/catalog.json',base).href;
const validPoint=c=>Number.isFinite(c?.latitude)&&Math.abs(c.latitude)<=90&&Number.isFinite(c?.longitude)&&Math.abs(c.longitude)<=180;
export function landmarkDistance(a,b){
 if(!validPoint(a)||!validPoint(b))return Infinity;
 const rad=Math.PI/180,dlat=(b.latitude-a.latitude)*rad,dlon=(b.longitude-a.longitude)*rad;
 const h=Math.sin(dlat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dlon/2)**2;
 return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function validateLandmarkCatalog(value){
 if(value?.version!==1||!Array.isArray(value.cities)||value.cities.length>500)return [];
 return value.cities.filter(c=>/^[a-z0-9-]{1,60}$/.test(c?.id)&&validPoint(c)&&Number.isFinite(c.radius)&&c.radius>0&&c.radius<=80&&typeof c.name==='string'&&c.name.length<=120&&typeof c.landmark==='string'&&c.landmark.length<=120&&['day','night','mask'].every(key=>typeof c[key]==='string'&&new RegExp('^wallpapers/'+c.id+'/[a-z0-9-]+\\.'+(key==='mask'?'svg':'webp')+'$').test(c[key])));
}
export function matchLandmark(city,catalog){return catalog.filter(c=>landmarkDistance(city,c)<=c.radius).sort((a,b)=>landmarkDistance(city,a)-landmarkDistance(city,b))[0]||null}
const abort=signal=>{if(signal?.aborted)throw Object.assign(new Error('Aborted'),{name:'AbortError'})};
export function createLandmarkLoader({fetcher=globalThis.fetch,cacheStorage=globalThis.caches}={}){
 let catalogTask=null;
 async function cache(){try{return await cacheStorage?.open(LANDMARK_CACHE)}catch{return null}}
 async function publicFile(url,signal,{type,limit}){
  abort(signal);const store=await cache();let response=await store?.match(url).catch(()=>null);
  if(!response){response=await fetcher(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Landmark download failed');}
  const contentType=response.headers.get('Content-Type')||'';
  if(!type.test(contentType))throw Error('Unexpected landmark format');
  const bytes=await response.clone().arrayBuffer();abort(signal);if(bytes.byteLength>limit)throw Error('Landmark too large');
  if(store)await store.put(url,response.clone()).catch(()=>{});
  return response;
 }
 async function catalogue(){
  // A single small catalogue request, shared by simultaneous scene updates.
  const store=await cache();let response;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{response=await fetcher(catalogUrl,{credentials:'omit',cache:'no-cache',referrerPolicy:'no-referrer',signal:controller.signal});if(!response.ok)throw Error('Catalogue unavailable');const bytes=await response.clone().arrayBuffer();if(bytes.byteLength>131072)throw Error('Catalogue too large');const entries=validateLandmarkCatalog(await response.clone().json());if(!entries.length)throw Error('Invalid catalogue');await store?.put(catalogUrl,response.clone()).catch(()=>{});return entries}
  catch{response=await store?.match(catalogUrl).catch(()=>null);return response?validateLandmarkCatalog(await response.json()):[]}
  finally{clearTimeout(timer)}
 }
 return async function load(city,{signal}={}){
  abort(signal);const entries=await(catalogTask??=catalogue().then(entries=>{if(!entries.length)catalogTask=null;return entries})),entry=matchLandmark(city,entries);abort(signal);
  if(!entry)return {status:entries.length?'unavailable':'offline',entry:null};
  const responses=await Promise.all(['day','night','mask'].map(key=>publicFile(new URL(entry[key],base).href,signal,{type:key==='mask'?/image\/svg\+xml/:/image\/webp/,limit:key==='mask'?32768:3145728})));
  abort(signal);
  const blobs=await Promise.all(responses.map(r=>r.blob()));abort(signal);
  // Keep just the selected pair and mask. User counters/settings use other stores.
  const store=await cache(),keep=new Set([catalogUrl,...['day','night','mask'].map(k=>new URL(entry[k],base).href)]);
  if(store)for(const request of await store.keys())if(!keep.has(request.url))await store.delete(request).catch(()=>{});
  return {status:'ready',entry,blobs};
 };
}
export const loadLandmark=createLandmarkLoader();
