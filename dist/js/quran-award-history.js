import{esc,uiLeaf,uiAttribute}from './ui.js';
import{t,getLocale,subscribeLanguage,translateUi}from './i18n.js';
import{awardInfo,awardArtwork,awardShareIdentity,validAwardDate,calendarAward}from './quran-awards-core.js';
import{rankingTime,renderRankingTimes}from './ranking-ui.js';

// Display adapters never mutate canonical award metadata or saved award rows.
export function awardUiTitle(kind,record=null){return typeof record?.title==='string'&&record.title.length?record.title:t('rankingUi.awardTitle'+kind[0].toUpperCase()+kind.slice(1));}
export function awardUiRule(kind){
 const a=awardInfo(kind);if(!a)return '';
 const key=kind==='week'?'Week':kind==='month'?'Month':a.days?(a.days<=30?'Streak':'StreakPermanent'):a.hours?'Hours':kind==='reading1'?'Reading1':kind==='reading10'?'Reading10':kind==='khatm'?'Khatm':kind==='adhkar7'?'Adhkar7':kind==='adhkar30'?'Adhkar30':'Founder';
 return t('rankingUi.awardRule'+key,{count:a.days||a.hours});
}
export const awardUiDayWord=count=>t('rankingUi.awardDayWord',{count});
export function awardUiIdentityLabel(listener){const who=awardShareIdentity(listener);return who.id?who.label:t('rankingUi.awardHiddenName');}
export function awardUiPeriod(row){
 if(!validAwardDate(row.start)||!validAwardDate(row.end))return t('rankingUi.historyUnspecified');
 const first=new Date(row.start+'T12:00:00Z'),last=new Date(row.end+'T12:00:00Z');if(calendarAward(row.kind))last.setUTCDate(last.getUTCDate()-1);
 const fmt=new Intl.DateTimeFormat(getLocale(),{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 return row.kind==='founder'||awardInfo(row.kind)?.hours?fmt.format(first):fmt.format(first)+' — '+fmt.format(last);
}
export function awardUiMetric(row){
 const a=awardInfo(row.kind);if(!a)return '';
 return calendarAward(row.kind)?rankingTime(row.seconds):a.readingJuz?t('rankingUi.awardMetricJuz',{count:a.readingJuz}):a.adhkarDays?t('rankingUi.awardMetricAdhkar',{count:a.adhkarDays}):a.days?t('rankingUi.awardMetricDays',{count:a.days}):a.hours?t('rankingUi.awardMetricHours',{count:a.hours}):awardUiTitle('founder');
}
// Award timestamps retain the competition calendar zone, independently of UI locale.
export function awardWonDate(row){
 const value=typeof row.earnedAt==='string'?row.earnedAt:'',date=new Date(value);
 if(!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(date.getTime()))return '';
 return new Intl.DateTimeFormat(getLocale(),{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Moscow'}).format(date);
}
export function awardHistoryLabel(row){
 if(!validAwardDate(row.start)||!validAwardDate(row.end)||row.end<=row.start)return t('rankingUi.historyUnspecified');
 const first=new Date(row.start+'T12:00:00Z'),last=new Date(row.end+'T12:00:00Z');last.setUTCDate(last.getUTCDate()-1);
 if(row.kind==='month'){const month=new Intl.DateTimeFormat(getLocale(),{month:'long',timeZone:'UTC'}).format(first);return month[0].toLocaleUpperCase(getLocale())+month.slice(1)+' '+first.getUTCFullYear();}
 return new Intl.DateTimeFormat(getLocale(),{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).formatRange(first,last);
}
const mounted=new WeakMap();
// A one-time historical distinction under the all-reciter measure.
const octoberRecognition=Object.freeze({kind:'month',start:'2026-10-01',end:'2026-11-01',seconds:168802,initial:'Н'});
function octoberRecognitionMarkup(){
 const {initial,seconds}=octoberRecognition;
 return '<article class="award-history-entry award-history-recognition" data-october-recognition><div class="award-history-identity"><strong>'+uiLeaf('rankingUi.historyOctoberTotal')+'</strong><small data-recognition-month>'+esc(awardHistoryLabel(octoberRecognition))+'</small></div><span class="award-history-recognition-score"><b>'+esc(initial)+'</b><span data-rank-ui-text data-rank-ui-seconds="'+seconds+'">'+esc(rankingTime(seconds))+'</span></span></article>';
}
// Identify the period won; the actual handover date is supplementary detail.
export function mountAwardHistory(host,rows,{isActive=()=>true,onCard=()=>{}}={}){
 mounted.get(host)?.();let selected='week',closed=false,rendered=[],observer=null;
 host.innerHTML='<div class="award-filter award-history-filter" role="group" '+uiAttribute('rankingUi.historyPeriodLabel')+'><button type="button" data-history-period="week" aria-pressed="true" aria-controls="award-history-results">'+uiLeaf('rankingUi.historyWeek')+'</button><button type="button" data-history-period="month" aria-pressed="false" aria-controls="award-history-results">'+uiLeaf('rankingUi.historyMonth')+'</button></div><div id="award-history-results" class="award-history-results" role="region" aria-label="'+esc(t('rankingUi.historyWeekWinners'))+'"></div>';
 const panel=host.querySelector('.award-history-results'),dialog=host.closest('dialog');
 const paint=()=>{
  if(closed)return;if(!host.isConnected){dispose();return;}translateUi(host);renderRankingTimes(host);
  panel.setAttribute('aria-label',t(selected==='week'?'rankingUi.historyWeekWinners':'rankingUi.historyMonthWinners'));
  const recognitionMonth=panel.querySelector('[data-recognition-month]');if(recognitionMonth)recognitionMonth.textContent=awardHistoryLabel(octoberRecognition);
  const byId=new Map(rendered.map(row=>[row.id,row]));
  for(const node of panel.querySelectorAll('[data-history-date]')){const row=byId.get(node.dataset.historyRow);if(row)node.textContent=node.dataset.historyDate==='label'?awardHistoryLabel(row):node.dataset.historyDate==='won'?awardWonDate(row):awardUiPeriod(row);}
  for(const node of panel.querySelectorAll('[data-history-caption]'))if(node.firstChild?.nodeType===3)node.firstChild.data=t(node.dataset.historyCaption);
  for(const node of panel.querySelectorAll('[data-history-identity]')){const row=byId.get(node.dataset.historyIdentity);if(row&&!awardShareIdentity(row.listener).id)node.textContent=awardUiIdentityLabel(row.listener);}
 };
 const draw=()=>{
  rendered=rows.filter(row=>row.kind===selected).sort((a,b)=>b.start.localeCompare(a.start)||a.id.localeCompare(b.id));
  const date=(row,type,text)=>'<span data-history-date="'+type+'" data-history-row="'+esc(row.id)+'">'+esc(text)+'</span>';
  const cards=rendered.map(row=>'<details class="award-history-entry"><summary><img class="award-history-emblem" src="'+esc(awardArtwork(row.kind))+'" alt=""><span class="award-history-identity"><strong data-history-identity="'+esc(row.id)+'">'+esc(awardUiIdentityLabel(row.listener))+'</strong><small>'+date(row,'label',awardHistoryLabel(row))+'</small></span><span class="award-history-chevron" aria-hidden="true"></span></summary><div class="award-history-detail"><span class="award-history-period" data-history-caption="rankingUi.historyPeriod">'+esc(t('rankingUi.historyPeriod'))+date(row,'period',awardUiPeriod(row))+'</span>'+(awardWonDate(row)?'<span class="award-history-received" data-history-caption="rankingUi.historyEarned">'+esc(t('rankingUi.historyEarned'))+date(row,'won',awardWonDate(row))+'</span>':'')+'<span>'+uiLeaf('rankingUi.historyListened')+'<strong data-rank-ui-text data-rank-ui-seconds="'+row.seconds+'">'+esc(rankingTime(row.seconds))+'</strong></span><button type="button" class="text-button" data-award-winner="'+esc(row.id)+'">'+uiLeaf('rankingUi.historyWinnerCard')+'</button></div></details>');
  if(selected==='month'){
   const older=rendered.findIndex(row=>row.start<octoberRecognition.start);
   cards.splice(older<0?cards.length:older,0,octoberRecognitionMarkup());
  }
  panel.innerHTML=cards.join('')||'<p class="award-note">'+uiLeaf('rankingUi.historyEmpty')+'</p>';
  panel.querySelectorAll('[data-award-winner]').forEach(button=>button.onclick=()=>{if(!closed&&isActive())void onCard(button);});paint();
 };
 host.querySelectorAll('[data-history-period]').forEach(button=>button.onclick=()=>{
  if(closed||!isActive()||selected===button.dataset.historyPeriod)return;selected=button.dataset.historyPeriod;
  host.querySelectorAll('[data-history-period]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));draw();
 });
 const off=subscribeLanguage(paint);
 function dispose(){if(closed)return;closed=true;off();observer?.disconnect();dialog?.removeEventListener('close',dispose);if(mounted.get(host)===dispose)mounted.delete(host);}
 const Observer=host.ownerDocument?.defaultView?.MutationObserver;
 if(dialog&&typeof Observer==='function'){observer=new Observer(()=>{if(!host.isConnected)dispose();});observer.observe(dialog.querySelector('#modal-content')||dialog,{childList:true,subtree:true});}
 dialog?.addEventListener('close',dispose,{once:true});mounted.set(host,dispose);draw();return dispose;
}
