import{t}from './i18n.js';
import{uiLeaf,uiAttribute,uiTextAttributes}from './ui.js';
import{reciterImageUrl}from './approved-catalog.js';
import{watchDecodedImages}from './image-presentation.js';
import{read,write}from './storage.js';

import{esc,closeModal}from './ui.js';
import{RECITERS,reciterInfo}from './quran-reciters.js';
import{rankListening,listenerRing,assignListenerRings,medalForRank}from './reciter-ranking-core.js';
import{rankingListeners,publicListenerPhoto}from './reciter-popularity.js';
import{rankingTime,rankingModal}from './ranking-ui.js';
let activeEntries=[],activeGlobal=false,duplicateInitials=new Set(),ringColors={};
const face=r=>'<img class="reciter-portrait" data-image-pending src="'+esc(reciterImageUrl(r.portrait))+'" alt="'+esc(r.name)+'" loading="lazy" decoding="async">';
function listeners(id){const people=rankingListeners(id);if(!people.length)return '';return "<div class=\"rank-listeners\" "+uiAttribute("rankingUi.listeners",{},"aria-label")+">"+people.map((p,index)=>'<button type="button" class="rank-listener'+(duplicateInitials.has(p.initial)?' rank-listener-collision':'')+'" style="--listener-ring:'+(ringColors[p.id]||listenerRing(p.id))+'" data-listener-reciter="'+esc(id)+'" data-listener-index="'+index+'" '+(p.mode==='profile'?'aria-label="'+esc(p.nickname)+'"':uiAttribute('rankingUi.anonymousListener'))+'><span>'+esc(p.initial)+'</span>'+(p.mode==='profile'&&p.hasPhoto?'<img src="'+esc(publicListenerPhoto(p.id))+'" alt="" loading="lazy">':'')+'</button>').join('')+'</div>';}
const row=e=>'<article class="reciter-card rank-list-row" data-personal-reciter="'+esc(e.id)+'" data-personal-reciter="'+esc(e.id)+'"><a href="#quran?view=reciters&reciter='+encodeURIComponent(e.id)+'"><span class="rank-row-number">'+e.rank+'</span>'+face(reciterInfo(e.id))+'<strong>'+esc(reciterInfo(e.id).name)+'</strong><span class="rank-row-time" data-rank-ui-seconds="'+e.seconds+'" data-rank-ui-text>'+esc(rankingTime(e.seconds))+'</span></a>'+listeners(e.id)+'</article>';
export function rankingMarkup(ids,{seconds,query='',global=false,leader='',leaderKey='rankingUi.leader'}){
 const letterUsers=new Map();for(const id of ids)for(const person of rankingListeners(id)){if(!letterUsers.has(person.initial))letterUsers.set(person.initial,new Set());letterUsers.get(person.initial).add(person.id);}duplicateInitials=new Set([...letterUsers].filter(([,users])=>users.size>1).map(([letter])=>letter));const savedRings=read('listener-ring-colors-v1',{});ringColors=assignListenerRings(ids.flatMap(rankingListeners),savedRings);if(Object.keys(ringColors).length)write('listener-ring-colors-v1',Object.fromEntries(Object.entries({...savedRings,...ringColors}).slice(-512)));
 const entries=rankListening(ids.map(id=>({id,seconds:seconds(id)})));activeEntries=entries;activeGlobal=global;
 const q=query.toLocaleLowerCase('ru').replace(/ё/g,'е').trim(),matching=q?entries.filter(e=>reciterInfo(e.id).name.toLocaleLowerCase('ru').replace(/ё/g,'е').includes(q)):entries;
 if(q)return '<div class="rank-search-results">'+matching.map(row).join('')+'</div>'+(matching.length?'':"<p class=\"reciter-empty\">"+uiLeaf("rankingUi.reciterNotFound")+"</p>");
 if(!entries.length)return '';
 const podium=entries.slice(0,3),ties=podium.some((e,i)=>i&&e.rank===podium[i-1].rank);
 return "<section class=\"rank-showcase\" "+uiAttribute("rankingUi.firstFive",{},"aria-label")+"><div class=\"rank-podium rank-podium-"+podium.length+'">'+podium.map((e,i)=>'<article class="reciter-card rank-podium-card rank-slot-'+(i+1)+' rank-medal-'+medalForRank(e.rank)+'"><a href="#quran?view=reciters&reciter='+encodeURIComponent(e.id)+'"><span class="rank-place" '+uiTextAttributes('rankingUi.place',{rank:e.rank})+'>'+esc(t('rankingUi.place',{rank:e.rank}))+'</span>'+face(reciterInfo(e.id))+'<strong>'+esc(reciterInfo(e.id).name)+'</strong><div class="rank-result"><span>'+(i===0?(leader?esc(leader):uiLeaf(leaderKey)):uiLeaf('rankingUi.listened'))+'</span><b data-rank-ui-seconds="'+e.seconds+'" data-rank-ui-text>'+esc(rankingTime(e.seconds))+'</b></div></a>'+(global?listeners(e.id):'')+'</article>').join('')+'</div>'+(ties?"<p class=\"rank-tie-note\">"+uiLeaf("rankingUi.tiesShared")+"</p>":'')+'<div class="rank-next">'+entries.slice(3,5).map(row).join('')+"</div><button type=\"button\" class=\"button secondary rank-open-all\" id=\"rank-open-all\">"+uiLeaf("rankingUi.allRanking")+"<span>"+entries.length+'</span></button></section>';
}
export function bindRankingView(host){
 watchDecodedImages(host);
 host.querySelectorAll('.rank-listener img').forEach(image=>image.onerror=()=>image.remove());
 host.querySelectorAll('[data-listener-reciter]').forEach(button=>button.onclick=()=>{
  const listener=rankingListeners(button.dataset.listenerReciter)[Number(button.dataset.listenerIndex)];if(!listener)return;
  rankingModal('<div class="modal-head"><h2>'+(listener.mode==='profile'?esc(listener.nickname):uiLeaf('rankingUi.nicknameHidden'))+"</h2><button class=\"text-button\" data-close>"+uiLeaf("rankingUi.close")+"</button></div>"+(listener.mode==='initial'?"<p class=\"muted\">"+uiLeaf("rankingUi.listenerAnonymousMode")+"</p>":''));
 });
 const all=host.querySelector('#rank-open-all');if(all)all.onclick=()=>{
  const entries=activeEntries.slice();rankingModal("<div class=\"modal-head\"><h2>"+uiLeaf("rankingUi.allRanking")+"</h2><button class=\"text-button\" data-close>"+uiLeaf("rankingUi.close")+"</button></div><div class=\"rank-full-list\">"+entries.map(row).join('')+'</div>');
  const root=document.getElementById('modal-content');root.querySelectorAll('a').forEach(a=>a.onclick=closeModal);bindRankingView(root);
 };
}

export function updatePersonalRankingTimes(host,ids,seconds){activeEntries=rankListening(ids.map(id=>({id,seconds:seconds(id)})));for(const root of [host,document.getElementById('modal-content')]){if(!root)continue;for(const card of root.querySelectorAll('[data-personal-reciter]')){const time=card.querySelector('.rank-result b,.rank-row-time');if(time){const value=seconds(card.dataset.personalReciter),next=rankingTime(value);time.dataset.rankUiSeconds=String(value);if(time.textContent!==next)time.textContent=next;}}}}
