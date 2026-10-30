const CACHE='salah-shell-v427';
const ASSETS=["./js/pronunciation-preload.js","./js/arabic-alphabet-name-audio.js","./js/arabic-alphabet-recordings.js","./data/alphabet-audio-sources.json","./alphabet-audio-credits.html","./assets/alphabet-audio/LICENSE.txt","./assets/updates/alphabet-audio-425.svg","./js/lesson-route.js","./js/lesson-planning.js","./js/account-lesson-link.js","./js/learning-cabinets.js","./js/homework-work.js","./js/lesson-homework.js","./js/reading-check-core.js","./js/reading-check-ui.js","./css/learning-cabinets.css","./css/homework-work.css","./css/lesson-homework.css","./css/reading-check.css","./assets/fonts/scheherazade-new-regular-v4500.woff2","./assets/fonts/scheherazade-new-OFL.txt","./assets/reciters/peshawaalkurdi-salah-420.jpg","./assets/reciters/muhammadalfaqih.jpg","./assets/reciters/fahadalkandari.jpg","./assets/reciters/noreensiddiq.jpg","./assets/reciters/muhammadjibreel.jpg","./assets/reciters/mustafaismail.jpg","./assets/reciters/mahmoudalbanna.jpg","./assets/reciters/muhammadaltablawi.jpg","./assets/updates/short-dhikr-418.svg","./js/short-dhikr.js","./css/adhkar-hub.css","./js/listener-presence.js","./js/listener-presence-core.js","./assets/updates/listener-presence-410.svg","./js/teacher-admin.js","./js/owner-classroom.js","./js/owner-user-list.js","./js/settings-screens.js","./js/owner-workspace.js","./js/owner-team-avatars.js","./js/staff-messenger.js","./css/owner-workspace.css","./css/staff-messenger.css","./js/daily-dua-themes.js","./assets/dua-themes/sleep.webp","./assets/dua-themes/home.webp","./assets/dua-themes/food.webp","./assets/dua-themes/cleanliness.webp","./assets/dua-themes/mosque.webp","./assets/dua-themes/everyday.webp","./assets/dua-themes/family.webp","./assets/dua-themes/prayer.webp","./assets/dua-themes/travel.webp","./assets/dua-themes/distress.webp","./assets/dua-themes/health.webp","./js/lesson-invitation.js","./js/lesson-notification-account.js","./js/adhkar-completion.js","./js/daily-dua-recordings.js","./js/dua-pronunciation.js","./data/daily-dua-audio-sources.json","./assets/updates/dua-pronunciation-402.svg","./assets/updates/dhikr-completion-402.svg","./js/owner-learning-native.js","./js/owner-course-cache.js","./js/muallim-native.js","./css/muallim-native.css","./js/owner-native-progress.js","./js/owner-frame-viewport.js","./js/owner-learning-frame.js","./assets/knowledge-live.svg","./assets/knowledge-online.svg","./js/owner-learning-links.js","./assets/knowledge-prayer-steps.svg","./assets/knowledge-wudu.svg","./assets/knowledge-prayer.svg","./assets/knowledge-umrah.svg","./assets/knowledge-muallim.svg","./assets/knowledge-alphabet.svg","./assets/knowledge-names.svg","./assets/salah-arabic-alphabet.pdf","./assets/salah-arabic-letters.pdf","./assets/updates/alphabet-pdf-395.svg","./js/knowledge-upcoming.js","./assets/video.svg","./assets/broadcast.svg","./assets/updates/online-lessons-coming-395.svg","./assets/updates/muallim-coming-395.svg","./assets/updates/live-stream-coming-395.svg","./assets/fonts/prata-counter-regular.ttf","./assets/fonts/prata-OFL.txt","./assets/updates/shared-listening-392.svg","./js/allah-names-core.js","./js/allah-names.js","./css/allah-names.css","./assets/updates/allah-names-391.svg","./js/playback-audio-session.js","./assets/updates/friend-invite-384.svg","./js/adhkar-recordings.js","./css/adhkar-audio.css","./assets/updates/adhkar-audio-380.svg","./assets/updates/account-375.svg","./assets/chevron-left.svg","./assets/brand/saadi-kobilov-mark.png","./js/support-cancellation-preview.js","./assets/updates/support-372.png","./assets/updates/tafsir-369.png","./js/quran-tafsir.js","./assets/updates/qibla-map-368.png","./assets/updates/holy-cities-368.png","./assets/updates/reading-position-368.png","./assets/updates/recognition-368.png","./js/qibla-map-style.js","./js/qibla-map-fallback.js","./js/vendor/maplibre/maplibre-gl.mjs","./js/vendor/maplibre/maplibre-gl-shared.mjs","./js/vendor/maplibre/maplibre-gl-worker.mjs","./js/vendor/maplibre/maplibre-gl.css","./js/vendor/maplibre/LICENSE.txt","./js/vendor/maplibre/provenance.json","./js/quran-reading-progress.js","./assets/updates/travel-363.png","./assets/updates/qibla-map-363.png","./js/quran-recognition.js","./js/quran-recognition-core.js","./js/quran-recognition-data.js","./js/quran-recognition-worker.js","./js/qibla-map.js","./js/qibla-map-core.js","./js/vendor/leaflet/leaflet.js","./js/vendor/leaflet/leaflet.css","./js/vendor/leaflet/LICENSE","./js/vendor/leaflet/images/layers-2x.png","./js/vendor/leaflet/images/layers.png","./js/vendor/leaflet/images/marker-icon-2x.png","./js/vendor/leaflet/images/marker-icon.png","./js/vendor/leaflet/images/marker-shadow.png","./data/recognition/catalog-v2.json","./data/recognition/SOURCES.txt","./js/travel-mode.js","./js/storage-cache.js","./js/release-highlight.js","./assets/updates/mushaf-357.png","./assets/updates/quran-reader-357.png","./assets/updates/download-357.png","./assets/updates/adhkar-357.png","./js/quran-reader-download.js","./js/quran-reader-script.js","./js/quran-mushaf-controls.js","./js/quran-mushaf-follow.js","./js/quran-mushaf-listening.js","./js/quran-mushaf-print.js","./js/quran-mushaf-print-index.js","./data/mushaf-print/layout.json","./data/mushaf-print/madani-layout.json","./data/mushaf-print/SOURCES.txt","./js/quran-mushaf.js","./js/quran-mushaf-page-cache.js","./js/quran-mushaf-core.js","./js/quran-mushaf-pages.js","./js/quran-reciter-discovery.js","./assets/reciters/raadalkurdi-v349.png","./assets/reciters/ahmadalnufais.jpg","./assets/reciters/khalidaljalil.jpg","./assets/reciters/wadeealyamani.jpg","./assets/reciters/abdullahkamel.jpg","./assets/reciters/haniarrifai.jpg","./assets/reciters/alijaber.jpg","./assets/reciters/muhammadayyub.jpg","./assets/reciters/salahbukhatir.jpg","./assets/reciters/islamsobhi.jpg","./assets/reciters/abdulrahmanalawsi.jpg","./assets/reciters/saadalghamdi.jpg","./assets/reciters/ahmadalajmi.jpg","./assets/reciters/faresabbad.jpg","./js/city-location.js","./data/tyumen-november-2026.json","./assets/tyumen-november-source-2025.jpg","./js/release-illustrations.js","./js/owner-user-detail.js","./js/listening-summary.js","./js/quran-playlist.js","./js/audience.js","./js/audience-core.js","./js/audience-mode.js","./css/audience.css","./js/financial-support.js","./js/support-subscription.js","./css/financial-support.css","./js/arabic-alphabet.js","./js/arabic-alphabet-core.js","./css/arabic-alphabet.css","./assets/amiri-regular.ttf","./assets/amiri-regular-OFL.txt","./js/release-gallery.js","./js/founder-welcome.js","./js/founder-welcome-core.js","./js/account-summary-core.js","./assets/icons/pen.svg","./assets/icons/right-from-bracket.svg","./assets/icons/shield-heart.svg","./assets/icons/arrows-rotate.svg","./js/series-celebration.js","./js/series-celebration-core.js","./assets/awards/leader-week-v4.png","./assets/awards/leader-month-v4.png","./assets/awards/founder-v1.png","./assets/awards/listening-25-v2.svg","./assets/awards/listening-50-v2.svg","./assets/awards/listening-100-v2.svg","./assets/awards/listening-250-v2.svg","./assets/awards/listening-500-v2.svg","./assets/awards/listening-1000-v2.svg","./assets/awards/listening-5000-v2.svg","./assets/awards/streak-7-v1.png","./assets/awards/streak-30-v1.png","./assets/awards/streak-100-v1.png","./assets/awards/streak-200-v1.png","./assets/awards/streak-365-v1.png","./assets/icons/seedling.svg","./assets/icons/book-open.svg","./assets/icons/gem.svg","./assets/icons/award.svg","./assets/icons/snowflake.svg","./css/quran-awards.css","./js/quran-awards.js","./js/quran-awards-core.js","./assets/icons/trophy.svg","./assets/icons/medal.svg","./color-theme.css","./theme-boot.js","./js/color-theme.js","./js/staff-push.js","./js/staff-push-core.js","./js/staff-message-status.js","./css/staff-cabinet.css","./js/staff-cabinet.js","./js/staff-markup.js","./js/staff-transport.js","./js/approved-catalog.js","./js/competition-motion.js","./js/competition-client.js","./js/competition-view.js","./js/competition-page.js","./js/quran-duration.js","./js/quran-listening-progress.js","./js/reciter-ranking-page.js","./assets/icons/user.svg","./assets/icons/user-ninja.svg","./assets/icons/Font-Awesome-LICENSE.txt","./js/reciter-ranking-core.js","./js/reciter-ranking-view.js","./js/account-avatar.js","./js/account-avatar-core.js","./js/account-avatar-store.js","./js/reciter-popularity.js","./js/reciter-popularity-core.js","./ayah-card.css","./js/quran-ayah-card.js","./js/native-adhan.js","./js/native-background-reminders.js","./js/native-reminder-navigation.js","./js/native-reminder-plan.js","./js/native-reminders.js","./js/media-session.js","./js/media-playback-focus.js","./js/ruqyah-catalog.js","./js/ruqyah-session.js","./assets/reciters/abdulbasitabdussamad.png","./assets/reciters/mansouralsalimi.png","./js/media-output-core.js","./js/tv-output.js","./js/action-icons.js","./js/quran-ruqyah.js","./js/quran-reader-follow.js","./assets/reciters/idrisabkar.png","./assets/reciters/abubakrshatri.png","./assets/reciters/nasseralqatami.png","./js/quran-listen-share.js","./js/quran-listen-share-core.js","./soft-depth.css","./js/soft-depth.js","./js/quran-reciter-favorites.js","./js/quran-reciter-library.js","./js/quran-reciter-recording.js","./js/native-support-core.js","./js/native-support-push.js","./js/support-photo-save.js","./js/support-notice.js","./js/home-reading.js","./js/home-reading-core.js","./js/qr-scanner.js","./js/vendor/jsQR.js","./js/vendor/jsQR-LICENSE.txt","./js/vendor/jsQR-source.json","./js/account-devices.js","./css/account-devices.css","./js/error-reporting.js","./js/owner-error-summary.js","./css/error-summary.css","./js/qr-login.js","./css/qr-login.css","./js/vendor/qrcode-generator.js","./js/vendor/qrcode-generator-LICENSE.txt","./js/quran-offline-store.js","./js/quran-offline-core.js","./js/quran-downloads.js","./js/dua-search.js","./js/reminder-before.js","./js/native-widget.js","./js/owner-release-card.js","./js/swipe-motion.js","./js/adhkar-swipe.js","./js/edge-back.js","./js/app-start.js","./js/owner-card-navigation.js","./js/owner-user-card.js","./js/notification-invite.js","./js/dhikr-reminder.js","./js/wallpaper-layout.js","./js/notification-status.js","./js/audio-focus.js","./js/ambient-audio.js","./js/ambient-settings.js","./js/support-client.js","./js/support-diagnostics.js","./js/support-photo.js","./js/owner-support-status.js","./js/user-support-status.js","./js/support-transport.js","./js/support.js","./css/support.css","./js/landmark-settings.js","./umrah.css","./js/umrah.js","./js/umrah-content.js","./js/umrah-illustrations.js","./js/haramain-schedule.js","./js/landmarks.js","./assets/landmark.svg","./js/broadcast-audio.js","./js/vendor/hls-light.min.js","./js/vendor/hls-LICENSE.txt","./js/quran-timing.js","./js/quran-broadcast.js","./daily-dua.css","./js/daily-dua.js","./js/daily-dua-core.js","./data/daily-dua.json","./data/quran-reading-LICENSE.txt","./js/account-presence.js","./js/app-release.js","./assets/salah-qr.svg","./assets/salah-qr.png","./js/app-sharing.js","./js/free-counter.js","./js/auth-transport.js","./js/auth-session.js","./assets/window-sky-mask.svg","./js/vendor/suncalc.js","./js/vendor/suncalc-LICENSE.txt","./js/vendor/suncalc-source.json","./assets/window-weather-mask.svg","./js/counter-account.js","./js/counter-sync-core.js","./assets/window-moon.webp","./js/wallpapers.js","./assets/window-new-york-night.webp","./assets/window-new-york-day.webp","./js/city-dialog.js","./js/city-data.js","./owner.html","./owner-manifest.json","./js/owner-entry.js","./","./index.html","./iphone.css","./icon-180.png","./style.css","./home-selected.css","./day-night.css","./weather.css","./js/weather-data.js","./js/day-night.js","./assets/day-mosque.webp","./knowledge.css","./quran.css","./js/quran.js","./js/quran-transcription.js","./js/tajweed.js","./js/quran-data.js","./js/quran-audio.js","./js/quran-session.js","./js/quran-player-bar.js","./quran-player.css","./js/quran-reciters.js","./data/quran-index.json","./assets/amiri-quran.ttf","./assets/amiri-OFL.txt","./qibla.css","./js/qibla.js","./js/qibla-view.js","./js/qibla-math.js","./js/knowledge.js","./js/home-swipe.js","./assets/journal-bookmark.svg","./assets/house.svg","./assets/clock.svg","./assets/book.svg","./assets/three-dots.svg","./assets/gear.svg","./assets/person.svg","./assets/circle.svg","./js/app.js","./js/prayer-display.js","./js/home-event.js","./js/tahajjud.js","./js/learning.js","./js/learning-state.js","./js/adhkar.js","./js/adhkar-progress.js","./js/adhkar-period.js","./js/calendar-pdf.js","./js/analytics.js","./js/admin.js","./js/owner-auth.js","./js/vendor/supabase.js","./js/vendor/supabase-LICENSE.txt","./assets/salah-mark.svg","./data/adhkar.json","./data/al-hakk-tyumen.json","./data/tyumen-october-2026.json","./assets/tyumen-october-2026.png","./data/learning-content.json","./data/learning-quran.json","./assets/night-mosque.webp","./assets/prayer-poses.png","./assets/star.svg","./assets/star-fill.svg","./assets/sun.svg","./assets/moon-stars.svg","./assets/list-ul.svg","./assets/arrow-left.svg","./assets/x-lg.svg","./assets/info-circle.svg","./js/storage.js","./js/backup.js","./js/prayers.js","./js/tyumen-source.js","./js/asr-first.js","./data/tyumen-first-asr.json","./js/weather.js","./js/ui.js","./manifest.json","./favicon.svg","./icon-192.png","./icon-512.png","./icon-maskable.png","./js/learning-illustrations.js","./js/reminders.js","./js/push-reminders.js","./js/reminder-events.js","./reminders.css","./data/adhan-sources.json","./js/qibla-access.js","./js/geomagnetism.js","./assets/geomagnetism-LICENSE.txt","./js/orientation.js","./js/pwa-updates.js","./js/calendar-occasions.js","./js/hijri.js","./js/sourced-audio.js","./data/learning-adhkar-audio-sources.json","./assets/reciters/alafasy.webp","./assets/reciters/tariqmuhammad.jpg","./assets/reciters/abdurrahmanalsudais.jpg","./assets/reciters/abdullahaljuhany.jpg","./assets/reciters/salahalbudair.jpg","./assets/reciters/abdulbarialthubaity.jpg","./assets/reciters/abdulmuhsinalqasim.jpg","./assets/reciters/abdullahalbuayjan.jpg","./assets/reciters/ahmadalhuthaifi.jpg","./assets/reciters/khalidalmuhanna.jpg","./assets/reciters/alialhuthaifi.jpg","./assets/reciters/badralturki.jpg","./assets/reciters/husary-original.png","./assets/reciters/yasseraldossari.jpg","./assets/reciters/muhammadalluhaidan.jpg","./assets/reciters/minshawi-original.jpg","./assets/reciters/bandarbalilah.png","./assets/reciters/saudalshuraim.jpg","./assets/reciters/mahermuaiqly.png","./assets/reciters/abdelazizsheim.jpg","./assets/reciters/hazzaalbalushi.jpg","./assets/reciters/haithamaljadani.jpg","./assets/reciters/raadalkurdi-approved.jpg","./assets/reciters/abdulrahmanmossad.jpg","./assets/reciters/haithamaldukhain.jpg","./assets/reciters/ahmedkaseb.jpg","./assets/reciters/obaidamuafaq.jpg","./assets/reciters/siratulloraupov.jpg","./js/adhkar-activity-core.js","./js/adhkar-activity.js"];

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
const ALPHABET_AUDIO_CACHE='salah-alphabet-audio-v1';
const alphabetAudioPaths=new Set(["./assets/alphabet-audio/alif.mp3","./assets/alphabet-audio/ba.mp3","./assets/alphabet-audio/ta.mp3","./assets/alphabet-audio/tha.mp3","./assets/alphabet-audio/jim.mp3","./assets/alphabet-audio/ha.mp3","./assets/alphabet-audio/kha.mp3","./assets/alphabet-audio/dal.mp3","./assets/alphabet-audio/dhal.mp3","./assets/alphabet-audio/ra.mp3","./assets/alphabet-audio/zay.mp3","./assets/alphabet-audio/sin.mp3","./assets/alphabet-audio/shin.mp3","./assets/alphabet-audio/sad.mp3","./assets/alphabet-audio/dad.mp3","./assets/alphabet-audio/tta.mp3","./assets/alphabet-audio/za.mp3","./assets/alphabet-audio/ayn.mp3","./assets/alphabet-audio/ghayn.mp3","./assets/alphabet-audio/fa.mp3","./assets/alphabet-audio/qaf.mp3","./assets/alphabet-audio/kaf.mp3","./assets/alphabet-audio/lam.mp3","./assets/alphabet-audio/mim.mp3","./assets/alphabet-audio/nun.mp3","./assets/alphabet-audio/heh.mp3","./assets/alphabet-audio/waw.mp3","./assets/alphabet-audio/ya.mp3","./assets/alphabet-audio/hamza.mp3"].map(p=>new URL(p,self.registration.scope).pathname));
const isAlphabetAudio=url=>!url.search&&alphabetAudioPaths.has(url.pathname);
const shellPaths=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).pathname));
const shellIndex=new URL('./index.html',self.registration.scope).href;
const ownerShell=new URL('./owner.html',self.registration.scope).href;
const appNavigationPaths=new Set([new URL(self.registration.scope).pathname,new URL(shellIndex).pathname,new URL('./share.html',self.registration.scope).pathname]);
const alphabetCredits=new URL('./alphabet-audio-credits.html',self.registration.scope).href;
const navigationShell=url=>url.pathname===new URL(alphabetCredits).pathname?alphabetCredits:url.pathname===new URL(ownerShell).pathname?ownerShell:appNavigationPaths.has(url.pathname)?shellIndex:null;
const STARTUP_REPAIR_KEY=new URL('./.startup-repair-418',self.registration.scope).href;
function activeRelease(){
 const worker=self.registration.active;if(!worker)return Promise.resolve(null);
 return new Promise(resolve=>{
  let channel,settled=false;
  const done=value=>{if(settled)return;settled=true;clearTimeout(timer);channel?.port1.close();resolve(value);};
  const timer=setTimeout(()=>done(null),2000);
  try{channel=new MessageChannel();channel.port1.onmessage=event=>done(event.data);worker.postMessage({type:'SALAH_RELEASE_INFO'},[channel.port2]);}catch{done(null);}
 });
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const previous=await activeRelease(),cache=await caches.open(CACHE);
  await cache.addAll(ASSETS.map(path=>new Request(new URL(path,self.registration.scope).href,{cache:'reload'})));
  await cache.delete(STARTUP_REPAIR_KEY);
  // 418 cannot link app.js, so its safe-screen updater never gets a chance to run.
  // Only this known broken predecessor bypasses waiting; other releases keep the normal update flow.
  if(previous?.version===418){await cache.put(STARTUP_REPAIR_KEY,new Response('418'));await self.skipWaiting();}
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE),repair=await cache.match(STARTUP_REPAIR_KEY);
  const recover418=Boolean(repair)&&await repair.text()==='418';
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('salah-shell-')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
  if(recover418){
   const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true}),reloads=[];
   for(const client of windows){
    let url;try{url=new URL(client.url);}catch{continue;}
    if(url.origin===self.location.origin&&navigationShell(url)&&typeof client.navigate==='function'){
     // A changed query forces a document load even when the existing URL has a fragment.
     url.searchParams.set('salah-repair','427');reloads.push(client.navigate(url.href));
    }
   }
   await Promise.allSettled(reloads);
  }
 })());
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
 if(event.request.mode!=='navigate'&&!shellPaths.has(url.pathname)&&!isAdhan(url)&&!isAlphabetAudio(url)&&!isOptionalWallpaper(url,event.request))return;
 // Quran's verified-byte loader owns its hash checks, writes and offline fallbacks.
 if(/\/data\/quran\/[^/]+\.json$/.test(url.pathname)||url.pathname.endsWith('/data/quran-search.json'))return;
 const response=isOptionalWallpaper(url,event.request)?serveOptionalWallpaper(event):isAlphabetAudio(url)?serveAdhan(event,ALPHABET_AUDIO_CACHE):isAdhan(url)?serveAdhan(event):serve(event,url);
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
async function serveAdhan(event,cacheName=ADHAN_CACHE){
 const request=event.request,fullRequest=audioRequest(request),cache=await caches.open(cacheName);
 const cached=await cache.match(fullRequest,{ignoreVary:true});
 if(completeAudio(cached))return rangedAudio(cached,request.headers.get('Range'));
 try{
  const response=await network(request);
  if(completeAudio(response))event.waitUntil(cache.put(fullRequest,response.clone()).catch(()=>{}));
  else if(response.status===206)saveFullAudio(event,fullRequest,cache);
  return response;
 }catch{return Response.error()}
}

const STAFF_ACCOUNT_CACHE='salah-staff-account-v1';
const STAFF_ACCOUNT_KEY=new URL('./.staff-account',self.registration.scope).href;
const STAFF_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function staffAccount(){try{const cache=await caches.open(STAFF_ACCOUNT_CACHE),response=await cache.match(STAFF_ACCOUNT_KEY);return response?await response.json():null;}catch{return null;}}
async function staffAccountMessage(event){try{const source=new URL(event.source?.url),scope=new URL(self.registration.scope);if(source.origin!==scope.origin||!source.pathname.startsWith(scope.pathname)||event.data.user!==null&&!STAFF_UUID.test(event.data.user||''))return;const cache=await caches.open(STAFF_ACCOUNT_CACHE);if(event.data.user)await cache.put(STAFF_ACCOUNT_KEY,new Response(JSON.stringify(event.data.user),{headers:{'Content-Type':'application/json'}}));else await cache.delete(STAFF_ACCOUNT_KEY);event.ports?.[0]?.postMessage({ok:true});}catch{event.ports?.[0]?.postMessage({ok:false});}}
async function staffPushNotification(data){if(!STAFF_UUID.test(data.user||'')||!STAFF_UUID.test(data.room||'')||!STAFF_UUID.test(data.messageId||'')||!Number.isFinite(data.expiresAt)||Date.now()>=data.expiresAt||data.expiresAt-Date.now()>86400000||await staffAccount()!==data.user)return;const url='#staff?room='+data.room;await self.registration.showNotification('SALAH',{body:'Новое сообщение команды',tag:'salah-staff-'+data.room,icon:new URL('./icon-192.png',self.registration.scope).href,badge:new URL('./icon-192.png',self.registration.scope).href,data:{kind:'staff',user:data.user,room:data.room,url},renotify:false});const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){try{const target=new URL(client.url),scope=new URL(self.registration.scope);if(target.origin===scope.origin&&target.pathname.startsWith(scope.pathname))client.postMessage({type:'SALAH_STAFF_RECEIVED',user:data.user});}catch{}}}
const LESSON_ACCOUNT_CACHE='salah-lesson-account-v1',LESSON_ACCOUNT_KEY=new URL('./.lesson-account',self.registration.scope).href;
async function lessonAccount(){try{const r=await(await caches.open(LESSON_ACCOUNT_CACHE)).match(LESSON_ACCOUNT_KEY);return r?await r.json():null;}catch{return null;}}
async function lessonAccountMessage(event){try{const source=new URL(event.source?.url),scope=new URL(self.registration.scope),user=event.data.user;if(source.origin!==scope.origin||!source.pathname.startsWith(scope.pathname)||user!==null&&!STAFF_UUID.test(user||''))return;const cache=await caches.open(LESSON_ACCOUNT_CACHE);if(user)await cache.put(LESSON_ACCOUNT_KEY,new Response(JSON.stringify(user)));else await cache.delete(LESSON_ACCOUNT_KEY);}catch{}}
async function classroomPushNotification(data){
 if(!STAFF_UUID.test(data.user||'')||!/^[\w-]{32}$/.test(data.lessonId||'')||await lessonAccount()!==data.user||!Number.isFinite(data.expiresAt)||Date.now()>=data.expiresAt||data.expiresAt-Date.now()>900000||typeof data.body!=='string'||data.body.length>220)return;
 const url='#lesson?class='+data.lessonId,tag=typeof data.tag==='string'&&/^salah-push-classroom-[a-f0-9-]{1,90}$/.test(data.tag)?data.tag:'salah-classroom-reminder';
 await self.registration.showNotification('SALAH',{body:data.body,tag,icon:new URL('./icon-192.png',self.registration.scope).href,badge:new URL('./icon-192.png',self.registration.scope).href,data:{kind:'classroom',user:data.user,lessonId:data.lessonId,url},renotify:false});
}
async function classroomNotificationClick(data){
 if(!STAFF_UUID.test(data.user||'')||!/^[\w-]{32}$/.test(data.lessonId||'')||await lessonAccount()!==data.user)return;
 const scope=new URL(self.registration.scope),url=new URL('./#lesson?class='+data.lessonId,scope);
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true}),client=windows.find(c=>{try{const u=new URL(c.url);return u.origin===scope.origin&&u.pathname.startsWith(scope.pathname);}catch{return false;}});
 if(client){await client.navigate(url.href);await client.focus();}else await self.clients.openWindow(url.href);
}
self.addEventListener('notificationclick',event=>{
 if(event.notification.data?.kind==='classroom'){event.waitUntil(classroomNotificationClick(event.notification.data));return;}
 event.notification.close();
 if(event.notification.data?.kind==='staff'){const data=event.notification.data;event.waitUntil((async()=>{if(!STAFF_UUID.test(data.user||'')||!STAFF_UUID.test(data.room||'')||await staffAccount()!==data.user)return;const scope=new URL(self.registration.scope),url=new URL('./#staff?room='+data.room,self.registration.scope);const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=windows.find(c=>{try{const u=new URL(c.url);return u.origin===scope.origin&&u.pathname.startsWith(scope.pathname)}catch{return false}});if(client){await client.focus();client.postMessage({type:'SALAH_STAFF_OPEN',user:data.user,room:data.room});}else await self.clients.openWindow(url.href);})());return;}
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

const RELEASE={"version":427,"date":"2026-10-30","changes":["Арабский алфавит: слушайте названия всех 28 букв и повторяйте запись по нажатию."],"announcement":{"version":425,"date":"2026-10-30","changes":["Арабский алфавит: слушайте названия всех 28 букв и повторяйте запись по нажатию."]}};
self.addEventListener('message',event=>{if(event.data?.type==='SALAH_LESSON_ACCOUNT'){event.waitUntil(lessonAccountMessage(event));return;}if(event.data?.type==='SALAH_STAFF_ACCOUNT'){event.waitUntil(staffAccountMessage(event));return;}if(event.data?.type==='SALAH_RELEASE_INFO')event.ports?.[0]?.postMessage(RELEASE);else if(event.data?.type==='SALAH_APPLY_UPDATE')event.waitUntil(self.skipWaiting())});


// The notification is always displayed: browsers forbid silent Web Push.
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 if(data.kind==='classroom'){event.waitUntil(classroomPushNotification(data));return;}
 if(data.kind==='staff'){event.waitUntil(staffPushNotification(data));return;}
 const fresh=Number.isFinite(data.expiresAt)&&Date.now()<data.expiresAt;
 // A delayed inactivity reminder must not disturb the selected city's sleeping hours.
 if(data.kind==='dhikr'){let hour;try{hour=Number(new Intl.DateTimeFormat('en',{timeZone:data.timeZone,hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).find(p=>p.type==='hour')?.value);}catch{}if(!fresh||!Number.isFinite(hour)||hour<8||hour>=22)return;}
 const body=fresh&&typeof data.body==='string'&&data.body.length<=240?data.body:'Откройте SALAH, чтобы посмотреть напоминания.';
 const supportUrl=data.kind==='support'&&typeof data.url==='string'&&/^#support\?thread=[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.url)?data.url:null;
 const competitionUrl=data.kind==='competition'&&typeof data.url==='string'&&/^#quran\?view=reciters&filter=salah-top&period=(day|week|month|all)$/.test(data.url)?data.url:null;
 const url=competitionUrl||supportUrl|| (data.url==='#settings'?'#settings':data.url==='#adhkar'?'#adhkar':'#home');
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





// Release 247: share Quran listening positions through validated links and QR codes.

