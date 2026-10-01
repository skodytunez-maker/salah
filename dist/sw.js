const CACHE='salah-shell-v57';
const ASSETS=["./","./index.html","./iphone.css","./icon-180.png","./style.css","./home-selected.css","./day-night.css","./weather.css","./js/weather-data.js","./js/day-night.js","./assets/day-mosque.webp","./knowledge.css","./quran.css","./js/quran.js","./js/quran-transcription.js","./js/tajweed.js","./js/quran-data.js","./js/quran-audio.js","./js/quran-reciters.js","./data/quran-index.json","./assets/amiri-quran.ttf","./assets/amiri-OFL.txt","./qibla.css","./js/qibla.js","./js/qibla-view.js","./js/qibla-math.js","./js/knowledge.js","./js/home-swipe.js","./assets/journal-bookmark.svg","./assets/house.svg","./assets/clock.svg","./assets/book.svg","./assets/three-dots.svg","./assets/gear.svg","./assets/person.svg","./assets/circle.svg","./js/app.js","./js/prayer-display.js","./js/home-event.js","./js/tahajjud.js","./js/learning.js","./js/learning-state.js","./js/adhkar.js","./js/adhkar-progress.js","./data/adhkar.json","./data/al-hakk-tyumen.json","./data/tyumen-october-2026.json","./assets/tyumen-october-2026.png","./data/learning-content.json","./data/learning-quran.json","./assets/night-mosque.webp","./assets/prayer-poses.png","./assets/star.svg","./assets/star-fill.svg","./assets/sun.svg","./assets/moon-stars.svg","./assets/list-ul.svg","./assets/arrow-left.svg","./assets/x-lg.svg","./assets/info-circle.svg","./js/storage.js","./js/backup.js","./js/prayers.js","./js/asr-first.js","./data/tyumen-first-asr.json","./js/weather.js","./js/ui.js","./manifest.json","./favicon.svg","./icon-192.png","./icon-512.png","./icon-maskable.png","./js/learning-illustrations.js","./js/reminders.js","./js/reminder-events.js","./reminders.css","./data/adhan-sources.json","./js/qibla-access.js","./js/geomagnetism.js","./assets/geomagnetism-LICENSE.txt","./js/orientation.js","./js/pwa-updates.js","./js/hijri.js","./js/sourced-audio.js","./data/learning-adhkar-audio-sources.json"];

const shellPaths=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).pathname));
const shellIndex=new URL('./index.html',self.registration.scope).href;
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(path=>new Request(new URL(path,self.registration.scope).href,{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('salah-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
function network(request,timeoutMs=3500){
 const controller=new AbortController();
 let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Network timeout'))},timeoutMs)});
 return Promise.race([fetch(request,{signal:controller.signal}),timeout]).finally(()=>clearTimeout(timer));
}
function remember(event,request,response){
 if(!response.ok||response.status===206||response.type!=='basic')return;
 const copy=response.clone();
 event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));
}
async function serve(event,url){
 const request=event.request;
 const cache=await caches.open(CACHE);
 if(request.mode==='navigate'){
  const cached=await cache.match(shellIndex);
  if(cached)return cached;
 }else if(shellPaths.has(url.pathname)){
  const cached=await cache.match(request,{ignoreSearch:true});
  if(cached)return cached;
 }
 try{
  const response=await network(request);
  if(response.ok){remember(event,request,response);return response}
  const cached=await cache.match(request);
  if(cached)return cached;
  if(request.mode==='navigate'){const index=await cache.match(shellIndex);if(index)return index}
  return response;
 }catch{
  const cached=await cache.match(request);
  return cached||(request.mode==='navigate'?await cache.match(shellIndex):null)||Response.error();
 }
}
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 // Quran's verified-byte loader owns its hash checks, writes and offline fallbacks.
 if(/\/data\/quran\/[^/]+\.json$/.test(url.pathname)||url.pathname.endsWith('/data/quran-search.json'))return;
 const response=isAdhan(url)?serveAdhan(event):serve(event,url);
 event.respondWith(response);
 // Keep this event active while a network response schedules its cache write.
 event.waitUntil(response.then(()=>{}).catch(()=>{}));
});

const ADHAN_CACHE='salah-adhan-audio-v1';
const audioDownloads=new Map();
function isAdhan(url){return /\/assets\/audio\/adhan-[\w-]+\.mp3$/.test(url.pathname)}
function completeAudio(response){return response?.status===200&&!response.headers.has('Content-Range')}
function audioRequest(request){
 const headers=new Headers(request.headers);headers.delete('Range');
 return new Request(request,{headers});
}
async function rangedAudio(response,range){
 if(!range)return response;
 const bytes=await response.arrayBuffer(),size=bytes.byteLength;
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);
 let start,end;
 if(match&&(match[1]||match[2])){
  if(match[1]){
   start=Number(match[1]);end=match[2]?Number(match[2]):size-1;
  }else{
   const suffix=Number(match[2]);if(Number.isSafeInteger(suffix)&&suffix>0){start=Math.max(0,size-suffix);end=size-1}
  }
 }
 const headers=new Headers(response.headers);headers.delete('Content-Encoding');headers.set('Accept-Ranges','bytes');
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){
  headers.set('Content-Range','bytes */'+size);headers.set('Content-Length','0');return new Response(null,{status:416,headers});
 }
 end=Math.min(end,size-1);
 headers.set('Content-Range','bytes '+start+'-'+end+'/'+size);headers.set('Content-Length',String(end-start+1));
 return new Response(bytes.slice(start,end+1),{status:206,statusText:'Partial Content',headers});
}
function saveFullAudio(event,request,cache){
 const key=request.url;
 if(!audioDownloads.has(key)){
  // This download runs after real playback use, without delaying the shell.
  const task=network(request,15000).then(response=>completeAudio(response)?cache.put(request,response):undefined).catch(()=>{}).finally(()=>audioDownloads.delete(key));
  audioDownloads.set(key,task);
 }
 event.waitUntil(audioDownloads.get(key));
}
async function serveAdhan(event){
 const request=event.request,fullRequest=audioRequest(request),cache=await caches.open(ADHAN_CACHE);
 const cached=await cache.match(fullRequest,{ignoreVary:true});
 if(completeAudio(cached))return rangedAudio(cached,request.headers.get('Range'));
 try{
  const response=await network(request);
  if(completeAudio(response))event.waitUntil(cache.put(fullRequest,response.clone()).catch(()=>{}));
  else if(response.status===206)saveFullAudio(event,fullRequest,cache);
  return response;
 }catch{return Response.error()}
}
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const fallback=new URL('./#home',self.registration.scope);
 let target=fallback;
 try{
  const value=event.notification.data?.url;
  if(typeof value==='string'&&value.length<=2048){
   const candidate=new URL(value,self.registration.scope);
   if(candidate.origin===fallback.origin&&candidate.pathname.startsWith(new URL(self.registration.scope).pathname))target=candidate;
  }
 }catch{}
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
  const client=clients.find(item=>{try{return new URL(item.url).origin===target.origin&&new URL(item.url).pathname.startsWith(new URL(self.registration.scope).pathname)}catch{return false}});
  if(client){if(client.navigate)await client.navigate(target.href);return client.focus()}
  return self.clients.openWindow(target.href);
 }));
});

self.addEventListener('message',event=>{if(event.data?.type==='SALAH_APPLY_UPDATE')event.waitUntil(self.skipWaiting())});
