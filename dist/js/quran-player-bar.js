import{ruqyahPlayback}from './ruqyah-session.js';
import{ruqyahDuration}from './ruqyah-catalog.js';
import{showTvOutput}from './tv-output.js';
import{actionIcon}from './action-icons.js';
import{showListeningShare}from './quran-listen-share.js';
import{RECITER_FAVORITES_KEY}from './quran-reciter-favorites.js';
import{quranPlayback}from './quran-session.js';
import{RECITERS,reciterInfo,reciterHasSurah,groupedReciters}from './quran-reciters.js';
import{read,write}from './storage.js';
import{toast}from './ui.js';
const icon=path=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
const previous=icon('<path d="M6 5v14M18 5l-9 7 9 7z"/>'),next=icon('<path d="M18 5v14M6 5l9 7-9 7z"/>');
const play=icon('<path d="M8 5l11 7-11 7z"/>'),pause=icon('<path d="M8 5v14M16 5v14"/>');
export function playerDockOffset(viewportHeight,{top=0,height=0,visible=false}={}){return visible&&height>0?Math.max(12,viewportHeight-top+8):12;}
export function mountQuranPlayer(){
 const panel=document.createElement('section');panel.id='quran-global-player';panel.className='quran-global-player';panel.hidden=true;panel.setAttribute('aria-label','Плеер Корана');
 panel.innerHTML='<button type="button" class="quran-player-collapse" data-collapse aria-label="Свернуть плеер">'+icon('<path d="M6 6l12 12M18 6L6 18"/>')+'</button><a class="quran-now-playing" aria-label="Открыть звучащую суру"><img class="quran-playing-portrait" alt=""><strong></strong><small></small></a><label class="quran-player-reciter"><span>Чтец</span><select aria-label="Чтец в плеере"></select></label><div class="quran-output-actions"><button type="button" class="quran-handoff-button" data-tv aria-label="На телевизор">'+actionIcon('tv')+'</button><button type="button" class="quran-handoff-button" data-share aria-label="Передать место прослушивания">Передать</button></div><div class="quran-global-controls"><button type="button" data-previous aria-label="Предыдущая сура">'+previous+'</button><button type="button" data-toggle aria-label="Воспроизвести Коран">'+play+'</button><button type="button" data-next aria-label="Следующая сура">'+next+'</button><button type="button" data-close aria-label="Остановить и закрыть плеер">'+icon('<rect x="6" y="6" width="12" height="12" rx="2"/>')+'</button><button type="button" data-expand aria-label="Открыть плеер" aria-haspopup="dialog">'+icon('<path d="m6 15 6-6 6 6"/>')+'</button></div><div class="quran-mini-progress" aria-hidden="true"><i></i></div><label class="quran-player-progress"><span data-time></span><input type="range" min="0" max="1" step="1" value="0" aria-label="Место в записи"><span data-duration></span></label>';
 document.body.append(panel);
 let disposed=false;const sheet=document.createElement('dialog');sheet.className='quran-player-dialog';sheet.setAttribute('aria-label','Полный плеер');document.body.append(sheet);
 const collapse=()=>sheet.close();sheet.addEventListener('close',()=>{if(disposed)return;panel.classList.remove('is-expanded');document.body.append(panel);if(!panel.hidden)panel.querySelector('[data-expand]').focus();placeDock();});sheet.onclick=e=>{if(e.target===sheet)collapse();};panel.querySelector('[data-collapse]').onclick=collapse;panel.querySelector('[data-expand]').onclick=()=>{panel.classList.add('is-expanded');sheet.append(panel);sheet.showModal();panel.querySelector('[data-collapse]').focus();};
 function placeDock(){const nav=document.getElementById('mobile-nav'),rect=nav?.getBoundingClientRect(),navVisible=rect&&rect.height>0&&getComputedStyle(nav).display!=='none';const offset=playerDockOffset(innerHeight,{top:rect?.top,height:rect?.height,visible:!!navVisible});panel.style.setProperty('--quran-dock-bottom',offset+'px');document.body.style.setProperty('--quran-audio-reserve',(offset+88)+'px');}
 window.addEventListener('resize',placeDock);globalThis.visualViewport?.addEventListener('resize',placeDock);const dockObserver=typeof ResizeObserver==='function'?new ResizeObserver(placeDock):null;const navElement=document.getElementById('mobile-nav');if(navElement)dockObserver?.observe(navElement);

 const link=panel.querySelector('a'),toggle=panel.querySelector('[data-toggle]');link.onclick=()=>{if(sheet.open)sheet.close();};
 panel.querySelector('[data-share]').onclick=showListeningShare;
 const current=()=>ruqyahPlayback.state.record?ruqyahPlayback:quranPlayback;
 panel.querySelector('[data-tv]').onclick=()=>showTvOutput({requestAudio:()=>current().requestOutput()});
 panel.querySelector('[data-previous]').onclick=()=>ruqyahPlayback.state.record?ruqyahPlayback.seek(ruqyahPlayback.state.positionSeconds-10):quranPlayback.changeSurah(-1);
 panel.querySelector('[data-next]').onclick=()=>ruqyahPlayback.state.record?ruqyahPlayback.seek(ruqyahPlayback.state.positionSeconds+10):quranPlayback.changeSurah(1);
 panel.querySelector('[data-close]').onclick=()=>current().stop();
 toggle.onclick=()=>current().toggle();
 const reciterSelect=panel.querySelector('select');
 reciterSelect.onchange=async()=>{const reciter=reciterSelect.value;if(!reciterHasSurah(reciter,quranPlayback.state.surah?.number))return;const saved=write('quran-preferences',{...read('quran-preferences',{}),reciter});if(!saved)toast('Не удалось сохранить выбор чтеца');await quranPlayback.changeReciter(reciter)};
 const range=panel.querySelector('input[type=range]');range.onchange=()=>current().seek(Number(range.value));
 const draw=state=>{
  const route=location.hash.slice(1).split('?')[0]||'home';
  const ruqyah=ruqyahPlayback.state,record=ruqyah.record;const visible=!!(record||state.surah)&&['home','quran'].includes(route);panel.hidden=!visible;document.body.classList.toggle('has-quran-audio',visible);if(!visible){if(sheet.open)sheet.close();return;}placeDock();globalThis.requestAnimationFrame?.(placeDock);
  panel.classList.toggle('is-ruqyah',!!record);panel.setAttribute('aria-label',record?'Плеер рукъи':'Плеер Корана');const playingState=record?ruqyah:state,duration=playingState.durationSeconds||0,position=playingState.positionSeconds||0;range.disabled=!duration;range.max=String(duration||1);range.value=String(duration?Math.min(position,duration):0);panel.querySelector('[data-time]').textContent=!record&&!duration?'…':ruqyahDuration(position)||'0:00';panel.querySelector('[data-duration]').textContent=ruqyahDuration(duration)||(record||playingState.durationStatus==='unavailable'?'—':'…');panel.querySelector('.quran-player-progress').hidden=!!record&&!duration;panel.querySelector('.quran-mini-progress i').style.width=(duration?Math.max(0,Math.min(100,position/duration*100)):0)+'%';panel.dataset.elapsed=ruqyahDuration(position)||'0:00';panel.dataset.duration=ruqyahDuration(duration)||'…';
  panel.querySelector('.quran-player-reciter').hidden=!!record;panel.querySelector('[data-share]').hidden=!!record;
  const prevButton=panel.querySelector('[data-previous]'),nextButton=panel.querySelector('[data-next]');prevButton.setAttribute('aria-label',record?'Назад на 10 секунд':'Предыдущая сура');nextButton.setAttribute('aria-label',record?'Вперёд на 10 секунд':'Следующая сура');prevButton.innerHTML=record?icon('<path d="M5 8a8 8 0 1 1-1 9M5 3v5h5"/><text x="8" y="15" fill="currentColor" stroke="none" font-size="8">10</text>'):previous;nextButton.innerHTML=record?icon('<path d="M19 8a8 8 0 1 0 1 9M19 3v5h-5"/><text x="8" y="15" fill="currentColor" stroke="none" font-size="8">10</text>'):next;
  if(record){const r=reciterInfo(record.reciter);link.href='#quran?view=reciters&reciter='+encodeURIComponent(record.reciter);link.setAttribute('aria-label','Открыть чтеца рукъи');link.querySelector('strong').textContent=record.title;link.querySelector('small').textContent=r.name+' · '+panel.dataset.elapsed+' / '+panel.dataset.duration+({paused:' · На паузе',loading:' · Загрузка…',ended:' · Запись завершена',error:' · Повторить'}[ruqyah.status]||'');link.querySelector('img').src='./'+(r.portrait||'assets/person.svg');const active=['playing','loading'].includes(ruqyah.status);toggle.innerHTML=active?pause:play;toggle.setAttribute('aria-label',active?'Пауза рукъи':'Воспроизвести рукъю');prevButton.disabled=nextButton.disabled=false;return;}
  link.setAttribute('aria-label','Открыть звучащую суру');
  link.href='#quran?surah='+state.surah.number+'&ayah='+(state.ayah||1)+(state.offlineOnly?'&reciter='+encodeURIComponent(state.reciter)+'&offline=1':'');
  link.querySelector('strong').textContent=state.meta.name;
  const favorites=read(RECITER_FAVORITES_KEY,[]),portrait=link.querySelector('.quran-playing-portrait');portrait.src='./'+(reciterInfo(state.reciter).portrait||'assets/person.svg');const catalogKey=state.surah.number+'|'+state.reciter+'|'+JSON.stringify(favorites);if(reciterSelect.dataset.catalog!==catalogKey){reciterSelect.dataset.catalog=catalogKey;reciterSelect.replaceChildren(...groupedReciters(favorites).map(group=>{const optgroup=document.createElement('optgroup');optgroup.label=group.name;for(const r of group.reciters){const option=document.createElement('option');option.value=r.id;option.disabled=!reciterHasSurah(r.id,state.surah.number);option.textContent=r.name+(option.disabled?' · нет записи':'');option.selected=r.id===state.reciter;optgroup.append(option);}return optgroup;}))}
  panel.querySelector('[data-share]').disabled=!['playing','paused'].includes(state.status);
  const status={loading:'Загрузка…',paused:'На паузе',ended:'Сура завершена',error:'Аудио недоступно — повторить'}[state.status];
  link.querySelector('small').textContent=(state.ayah?'Аят '+state.ayah:state.timingStatus==='loading'?'Разметка…':state.timingStatus==='ready'?'Между аятами':'Сура целиком')+' · '+panel.dataset.elapsed+' / '+panel.dataset.duration+(status?' · '+status:'');
  const playing=['playing','loading'].includes(state.status);toggle.innerHTML=playing?pause:play;toggle.setAttribute('aria-label',playing?'Пауза Корана':'Воспроизвести Коран');
  panel.querySelector('[data-previous]').disabled=!state.canPrevious;panel.querySelector('[data-next]').disabled=!state.canNext;
 };
 const routeChanged=()=>draw(quranPlayback.state);
 window.addEventListener('hashchange',routeChanged);window.addEventListener('salah:reciter-favorites',routeChanged);
 const unsubscribe=quranPlayback.subscribe(draw),unsubscribeRuqyah=ruqyahPlayback.subscribe(()=>draw(quranPlayback.state));
 return()=>{disposed=true;unsubscribe();unsubscribeRuqyah();window.removeEventListener('hashchange',routeChanged);window.removeEventListener('salah:reciter-favorites',routeChanged);dockObserver?.disconnect();window.removeEventListener('resize',placeDock);globalThis.visualViewport?.removeEventListener('resize',placeDock);if(sheet.open)sheet.close();sheet.remove();panel.remove();document.body.style.removeProperty('--quran-audio-reserve');document.body.classList.remove('has-quran-audio');};
}
