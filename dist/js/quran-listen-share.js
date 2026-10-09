import{esc,toast,modal}from './ui.js';
import{quranPlayback}from './quran-session.js';
import{reciterInfo}from './quran-reciters.js';
import{reciterRecording}from './quran-reciter-recording.js';
import{listeningShareUrl,parseListeningShare,listeningTime}from './quran-listen-share-core.js';
const place=p=>reciterInfo(p.reciter).format==='verse'?'Аят '+p.ayah+' · '+listeningTime(p.seconds)+' от начала аята':listeningTime(p.seconds)+' от начала суры';
export function showListeningShare(){
 const state=quranPlayback.state;if(!state.surah||!['playing','paused'].includes(state.status)){toast('Сначала включите запись Корана');return;}
 const position={surah:state.surah.number,reciter:state.reciter,ayah:state.ayah||state.index+1||1,seconds:state.positionSeconds||0};
 let url;try{url=listeningShareUrl(position)}catch{toast('Не удалось сохранить место прослушивания');return;}
 modal('<div class="modal-head"><h2>Передать прослушивание</h2><button class="icon-button" data-close aria-label="Закрыть">×</button></div><p class="quran-share-title">'+esc(state.meta.name)+'</p><p class="muted">'+esc(reciterInfo(position.reciter).name)+' · '+esc(place(position))+'</p><p class="muted">Друг откроет ссылку и нажмёт «Продолжить слушать». Место сохранено сейчас.</p><div class="quran-listen-qr" role="img" aria-label="QR-код места прослушивания"><p class="muted">Готовим QR-код…</p></div><label for="quran-listen-link">Ссылка на запись и место в ней</label><input id="quran-listen-link" type="url" readonly value="'+esc(url)+'"><div class="quran-listen-share-actions"><button class="button" id="quran-send-position" type="button">Отправить ссылку</button><button class="button secondary" id="quran-copy-position" type="button">Скопировать ссылку</button></div><p class="muted" id="quran-share-status" role="status"></p>');
 const root=document.getElementById('modal-content'),field=root.querySelector('input'),status=root.querySelector('[role=status]');
 const copy=async()=>{try{await navigator.clipboard.writeText(url);status.textContent='Ссылка скопирована'}catch{field.focus();field.select();status.textContent='Скопируйте выделенную ссылку и отправьте другу'}};
 root.querySelector('#quran-copy-position').onclick=copy;
 root.querySelector('#quran-send-position').onclick=async()=>{if(typeof navigator.share!=='function'){await copy();return}try{await navigator.share({title:'SALAH · '+state.meta.name,text:'Продолжить слушать: '+reciterInfo(position.reciter).name,url})}catch(e){if(e?.name!=='AbortError')await copy()}};
 const qrBox=root.querySelector('.quran-listen-qr');import('./vendor/qrcode-generator.js').then(({default:qrcode})=>{if(!qrBox.isConnected)return;const qr=qrcode(0,'M');qr.addData(url);qr.make();qrBox.innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true})}).catch(()=>{if(qrBox.isConnected)qrBox.innerHTML='<p class="muted">QR-код недоступен. Используйте ссылку.</p>'});
}
export function mountListeningShare(host,index,hash){
 const position=parseListeningShare(hash),meta=position&&index.surahs.find(s=>s.number===position.surah);
 if(!meta||position.ayah>meta.ayahs){host.innerHTML='<section class="panel"><h1>Ссылка недействительна</h1><p class="muted">Не удалось определить запись или место прослушивания.</p><a class="button" href="#quran">Открыть Коран</a></section>';return()=>{};}
 const reciter=reciterInfo(position.reciter);
 host.innerHTML='<section class="panel quran-received-listening"><p class="eyebrow">ПРОДОЛЖИТЬ ПРОСЛУШИВАНИЕ</p><img class="quran-received-portrait" src="./'+esc(reciter.portrait)+'" alt="'+esc(reciter.name)+'"><h1>'+esc(meta.name)+'</h1><p>'+esc(reciter.name)+'</p><p class="muted">'+esc(place(position))+'</p><button class="button" id="quran-accept-listening" type="button">Продолжить слушать</button><p class="muted" id="quran-received-status" role="status">Запись начнётся после нажатия.</p><a class="text-button" href="#quran">К библиотеке Корана</a></section>';
 let alive=true,accepted=false;const button=host.querySelector('#quran-accept-listening'),status=host.querySelector('#quran-received-status');
 const unsubscribe=quranPlayback.subscribe(state=>{if(!alive||!accepted)return;if(state.surah?.number!==position.surah||state.reciter!==position.reciter){button.disabled=false;button.textContent='Продолжить слушать';status.textContent='Нажмите, чтобы продолжить эту запись с сохранённого места.';return;}status.textContent=state.status==='playing'?'Слушаем · '+listeningTime(state.positionSeconds||0):state.status==='error'?'Не удалось загрузить запись. Проверьте интернет и попробуйте снова.':state.status==='loading'?'Открываем запись…':state.status==='paused'?'На паузе':'';button.disabled=state.status==='loading';button.textContent=state.status==='playing'?'Слушать снова с этого места':state.status==='error'?'Повторить':'Продолжить слушать'});
 button.onclick=async()=>{const current=quranPlayback.state;if(accepted&&current.surah?.number===position.surah&&current.reciter===position.reciter&&current.status==='paused'){quranPlayback.toggle();return;}accepted=true;button.disabled=true;status.textContent='Открываем запись…';try{await quranPlayback.start(reciterRecording(index,position.surah),position.reciter,position.ayah-1,true,false,position.seconds)}catch{if(alive){button.disabled=false;status.textContent='Не удалось открыть запись. Попробуйте снова.'}};};
 return()=>{alive=false;unsubscribe()};
}
