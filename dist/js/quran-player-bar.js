import{RECITER_FAVORITES_KEY}from './quran-reciter-favorites.js';
import{quranPlayback}from './quran-session.js';
import{RECITERS,reciterInfo,reciterHasSurah,groupedReciters}from './quran-reciters.js';
import{read,write}from './storage.js';
import{toast}from './ui.js';
const icon=path=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
const previous=icon('<path d="M6 5v14M18 5l-9 7 9 7z"/>'),next=icon('<path d="M18 5v14M6 5l9 7-9 7z"/>');
const play=icon('<path d="M8 5l11 7-11 7z"/>'),pause=icon('<path d="M8 5v14M16 5v14"/>');
export function mountQuranPlayer(){
 const panel=document.createElement('section');panel.id='quran-global-player';panel.className='quran-global-player';panel.hidden=true;panel.setAttribute('aria-label','Плеер Корана');
 panel.innerHTML='<a class="quran-now-playing" aria-label="Открыть звучащую суру"><img class="quran-playing-portrait" alt=""><strong></strong><small></small></a><label class="quran-player-reciter"><span>Чтец</span><select aria-label="Чтец в плеере"></select></label><div class="quran-global-controls"><button type="button" data-previous aria-label="Предыдущая сура">'+previous+'</button><button type="button" data-toggle aria-label="Воспроизвести Коран">'+play+'</button><button type="button" data-next aria-label="Следующая сура">'+next+'</button><button type="button" data-close aria-label="Остановить и закрыть плеер">'+icon('<path d="M6 6l12 12M18 6L6 18"/>')+'</button></div>';
 document.body.append(panel);
 const link=panel.querySelector('a'),toggle=panel.querySelector('[data-toggle]');
 panel.querySelector('[data-previous]').onclick=()=>quranPlayback.changeSurah(-1);
 panel.querySelector('[data-next]').onclick=()=>quranPlayback.changeSurah(1);
 panel.querySelector('[data-close]').onclick=()=>quranPlayback.stop();
 toggle.onclick=()=>quranPlayback.toggle();
 const reciterSelect=panel.querySelector('select');
 reciterSelect.onchange=async()=>{const reciter=reciterSelect.value;if(!reciterHasSurah(reciter,quranPlayback.state.surah?.number))return;const saved=write('quran-preferences',{...read('quran-preferences',{}),reciter});if(!saved)toast('Не удалось сохранить выбор чтеца');await quranPlayback.changeReciter(reciter)};
 const draw=state=>{
  const route=location.hash.slice(1).split('?')[0]||'home';
  const visible=!!state.surah&&['home','quran'].includes(route);panel.hidden=!visible;document.body.classList.toggle('has-quran-audio',visible);if(!visible)return;
  link.href='#quran?surah='+state.surah.number+'&ayah='+(state.ayah||1)+(state.offlineOnly?'&reciter='+encodeURIComponent(state.reciter)+'&offline=1':'');
  link.querySelector('strong').textContent=state.meta.name;
  const favorites=read(RECITER_FAVORITES_KEY,[]),portrait=link.querySelector('.quran-playing-portrait');portrait.src='./'+(reciterInfo(state.reciter).portrait||'assets/person.svg');const catalogKey=state.surah.number+'|'+state.reciter+'|'+JSON.stringify(favorites);if(reciterSelect.dataset.catalog!==catalogKey){reciterSelect.dataset.catalog=catalogKey;reciterSelect.replaceChildren(...groupedReciters(favorites).map(group=>{const optgroup=document.createElement('optgroup');optgroup.label=group.name;for(const r of group.reciters){const option=document.createElement('option');option.value=r.id;option.disabled=!reciterHasSurah(r.id,state.surah.number);option.textContent=r.name+(option.disabled?' · нет записи':'');option.selected=r.id===state.reciter;optgroup.append(option);}return optgroup;}))}
  const status={loading:'Загрузка…',paused:'На паузе',ended:'Сура завершена',error:'Аудио недоступно — повторить'}[state.status];
  link.querySelector('small').textContent=(state.ayah?'Аят '+state.ayah:state.timingStatus==='loading'?'Разметка…':state.timingStatus==='ready'?'Между аятами':'Сура целиком')+(status?' · '+status:'');
  const playing=['playing','loading'].includes(state.status);toggle.innerHTML=playing?pause:play;toggle.setAttribute('aria-label',playing?'Пауза Корана':'Воспроизвести Коран');
  panel.querySelector('[data-previous]').disabled=!state.canPrevious;panel.querySelector('[data-next]').disabled=!state.canNext;
 };
 const routeChanged=()=>draw(quranPlayback.state);
 window.addEventListener('hashchange',routeChanged);window.addEventListener('salah:reciter-favorites',routeChanged);
 const unsubscribe=quranPlayback.subscribe(draw);
 return()=>{unsubscribe();window.removeEventListener('hashchange',routeChanged);window.removeEventListener('salah:reciter-favorites',routeChanged);panel.remove();document.body.classList.remove('has-quran-audio');};
}
