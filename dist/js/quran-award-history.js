import{esc}from './ui.js';
import{awardArtwork,awardPeriod,awardShareIdentity}from './quran-awards-core.js';
import{rankTime}from './reciter-ranking-core.js';

// Keep each period separate and the listening total behind an explicit tap.
export function mountAwardHistory(host,rows,{isActive=()=>true,onCard=()=>{}}={}){
 let selected='week';
 host.innerHTML='<div class="award-filter award-history-filter" role="group" aria-label="Период истории побед"><button type="button" data-history-period="week" aria-pressed="true" aria-controls="award-history-results">Неделя</button><button type="button" data-history-period="month" aria-pressed="false" aria-controls="award-history-results">Месяц</button></div><div id="award-history-results" class="award-history-results" role="region" aria-label="Победители недели"></div>';
 const panel=host.querySelector('.award-history-results');
 const draw=()=>{
  const winners=rows.filter(row=>row.kind===selected).sort((a,b)=>b.start.localeCompare(a.start)||a.id.localeCompare(b.id));
  panel.setAttribute('aria-label',selected==='week'?'Победители недели':'Победители месяца');
  panel.innerHTML=winners.map(row=>'<details class="award-history-entry"><summary><img class="award-history-emblem" src="'+esc(awardArtwork(row.kind))+'" alt=""><span class="award-history-identity"><strong>'+esc(awardShareIdentity(row.listener).label)+'</strong><small>'+esc(awardPeriod(row))+'</small></span><span class="award-history-chevron" aria-hidden="true"></span></summary><div class="award-history-detail"><span>Прослушано<strong>'+esc(rankTime(row.seconds))+'</strong></span><button type="button" class="text-button" data-award-winner="'+esc(row.id)+'">Карточка победителя</button></div></details>').join('')||'<p class="award-note">Победитель появится после завершения периода.</p>';
  panel.querySelectorAll('[data-award-winner]').forEach(button=>button.onclick=()=>{if(isActive())void onCard(button);});
 };
 host.querySelectorAll('[data-history-period]').forEach(button=>button.onclick=()=>{
  if(!isActive()||selected===button.dataset.historyPeriod)return;selected=button.dataset.historyPeriod;
  host.querySelectorAll('[data-history-period]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));draw();
 });
 draw();
}
