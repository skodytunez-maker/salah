const CACHE='salah-shell-v244';
const ASSETS=["./soft-depth.css","./js/soft-depth.js","./js/quran-reciter-favorites.js","./js/quran-reciter-library.js","./js/quran-reciter-recording.js","./js/native-support-core.js","./js/native-support-push.js","./js/support-photo-save.js","./js/support-notice.js","./js/home-reading.js","./js/home-reading-core.js","./js/qr-scanner.js","./js/vendor/jsQR.js","./js/vendor/jsQR-LICENSE.txt","./js/vendor/jsQR-source.json","./js/account-devices.js","./css/account-devices.css","./js/error-reporting.js","./js/owner-error-summary.js","./css/error-summary.css","./js/qr-login.js","./css/qr-login.css","./js/vendor/qrcode-generator.js","./js/vendor/qrcode-generator-LICENSE.txt","./js/quran-offline-store.js","./js/quran-offline-core.js","./js/quran-downloads.js","./js/dua-search.js","./js/reminder-before.js","./js/native-widget.js","./js/owner-release-card.js","./js/swipe-motion.js","./js/adhkar-swipe.js","./js/edge-back.js","./js/app-start.js","./js/owner-card-navigation.js","./js/owner-user-card.js","./js/notification-invite.js","./js/dhikr-reminder.js","./js/wallpaper-layout.js","./js/notification-status.js","./js/audio-focus.js","./js/ambient-audio.js","./js/ambient-settings.js","./js/support-client.js","./js/support-diagnostics.js","./js/support-photo.js","./js/owner-support-status.js","./js/user-support-status.js","./js/support-transport.js","./js/support.js","./css/support.css","./js/landmark-settings.js","./umrah.css","./js/umrah.js","./js/umrah-content.js","./js/umrah-illustrations.js","./js/haramain-schedule.js","./js/landmarks.js","./assets/landmark.svg","./js/broadcast-audio.js","./js/vendor/hls-light.min.js","./js/vendor/hls-LICENSE.txt","./js/quran-timing.js","./js/quran-broadcast.js","./daily-dua.css","./js/daily-dua.js","./js/daily-dua-core.js","./data/daily-dua.json","./data/quran-reading-LICENSE.txt","./js/account-presence.js","./js/app-release.js","./assets/salah-qr.svg","./assets/salah-qr.png","./js/app-sharing.js","./js/free-counter.js","./js/auth-transport.js","./js/auth-session.js","./assets/window-sky-mask.svg","./js/vendor/suncalc.js","./js/vendor/suncalc-LICENSE.txt","./js/vendor/suncalc-source.json","./assets/window-weather-mask.svg","./js/counter-account.js","./js/counter-sync-core.js","./assets/window-moon.webp","./js/wallpapers.js","./assets/window-new-york-night.webp","./assets/window-new-york-day.webp","./js/city-dialog.js","./js/city-data.js","./owner.html","./owner-manifest.json","./js/owner-entry.js","./","./index.html","./iphone.css","./icon-180.png","./style.css","./home-selected.css","./day-night.css","./weather.css","./js/weather-data.js","./js/day-night.js","./assets/day-mosque.webp","./knowledge.css","./quran.css","./js/quran.js","./js/quran-transcription.js","./js/tajweed.js","./js/quran-data.js","./js/quran-audio.js","./js/quran-session.js","./js/quran-player-bar.js","./quran-player.css","./js/quran-reciters.js","./data/quran-index.json","./assets/amiri-quran.ttf","./assets/amiri-OFL.txt","./qibla.css","./js/qibla.js","./js/qibla-view.js","./js/qibla-math.js","./js/knowledge.js","./js/home-swipe.js","./assets/journal-bookmark.svg","./assets/house.svg","./assets/clock.svg","./assets/book.svg","./assets/three-dots.svg","./assets/gear.svg","./assets/person.svg","./assets/circle.svg","./js/app.js","./js/prayer-display.js","./js/home-event.js","./js/tahajjud.js","./js/learning.js","./js/learning-state.js","./js/adhkar.js","./js/adhkar-progress.js","./js/adhkar-period.js","./js/calendar-pdf.js","./js/analytics.js","./js/admin.js","./js/owner-auth.js","./js/vendor/supabase.js","./js/vendor/supabase-LICENSE.txt","./assets/salah-mark.svg","./data/adhkar.json","./data/al-hakk-tyumen.json","./data/tyumen-october-2026.json","./assets/tyumen-october-2026.png","./data/learning-content.json","./data/learning-quran.json","./assets/night-mosque.webp","./assets/prayer-poses.png","./assets/star.svg","./assets/star-fill.svg","./assets/sun.svg","./assets/moon-stars.svg","./assets/list-ul.svg","./assets/arrow-left.svg","./assets/x-lg.svg","./assets/info-circle.svg","./js/storage.js","./js/backup.js","./js/prayers.js","./js/tyumen-source.js","./js/asr-first.js","./data/tyumen-first-asr.json","./js/weather.js","./js/ui.js","./manifest.json","./favicon.svg","./icon-192.png","./icon-512.png","./icon-maskable.png","./js/learning-illustrations.js","./js/reminders.js","./js/push-reminders.js","./js/reminder-events.js","./reminders.css","./data/adhan-sources.json","./js/qibla-access.js","./js/geomagnetism.js","./assets/geomagnetism-LICENSE.txt","./js/orientation.js","./js/pwa-updates.js","./js/calendar-occasions.js","./js/hijri.js","./js/sourced-audio.js","./data/learning-adhkar-audio-sources.json","./assets/reciters/alafasy.webp","./assets/reciters/tariqmuhammad.jpg","./assets/reciters/abdurrahmanalsudais.jpg","./assets/reciters/abdullahaljuhany.jpg","./assets/reciters/salahalbudair.jpg","./assets/reciters/abdulbarialthubaity.jpg","./assets/reciters/abdulmuhsinalqasim.jpg","./assets/reciters/abdullahalbuayjan.jpg","./assets/reciters/ahmadalhuthaifi.jpg","./assets/reciters/khalidalmuhanna.jpg","./assets/reciters/alialhuthaifi.jpg","./assets/reciters/badralturki.jpg","./assets/reciters/husary-original.png","./assets/reciters/yasseraldossari.jpg","./assets/reciters/muhammadalluhaidan.jpg","./assets/reciters/minshawi-original.jpg","./assets/reciters/bandarbalilah.png","./assets/reciters/saudalshuraim.jpg","./assets/reciters/mahermuaiqly.png","./assets/reciters/abdelazizsheim.jpg","./assets/reciters/hazzaalbalushi.jpg","./assets/reciters/haithamaljadani.jpg","./assets/reciters/raadalkurdi-approved.jpg","./assets/reciters/abdulrahmanmossad.jpg","./assets/reciters/haithamaldukhain.jpg","./assets/reciters/ahmedkaseb.jpg","./assets/reciters/obaidamuafaq.jpg","./assets/reciters/siratulloraupov.jpg"];

// Four versioned public tablet files load only when their CSS media query is selected.
const OPTIONAL_WALLPAPERS=['./assets/window-new-york-day-tablet-v1.webp','./assets/window-new-york-night-tablet-v1.webp','./assets/window-sky-mask-tablet-v1.svg','./assets/window-weather-mask-tablet-v1.svg'];
const optionalWallpaperPaths=new Set(OPTIONAL_WALLPAPERS.map(path=>new URL(path,self.registration.scope).pathname));
const OPTIONAL_WALLPAPER_CACHE='salah-builtin-wallpapers-v1';
const isOptionalWallpaper=(url,request)=>!url.search&&!request.headers.has('Range')&&optionalWallpaperPaths.has(url.pathname);
async function serveOptionalWallpaper(event){
 const request=new Request(event.request,{credentials:'omit'});
 let cache;try{cache=await caches.open(OPTIONAL_WALLPAPER_CACHE)}catch{}
 const cached=await cache?.match(request).catch(()=>null);if(cached)return cached;
 try{
  const response=await network(request);
  if(response.status!==200||response.type!=='basic'||response.redirected||!/^image\/(webp|svg\+xml)(?:;|$)/i.test(response.headers.get('Content-Type')||''))return Response.error();
  const bytes=await response.clone().arrayBuffer();if(bytes.byteLength>3145728)return Response.error();
  if(cache)await cache.put(request,response.clone()).catch(()=>{});return response;
 }catch{return Response.error();}
}
const shellPaths=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).pathname));
const shellIndex=new URL('./index.html',self.registration.scope).href;
const ownerShell=new URL('./owner.html',self.registration.scope).href;
const appNavigationPaths=new Set([new URL(self.registration.scope).pathname,new URL(shellIndex).pathname]);
const navigationShell=url=>url.pathname===new URL(ownerShell).pathname?ownerShell:appNavigationPaths.has(url.pathname)?shellIndex:null;
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
  const cached=await cache.match(navigationShell(url));
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
  if(request.mode==='navigate'){const index=await cache.match(navigationShell(url));if(index)return index}
  return response;
 }catch{
  const cached=await cache.match(request);
  return cached||(request.mode==='navigate'?await cache.match(navigationShell(url)):null)||Response.error();
 }
}
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 const scopePath=new URL(self.registration.scope).pathname;
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(scopePath)||event.request.headers.has('Authorization'))return;
 // Standalone public pages must load their own document, rather than the app shell.
 if(event.request.mode==='navigate'&&!navigationShell(url))return;
 // Only explicitly bundled public shell files and Azan audio belong in this cache.
 // Private/API responses and resources from other GitHub Pages apps must bypass it.
 if(event.request.mode!=='navigate'&&!shellPaths.has(url.pathname)&&!isAdhan(url)&&!isOptionalWallpaper(url,event.request))return;
 // Quran's verified-byte loader owns its hash checks, writes and offline fallbacks.
 if(/\/data\/quran\/[^/]+\.json$/.test(url.pathname)||url.pathname.endsWith('/data/quran-search.json'))return;
 const response=isOptionalWallpaper(url,event.request)?serveOptionalWallpaper(event):isAdhan(url)?serveAdhan(event):serve(event,url);
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

const RELEASE={"version":244,"date":"2026-10-09","changes":["В разделе «Коран» появились карточки чтецов, избранные и удобный выбор сур для прослушивания.","Добавлены девять чтецов, включая Ахмеда Касеба, Мухаммада аль-Курди и Сиратулло Раупова."],"announcement":{"version":242,"date":"2026-10-09","changes":["В разделе «Коран» появились карточки чтецов, избранные и удобный выбор сур для прослушивания.","Добавлены девять чтецов, включая Ахмеда Касеба, Мухаммада аль-Курди и Сиратулло Раупова."]}};
self.addEventListener('message',event=>{if(event.data?.type==='SALAH_RELEASE_INFO')event.ports?.[0]?.postMessage(RELEASE);else if(event.data?.type==='SALAH_APPLY_UPDATE')event.waitUntil(self.skipWaiting())});


// The notification is always displayed: browsers forbid silent Web Push.
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 const fresh=Number.isFinite(data.expiresAt)&&Date.now()<data.expiresAt;
 // A delayed inactivity reminder must not disturb the selected city's sleeping hours.
 if(data.kind==='dhikr'){let hour;try{hour=Number(new Intl.DateTimeFormat('en',{timeZone:data.timeZone,hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).find(p=>p.type==='hour')?.value);}catch{}if(!fresh||!Number.isFinite(hour)||hour<8||hour>=22)return;}
 const body=fresh&&typeof data.body==='string'&&data.body.length<=240?data.body:'Откройте SALAH, чтобы посмотреть напоминания.';
 const supportUrl=data.kind==='support'&&typeof data.url==='string'&&/^#support\?thread=[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.url)?data.url:null;
 const url=supportUrl|| (data.url==='#settings'?'#settings':data.url==='#adhkar'?'#adhkar':'#home');
 const tag=typeof data.tag==='string'&&/^salah-push-[a-z0-9-]{1,100}$/.test(data.tag)?data.tag:'salah-background-reminder';
 event.waitUntil(self.registration.showNotification('SALAH',{body,tag,icon:new URL('./icon-192.png',self.registration.scope).href,badge:new URL('./icon-192.png',self.registration.scope).href,data:{url},renotify:false}));
});

// Offline audio, situation search and new city artwork are bundled together.
// Download sources retain canonical audio cache keys for previous saved recordings.




// Place captions follow both bundled and selected city wallpapers.

// Reader navigation keeps explicit downloaded-only listening.


// Independently verified Raad portrait replaces unverified catalogue image.

// Frontal Raad source: mask-only extraction; no face synthesis.

// User-approved clear Kurdi portrait, natural head pose preserved.

// Preview: reading and reciters are equal Quran section tabs.

// User-selected heading row: Quran and Reciters side by side.

// Scoped heading layout overrides generic app-header styling.

// Audio downloads are scoped to a chosen reciter and surah; author fields in reading settings.





// Release 244: reduced motion depth, clear crash-report label, unified Tyumen night wallpaper.
