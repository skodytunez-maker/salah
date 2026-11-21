import{translateUi,subscribeLanguage}from './i18n.js';
import{uiLeaf,uiAttribute}from './ui.js';
import{reciterFilterTabs,recentReciters}from './quran-reciter-discovery.js';
import{listeningSummaryMarkup,updateListeningSummary,translateListeningSummary}from './listening-summary.js';
import{mountCompetition}from './competition-page.js';
import{sharedPersonalTotals,refreshCompetitionOwn}from './competition-client.js';
import{RANK_INTENTION_PHRASES,rankListening}from './reciter-ranking-core.js';

import{RECITERS,reciterIsAvailable,visibleReciters}from './quran-reciters.js';
import{read,write}from './storage.js';
import{RECITER_FAVORITES_KEY,normalizeReciterFavorites}from './quran-reciter-favorites.js';
import{showListeningScanner}from './quran-listen-share.js';
import{rankingMarkup,bindRankingView,updatePersonalRankingTimes}from './reciter-ranking-view.js';
import{loadPopularReciters,rankingSeconds,globalRankingPeriod,setGlobalRankingPeriod,personalListening,personalTop,formatListeningTime,popularConsentMarkup,listenerPrivacyMarkup,bindPopularConsent}from './reciter-popularity.js';
import{renderRankingTimes}from './ranking-ui.js';
export function mountReciterRanking(host,filter,heading){
 if(filter!=='my-top')return mountCompetition(host,heading);
 const global=filter==='salah-top';let period=read('reciter-listening-period','day'),query='',ids=[],loading=global,error=false,closed=false,generation=0,renderedDay=new Date().toDateString(),personalRenderKey='';
 if(!['day','week','month','all'].includes(period))period='day';
 const draw=()=>{
  if(closed)return;renderedDay=new Date().toDateString();
  const commonTotals=sharedPersonalTotals(personalListening(period).totals,period),personalIds=Object.entries(commonTotals).filter(([id,n])=>n>0&&reciterIsAvailable(id)).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([id])=>id);
  const currentKey=JSON.stringify({period,query,newCount:recentReciters(RECITERS).length,saved:read(RECITER_FAVORITES_KEY,[]),ranks:rankListening(personalIds.map(id=>({id,seconds:commonTotals[id]}))).map(({id,rank})=>({id,rank})),day:renderedDay});
  if(!global&&currentKey===personalRenderKey){updatePersonalRankingTimes(host,personalIds,id=>commonTotals[id]||0);updateListeningSummary(host,Math.floor(Object.values(commonTotals).reduce((a,b)=>a+b,0)));return;}personalRenderKey=currentKey;
  const saved=normalizeReciterFavorites(read(RECITER_FAVORITES_KEY,[]),RECITERS),count=visibleReciters().filter(r=>!r.variantOf).length;
  let html='<section class="quran-library quran-reciters-library rank-page">'+heading();
  html+="<label class=\"field\"><input type=\"search\" id=\"reciter-search\" "+uiAttribute("rankingUi.findReciter",{},"aria-label")+" "+uiAttribute("rankingUi.findReciter",{},"placeholder")+" autocomplete=\"off\"></label>";
  html+=''+reciterFilterTabs(null,saved.length,RECITERS)+'';
  html+="<nav class=\"reciter-top-tabs\" "+uiAttribute("rankingUi.reciterTops",{},"aria-label")+"><a class=\"reciter-top-tab reciter-top-personal\" href=\"#quran?view=reciters&filter=my-top\" aria-current=\""+(!global?'page':'false')+"\"><span class=\"reciter-top-icon\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M4 13v-2a8 8 0 0 1 16 0v2M4 12h3v7H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Zm16 0h-3v7h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2Z\"/></svg></span><span><strong>"+uiLeaf("rankingUi.myTop")+"</strong><small>"+uiLeaf("rankingUi.yourTime")+"</small></span></a><a class=\"reciter-top-tab reciter-top-global\" href=\"#quran?view=reciters&filter=salah-top\" aria-current=\""+(global?'page':'false')+"\"><span class=\"reciter-top-icon\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v5m-4 3h8m-7-3h6\"/></svg></span><span><strong>"+uiLeaf("rankingUi.salahTop")+"</strong><small>"+uiLeaf("rankingUi.overallRanking")+"</small></span></a></nav>";
  const active=global?globalRankingPeriod():period,options=global?[['day','rankingUi.day'],['week','rankingUi.week'],['month','rankingUi.month']]:[['day','rankingUi.day'],['week','rankingUi.week'],['month','rankingUi.month'],['all','rankingUi.allTime']];
  const leaders={day:'rankingUi.dayLeader',week:'rankingUi.weekLeader',month:'rankingUi.monthLeader',all:'rankingUi.yourLeader'};
  if(global)html+='<div class="reciter-popular-heading"><p class="rank-intention" id="rank-intention" lang="ru" dir="ltr" translate="no" aria-live="off">'+RANK_INTENTION_PHRASES[Math.floor(Date.now()/15000)%RANK_INTENTION_PHRASES.length]+'</p></div>';
  html+='<div class="reciter-period-tabs '+(global?'rank-global-periods':'')+'" role="group" '+uiAttribute('rankingUi.listeningPeriod')+'>'+options.map(([value,label])=>'<button type="button" data-rank-period="'+value+'" aria-pressed="'+(value===active)+'">'+uiLeaf(label)+'</button>').join('')+'</div>';
  if(!global){const data={...personalListening(period),totals:commonTotals};html+=listeningSummaryMarkup(Math.floor(Object.values(data.totals).reduce((a,b)=>a+b,0)),{personal:true});}
  const ranked=global?ids.filter(reciterIsAvailable):personalIds;
  if(global&&loading)html+="<p class=\"reciter-empty\">"+uiLeaf("rankingUi.loadingRanking")+"</p>";
  else if(global&&error&&!ranked.length)html+="<p class=\"reciter-empty\">"+uiLeaf("rankingUi.rankingLoadFailed")+"</p>";
  else if(!ranked.length)html+='<p class="reciter-empty">'+uiLeaf(global?'rankingUi.noMinutes':'rankingUi.startListening')+'</p>';
  else html+=rankingMarkup(ranked,{seconds:id=>global?rankingSeconds(id):(commonTotals[id]||0),query,global,leaderKey:leaders[active]});
  if(global)html+=listenerPrivacyMarkup()+popularConsentMarkup();
  html+='</section>';host.innerHTML=html;bindRankingView(host);bindPopularConsent(host);
  host.querySelector('#quran-open-listening-scanner').onclick=showListeningScanner;
  const search=host.querySelector('#reciter-search');search.value=query;search.oninput=()=>{query=search.value;draw();host.querySelector('#reciter-search').focus();};
  host.querySelectorAll('[data-rank-period]').forEach(button=>button.onclick=()=>{if(global){setGlobalRankingPeriod(button.dataset.rankPeriod);ids=[];loading=true;draw();void refresh();}else{period=button.dataset.rankPeriod;write('reciter-listening-period',period);draw();}});
 };
 async function refresh(){if(closed||!global||document.hidden)return;const token=++generation;try{const rows=await loadPopularReciters();if(closed||token!==generation)return;ids=rows;loading=false;error=false;}catch{if(closed||token!==generation)return;loading=false;error=true;}if(document.activeElement!==host.querySelector('#reciter-search'))draw();}
 const personalRefresh=()=>{if(!closed&&!global&&document.activeElement!==host.querySelector('#reciter-search'))draw();};
 const statusRefresh=()=>{if(!closed&&document.activeElement!==host.querySelector('#reciter-search'))draw();};
 window.addEventListener('salah:competition-updated',personalRefresh);window.addEventListener('salah:personal-listening-progress',personalRefresh);window.addEventListener('salah:personal-listening',personalRefresh);window.addEventListener('salah:popularity-updated',refresh);window.addEventListener('salah:counter-status',statusRefresh);document.addEventListener('visibilitychange',refresh);
 const intentionTimer=setInterval(()=>{const line=host.querySelector('#rank-intention');if(line&&!document.hidden)line.textContent=RANK_INTENTION_PHRASES[Math.floor(Date.now()/15000)%RANK_INTENTION_PHRASES.length];},15000);
 const timer=setInterval(()=>{if(global)void refresh();else if(renderedDay!==new Date().toDateString())personalRefresh();},60000);
 const offLanguage=subscribeLanguage(()=>{if(closed)return;translateUi(host);renderRankingTimes(host);translateListeningSummary(host);});
 draw();if(global)void refresh();else void refreshCompetitionOwn().catch(()=>{});
 return()=>{closed=true;offLanguage();generation++;clearInterval(timer);clearInterval(intentionTimer);window.removeEventListener('salah:competition-updated',personalRefresh);window.removeEventListener('salah:personal-listening-progress',personalRefresh);window.removeEventListener('salah:personal-listening',personalRefresh);window.removeEventListener('salah:popularity-updated',refresh);window.removeEventListener('salah:counter-status',statusRefresh);document.removeEventListener('visibilitychange',refresh);};
}
