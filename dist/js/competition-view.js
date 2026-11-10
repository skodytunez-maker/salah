import{read,write}from './storage.js';
import{esc,modal,closeModal}from './ui.js';
import{reciterInfo}from './quran-reciters.js';
import{rankTime,listenerRing,assignListenerRings,medalForRank}from './reciter-ranking-core.js';
import{competitionAvatar,competitionOwn}from './competition-client.js';
import{awardArtwork}from './quran-awards-core.js';
import{ownerVerified,verifyOwner,ownerNeedsMfa}from './owner-auth.js';
import{counterSyncStatus}from './counter-account.js';
let entries=[],rings={};
const label=p=>p.mode==='profile'?p.nickname:p.initial;
export function competitionProfilePreview(id){const entry=entries.find(row=>row.id===id);return entry&&['profile','initial'].includes(entry.mode)?label(entry):'';}
const medalRings={gold:'#d8be88',silver:'#c2cbd8',bronze:'#bf926c'};
const listening=p=>['initial','profile'].includes(p.mode)&&Number.isFinite(p.listeningUntil)&&p.listeningUntil>Date.now();
const headphones=p=>'<span class="competition-listening" role="img" aria-label="Слушает Коран" '+(listening(p)?'':'hidden')+'><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 1-2Zm16 0h-3v8h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-1-2Z"/></svg></span>';
const avatar=p=>'<span class="competition-user-face" data-listening-person="'+esc(p.id)+'" style="--listener-ring:'+(medalRings[medalForRank(p.rank)]||rings[p.id]||listenerRing(p.id))+'"><span>'+esc(p.initial)+'</span>'+(p.mode==='profile'&&p.hasPhoto?'<img src="'+esc(competitionAvatar(p.id))+'" alt="" loading="lazy">':'')+headphones(p)+'</span>';
const leaderAwards=p=>{const kinds=[...new Set(Array.isArray(p.awards)?p.awards:[])].filter(k=>k==='week'||k==='month');return kinds.length?'<span class="competition-award-badges" data-count="'+kinds.length+'">'+kinds.map(k=>'<span class="competition-leader-award"><span class="competition-leader-picture competition-leader-'+k+'"><img src="'+awardArtwork(k)+'" alt=""></span><small>'+(k==='week'?'Лидер недели':'Лидер месяца')+'</small></span>').join('')+'</span>':'';};
const person=(p,access)=>{
 const content='<span class="competition-person-identity">'+avatar(p)+'<strong>'+esc(label(p))+'</strong></span>'+leaderAwards(p);
 if(!access.owner&&p.id!==access.ownId)return '<span class="competition-person" style="cursor:default">'+content+'</span>';
 return '<button type="button" class="competition-person" data-competition-person="'+esc(p.id)+'" aria-label="'+esc(p.mode==='profile'?'Профиль: '+p.nickname:'Карточка слушателя')+'">'+content+'</button>';
};
const picture=p=>'<a class="competition-reciter" href="#quran?view=reciters&reciter='+encodeURIComponent(p.reciter)+'" aria-label="Слушать: '+esc(reciterInfo(p.reciter).name)+'"><img class="reciter-portrait" src="./'+esc(reciterInfo(p.reciter).portrait||'assets/person.svg')+'" alt="'+esc(reciterInfo(p.reciter).name)+'" loading="lazy"><small>'+esc(reciterInfo(p.reciter).name)+'</small></a>';
const podiumTime=seconds=>{const value=Math.max(0,Math.floor(seconds||0));return Math.floor(value/3600)+':'+String(Math.floor(value%3600/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');};
const score=(person,mode)=>mode==='total'?person.totalSeconds??person.seconds:person.seconds;
const reciterTime=item=>'<span class="competition-reciter-time" data-competition-reciter-time="'+esc(item.reciter)+'" aria-label="'+esc(rankTime(item.seconds))+'">'+esc(podiumTime(item.seconds))+'</span>';
function podiumReciters(person,mode){
 if(person.totalSeconds===undefined)return picture(person);
 const items=mode==='total'&&person.reciters?.length?person.reciters:[person];
 const slides=items.map((item,index)=>'<div class="competition-reciter-slide" data-reciter-slide="'+esc(item.reciter)+'" aria-label="Чтец '+(index+1)+' из '+items.length+'">'+picture(item)+(mode==='total'?reciterTime(item):'<span class="competition-reciter-time">Любимый чтец</span>')+'</div>').join('');
 const pager=items.length>5?'<button type="button" data-slide-step="-1" aria-label="Предыдущий чтец">‹</button><span data-slide-count></span><button type="button" data-slide-step="1" aria-label="Следующий чтец">›</button>':items.length>1?items.map((_,index)=>'<button type="button" class="competition-reciter-dot" data-slide-index="'+index+'" aria-label="Чтец '+(index+1)+' из '+items.length+'"></button>').join(''):'';
 return '<div class="competition-reciter-carousel" data-podium-reciter="'+esc(person.id)+'"><div class="competition-reciter-track" aria-label="Чтецы участника">'+slides+'</div><div class="competition-reciter-pager">'+pager+'</div></div>';
}
function bindPodiumReciters(host,selected){
 host.querySelectorAll('[data-podium-reciter]').forEach(carousel=>{
  const id=carousel.dataset.podiumReciter,track=carousel.querySelector('.competition-reciter-track'),slides=[...track.children],dots=[...carousel.querySelectorAll('[data-slide-index]')],count=carousel.querySelector('[data-slide-count]'),prev=carousel.querySelector('[data-slide-step="-1"]'),next=carousel.querySelector('[data-slide-step="1"]');
  let current=-1;
  const paint=index=>{
   if(index===current||!slides[index])return;
   current=index;selected.set(id,slides[index].dataset.reciterSlide);
   slides.forEach((slide,i)=>{slide.setAttribute('aria-hidden',String(i!==index));slide.querySelector('a').tabIndex=i===index?0:-1;});
   dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===index)));
   if(count)count.textContent=(index+1)+' / '+slides.length;
   if(prev)prev.disabled=index===0;if(next)next.disabled=index===slides.length-1;
  };
  const go=index=>{if(!slides[index])return;track.scrollLeft=index*track.clientWidth;paint(index);};
  go(Math.max(0,slides.findIndex(slide=>slide.dataset.reciterSlide===selected.get(id))));
  track.onscroll=()=>{if(track.clientWidth)paint(Math.round(track.scrollLeft/track.clientWidth));};
  dots.forEach((dot,index)=>dot.onclick=()=>go(index));
  if(prev)prev.onclick=()=>go(current-1);if(next)next.onclick=()=>go(current+1);
 });
}
export const competitionScoreModeButton=mode=>'<button type="button" class="competition-score-mode" data-competition-score-mode aria-pressed="'+(mode==='favorite')+'" aria-label="Режим любимого чтеца" title="'+(mode==='total'?'Общее время':'Любимый чтец')+'"><svg class="'+(mode==='total'?'is-active':'')+'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><svg class="'+(mode==='favorite'?'is-active':'')+'" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.8a5.4 5.4 0 0 0-7.6 0L12 6l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.4 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z"/></svg></button>';
const row=(p,access,mode)=>'<article class="competition-list-row" data-competition-entry="'+esc(p.id)+'" data-competition-rank="'+p.rank+'" data-competition-reciter="'+esc(p.reciter)+'"><b class="competition-place">'+p.rank+'</b>'+picture(p)+'<div>'+person(p,access)+'<span class="competition-time">'+esc(rankTime(score(p,mode)))+'</span></div></article>';
export function competitionMarkup(rows,access={},mode='total'){
 entries=rows.slice();const saved=read('listener-ring-colors-v1',{});rings=assignListenerRings(entries,saved);if(Object.keys(rings).length)write('listener-ring-colors-v1',Object.fromEntries(Object.entries({...saved,...rings}).slice(-512)));
 if(!entries.length)return '<p class="reciter-empty">Здесь появятся слушатели и их любимые чтецы.</p>';
 const top=entries.slice(0,3),hasTotals=top.every(person=>person.totalSeconds!==undefined),showModes=hasTotals||mode==='favorite';
 const podium=top.map((p,i)=>{
  const time=score(p,mode),label=showModes?(mode==='total'?'Всего':'У этого чтеца'):'',full=esc(rankTime(time));
  return '<article class="competition-card competition-slot-'+(i+1)+' rank-medal-'+medalForRank(p.rank)+'" data-competition-entry="'+esc(p.id)+'" data-competition-rank="'+p.rank+'" data-competition-reciter="'+esc(p.reciter)+'"><span class="competition-place">'+p.rank+' место</span>'+podiumReciters(p,mode)+person(p,access)+'<b class="competition-time'+(label?' competition-time-emphasis':'')+'" aria-label="'+full+'" title="'+full+'">'+(label?'<small>'+label+'</small>':'')+'<span data-competition-score>'+esc(podiumTime(time))+'</span></b></article>';
 }).join('');
 return '<section class="competition-showcase" aria-label="Первые пять слушателей"><div class="competition-podium competition-podium-'+top.length+'">'+podium+'</div><div class="competition-next">'+entries.slice(3,5).map(p=>row(p,access,mode)).join('')+'</div>'+(top.some((p,i)=>i&&p.rank===top[i-1].rank)?'<p class="rank-tie-note">Одинаковое '+(mode==='total'&&hasTotals?'общее ':'')+'время — одинаковое место.</p>':'')+'<div class="competition-rating-actions"><button type="button" class="button secondary rank-open-all" id="competition-all">Весь рейтинг<span>'+entries.length+'</span></button>'+(showModes?competitionScoreModeButton(mode):'')+'</div></section>';
}
export function bindCompetitionView(host,access={},mode='total',selected=new Map(),toggleMode=()=>{}){
 if(mode==='total')bindPodiumReciters(host,selected);
 const toggle=host.querySelector('[data-competition-score-mode]');if(toggle)toggle.onclick=toggleMode;
 host.querySelectorAll('.competition-user-face img').forEach(image=>image.onerror=()=>image.remove());
 let selection=0;
 host.querySelectorAll('[data-competition-person]').forEach(button=>button.onclick=async()=>{
  let p=entries.find(item=>item.id===button.dataset.competitionPerson);if(!p)return;
  const request=++selection;
  if(access.owner){
   const origin=location.hash,account=counterSyncStatus().userId;
   const owner=ownerVerified()||await verifyOwner().catch(()=>false);
   if(request!==selection||location.hash!==origin||counterSyncStatus().userId!==account||!button.isConnected||
    (host.id==='modal-content'&&!document.getElementById('modal')?.open))return;
   p=entries.find(item=>item.id===button.dataset.competitionPerson);if(!p)return;
   if((owner&&ownerVerified())||ownerNeedsMfa()){
    const selected=document.querySelector('[data-competition-period][aria-pressed="true"]')?.dataset.competitionPeriod;
    const params=new URLSearchParams(origin.split('?')[1]||'');
    if(selected&&params.has('period')&&params.get('period')!==selected){
     params.set('period',selected);history.replaceState(history.state,'','#quran?'+params);
    }
    const back=location.hash;
    const target='#admin?view=profile&listener='+encodeURIComponent(p.id);
    history.pushState({salahRankProfileBack:back},'',target);
    closeModal();window.dispatchEvent(new Event('hashchange'));
    return;
   }
  }
  if(!counterSyncStatus().signedIn||competitionOwn()?.id!==p.id)return;
  modal('<div class="modal-head"><h2>'+esc(p.mode==='profile'?p.nickname:'Ник скрыт')+'</h2><button class="text-button" data-close>Закрыть</button></div>'+avatar(p)+'<p>'+esc(rankTime(score(p,mode)))+' прослушано</p>'+(p.mode==='initial'?'<p class="muted">Слушатель выбрал анонимность.</p>':''));});
 const all=host.querySelector('#competition-all');if(all)all.onclick=()=>{modal('<div class="modal-head"><h2>Топ SALAH</h2><button class="text-button" data-close>Закрыть</button></div><div class="competition-full-list">'+entries.map(p=>row(p,access,mode)).join('')+'</div>');const root=document.getElementById('modal-content');root.querySelectorAll('a').forEach(link=>link.onclick=closeModal);bindCompetitionView(root,access,mode);};
}

export function updateCompetitionTimes(host,rows,mode='total'){
 entries=rows.slice();const results=new Map(entries.map(p=>[p.id,p]));
 for(const root of [host,document.getElementById('modal-content')]){
  if(!root)continue;
  for(const face of root.querySelectorAll('[data-listening-person]')){
   const p=results.get(face.dataset.listeningPerson),badge=face.querySelector('.competition-listening');if(badge)badge.hidden=!p||!listening(p);
  }
  for(const card of root.querySelectorAll('[data-competition-entry]')){
   const person=results.get(card.dataset.competitionEntry),time=card.querySelector('.competition-time');
   if(!person||!time)continue;
   const seconds=score(person,mode),full=rankTime(seconds),value=card.classList.contains('competition-card')?podiumTime(seconds):full,number=time.querySelector('[data-competition-score]')||time;
   if(number.textContent!==value)number.textContent=value;
   if(time.getAttribute('aria-label')!==full){time.setAttribute('aria-label',full);time.title=full;}
   if(mode==='total'&&person.reciters?.length){
    const times=new Map(person.reciters.map(item=>[item.reciter,item.seconds]));
    for(const label of card.querySelectorAll('[data-competition-reciter-time]')){
     const value=times.get(label.dataset.competitionReciterTime);if(value===undefined)continue;
     const text=podiumTime(value);if(label.textContent!==text){label.textContent=text;label.setAttribute('aria-label',rankTime(value));}
    }
   }
  }
 }
}
