import{createImagePresenter,watchDecodedImages}from '../dist/js/image-presentation.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import*as language from '../dist/js/i18n.js';
import*as labels from '../dist/js/quran-ui.js';
import{esc}from '../dist/js/ui.js';
import{actionIcon,actionLabel}from '../dist/js/action-icons.js';
import{RECITERS,reciterInfo,reciterHasSurah,reciterOptions,reciterIsAvailable,visibleReciters}from '../dist/js/quran-reciters.js';
import{createOfflineAudioStore,AUDIO_DATABASE}from '../dist/js/quran-offline-store.js';
import{downloadAudioFiles,createQuranDownloadQueue}from '../dist/js/quran-offline-core.js';
import{createQuranSession}from '../dist/js/quran-session.js';
import{createQuranPlayer}from '../dist/js/quran-audio.js';
import{reciterRecording}from '../dist/js/quran-reciter-recording.js';
import{audioUrl,downloadAudioUrl}from '../dist/js/quran-data.js';
import offlineCopy from '../dist/js/i18n/offlineaudio/index.js';

// Exercise the real IndexedDB store branch. This deterministic IDB fixture
// retains databases across store instances, just as a web-bundle update does.
function indexedDatabase(){
 const databases=new Map(),opened=[];
 const idb={open(name){opened.push(name);const request={};queueMicrotask(()=>{let db=databases.get(name),upgrade=false;if(!db){upgrade=true;const stores=new Map();db={stores,objectStoreNames:{contains:key=>stores.has(key)},createObjectStore(key,{keyPath}){stores.set(key,{keyPath,rows:new Map()});},close(){},transaction(names,mode){const tx={pending:0,failed:false,abort(){tx.failed=true;queueMicrotask(()=>tx.onabort?.());},objectStore(key){assert.ok(stores.has(key));const source=stores.get(key);const operation=fn=>{const result={};tx.pending++;queueMicrotask(()=>{try{result.result=fn();result.onsuccess?.();}catch(error){result.error=error;result.onerror?.();tx.failed=true;tx.onerror?.();}finally{tx.pending--;queueMicrotask(()=>{if(!tx.pending&&!tx.failed)tx.oncomplete?.();});}});return result;};return{get:key=>operation(()=>structuredClone(source.rows.get(key))),getAll:()=>operation(()=>[...source.rows.values()].map(value=>structuredClone(value))),getAllKeys:()=>operation(()=>[...source.rows.keys()]),put:value=>operation(()=>source.rows.set(value[source.keyPath],structuredClone(value))),delete:key=>operation(()=>source.rows.delete(key)),clear:()=>operation(()=>source.rows.clear())};}};return tx;}};databases.set(name,db);}request.result=db;if(upgrade)request.onupgradeneeded?.();request.onsuccess?.();});return request;}};
 return{idb,opened,databases};
}
const fixture=indexedDatabase(),store=createOfflineAudioStore({idb:fixture.idb,cacheStorage:null,baseUrl:'https://salah.invalid/salah/'}),index=JSON.parse(await fs.readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
const r1='ar.badralturki',r2='ar.yasseraldossaricontinuous';
const actualBytes=new Map(),nativeFetch=globalThis.fetch;
if(process.argv.includes('--real-audio')){
 for(const [number,reciter] of [[112,r1],[114,r1],[1,r2],[113,r2],[114,r2]]){
  const first=reciterRecording(index,number).verses[0],cacheKey=audioUrl(first.number,reciter,number);
  const response=await nativeFetch(downloadAudioUrl(first.number,reciter,number),{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type')||'',/^audio\//i);
  actualBytes.set(cacheKey,{bytes:Buffer.from(await response.arrayBuffer()),type:response.headers.get('Content-Type')});
 }
}
async function save(number,reciter){
 const first=reciterRecording(index,number).verses[0],url=audioUrl(first.number,reciter,number),actual=actualBytes.get(url);
 const bytes=await downloadAudioFiles({urls:[url],store,fetcher:async()=>new Response(actual?.bytes||new Uint8Array([1,2,3,4]),{headers:{'Content-Type':actual?.type||'audio/mpeg'}})});
 await store.saveRecording({id:reciter+':'+number,reciter,surah:number,urls:[url],bytes,savedAt:1});
 return bytes;
}
await save(112,r1);await save(114,r1);await save(1,r2);assert.equal((await store.listRecordings()).length,3);assert.ok(fixture.opened.every(name=>name===AUDIO_DATABASE));
const w=new Window({url:'https://salah.invalid/salah/#quran?view=reciters&filter=downloaded'}),doc=w.document,host=doc.createElement('main');doc.body.append(host);doc.body.insertAdjacentHTML('beforeend','<dialog id="modal"><div id="modal-content"></div></dialog>');
const previous={document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator')};globalThis.document=doc;globalThis.window=w;
let providerRequests=0;globalThis.fetch=async()=>{providerRequests++;throw Error('Provider blocked');};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false}});
const tracks=[],mediaUpdates=[];
class Audio{constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.duration=20;tracks.push(this);}async play(){this.paused=false;}pause(){this.paused=true;}}
const playback=createQuranSession({loadCatalog:async()=>index,load:async number=>reciterRecording(index,number),loadSaved:reciter=>store.listRecordings(reciter),getAudio:url=>store.getAudio(url),createAudio:url=>new Audio(url),media:{update:value=>mediaUpdates.push(value)},createPlayer:options=>createQuranPlayer({...options,getAudio:url=>store.getAudio(url),loadTimings:async()=>null,loadDurations:async()=>null})});
const storage=new Map(),toasts=[],queueSaves=[];let releaseSave=null;
const context=vm.createContext({createImagePresenter,watchDecodedImages,...language,...labels,esc,actionIcon,actionLabel,RECITERS,reciterInfo,reciterHasSurah,reciterOptions,RECITER_FAVORITES_KEY:'favorites',offlineAudioStore:store,createQuranDownloadQueue,loadSurah:async number=>reciterRecording(index,number),saveSurahAudio:async(surah,reciter,progress,signal)=>{if(releaseSave)await releaseSave(signal);if(signal.aborted)throw new DOMException('Paused','AbortError');queueSaves.push(surah.number);const bytes=await save(surah.number,reciter);progress(1,bytes);return bytes;},read:(key,fallback)=>storage.has(key)?storage.get(key):fallback,write:(key,value)=>{storage.set(key,value);return true;},toast:message=>toasts.push(message),closeModal:()=>doc.querySelector('#modal').open=false,quranModal:html=>{doc.querySelector('#modal-content').innerHTML=html;doc.querySelector('#modal').open=true;for(const button of doc.querySelectorAll('[data-close]'))button.onclick=()=>doc.querySelector('#modal').open=false;},quranPlayback:playback,reciterRecording,document:doc,window:w,navigator:{onLine:false,storage:{persist:async()=>true}},Intl,Date,AbortController,DOMException,console});
const source=await fs.readFile(new URL('../dist/js/quran-downloads.js',import.meta.url),'utf8'),api=vm.runInContext(source.replace(/^import.*\n/gm,'').replace(/export /g,'')+';({mountSavedQuranAudio,quranDownloadQueue})',context),turns=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
language.setInterfaceLanguage('ru');let dispose=api.mountSavedQuranAudio(host,index);await turns();
assert.equal(host.querySelectorAll('[data-saved-play]').length,3,'All reciters share one downloaded-recording list');assert.equal(host.querySelectorAll('#quran-offline-reciter').length,1,'The full-download panel has one reciter selector');assert.equal(host.querySelector('#quran-saved-recordings'),null,'Do not duplicate the selected-reciter saved list');assert.equal(providerRequests,0,'Opening the library contacts no provider');
const play=host.querySelector('[data-saved-play="'+r1+':112"]'),row=play.closest('article'),selector=host.querySelector('#quran-offline-reciter'),selection=host.querySelector('#quran-offline-selection');selector.value=r1;selector.dispatchEvent(new w.Event('change'));selection.value='112';selector.focus();host.scrollTop=84;const beforeTracks=tracks.length;
for(const code of ['ru','en','az','tg','uz','kk','de','ar']){language.setInterfaceLanguage(code);assert.equal(host.querySelector('[data-saved-play="'+r1+':112"]'),play);assert.equal(play.closest('article'),row);assert.equal(selector.value,r1);assert.equal(selection.value,'112');assert.equal(doc.activeElement,selector);assert.equal(host.scrollTop,84);assert.equal(tracks.length,beforeTracks);assert.equal(providerRequests,0);assert.equal(host.querySelector('h2').textContent,language.t('offlineAudioUi.title'));assert.equal(play.getAttribute('aria-label'),language.t('offlineAudioUi.listenAria',{surah:index.surahs[111].name,reciter:reciterInfo(r1).name}));}
// The listener opened this same chapter from the normal player before going
// offline. A saved-library tap must replace that session with its local queue.
await playback.start(reciterRecording(index,112),r1,0,true,false);
await turns();assert.equal(playback.state.offlineOnly,false);
tracks.at(-1).currentTime=7;
tracks.at(-1).ontimeupdate();
playback.pause();
language.setInterfaceLanguage('ru');play.click();await turns();assert.equal(playback.state.status,'playing');assert.equal(playback.state.offlineOnly,true);assert.equal(playback.state.reciter,r1);assert.equal(playback.state.surah.number,112);assert.ok(tracks.at(-1).src.startsWith('blob:'),'The existing player receives an IndexedDB blob, not a provider URL');assert.equal(providerRequests,0);assert.equal(play.getAttribute('aria-pressed'),'true');
tracks.at(-1).onloadedmetadata();assert.equal(tracks.at(-1).currentTime,7,'Going offline at the same recording retains the current second.');
if(actualBytes.size){
 const firstUrl=(await store.listRecordings(r1))[0].urls[0];
 const local=Buffer.from(await nativeFetch(tracks.at(-1).src).then(r=>r.arrayBuffer()));
 assert.deepEqual(local,actualBytes.get(firstUrl).bytes,'Playback receives the actual saved provider bytes without a provider request.');
}
const count=tracks.length;play.click();assert.equal(playback.state.status,'paused');play.click();await turns();assert.equal(playback.state.status,'playing');assert.equal(tracks.length,count,'Pause/resume keeps the same media element');
tracks.at(-1).onended();await turns();assert.equal(playback.state.surah.number,114,'Offline next skips unsaved surah 113');assert.equal(playback.state.status,'playing');assert.equal(providerRequests,0);assert.equal(playback.state.canNext,false);
if(actualBytes.size){
 const nextUrl=(await store.listRecordings(r1))[1].urls[0];
 const local=Buffer.from(await nativeFetch(tracks.at(-1).src).then(r=>r.arrayBuffer()));
 assert.deepEqual(local,actualBytes.get(nextUrl).bytes,'The next saved chapter is played from the actual locally stored audio.');
}
// A new store instance and remount read the same original IndexedDB database.
dispose();const reopened=createOfflineAudioStore({idb:fixture.idb,cacheStorage:null,baseUrl:'https://salah.invalid/salah/'});dispose=api.mountSavedQuranAudio(host,index,{store:reopened});await turns();assert.equal(host.querySelectorAll('[data-saved-play]').length,3);const firstSaved=(await reopened.listRecordings(r1))[0].urls[0];assert.equal((await reopened.getAudio(firstSaved)).size,actualBytes.get(firstSaved)?.bytes.length||4);assert.equal(providerRequests,0);
// Deletion requires the existing confirmation UI and only touches public audio.
host.querySelector('[data-saved-remove="'+r2+':1"]').click();assert.equal((await reopened.listRecordings()).length,3,'Opening a confirmation cannot delete');doc.querySelector('[data-close]').click();assert.equal((await reopened.listRecordings()).length,3);
host.querySelector('[data-saved-remove="'+r2+':1"]').click();doc.querySelector('[data-confirm-saved-remove]').click();await turns();assert.equal((await reopened.listRecordings()).length,2);assert.equal(host.querySelectorAll('[data-saved-play]').length,2);assert.ok(toasts.includes(language.t('offlineAudioUi.removed')));assert.equal(playback.state.status,'playing','Deleting another download does not interrupt current audio');
// The old all-surahs downloader is reachable here; it skips already stored
// chapters, reports progress and saves to the same database used by playback.
const downloadReciter=host.querySelector('#quran-offline-reciter');downloadReciter.value=r1;downloadReciter.dispatchEvent(new w.Event('change'));host.querySelector('#quran-offline-selection').value='all';host.querySelector('#quran-offline-start').click();assert.ok(doc.querySelector('#quran-confirm-download'),'Downloading all chapters is explicitly confirmed');doc.querySelector('#quran-confirm-download').click();await turns();while(api.quranDownloadQueue.busy)await turns();await turns();assert.equal((await reopened.listRecordings(r1)).length,114);assert.equal(queueSaves.length,112,'Already downloaded chapters are not fetched/saved twice');assert.equal(providerRequests,0);assert.equal(host.querySelectorAll('[data-saved-play]').length,114);
host.querySelector('[data-saved-clear]').click();assert.equal((await reopened.listRecordings()).length,114);doc.querySelector('[data-confirm-saved-clear]').click();await turns();assert.equal((await reopened.listRecordings()).length,0);assert.equal(host.querySelectorAll('[data-saved-play]').length,0);assert.ok(host.querySelector('.reciter-empty').textContent.includes(language.t('offlineAudioUi.emptyHelp')));assert.equal(host.querySelector('[data-saved-clear]').hidden,true);assert.equal(fixture.databases.size,1,'No replacement cache/database is introduced');
// Queue cancellation preserves its finished chapters; Resume continues
// from the store instead of discarding work or starting a duplicate queue.
let unblock,attempt=0;const beforePartial=queueSaves.length,emptyBeforePartial=host.querySelector('.reciter-empty');releaseSave=signal=>++attempt===1?Promise.resolve():new Promise((resolve,reject)=>{unblock=resolve;signal.addEventListener('abort',()=>reject(new DOMException('Paused','AbortError')),{once:true});});
host.querySelector('#quran-offline-selection').value='all';host.querySelector('#quran-offline-start').click();doc.querySelector('#quran-confirm-download').click();await turns();assert.equal((await reopened.listRecordings(r1)).length,1);assert.equal(host.querySelector('[data-saved-clear]').disabled,true,'Deletion is unavailable while the download queue owns storage');assert.equal(host.querySelector('.reciter-empty'),emptyBeforePartial,'Bulk progress does not rebuild the saved audio list before the queue settles');host.querySelector('#quran-offline-pause').click();await turns();assert.equal(api.quranDownloadQueue.state.status,'paused');assert.equal((await reopened.listRecordings(r1)).length,1,'Pausing keeps the completed chapter');releaseSave=null;downloadReciter.value=r2;downloadReciter.dispatchEvent(new w.Event('change'));const resume=host.querySelector('#quran-offline-resume');assert.equal(resume.hidden,false);resume.click();assert.equal(doc.querySelector('#modal').open,false,'Resume never adds the current selector to the original queue');await turns();while(api.quranDownloadQueue.busy)await turns();await turns();assert.equal((await reopened.listRecordings(r1)).length,114);assert.equal(host.querySelectorAll('[data-saved-play]').length,114);assert.equal(queueSaves.length-beforePartial,114,'Resume does not download the completed chapter again');assert.equal(providerRequests,0);
const snapshots=JSON.stringify([...storage]);dispose();const detached=host.innerHTML;language.setInterfaceLanguage('en');assert.equal(host.innerHTML,detached,'Unmount removes download/playback/language subscriptions');assert.equal(JSON.stringify([...storage]),snapshots);
let storageFailures=1;dispose=api.mountSavedQuranAudio(host,index,{store:{listRecordings:async()=>{if(storageFailures--===1)throw Error('Storage unavailable');return reopened.listRecordings();}}});await turns();assert.equal(host.querySelector('[data-saved-status]').textContent,language.t('downloadUi.storageUnavailable'));host.querySelector('[data-saved-retry]').click();await turns();assert.equal(host.querySelectorAll('[data-saved-play]').length,114,'A storage failure can be retried without clearing anything');dispose();
let lateList;dispose=api.mountSavedQuranAudio(host,index,{store:{listRecordings:()=>new Promise(resolve=>lateList=resolve)}});dispose();host.innerHTML='<p>New route</p>';lateList(await reopened.listRecordings());await turns();assert.equal(host.textContent,'New route','An old storage request cannot restore a detached library');
// Route through the actual shared Quran/reciter header and library dispatcher.
context.recognitionEntry=()=>'';context.showListeningScanner=()=>{};const librarySource=await fs.readFile(new URL('../dist/js/quran-reciter-library.js',import.meta.url),'utf8'),library=vm.runInContext(librarySource.replace(/^import.*\n/gm,'').replace(/export /g,'')+';({mountReciterLibrary,quranSectionTabs})',context);
const header=doc.createElement('div');for(const code of ['ru','en','az','tg','uz','kk','de','ar']){language.setInterfaceLanguage(code);for(const active of ['read','reciters']){header.innerHTML=library.quranSectionTabs(active);assert.equal(header.querySelector('.quran-saved-library-entry'),null,'The shared Quran/reciters header has no redundant Downloaded button');assert.equal(header.querySelector('[href="#quran?view=reciters&filter=downloaded"]'),null);assert.equal(header.querySelector('a[aria-current=page]').getAttribute('href'),active==='read'?'#quran':'#quran?view=reciters','The approved reading/reciter navigation is retained');assert.ok(header.querySelector('#quran-open-listening-scanner'),'Transfer scanning stays available');}}
dispose=library.mountReciterLibrary(host,index,null,'downloaded');await turns();assert.equal(host.querySelectorAll('[data-saved-play]').length,114,'Removing the common-screen entry does not remove the existing saved route or its recordings');assert.equal(host.querySelector('.quran-saved-library-entry'),null);assert.equal(providerRequests,0);dispose();playback.stop();
// On the normal reader profile, airplane mode selects the saved queue and
// avoids the first unsaved chapter even if the same surah was already paused.
await reopened.removeRecording((await reopened.listRecordings(r1)).find(record=>record.surah===113));
Object.assign(context,{reciterIsAvailable,visibleReciters,reciterImageUrl:path=>path,recentReciters:()=>[],
 normalizeReciterFavorites:()=>[],ruqyahMarkup:()=>'',bindRuqyah:()=>()=>{},bindPopularConsent(){},
 listeningDayKey:()=> '2026-11-26'});
dispose=library.mountReciterLibrary(host,index,r1,null);
await turns();
await playback.start(reciterRecording(index,112),r1,0,true,false);
await turns();playback.pause();
const audioBeforeMissing=tracks.length;
assert.ok(!host.querySelector('[data-reciter-download="113"]').textContent.includes(language.t('reciterUi.saved')),'A completed queue cannot make a removed recording appear saved');
await host.querySelector('[data-reciter-play="113"]').onclick();
assert.equal(tracks.length,audioBeforeMissing,'A chapter missing in airplane mode never starts a network audio element');
assert.equal(playback.state.surah.number,112,'An unavailable tap preserves the current paused chapter');
assert.equal(playback.state.status,'paused');
assert.equal(host.querySelector('#reciter-listen-status').textContent,language.t('offlineAudioUi.playFailed'));
await host.querySelector('[data-reciter-play="112"]').onclick();await turns();
assert.equal(playback.state.offlineOnly,true);
assert.equal(playback.state.status,'playing');
tracks.at(-1).onended();await turns();
assert.equal(playback.state.surah.number,114);
assert.equal(providerRequests,0);
dispose();playback.stop();
await save(1,r2);await save(113,r2);await save(114,r2);
dispose=library.mountReciterLibrary(host,index,r2,null);await turns();
await host.querySelector('[data-reciter-play="1"]').onclick();await turns();
assert.equal(playback.state.surah.number,1,'The exact Daussari Al-Fatiha entry from the report starts offline');
assert.equal(playback.state.offlineOnly,true);
assert.equal(playback.state.status,'playing');
assert.match(tracks.at(-1).src,/^blob:/);
const fatihaRecord=(await reopened.listRecordings(r2)).find(record=>record.surah===1);
const fatihaBytes=actualBytes.get(fatihaRecord.urls[0]);
if(fatihaBytes)assert.deepEqual(Buffer.from(await (await nativeFetch(tracks.at(-1).src)).arrayBuffer()),fatihaBytes.bytes);
playback.stop();
const dausariButton=host.querySelector('[data-reciter-play="113"]');
assert.ok(dausariButton,'Daussari full-surah download is available from his regular profile');
await dausariButton.onclick();await turns();
assert.equal(playback.state.reciter,r2);
assert.equal(playback.state.offlineOnly,true);
assert.equal(playback.state.status,'playing');
assert.match(tracks.at(-1).src,/^blob:/,'Airplane mode hands saved local audio to the player');
const bytes=actualBytes.get((await reopened.listRecordings(r2)).find(record=>record.surah===113).urls[0]);
if(bytes)assert.deepEqual(Buffer.from(await (await nativeFetch(tracks.at(-1).src)).arrayBuffer()),bytes.bytes);
tracks.at(-1).onended();await turns();
assert.equal(playback.state.surah.number,114);
assert.equal(playback.state.status,'playing');
assert.match(tracks.at(-1).src,/^blob:/);
assert.equal(providerRequests,0);
playback.stop();

let finishNext;
language.setInterfaceLanguage('ru');
releaseSave=()=>new Promise(resolve=>{finishNext=resolve;});
const buttonFor=number=>host.querySelector('[data-reciter-download="'+number+'"]');
buttonFor(109).click();await turns();
assert.equal(buttonFor(110).disabled,false,'The next surah stays selectable during a download');
buttonFor(110).click();buttonFor(111).click();
assert.match(buttonFor(110).textContent,/В очереди/);
assert.match(buttonFor(111).textContent,/В очереди/);
assert.equal(buttonFor(110).disabled,true,'Queued surahs cannot be accidentally added twice');
releaseSave=null;finishNext();
while(api.quranDownloadQueue.busy)await turns();
assert.deepEqual(api.quranDownloadQueue.state.completed.map(track=>track.number),[109,110,111]);
assert.match(buttonFor(111).textContent,/Сохранено/);
context.navigator.onLine=true;
await host.querySelector('[data-reciter-play="114"]').onclick();await turns();
assert.equal(playback.state.status,'playing');
assert.equal(playback.state.offlineOnly,false,'A normal online profile tap keeps the existing listening mode');
playback.stop();
dispose();
for(const code of ['ru','en','az','tg','uz','kk','de','ar']){assert.deepEqual(Object.keys(offlineCopy[code]).sort(),Object.keys(offlineCopy.ru).sort());for(const key of Object.keys(offlineCopy.ru)){const placeholders=value=>new Set(Object.values(typeof value==='string'?{value}:value).flatMap(text=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(match=>match[1])));assert.deepEqual([...placeholders(offlineCopy[code][key])].sort(),[...placeholders(offlineCopy.ru[key])].sort());}}
language.setInterfaceLanguage('ru');globalThis.document=previous.document;globalThis.window=previous.window;globalThis.fetch=previous.fetch;if(previous.navigator)Object.defineProperty(globalThis,'navigator',previous.navigator);else delete globalThis.navigator;await w.happyDOM.close();
console.log('PASS: actual downloaded-audio DOM/IndexedDB/player work with providers blocked, all-reciter visibility, offline skip-next, 114-chapter download/resume, remount persistence, explicit deletion, locale/focus/scroll stability and cleanup. No browser/device claim.');
