import{quranPlayback}from './quran-session.js';
import{reciterInfo}from './quran-reciters.js';
const icon=path=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
const previous=icon('<path d="M6 5v14M18 5l-9 7 9 7z"/>'),next=icon('<path d="M18 5v14M6 5l9 7-9 7z"/>');
const play=icon('<path d="M8 5l11 7-11 7z"/>'),pause=icon('<path d="M8 5v14M16 5v14"/>');
export function mountQuranPlayer(){
 const panel=document.createElement('section');panel.id='quran-global-player';panel.className='quran-global-player';panel.hidden=true;panel.setAttribute('aria-label','Плеер Корана');
 panel.innerHTML='<a class="quran-now-playing" aria-label="Открыть звучащую суру"><strong></strong><small></small></a><div class="quran-global-controls"><button type="button" data-previous aria-label="Предыдущая сура">'+previous+'</button><button type="button" data-toggle aria-label="Воспроизвести Коран">'+play+'</button><button type="button" data-next aria-label="Следующая сура">'+next+'</button><button type="button" data-close aria-label="Остановить и закрыть плеер">'+icon('<path d="M6 6l12 12M18 6L6 18"/>')+'</button></div>';
 document.body.append(panel);
 const link=panel.querySelector('a'),toggle=panel.querySelector('[data-toggle]');
 panel.querySelector('[data-previous]').onclick=()=>quranPlayback.changeSurah(-1);
 panel.querySelector('[data-next]').onclick=()=>quranPlayback.changeSurah(1);
 panel.querySelector('[data-close]').onclick=()=>quranPlayback.stop();
 toggle.onclick=()=>quranPlayback.toggle();
 return quranPlayback.subscribe(state=>{
  const visible=!!state.surah;panel.hidden=!visible;document.body.classList.toggle('has-quran-audio',visible);if(!visible)return;
  link.href='#quran?surah='+state.surah.number+'&ayah='+(state.index+1);
  link.querySelector('strong').textContent=state.meta.name;
  const status={loading:'Загрузка…',paused:'На паузе',ended:'Сура завершена',error:'Аудио недоступно — повторить'}[state.status];
  link.querySelector('small').textContent=(reciterInfo(state.reciter).format==='surah'?'Сура целиком':'Аят '+(state.index+1))+(status?' · '+status:'')+' · '+reciterInfo(state.reciter).name;
  const playing=['playing','loading'].includes(state.status);toggle.innerHTML=playing?pause:play;toggle.setAttribute('aria-label',playing?'Пауза Корана':'Воспроизвести Коран');
  panel.querySelector('[data-previous]').disabled=!state.canPrevious;panel.querySelector('[data-next]').disabled=!state.canNext;
 });
}
