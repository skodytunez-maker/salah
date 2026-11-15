import{initQuranSessionRecovery}from './quran-session-recovery.js';
import{bindMiniPlayerDismiss}from './quran-mini-dismiss.js';
import{mountPlayerWindow}from './quran-player-window.js';
import{mountQuranPlayerExtras}from './quran-player-extras.js';
import{reciterImageUrl}from './approved-catalog.js';
import{createImagePresenter}from './image-presentation.js';
import{ruqyahPlayback}from './ruqyah-session.js';
import{ruqyahDuration}from './ruqyah-catalog.js';
import{showTvOutput}from './tv-output.js';
import{actionIcon}from './action-icons.js';
import{showListeningShare}from './quran-listen-share.js';
import{RECITER_FAVORITES_KEY}from './quran-reciter-favorites.js';
import{quranPlayback}from './quran-session.js';
import{markListeningDismissed}from './quran-listening-progress.js';
import{RECITERS,reciterInfo,reciterHasSurah,groupedReciters}from './quran-reciters.js';
import{read,write}from './storage.js';
import{toast}from './ui.js';
import{t,translateUi,subscribeLanguage}from './i18n.js';
const icon=path=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
const previous=icon('<path d="M6 5v14M18 5l-9 7 9 7z"/>'),next=icon('<path d="M18 5v14M6 5l9 7-9 7z"/>');
const play=icon('<path d="M6.5 5l11 7-11 7z"/>'),pause=icon('<path d="M8 5v14M16 5v14"/>');
export function playerDockOffset(viewportHeight,{top=0,height=0,visible=false,bottom=NaN}={}){return visible&&height>0?Math.max(12,(Number.isFinite(bottom)?bottom+height:viewportHeight-top)+8):12;}
export function mountQuranPlayer(){
 const panel=document.createElement('section');panel.id='quran-global-player';panel.className='quran-global-player';panel.hidden=true;panel.setAttribute('aria-label',t('player.quranLabel'));
 panel.innerHTML='<div class="quran-player-heading"><button type="button" class="quran-player-collapse" data-collapse data-i18n-aria-label="player.collapse" aria-label="Свернуть плеер">'+icon('<path d="m6 9 6 6 6-6"/>')+'</button><span>КОРАН · SALAH</span><i data-nature-label hidden aria-hidden="true"></i></div><button type="button" class="quran-now-playing" aria-label="Открыть полный плеер"><img class="quran-playing-portrait" alt=""><strong></strong></button><label class="quran-player-reciter"><span class="quran-playing-reader"></span><select data-i18n-aria-label="player.changeReciter" aria-label="Сменить чтеца"></select></label><small class="quran-playing-status"></small><div class="quran-output-actions"><button type="button" class="quran-handoff-button" data-quran-shuffle data-i18n-aria-label="player.shuffleSurahs" data-i18n-title="player.shuffle" aria-label="Перемешать суры" title="Перемешать">'+actionIcon('shuffle')+'</button><button type="button" class="quran-handoff-button" data-tv data-i18n-aria-label="player.connectOutput" data-i18n-title="player.connectDevice" aria-label="Подключить телевизор или колонку" title="Подключить устройство">'+actionIcon('tv')+'</button><button type="button" class="quran-handoff-button" data-share data-i18n-aria-label="player.sharePosition" data-i18n-title="player.share" aria-label="Передать место прослушивания" title="Передать">'+icon('<path d="M12 16V3m-4 4 4-4 4 4M7 11H4v10h16V11h-3"/>')+'</button></div><div class="quran-global-controls" dir="ltr"><button type="button" data-previous aria-label="Предыдущая сура">'+previous+'</button><button type="button" data-toggle aria-label="Воспроизвести Коран">'+play+'</button><button type="button" data-next aria-label="Следующая сура">'+next+'</button><button type="button" data-expand data-i18n-aria-label="player.open" aria-label="Открыть плеер" aria-haspopup="dialog">'+icon('<path d="m6 15 6-6 6 6"/>')+'</button><button type="button" data-dismiss-player data-i18n-aria-label="player.close" aria-label="Закрыть плеер">'+icon('<path d="m6 6 12 12M18 6 6 18"/>')+'</button></div><div class="quran-mini-progress" aria-hidden="true"><i></i></div><label class="quran-player-progress" dir="ltr"><span data-time></span><input type="range" min="0" max="1" step="1" value="0" dir="ltr" data-i18n-aria-label="player.seek" aria-label="Место в записи"><span data-duration></span></label><details class="quran-playlist-queue" hidden><summary>Плейлист</summary><ol class="quran-playlist-tracks"></ol></details>';
 const dock=document.getElementById('app-bottom-dock')||document.body;dock.append(panel);
 const playerWindow=mountPlayerWindow(panel,dock,{onPlace:placeDock}),expand=()=>playerWindow.open();
 function placeDock(){const nav=document.getElementById('mobile-nav'),rect=nav?.getBoundingClientRect(),navStyle=nav?getComputedStyle(nav):null,navVisible=rect&&rect.height>0&&navStyle.display!=='none';const offset=playerDockOffset(innerHeight,{top:rect?.top,height:rect?.height,bottom:parseFloat(navStyle?.bottom),visible:!!navVisible});panel.style.setProperty('--quran-dock-bottom',offset+'px');document.body.style.setProperty('--quran-audio-reserve',(offset+88)+'px');}
 window.addEventListener('resize',placeDock);globalThis.visualViewport?.addEventListener('resize',placeDock);const dockObserver=typeof ResizeObserver==='function'?new ResizeObserver(placeDock):null;const navElement=document.getElementById('mobile-nav');if(navElement)dockObserver?.observe(navElement);

 const nowPlaying=panel.querySelector('.quran-now-playing'),toggle=panel.querySelector('[data-toggle]'),portraitPresenter=createImagePresenter(nowPlaying.querySelector('.quran-playing-portrait'));
 const imageOnline=()=>void portraitPresenter.retry();window.addEventListener('online',imageOnline);
 panel.querySelector('[data-share]').onclick=showListeningShare;
 const current=()=>ruqyahPlayback.state.record?ruqyahPlayback:quranPlayback;
 panel.querySelector('[data-tv]').onclick=()=>showTvOutput({requestAudio:()=>current().requestOutput()});
 panel.querySelector('[data-previous]').onclick=()=>ruqyahPlayback.state.record?ruqyahPlayback.seek(ruqyahPlayback.state.positionSeconds-10):quranPlayback.changeSurah(-1);
 panel.querySelector('[data-next]').onclick=()=>ruqyahPlayback.state.record?ruqyahPlayback.seek(ruqyahPlayback.state.positionSeconds+10):quranPlayback.changeSurah(1);
 toggle.onclick=()=>current().toggle();
 const reciterSelect=panel.querySelector('select');
 reciterSelect.onchange=async()=>{const reciter=reciterSelect.value;if(!reciterHasSurah(reciter,quranPlayback.state.surah?.number))return;const saved=write('quran-preferences',{...read('quran-preferences',{}),reciter});if(!saved)toast(t('player.reciterSaveFailed'));await quranPlayback.changeReciter(reciter)};
 const dismissPlayer=()=>{const hadQuran=!!quranPlayback.state.surah&&!ruqyahPlayback.state.record;quranPlayback.stop();if(hadQuran)markListeningDismissed();if(ruqyahPlayback.state.record)ruqyahPlayback.stop();};
 panel.querySelector('[data-dismiss-player]').onclick=dismissPlayer;
 const stopMiniDismiss=bindMiniPlayerDismiss(panel,{canStart:()=>!playerWindow.isOpen,dismiss:dismissPlayer});
 const range=panel.querySelector('input[type=range]');range.onchange=()=>current().seek(Number(range.value));
 let queueId=null;const queuePanel=panel.querySelector('.quran-playlist-queue'),queueList=panel.querySelector('.quran-playlist-tracks');
 queueList.onclick=e=>{const button=e.target.closest('[data-playlist-index]');if(button)void quranPlayback.playPlaylistEntry(Number(button.dataset.playlistIndex));};
 const shufflePlaylist=async e=>{const button=e.target.closest?.('button[data-quran-shuffle]');if(!button)return;const route=location.hash;if(quranPlayback.state.offlineOnly){toast(t('player.shuffleOnline'));return;}button.disabled=true;try{const started=await quranPlayback.startPlaylist();if(started&&location.hash===route){expand();queuePanel.open=true;}else if(!started&&!quranPlayback.state.playlistBuilding)toast(t('player.shuffleFailed'));}finally{if(button.isConnected)button.disabled=false;}};
 document.addEventListener('click',shufflePlaylist);
 const paintPickerLanguage=()=>{for(const group of reciterSelect.querySelectorAll('optgroup')){if(group.dataset.playerGroup)group.label=t('player.group.'+group.dataset.playerGroup);for(const option of group.querySelectorAll('option'))option.textContent=option.dataset.playerReader+(option.disabled?' · '+t('player.noRecording'):'');}for(const label of queueList.querySelectorAll('[data-player-surah]'))label.textContent=t('player.surahFallback',{number:label.dataset.playerSurah});};
 const paintLabels=state=>{
  const ruqyah=ruqyahPlayback.state,record=ruqyah.record,playingState=record?ruqyah:state,active=['playing','loading'].includes(playingState.status);
  panel.querySelector('.quran-player-heading>span').textContent=t(record?'player.ruqyahHeading':'player.quranHeading');panel.setAttribute('aria-label',t(record?'player.ruqyahLabel':'player.quranLabel'));
  panel.querySelector('[data-previous]').setAttribute('aria-label',t(record?'player.seekBack':'player.previous'));panel.querySelector('[data-next]').setAttribute('aria-label',t(record?'player.seekForward':'player.next'));
  toggle.setAttribute('aria-label',t(record?(active?'player.pauseRuqyah':'player.playRuqyah'):(active?'player.pauseQuran':'player.playQuran')));
  if(!record&&!state.surah){nowPlaying.setAttribute('aria-label',t('player.openFull'));return;}
  if(record){const reader=reciterInfo(record.reciter),status={paused:'player.pausedState',loading:'common.loading',ended:'player.recordFinished',error:'common.retry'}[ruqyah.status];nowPlaying.setAttribute('aria-label',t('player.openFullRuqyah'));panel.querySelector('.quran-playing-status').textContent=reader.name+' · '+panel.dataset.elapsed+' / '+panel.dataset.duration+(status?' · '+t(status):'');}
  else{const status={loading:'common.loading',paused:'player.pausedState',ended:'player.surahFinished',error:'player.audioUnavailable'}[state.status],position=state.ayah?t('player.ayah',{number:state.ayah}):t(state.timingStatus==='loading'?'player.timingLoading':state.timingStatus==='ready'?'player.betweenAyahs':'player.wholeSurah');nowPlaying.setAttribute('aria-label',t('player.openNamed',{name:state.meta.name}));panel.querySelector('.quran-playing-status').textContent=position+' · '+panel.dataset.elapsed+' / '+panel.dataset.duration+(status?' · '+t(status):'');}
  if(!queuePanel.hidden&&state.playlist)queuePanel.querySelector('summary').textContent=t('player.playlistPosition',{index:state.playlist.index+1,count:state.playlist.tracks.length});
 };
 const draw=state=>{
  document.querySelectorAll('[data-quran-shuffle]').forEach(button=>{button.disabled=state.playlistBuilding||state.offlineOnly;button.setAttribute('aria-busy',String(state.playlistBuilding));});
  queuePanel.hidden=!!ruqyahPlayback.state.record||!state.playlist;
  if(!queuePanel.hidden){const queue=state.playlist;queuePanel.querySelector('summary').textContent=t('player.playlistPosition',{index:queue.index+1,count:queue.tracks.length});if(queueId!==queue.id){queueId=queue.id;queueList.replaceChildren(...queue.tracks.map((track,i)=>{const li=document.createElement('li'),button=document.createElement('button'),title=document.createElement('span'),reader=document.createElement('small');button.type='button';button.dataset.playlistIndex=String(i);title.textContent=track.title||t('player.surahFallback',{number:track.surah});if(!track.title)title.dataset.playerSurah=String(track.surah);reader.textContent=reciterInfo(track.reciter).name;button.append(title,reader);li.append(button);return li;}));}queueList.querySelectorAll('button').forEach((button,i)=>{button.setAttribute('aria-current',String(i===queue.index));});}

  const route=location.hash.slice(1).split('?')[0]||'home';
  const ruqyah=ruqyahPlayback.state,record=ruqyah.record;const visible=!!(record||state.surah)&&['home','quran'].includes(route);panel.hidden=!visible;document.body.classList.toggle('has-quran-audio',visible);if(!visible){playerWindow.close();return;}placeDock();globalThis.requestAnimationFrame?.(placeDock);
  panel.classList.toggle('is-ruqyah',!!record);const playingState=record?ruqyah:state,duration=playingState.durationSeconds||0,position=playingState.positionSeconds||0;range.disabled=!duration||playingState.canSeek===false;range.max=String(duration||1);range.value=String(duration?Math.min(position,duration):0);panel.querySelector('[data-time]').textContent=!record&&!duration?'…':ruqyahDuration(position)||'0:00';panel.querySelector('[data-duration]').textContent=ruqyahDuration(duration)||(record||playingState.durationStatus==='unavailable'?'—':'…');panel.querySelector('.quran-player-progress').hidden=!!record&&!duration;panel.querySelector('.quran-mini-progress i').style.width=(duration?Math.max(0,Math.min(100,position/duration*100)):0)+'%';panel.dataset.elapsed=ruqyahDuration(position)||'0:00';panel.dataset.duration=ruqyahDuration(duration)||'…';
  panel.querySelector('.quran-player-reciter').classList.toggle('is-readonly',!!record);reciterSelect.disabled=!!record;reciterSelect.hidden=!!record;panel.querySelector('[data-share]').hidden=!!record;panel.querySelector('[data-quran-shuffle]').hidden=!!record;
  paintLabels(state);const prevButton=panel.querySelector('[data-previous]'),nextButton=panel.querySelector('[data-next]');prevButton.innerHTML=record?icon('<path d="M5 8a8 8 0 1 1-1 9M5 3v5h5"/><text x="8" y="15" fill="currentColor" stroke="none" font-size="8">10</text>'):previous;nextButton.innerHTML=record?icon('<path d="M19 8a8 8 0 1 0 1 9M19 3v5h-5"/><text x="8" y="15" fill="currentColor" stroke="none" font-size="8">10</text>'):next;
  if(record){const r=reciterInfo(record.reciter);panel.querySelector('.quran-playing-reader').textContent=r.name;nowPlaying.querySelector('strong').textContent=record.title;void portraitPresenter.set(reciterImageUrl(r.portrait));const active=['playing','loading'].includes(ruqyah.status);toggle.innerHTML=active?pause:play;prevButton.disabled=nextButton.disabled=false;return;}
  nowPlaying.querySelector('strong').textContent=state.meta.name;panel.querySelector('.quran-playing-reader').textContent=reciterInfo(state.reciter).name;
  const favorites=read(RECITER_FAVORITES_KEY,[]);void portraitPresenter.set(reciterImageUrl(reciterInfo(state.reciter).portrait));const catalogKey=state.surah.number+'|'+state.reciter+'|'+JSON.stringify(favorites);if(reciterSelect.dataset.catalog!==catalogKey){reciterSelect.dataset.catalog=catalogKey;reciterSelect.replaceChildren(...groupedReciters(favorites).map(group=>{const optgroup=document.createElement('optgroup');optgroup.label=['favorites','other','makkah','madinah'].includes(group.id)?t('player.group.'+group.id):group.name;if(['favorites','other','makkah','madinah'].includes(group.id))optgroup.dataset.playerGroup=group.id;for(const r of group.reciters){const option=document.createElement('option');option.value=r.id;option.disabled=!reciterHasSurah(r.id,state.surah.number);option.dataset.playerReader=r.name;option.textContent=r.name+(option.disabled?' · '+t('player.noRecording'):'');option.selected=r.id===state.reciter;optgroup.append(option);}return optgroup;}))}
  panel.querySelector('[data-share]').disabled=!['playing','paused'].includes(state.status);
  const playing=['playing','loading'].includes(state.status);toggle.innerHTML=playing?pause:play;
  panel.querySelector('[data-previous]').disabled=!state.canPrevious;panel.querySelector('[data-next]').disabled=!state.canNext;
 };
 const languageChanged=()=>{translateUi(panel);paintLabels(quranPlayback.state);paintPickerLanguage();};const stopLanguage=subscribeLanguage(languageChanged);languageChanged();
 const routeChanged=()=>draw(quranPlayback.state);
 window.addEventListener('hashchange',routeChanged);window.addEventListener('salah:reciter-favorites',routeChanged);
 const stopExtras=mountQuranPlayerExtras(panel,{playback:quranPlayback,ruqyah:ruqyahPlayback});
 const unsubscribe=quranPlayback.subscribe(draw),unsubscribeRuqyah=ruqyahPlayback.subscribe(()=>draw(quranPlayback.state));
 const recovery=initQuranSessionRecovery({playback:quranPlayback,getExpanded:()=>playerWindow.isOpen,restoreExpanded:()=>{if(!ruqyahPlayback.state.record)playerWindow.open();}});
 return()=>{portraitPresenter.destroy();window.removeEventListener('online',imageOnline);stopLanguage();recovery.destroy();stopMiniDismiss();playerWindow.destroy();stopExtras();document.removeEventListener('click',shufflePlaylist);unsubscribe();unsubscribeRuqyah();window.removeEventListener('hashchange',routeChanged);window.removeEventListener('salah:reciter-favorites',routeChanged);dockObserver?.disconnect();window.removeEventListener('resize',placeDock);globalThis.visualViewport?.removeEventListener('resize',placeDock);panel.remove();document.body.style.removeProperty('--quran-audio-reserve');document.body.classList.remove('has-quran-audio');};
}
