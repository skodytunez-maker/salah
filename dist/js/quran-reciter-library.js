import{t,getLocale,subscribeLanguage}from './i18n.js';
import{uiLeaf,uiTextAttributes,uiAttribute,setUiLabel,setUiAttribute,clearUiLabel,translateQuranUi,translateReciterGroups,bindQuranUi,quranModal,downloadErrorKey}from './quran-ui.js';
import{recognitionEntry}from './quran-recognition.js';
import{reciterIsPromoted,recentReciters,orderReciterCatalog,reciterFilterTabs}from './quran-reciter-discovery.js';
import{reciterImageUrl}from './approved-catalog.js';
import{watchDecodedImages}from './image-presentation.js';
import{mountReciterRanking}from './reciter-ranking-page.js';
import{loadPopularReciters,popularConsentMarkup,bindPopularConsent,personalListening,personalTop,listeningDayKey}from './reciter-popularity.js';
import{actionIcon,actionLabel}from './action-icons.js';
import{ruqyahFor,ruqyahMarkup,bindRuqyah}from './quran-ruqyah.js';
import{showListeningScanner}from './quran-listen-share.js';
import{quranDownloadQueue,mountSavedQuranAudio}from './quran-downloads.js';
import{offlineAudioStore}from './quran-offline-store.js';
import{RECITERS,reciterInfo,reciterHasSurah,reciterIsAvailable,visibleReciters}from './quran-reciters.js';
import{RECITER_FAVORITES_KEY,normalizeReciterFavorites,toggleReciterFavorite}from './quran-reciter-favorites.js';
import{read,write}from './storage.js';
import{esc,toast}from './ui.js';
import{reciterRecording}from './quran-reciter-recording.js';
import{quranPlayback}from './quran-session.js';
const formatListeningTime=seconds=>{const total=Math.floor(Math.max(0,Number(seconds)||0)),minutes=Math.floor(total/60),rest=total%60;return !minutes?t(total?'reciterUi.timeSeconds':'reciterUi.timeZero',{count:total}):t(rest?'reciterUi.timeWithSeconds':'reciterUi.timeMinutes',{hours:Math.floor(minutes/60),minutes:minutes%60,seconds:rest});};
const favorites=()=>[...new Set(normalizeReciterFavorites(read(RECITER_FAVORITES_KEY,[]),RECITERS).map(id=>reciterInfo(id).variantOf||id))];
const catalogReciters={get length(){return visibleReciters().filter(r=>!r.variantOf).length;},filter(fn){return visibleReciters().filter(r=>!r.variantOf).filter(fn);}};
export const reciterPortrait=r=>'<img class="reciter-portrait" data-image-pending src="'+esc(reciterImageUrl(r.portrait))+'" alt="'+esc(r.name)+'" loading="lazy" decoding="async">';
const favoriteButton=(r,saved)=>'<button type="button" class="reciter-favorite" data-reciter-favorite="'+r.id+'" aria-pressed="'+saved.includes(r.id)+'" '+uiAttribute(saved.includes(r.id)?'reciterUi.favoriteRemoveName':'reciterUi.favoriteAddName',{name:r.name})+'><img src="./assets/'+(saved.includes(r.id)?'star-fill':'star')+'.svg" alt="" aria-hidden="true"></button>';
export function saveReciterFavorite(id){
 const info=RECITERS.find(r=>r.id===id);if(!info||!reciterIsAvailable(id))return false;const next=toggleReciterFavorite(favorites(),info.variantOf||id,RECITERS);if(!next)return false;
 if(!write(RECITER_FAVORITES_KEY,next)){toast(t('reciterUi.favoriteFailed'));return false;}
 window.dispatchEvent(new Event('salah:reciter-favorites'));return true;
}
const card=(r,saved,note='',rank=0,now=Date.now())=>'<article class="reciter-card"><a href="#quran?view=reciters&reciter='+encodeURIComponent(r.id)+'">'+(rank?'<span class="reciter-rank" '+uiAttribute('reciterUi.rank',{number:rank})+'>'+rank+'</span>':'')+reciterPortrait(r)+(reciterIsPromoted(r,now)?"<span class=\"reciter-new-badge\">"+(uiLeaf('reciterUi.new'))+"</span>":'')+'<strong>'+esc(r.name)+'</strong><small>'+(r.availableSurahs?uiLeaf('reciterUi.recordsCount',{count:r.availableSurahs.length}):uiLeaf('quranUi.surahsCount',{count:114}))+'</small>'+(note?'<span class="reciter-listening-time" data-personal-time="'+esc(r.id)+'">'+esc(note)+'</span>':'')+'</a>'+favoriteButton(r,saved)+'</article>';
export function quranSectionTabs(active='read'){const reading=active==='read';return "<header class=\"quran-section-title\"><nav class=\"quran-section-heading\" "+(uiAttribute('reciterUi.sectionLabel',{},'aria-label'))+"><a href=\"#quran\" aria-current=\""+(reading?'page':'false')+'">'+(reading?"<h1>"+(uiLeaf('nav.quran'))+"</h1>":uiLeaf('nav.quran'))+'</a><div class="quran-heading-tools">'+recognitionEntry()+"<button type=\"button\" class=\"button secondary quran-scan-entry\" id=\"quran-open-listening-scanner\" "+(uiAttribute('reciterUi.scanTransfer',{},'aria-label'))+" "+(uiAttribute('reciterUi.scanQr',{},'title'))+"><svg viewBox=\"0 0 32 32\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 3H5a2 2 0 0 0-2 2v5m19-7h5a2 2 0 0 1 2 2v5M3 22v5a2 2 0 0 0 2 2h5m12 0h5a2 2 0 0 0 2-2v-5\"/><rect x=\"7\" y=\"7\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"19\" y=\"7\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"7\" y=\"19\" width=\"6\" height=\"6\" rx=\"1\"/><path fill=\"currentColor\" stroke=\"none\" d=\"M9 9h2v2H9zm12 0h2v2h-2zM9 21h2v2H9zm7-5h3v3h-3zm6 0h3v3h-3zm-6 6h3v3h-3zm6 0h3v3h-3z\"/></svg></button></div><a href=\"#quran?view=reciters\" aria-current=\""+(!reading?'page':'false')+'">'+(!reading?"<h1>"+(uiLeaf('reciterUi.reciters'))+"</h1>":uiLeaf('reciterUi.reciters'))+'</a></nav><p class="muted">'+(reading?uiLeaf('quranUi.surahsCount',{count:114}):uiLeaf('reciterUi.chooseVoice'))+'</p></header>';}
export function mountReciterLibrary(host,index,chosen,filter){
 if(!chosen&&filter==='downloaded'){
  const dispose=mountSavedQuranAudio(host,index,{heading:()=>quranSectionTabs('downloaded')});
  const scanner=host.querySelector('#quran-open-listening-scanner');if(scanner)scanner.onclick=showListeningScanner;
  return dispose;
 }
 if(!chosen&&['my-top','salah-top','popular'].includes(filter))return mountReciterRanking(host,filter,()=>quranSectionTabs('reciters'));

 let disposePortraits=null;
 let renderedDay=listeningDayKey(Date.now());let listeningPeriod=read('reciter-listening-period','day');if(!['day','week','month','all'].includes(listeningPeriod))listeningPeriod='day';let disposeRuqyah=null;let closed=false,request=0,currentQuery='',renderedDiscovery='',rankingMode=filter==='salah-top'?'global':'personal',popularIds=null,popularError=false,savedSurahs=new Set();const r=visibleReciters().find(r=>r.id===chosen)||null;
 const discoveryKey=(now=Date.now())=>recentReciters(RECITERS,now).map(r=>r.id+':'+reciterIsPromoted(r,now)).join('|');
 const draw=()=>{const now=Date.now();if(!r&&filter==='new'&&!recentReciters(RECITERS,now).length)filter=null;renderedDay=listeningDayKey(now);renderedDiscovery=discoveryKey(now);
  disposePortraits?.();disposePortraits=null;disposeRuqyah?.();disposeRuqyah=null;
  const saved=favorites().filter(reciterIsAvailable),selected=saved.map(id=>reciterInfo(id)),others=catalogReciters.filter(r=>!saved.includes(r.id)),favoriteView=filter==='favorites',newView=filter==='new',newReaders=recentReciters(RECITERS,now),ruqyahView=filter==='ruqyah',popularView=['popular','my-top','salah-top'].includes(filter);
  host.innerHTML='<section class="quran-library quran-reciters-library">'+quranSectionTabs('reciters')+(r?'<div class="reciter-topnav"><a class="reciter-back-catalog" href="#quran?view=reciters">'+actionLabel('back',t('reciterUi.allReciters'))+'</a></div>':'')+(r?
   '<div class="reciter-profile">'+reciterPortrait(r)+"<div><span class=\"eyebrow\">"+(uiLeaf('reciterUi.quranReciter'))+"</span><h1>"+esc(r.name)+'</h1><p class="muted">'+(r.availableSurahs?uiLeaf('reciterUi.recordsCount',{count:r.availableSurahs.length}):uiLeaf('quranUi.surahsCount',{count:114}))+(r.riwaya?' · '+esc(r.riwaya):'')+'</p>'+favoriteButton(r,saved)+'</div></div>'+ruqyahMarkup(r.id)+(r.offline===false?"<p class=\"quran-option-note\">"+(uiLeaf('reciterUi.onlineNote'))+"</p>":'')+'<div class="reciter-surahs">'+index.surahs.filter(s=>reciterHasSurah(r.id,s.number)).map(s=>'<article class="reciter-surah-row"><button type="button" data-reciter-play="'+s.number+'"><span class="quran-surah-number">'+s.number+'</span><span><strong>'+esc(s.name)+'</strong><small>'+uiLeaf('quranUi.ayahsCount',{count:s.ayahs})+'</small></span><span class="reciter-play-label">'+actionLabel('play',t('quranUi.listen'))+'</span></button><button type="button" class="reciter-download" data-reciter-download="'+s.number+'" aria-label="Скачать '+esc(s.name)+' · '+esc(r.name)+'" '+(r.offline===false?'disabled':'')+'>'+(r.offline===false?t('reciterUi.online'):actionLabel('download',t('downloadUi.download')))+'</button></article>').join('')+"</div><p id=\"reciter-download-status\" class=\"quran-option-note\" role=\"status\" aria-live=\"polite\"></p><button type=\"button\" class=\"text-button\" id=\"reciter-download-pause\" hidden>"+(uiLeaf('reciterUi.pauseDownload'))+"</button>":
   "<label class=\"field\">"+(uiLeaf('reciterUi.search'))+"<input type=\"search\" id=\"reciter-search\" "+(uiAttribute('reciterUi.namePlaceholder',{},'placeholder'))+" autocomplete=\"off\"></label>"+reciterFilterTabs(favoriteView?'favorites':newView?'new':ruqyahView?'ruqyah':popularView?null:'all',saved.length,RECITERS,now)+"<nav class=\"reciter-top-tabs\" "+(uiAttribute('reciterUi.topLabel',{},'aria-label'))+"><a class=\"reciter-top-tab reciter-top-personal\" href=\"#quran?view=reciters&filter=my-top\" aria-current=\""+(popularView&&rankingMode==='personal'?'page':'false')+"\"><span class=\"reciter-top-icon\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M4 13v-2a8 8 0 0 1 16 0v2M4 12h3v7H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Zm16 0h-3v7h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2Z\"/></svg></span><span><strong>"+(uiLeaf('reciterUi.myTop'))+"</strong><small>"+(uiLeaf('reciterUi.myTopNote'))+"</small></span></a><a class=\"reciter-top-tab reciter-top-global\" href=\"#quran?view=reciters&filter=salah-top\" aria-current=\""+(popularView&&rankingMode==='global'?'page':'false')+"\"><span class=\"reciter-top-icon\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v5m-4 3h8m-7-3h6\"/></svg></span><span><strong>"+(uiLeaf('reciterUi.salahTop'))+"</strong><small>"+(uiLeaf('reciterUi.listeners'))+"</small></span></a></nav>" +(newView?"<p class=\"quran-option-note\">"+(uiLeaf('reciterUi.recentNote'))+"</p>"+(!newReaders.length?"<p class=\"reciter-empty\">"+(uiLeaf('reciterUi.noRecent'))+"</p>":''):'')+(favoriteView&&!selected.length?"<p class=\"reciter-empty\">"+(uiLeaf('reciterUi.favoriteEmpty'))+"</p>":'')+(popularView?''+(rankingMode==='personal'?"<div class=\"reciter-period-tabs\" role=\"group\" "+(uiAttribute('reciterUi.periodLabel',{},'aria-label'))+">"+[['day',t('reciterUi.day')],['week',t('reciterUi.week')],['month',t('reciterUi.month')],['all',t('reciterUi.allTime')]].map(([value,label])=>'<button type="button" data-listening-period="'+value+'" aria-pressed="'+(listeningPeriod===value)+'">'+label+'</button>').join('')+'</div><div class="reciter-personal-total"><span>Вы прослушали · '+({day:t('reciterUi.today'),week:t('reciterUi.thisWeek'),month:t('reciterUi.thisMonth'),all:t('reciterUi.entireTime')}[listeningPeriod])+'</span><strong>'+formatListeningTime(Object.values(personalListening(listeningPeriod).totals).reduce((sum,n)=>sum+n,0))+'</strong><small>'+(listeningPeriod==='all'?t('reciterUi.onDevice'):'Счёт по датам — с '+new Intl.DateTimeFormat('ru',{day:'numeric',month:'long'}).format(new Date(personalListening().dailySince)))+'</small></div>'+(!personalTop(listeningPeriod).length?"<p class=\"reciter-empty\">"+(uiLeaf('reciterUi.personalEmpty'))+"</p>":''):"<div class=\"reciter-popular-heading\"><h2>"+(uiLeaf('reciterUi.salahTop'))+"</h2><p>"+(uiLeaf('reciterUi.rankingNote'))+"</p></div>"+popularConsentMarkup()+(popularIds===null?'<p class="reciter-empty">'+(popularError?t('reciterUi.rankingUnavailable'):t('reciterUi.loadingRanking'))+'</p>':!popularIds.length?"<p class=\"reciter-empty\">"+(uiLeaf('reciterUi.rankingEmpty'))+"</p>":'')):'')+'<div class="reciter-grid">'+(popularView?(rankingMode==='personal'?personalTop(listeningPeriod):popularIds||[]).map(id=>reciterInfo(id)):ruqyahView?catalogReciters.filter(item=>ruqyahFor(item.id).length):favoriteView?selected:newView?newReaders:orderReciterCatalog(RECITERS,saved,now)).map((item,i)=>card(item,saved,popularView&&rankingMode==='personal'?formatListeningTime(personalListening(listeningPeriod).totals[item.id]):'',popularView?i+1:0,now)).join('')+"</div><p id=\"reciter-search-empty\" class=\"muted\" hidden>"+(uiLeaf('reciterUi.notFound'))+"</p>")+'<p id="reciter-listen-status" class="quran-option-note" role="status" aria-live="polite"></p></section>';
  disposePortraits=watchDecodedImages(host);disposeRuqyah=bindRuqyah(host);bindPopularConsent(host);host.querySelectorAll('[data-listening-period]').forEach(button=>button.onclick=e=>{listeningPeriod=button.dataset.listeningPeriod;write('reciter-listening-period',listeningPeriod);draw();if(e.detail===0)host.querySelector('[data-listening-period="'+listeningPeriod+'"]')?.focus();});
  host.querySelectorAll('[data-reciter-favorite]').forEach(button=>button.onclick=e=>{const id=button.dataset.reciterFavorite;if(!saveReciterFavorite(id))return;draw();sync(quranPlayback.state);syncDownload(quranDownloadQueue.state);if(e.detail===0)host.querySelector('[data-reciter-favorite="'+id+'"]')?.focus();});
  host.querySelector('#quran-open-listening-scanner').onclick=showListeningScanner;
  const search=host.querySelector('#reciter-search');if(search)search.oninput=()=>{currentQuery=search.value;const q=search.value.toLocaleLowerCase('ru').replace(/ё/g,'е').trim();let count=0;host.querySelectorAll('.reciter-card').forEach(card=>{card.hidden=!card.textContent.toLocaleLowerCase('ru').replace(/ё/g,'е').includes(q);if(!card.hidden)count++;});host.querySelector('#reciter-search-empty').hidden=count>0||!q;};
  if(search){search.value=currentQuery;search.oninput();}
  host.querySelectorAll('[data-reciter-play]').forEach(button=>button.onclick=async()=>{
   if(!reciterIsAvailable(r.id))return;
   const token=++request,number=Number(button.dataset.reciterPlay),status=host.querySelector('#reciter-listen-status');
   try{
    const offline=navigator.onLine===false;
    const active=quranPlayback.state;
    const same=(active.reciter===r.id||active.reciter===r.continuousReciter)&&active.surah?.number===number&&['playing','paused','loading'].includes(active.status);
    if(same&&(!offline||['playing','loading'].includes(active.status))){quranPlayback.toggle();return;}
    const saved=offline&&(await offlineAudioStore.listRecordings(r.id).catch(()=>[])).some(record=>record.surah===number);
    if(closed||token!==request)return;
    if(offline&&!saved){setUiLabel(status,'offlineAudioUi.playFailed');return;}
    if(same&&active.offlineOnly&&active.reciter===r.id){quranPlayback.toggle();return;}
    setUiLabel(status,'reciterUi.loadingNamed',{name:index.surahs[number-1].name});
    const surah=reciterRecording(index,number),resume=offline&&same&&active.reciter===r.id;
    write('quran-preferences',{...read('quran-preferences',{}),reciter:r.id});
    await quranPlayback.start(surah,r.id,resume?active.index:0,true,offline,resume?active.trackPositionSeconds:0);
    if(!closed&&token===request){
     const failed=quranPlayback.state.status==='error';
     if(failed)setUiLabel(status,offline?'offlineAudioUi.playFailed':'reciterUi.surahFailed');
     else clearUiLabel(status);
    }
   }catch{if(!closed&&token===request)setUiLabel(status,'reciterUi.surahFailed');}
  });

  host.querySelectorAll('[data-reciter-download]').forEach(button=>button.onclick=()=>{
   if(!r||r.offline===false)return;
   const number=Number(button.dataset.reciterDownload);
   if(savedSurahs.has(number)){toast(t('reciterUi.alreadySaved'));return;}
   void quranDownloadQueue.enqueue(r.id,number);
  });
  const pauseDownload=host.querySelector('#reciter-download-pause');if(pauseDownload)pauseDownload.onclick=()=>quranDownloadQueue.pause();paintLanguage();
 };
const seenDownloads=new WeakSet(quranDownloadQueue.state.completed);
function syncDownload(state){
 if(closed||!r)return;const matches=state.reciter===r.id,busy=quranDownloadQueue.busy;
 for(const track of state.completed){
  if(seenDownloads.has(track))continue;
  seenDownloads.add(track);
  if(track.reciter===r.id)savedSurahs.add(track.number);
 }
 const waiting=new Set(state.pending.filter(track=>track.reciter===r.id).map(track=>track.number));
 host.querySelectorAll('[data-reciter-download]').forEach(button=>{
  const number=Number(button.dataset.reciterDownload),queued=waiting.has(number);
  const working=queued&&matches&&state.surah===number&&busy,saved=savedSurahs.has(number);
  const label=working?t('downloadUi.downloading'):saved?t('reciterUi.saved'):queued
   ?t(busy?'reciterUi.downloadQueued':'downloadUi.resume'):t('downloadUi.download');
  const visibleLabel=r.offline===false?t('reciterUi.online'):label;
  if(button.dataset.downloadLabel!==visibleLabel){
   button.innerHTML=r.offline===false?visibleLabel:actionLabel('download',visibleLabel);
   button.dataset.downloadLabel=visibleLabel;
  }
  const accessibleLabel=saved?'reciterUi.savedNamed':queued&&busy?'reciterUi.queuedNamed':'reciterUi.downloadNamed';
  setUiAttribute(button,'aria-label',accessibleLabel,{name:index.surahs[number-1].name,reciter:r.name});
  const disabled=r.offline===false||(queued&&busy);
  if(button.disabled!==disabled)button.disabled=disabled;
 });
 const status=host.querySelector('#reciter-download-status');if(status){if(matches&&busy)setUiLabel(status,'reciterUi.downloadProgress',{name:index.surahs[state.surah-1].name,value:new Intl.NumberFormat(getLocale()).format(Math.round((state.bytes+(state.currentBytes||0))/1024))});else{const key=matches?{complete:'reciterUi.savedHint',paused:'reciterUi.downloadPaused',error:downloadErrorKey(state)}[state.status]:busy?'reciterUi.otherDownload':null;if(key)setUiLabel(status,key);else clearUiLabel(status);}}
 const pause=host.querySelector('#reciter-download-pause');if(pause)pause.hidden=!matches||!busy;
}
 const refreshDiscovery=()=>{if(closed||r||document.hidden||document.activeElement===host.querySelector('#reciter-search'))return;if(discoveryKey()!==renderedDiscovery)draw();};
 const discoveryTimer=!r&&!['popular','my-top','salah-top'].includes(filter)?setInterval(refreshDiscovery,60000):null;document.addEventListener('visibilitychange',refreshDiscovery);
 const sync=state=>{if(closed)return;host.querySelectorAll('[data-reciter-play]').forEach(b=>{const match=(state.reciter===r?.id||state.reciter===r?.continuousReciter)&&state.surah?.number===Number(b.dataset.reciterPlay),playing=match&&['playing','loading'].includes(state.status);b.setAttribute('aria-pressed',String(playing));const label=playing?t('player.pause'):match&&state.status==='paused'?t('reciterUi.resume'):t('quranUi.listen'),control=b.querySelector('.reciter-play-label');if(control.dataset.playLabel!==label){control.innerHTML=actionLabel(playing?'pause':'play',label);control.dataset.playLabel=label;}});};draw();const refreshGlobal=()=>{if(closed||r||filter!=='salah-top'||document.hidden||document.activeElement===host.querySelector('#reciter-search'))return;void loadPopularReciters().then(ids=>{if(closed)return;popularIds=ids;popularError=false;if(document.activeElement!==host.querySelector('#reciter-search'))draw();}).catch(()=>{if(closed)return;popularError=true;draw();});};refreshGlobal();const globalTimer=filter==='salah-top'?setInterval(refreshGlobal,60000):null;const periodTimer=['popular','my-top'].includes(filter)?setInterval(()=>{if(!closed&&!r&&renderedDay!==listeningDayKey(Date.now())&&document.activeElement!==host.querySelector('#reciter-search'))draw();},60000):null;window.addEventListener('salah:popularity-updated',refreshGlobal);document.addEventListener('visibilitychange',refreshGlobal);const refreshConsent=()=>{if(!closed&&!r&&['popular','my-top','salah-top'].includes(filter))draw();};window.addEventListener('salah:counter-status',refreshConsent);const refreshListening=()=>{if(closed||r||!['popular','my-top'].includes(filter))return;if(document.activeElement===host.querySelector('#reciter-search')){const totals=personalListening(listeningPeriod).totals;const heading=host.querySelector('.reciter-personal-total strong');if(heading)heading.textContent=formatListeningTime(Object.values(totals).reduce((sum,n)=>sum+n,0));host.querySelectorAll('[data-personal-time]').forEach(el=>el.textContent=formatListeningTime(totals[el.dataset.personalTime]));}else draw();};window.addEventListener('salah:personal-listening',refreshListening);const unsubscribe=quranPlayback.subscribe(sync);const unsubscribeDownload=quranDownloadQueue.subscribe(syncDownload);if(r)void offlineAudioStore.listRecordings(r.id).then(records=>{if(closed)return;for(const record of records)savedSurahs.add(record.surah);syncDownload(quranDownloadQueue.state);}).catch(()=>{});
 function paintLanguage(){if(closed)return;translateQuranUi(host);sync(quranPlayback.state);syncDownload(quranDownloadQueue.state);
  for(const button of host.querySelectorAll('[data-listening-period]'))setUiLabel(button,{day:'reciterUi.day',week:'reciterUi.week',month:'reciterUi.month',all:'reciterUi.allTime'}[button.dataset.listeningPeriod]);
  for(const button of host.querySelectorAll('[data-reciter-favorite]'))setUiAttribute(button,'aria-label',button.getAttribute('aria-pressed')==='true'?'reciterUi.favoriteRemoveName':'reciterUi.favoriteAddName',{name:reciterInfo(button.dataset.reciterFavorite).name});
  const back=host.querySelector('.reciter-back-catalog span');if(back)setUiLabel(back,'reciterUi.allReciters');
  const total=host.querySelector('.reciter-personal-total');if(total){setUiLabel(total.querySelector('span'),'reciterUi.listenedPeriod',{period:t({day:'reciterUi.today',week:'reciterUi.thisWeek',month:'reciterUi.thisMonth',all:'reciterUi.entireTime'}[listeningPeriod])});if(listeningPeriod==='all')setUiLabel(total.querySelector('small'),'reciterUi.onDevice');else setUiLabel(total.querySelector('small'),'reciterUi.countsSince',{date:new Intl.DateTimeFormat(getLocale(),{day:'numeric',month:'long'}).format(new Date(personalListening().dailySince))});total.querySelector('strong').textContent=formatListeningTime(Object.values(personalListening(listeningPeriod).totals).reduce((sum,n)=>sum+n,0));}
  if(host.querySelector('[data-personal-time]')){const totals=personalListening(listeningPeriod).totals;for(const node of host.querySelectorAll('[data-personal-time]'))node.textContent=formatListeningTime(totals[node.dataset.personalTime]);}
 };
 const offLanguage=subscribeLanguage(paintLanguage);paintLanguage();
 return()=>{closed=true;disposePortraits?.();offLanguage();request++;if(discoveryTimer)clearInterval(discoveryTimer);document.removeEventListener('visibilitychange',refreshDiscovery);if(globalTimer)clearInterval(globalTimer);if(periodTimer)clearInterval(periodTimer);window.removeEventListener('salah:popularity-updated',refreshGlobal);document.removeEventListener('visibilitychange',refreshGlobal);window.removeEventListener('salah:counter-status',refreshConsent);window.removeEventListener('salah:personal-listening',refreshListening);disposeRuqyah?.();unsubscribe();unsubscribeDownload();};
}
