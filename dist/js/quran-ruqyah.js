import{esc}from './ui.js';
import{setForegroundAudio}from './audio-focus.js';
import{quranPlayback}from './quran-session.js';
import{stopQuranBroadcast}from './quran-broadcast.js';
export const RUQYAH_RECORDINGS=Object.freeze([{"id":"luhaidan-hour","reciter":"ar.muhammadalluhaidan","title":"Рукъя · длинная запись","type":"youtube","videoId":"mf1z4iFnHXo","url":"https://www.youtube.com/watch?v=mf1z4iFnHXo","source":"https://www.youtube.com/watch?v=mf1z4iFnHXo","publisher":"Solih","duration":3685},{"id":"idris-short","reciter":"ar.idrisabkar","title":"Рукъя · короткая запись","url":"https://download.tvquran.com/download/selections/9/590e58957bc22.mp3","source":"https://www.tvquran.com/ar/selection/940","duration":1632.616878}].map(Object.freeze));
export function ruqyahFor(reciter){return RUQYAH_RECORDINGS.filter(r=>r.reciter===reciter);}
export function ruqyahDuration(seconds){if(!Number.isFinite(seconds)||seconds<=0)return '';const total=Math.round(seconds);return(total>=3600?Math.floor(total/3600)+':'+String(Math.floor(total/60)%60).padStart(2,'0'):Math.floor(total/60))+':'+String(total%60).padStart(2,'0');}
export function ruqyahMarkup(reciter){const records=ruqyahFor(reciter);if(!records.length)return '';return '<section class="reciter-ruqyah" aria-label="Рукъя"><div class="ruqyah-heading"><span class="eyebrow">ОТДЕЛЬНОЕ ЧТЕНИЕ</span><h2>Рукъя</h2></div>'+records.map(r=>'<article class="ruqyah-recording" data-ruqyah="'+r.id+'"><p>'+esc(r.title)+' <span class="ruqyah-duration">'+ruqyahDuration(r.duration)+'</span></p><div class="ruqyah-actions"><button type="button" class="button" data-ruqyah-play aria-pressed="false">▶ Слушать</button>'+(r.type==='youtube'?'<a class="button secondary" href="'+esc(r.source)+'" target="_blank" rel="noopener noreferrer">Открыть YouTube ↗</a>':'<a class="button secondary" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer" download="salah-ruqyah-'+r.id+'.mp3">Скачать файл ↗</a>')+'</div>'+(r.type==='youtube'?'<small class="ruqyah-save-note">Запись на YouTube · отдельное скачивание пока недоступно.</small><div data-ruqyah-video hidden></div>':'<small class="ruqyah-save-note">Файл откроется отдельно для сохранения.</small><audio controls preload="none" hidden aria-label="'+esc(r.title)+'"></audio>')+'<p class="ruqyah-status" role="status"></p><a class="ruqyah-source" href="'+esc(r.source)+'" target="_blank" rel="noopener noreferrer">Источник записи ↗</a></article>').join('')+'</section>';}
export function bindRuqyah(host,{playback=quranPlayback,stopBroadcast=stopQuranBroadcast,focus=setForegroundAudio}={}){
 let closed=false;const rows=[];
 for(const node of host.querySelectorAll('[data-ruqyah]')){
  const record=RUQYAH_RECORDINGS.find(r=>r.id===node.dataset.ruqyah);if(!record)continue;
  if(record.type==='youtube'){
   const button=node.querySelector('[data-ruqyah-play]'),screen=node.querySelector('[data-ruqyah-video]'),owner={};let frame=null;
   const pause=()=>{frame?.remove();frame=null;screen.hidden=true;button.textContent='▶ Слушать';button.setAttribute('aria-pressed','false');focus(owner,false);};
   const click=()=>{if(closed)return;if(frame){pause();return;}for(const row of rows)row.pause();playback.pause();stopBroadcast();frame=host.ownerDocument.createElement('iframe');frame.title='Рукъя · '+record.publisher;frame.src='https://www.youtube-nocookie.com/embed/'+record.videoId+'?autoplay=1&rel=0&playsinline=1';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';screen.replaceChildren(frame);screen.hidden=false;button.textContent='Закрыть запись';button.setAttribute('aria-pressed','true');focus(owner,true);};
   button.addEventListener('click',click);rows.push({pause,owner,cleanup:()=>{button.removeEventListener('click',click);pause();}});continue;
  }
  const audio=node.querySelector('audio'),button=node.querySelector('[data-ruqyah-play]'),status=node.querySelector('.ruqyah-status'),owner={};let pending=false,sequence=0;
  const draw=()=>{const active=pending||!audio.paused&&!audio.ended;button.textContent=active?'Ⅱ Пауза':'▶ Слушать';button.setAttribute('aria-pressed',String(active));focus(owner,active);};
  const pause=()=>{sequence++;pending=false;status.textContent='';audio.pause();draw();};
  const play=()=>{if(closed)return;for(const row of rows)if(row.audio!==audio)row.pause();playback.pause();stopBroadcast();pending=false;status.textContent='';draw();};
  audio.addEventListener('play',play);audio.addEventListener('pause',draw);audio.addEventListener('ended',draw);
  const error=()=>{pending=false;status.textContent='Не удалось открыть запись. Попробуйте снова.';draw();};audio.addEventListener('error',error);
  const click=()=>{if(closed)return;if(pending||!audio.paused&&!audio.ended){pause();return;}
   const operation=++sequence;if(!audio.getAttribute('src'))audio.src=record.url;audio.hidden=false;pending=true;status.textContent='Открываем запись…';draw();
   try{Promise.resolve(audio.play()).then(()=>{if(closed||operation!==sequence)return;pending=false;status.textContent='';draw();}).catch(()=>{if(!closed&&operation===sequence)error();});}catch{error();}
  };button.addEventListener('click',click);rows.push({audio,pause,owner,cleanup:()=>{button.removeEventListener('click',click);audio.removeEventListener('play',play);audio.removeEventListener('pause',draw);audio.removeEventListener('ended',draw);audio.removeEventListener('error',error);}});
 }
 const unsubscribe=playback.subscribe(state=>{if(['playing','loading'].includes(state.status))for(const row of rows)row.pause();});
 return()=>{closed=true;unsubscribe();for(const row of rows){row.cleanup();row.pause();row.audio?.removeAttribute('src');row.audio?.load?.();focus(row.owner,false);}};
}
