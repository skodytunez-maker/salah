import{read,write}from './storage.js';
import{esc,modal,closeModal}from './ui.js';
import{reciterInfo}from './quran-reciters.js';
import{rankTime,listenerRing,assignListenerRings,medalForRank}from './reciter-ranking-core.js';
import{competitionAvatar}from './competition-client.js';
let entries=[],rings={};
const label=p=>p.mode==='profile'?p.nickname:p.initial;
const medalRings={gold:'#d8be88',silver:'#c2cbd8',bronze:'#bf926c'};
const avatar=p=>'<span class="competition-user-face" style="--listener-ring:'+(medalRings[medalForRank(p.rank)]||rings[p.id]||listenerRing(p.id))+'"><span>'+esc(p.initial)+'</span>'+(p.mode==='profile'&&p.hasPhoto?'<img src="'+esc(competitionAvatar(p.id))+'" alt="" loading="lazy">':'')+'</span>';
const person=p=>'<button type="button" class="competition-person" data-competition-person="'+esc(p.id)+'" aria-label="'+esc(p.mode==='profile'?'Профиль: '+p.nickname:'Анонимный слушатель')+'">'+avatar(p)+'<strong>'+esc(label(p))+'</strong></button>';
const picture=p=>'<a class="competition-reciter" href="#quran?view=reciters&reciter='+encodeURIComponent(p.reciter)+'" aria-label="Слушать: '+esc(reciterInfo(p.reciter).name)+'"><img class="reciter-portrait" src="./'+esc(reciterInfo(p.reciter).portrait||'assets/person.svg')+'" alt="'+esc(reciterInfo(p.reciter).name)+'" loading="lazy"><small>'+esc(reciterInfo(p.reciter).name)+'</small></a>';
const row=p=>'<article class="competition-list-row" data-competition-entry="'+esc(p.id)+'" data-competition-rank="'+p.rank+'" data-competition-reciter="'+esc(p.reciter)+'"><b class="competition-place">'+p.rank+'</b>'+picture(p)+'<div>'+person(p)+'<span class="competition-time">'+esc(rankTime(p.seconds))+'</span></div></article>';
export function competitionMarkup(rows){
 entries=rows.slice();const saved=read('listener-ring-colors-v1',{});rings=assignListenerRings(entries,saved);if(Object.keys(rings).length)write('listener-ring-colors-v1',Object.fromEntries(Object.entries({...saved,...rings}).slice(-512)));
 if(!entries.length)return '<p class="reciter-empty">Здесь появятся слушатели и их любимые чтецы.</p>';
 const top=entries.slice(0,3);return '<section class="competition-showcase" aria-label="Первые пять слушателей"><div class="competition-podium competition-podium-'+top.length+'">'+top.map((p,i)=>'<article class="competition-card competition-slot-'+(i+1)+' rank-medal-'+medalForRank(p.rank)+'" data-competition-entry="'+esc(p.id)+'" data-competition-rank="'+p.rank+'" data-competition-reciter="'+esc(p.reciter)+'"><span class="competition-place">'+p.rank+' место</span>'+picture(p)+person(p)+'<b class="competition-time">'+esc(rankTime(p.seconds))+'</b></article>').join('')+'</div><div class="competition-next">'+entries.slice(3,5).map(row).join('')+'</div>'+(top.some((p,i)=>i&&p.rank===top[i-1].rank)?'<p class="rank-tie-note">Одинаковое время — одинаковое место.</p>':'')+'<button type="button" class="button secondary rank-open-all" id="competition-all">Весь рейтинг<span>'+entries.length+'</span></button></section>';
}
export function bindCompetitionView(host){
 host.querySelectorAll('.competition-user-face img').forEach(image=>image.onerror=()=>image.remove());
 host.querySelectorAll('[data-competition-person]').forEach(button=>button.onclick=()=>{const p=entries.find(p=>p.id===button.dataset.competitionPerson);if(!p)return;modal('<div class="modal-head"><h2>'+esc(p.mode==='profile'?p.nickname:'Ник скрыт')+'</h2><button class="text-button" data-close>Закрыть</button></div>'+avatar(p)+'<p>'+esc(rankTime(p.seconds))+' прослушано</p>'+(p.mode==='initial'?'<p class="muted">Слушатель выбрал анонимность.</p>':''));});
 const all=host.querySelector('#competition-all');if(all)all.onclick=()=>{modal('<div class="modal-head"><h2>Топ SALAH</h2><button class="text-button" data-close>Закрыть</button></div><div class="competition-full-list">'+entries.map(row).join('')+'</div>');const root=document.getElementById('modal-content');root.querySelectorAll('a').forEach(link=>link.onclick=closeModal);bindCompetitionView(root);};
}

export function updateCompetitionTimes(host,rows){
 entries=rows.slice();const results=new Map(entries.map(p=>[p.id,p]));for(const root of [host,document.getElementById('modal-content')]){if(!root)continue;for(const card of root.querySelectorAll('[data-competition-entry]')){const person=results.get(card.dataset.competitionEntry),time=card.querySelector('.competition-time');if(person&&time&&time.textContent!==rankTime(person.seconds))time.textContent=rankTime(person.seconds);}}
}
