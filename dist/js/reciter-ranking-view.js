
import{esc,modal,closeModal}from './ui.js';
import{RECITERS,reciterInfo}from './quran-reciters.js';
import{rankListening,rankTime}from './reciter-ranking-core.js';
import{rankingListeners,publicListenerPhoto}from './reciter-popularity.js';
let activeEntries=[],activeGlobal=false;
const face=r=>'<img class="reciter-portrait" src="./'+esc(r.portrait||'assets/person.svg')+'" alt="'+esc(r.name)+'" loading="lazy" decoding="async">';
function listeners(id){const people=rankingListeners(id);if(!people.length)return '';return '<div class="rank-listeners" aria-label="Слушатели">'+people.map((p,index)=>'<button type="button" class="rank-listener" data-listener-reciter="'+esc(id)+'" data-listener-index="'+index+'" aria-label="'+esc(p.mode==='profile'?p.nickname:'Анонимный слушатель')+'"><span>'+esc(p.initial)+'</span>'+(p.mode==='profile'&&p.hasPhoto?'<img src="'+esc(publicListenerPhoto(p.id))+'" alt="" loading="lazy">':'')+'</button>').join('')+'</div>';}
const row=e=>'<article class="reciter-card rank-list-row"><a href="#quran?view=reciters&reciter='+encodeURIComponent(e.id)+'"><span class="rank-row-number">'+e.rank+'</span>'+face(reciterInfo(e.id))+'<strong>'+esc(reciterInfo(e.id).name)+'</strong><span class="rank-row-time">'+esc(rankTime(e.seconds))+'</span></a>'+listeners(e.id)+'</article>';
export function rankingMarkup(ids,{seconds,query='',global=false,leader='Лидер'}){
 const entries=rankListening(ids.map(id=>({id,seconds:seconds(id)})));activeEntries=entries;activeGlobal=global;
 const q=query.toLocaleLowerCase('ru').replace(/ё/g,'е').trim(),matching=q?entries.filter(e=>reciterInfo(e.id).name.toLocaleLowerCase('ru').replace(/ё/g,'е').includes(q)):entries;
 if(q)return '<div class="rank-search-results">'+matching.map(row).join('')+'</div>'+(matching.length?'':'<p class="reciter-empty">Чтец не найден</p>');
 if(!entries.length)return '';
 const podium=entries.slice(0,3),ties=podium.some((e,i)=>i&&e.rank===podium[i-1].rank);
 return '<section class="rank-showcase" aria-label="Первые пять мест"><div class="rank-podium rank-podium-'+podium.length+'">'+podium.map((e,i)=>'<article class="reciter-card rank-podium-card rank-slot-'+(i+1)+'"><a href="#quran?view=reciters&reciter='+encodeURIComponent(e.id)+'"><span class="rank-place">'+e.rank+' место</span>'+face(reciterInfo(e.id))+'<strong>'+esc(reciterInfo(e.id).name)+'</strong><div class="rank-result"><span>'+(i===0?esc(leader):'Прослушано')+'</span><b>'+esc(rankTime(e.seconds))+'</b></div></a>'+(global?listeners(e.id):'')+'</article>').join('')+'</div>'+(ties?'<p class="rank-tie-note">При одинаковом времени места делятся.</p>':'')+'<div class="rank-next">'+entries.slice(3,5).map(row).join('')+'</div><button type="button" class="button secondary rank-open-all" id="rank-open-all">Весь рейтинг<span>'+entries.length+'</span></button></section>';
}
export function bindRankingView(host){
 host.querySelectorAll('.rank-listener img').forEach(image=>image.onerror=()=>image.remove());
 host.querySelectorAll('[data-listener-reciter]').forEach(button=>button.onclick=()=>{
  const listener=rankingListeners(button.dataset.listenerReciter)[Number(button.dataset.listenerIndex)];if(!listener)return;
  modal('<div class="modal-head"><h2>'+esc(listener.mode==='profile'?listener.nickname:'Ник скрыт')+'</h2><button class="text-button" data-close>Закрыть</button></div>'+(listener.mode==='initial'?'<p class="muted">Слушатель выбрал анонимный режим.</p>':''));
 });
 const all=host.querySelector('#rank-open-all');if(all)all.onclick=()=>{
  const entries=activeEntries.slice();modal('<div class="modal-head"><h2>Весь рейтинг</h2><button class="text-button" data-close>Закрыть</button></div><div class="rank-full-list">'+entries.map(row).join('')+'</div>');
  const root=document.getElementById('modal-content');root.querySelectorAll('a').forEach(a=>a.onclick=closeModal);bindRankingView(root);
 };
}
