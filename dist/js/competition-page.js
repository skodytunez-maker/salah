import{reciterFilterTabs,recentReciters}from './quran-reciter-discovery.js';
import{listeningSummaryMarkup,updateListeningSummary,createLiveListeningTotal}from './listening-summary.js';
import{personalDataAllowed,showRestrictedFeature}from './audience.js';
import{captureCompetitionLayout,animateCompetitionChange}from './competition-motion.js';
import{showAwardWinners}from './quran-awards.js';
import{read,write}from './storage.js';
import{toast}from './ui.js';
import{counterSyncStatus}from './counter-account.js';
import{RECITERS}from './quran-reciters.js';
import{RECITER_FAVORITES_KEY,normalizeReciterFavorites}from './quran-reciter-favorites.js';
import{RANK_INTENTION_PHRASES}from './reciter-ranking-core.js';
import{listenerPrivacyMarkup,bindPopularConsent,personalListening}from './reciter-popularity.js';
import{loadCompetition,cachedCompetition,competitionListeningTotal,preloadCompetition,clearCompetitionCache,competitionOwn,refreshCompetitionOwn,saveCompetitionSettings,connectCompetitionNotifications,syncCompetitionNow}from './competition-client.js';
import{competitionMarkup,bindCompetitionView,updateCompetitionTimes}from './competition-view.js';
export function mountCompetition(host,heading){
 if(!personalDataAllowed()){showRestrictedFeature(host,'Топ SALAH');return()=>{};}
 const params=new URLSearchParams(location.hash.split('?')[1]||'');let period=params.get('period')||read('competition-period','all'),rows=[],loading=true,error=false,closed=false,generation=0,busy=false,renderKey='',refreshing=null;const previews=new Map();
 if(!['day','week','month','all'].includes(period))period='all';
 const periods=[['day','День'],['week','Неделя'],['month','Месяц'],['all','Всё время']],liveTotal=createLiveListeningTotal();
 function displayRows(){const own=competitionOwn();if(!own)return rows;const totals=personalListening(period).totals;return rows.map(row=>{if(row.id!==own.id)return row;const key=own.id+':'+period+':'+new Date().toDateString()+':'+row.reciter,local=totals[row.reciter]||0,previous=previews.get(key),seconds=previous?Math.max(row.seconds,previous.seconds+Math.max(0,local-previous.local)):row.seconds;previews.set(key,{local,seconds});return{...row,seconds};});}
 function draw(){if(closed)return;const shown=displayRows(),own=competitionOwn(),signed=counterSyncStatus().signedIn,count=RECITERS.filter(r=>!r.variantOf).length,favorites=normalizeReciterFavorites(read(RECITER_FAVORITES_KEY,[]),RECITERS).length;
 const total=liveTotal.sample(competitionListeningTotal(period),personalListening(period).totals,{key:own?.id+':'+period+':'+new Date().toDateString(),eligible:signed&&own?.enabled===true&&['initial','profile'].includes(own.mode)});
 const key=JSON.stringify({period,busy,signed,favorites,count,newCount:recentReciters(RECITERS).length,own:own?{id:own.id,mode:own.mode,enabled:own.enabled,notify:own.notify,period:own.period}:null,loading:loading&&!rows.length,error,rows:rows.map(({seconds,...person})=>person)});
 if(key===renderKey){updateListeningSummary(host,total);updateCompetitionTimes(host,shown);return;}renderKey=key;
 let html='<section class="quran-library quran-reciters-library rank-page competition-page">'+heading()+''+reciterFilterTabs(null,favorites,RECITERS)+'<nav class="reciter-top-tabs" aria-label="Топы"><a class="reciter-top-tab reciter-top-personal" href="#quran?view=reciters&filter=my-top"><span><strong>Мой топ</strong><small>Ваше время</small></span></a><a class="reciter-top-tab reciter-top-global" href="#quran?view=reciters&filter=salah-top" aria-current="page"><span><strong>Топ SALAH</strong><small>Слушатели</small></span></a></nav>';
 html+='<div class="competition-heading"><p class="rank-intention" id="rank-intention" aria-live="off">'+RANK_INTENTION_PHRASES[Math.floor(Date.now()/15000)%RANK_INTENTION_PHRASES.length]+'</p></div><div class="reciter-period-tabs" role="group" aria-label="Период">'+periods.map(([p,label])=>'<button type="button" data-competition-period="'+p+'" aria-pressed="'+(p===period)+'">'+label+'</button>').join('')+'</div>';
 html+=listeningSummaryMarkup(total);
 html+=loading&&!rows.length?'<p class="reciter-empty">Загружаем рейтинг…</p>':error&&!rows.length?'<p class="reciter-empty">Рейтинг временно недоступен.<button class="text-button" id="competition-retry">Повторить</button></p>':competitionMarkup(shown);
 if(error&&rows.length)html+='<p class="muted competition-sync-note">Показан последний загруженный результат.</p>';
 if(!signed)html+='<a class="text-button" href="#account">Войти в аккаунт</a>';
 else if(own){html+='<div class="competition-settings">'+(!own.enabled?'<p class="muted competition-explanation">Учёт в рейтинге отключён для этого аккаунта.</p>':'')+(own.enabled?listenerPrivacyMarkup({allowJoin:false})+'<div class="rank-privacy-bar competition-notify-row"><label class="switch-row"><span>Уведомлять, если меня обошли</span><input type="checkbox" role="switch" id="competition-notify" aria-label="Уведомлять, если меня обошли" '+(own.notify?'checked ':'')+(busy?'disabled':'')+'></label></div>':'')+'</div>';}
 html+='<button type="button" class="competition-awards-link" id="competition-awards"><img src="./assets/icons/trophy.svg" alt="">Итоги и награды</button>';
 html+='</section>';const before=captureCompetitionLayout(host);host.innerHTML=html;bindCompetitionView(host);animateCompetitionChange(host,before);bindPopularConsent(host);
 host.querySelectorAll('[data-competition-period]').forEach(button=>button.onclick=()=>{if(period===button.dataset.competitionPeriod)return;period=button.dataset.competitionPeriod;write('competition-period',period);const cached=cachedCompetition(period);rows=cached||[];loading=cached===null;error=false;draw();void refresh();});const retry=host.querySelector('#competition-retry');if(retry)retry.onclick=()=>void refresh(true);
 const awards=host.querySelector('#competition-awards');if(awards)awards.onclick=()=>void showAwardWinners({isActive:()=>!closed});
 const notify=host.querySelector('#competition-notify');if(notify)notify.onchange=()=>{const enabled=notify.checked;void act(async()=>{if(enabled)await connectCompetitionNotifications(period);else await saveCompetitionSettings({notify:false});});};
 }
 async function act(action){if(busy)return;busy=true;draw();try{await action();}catch(e){toast(e.message||'Не удалось сохранить');}finally{busy=false;draw();}}
 async function refresh(force=false){if(closed||document.hidden)return;if(refreshing?.period===period)return refreshing.task;const selected=period,token=++generation,entry={period:selected,task:null};refreshing=entry;entry.task=(async()=>{try{const data=await loadCompetition(selected,{force});if(closed||token!==generation)return;rows=data;loading=false;error=false;}catch{if(closed||token!==generation)return;loading=false;error=true;}finally{if(refreshing===entry)refreshing=null;}draw();})();return entry.task;}
 const privacyUpdate=()=>{clearCompetitionCache();liveTotal.reset();generation++;refreshing=null;previews.clear();const own=competitionOwn();if(own){rows=rows.filter(row=>row.id!==own.id);draw();}void refresh(true);};
 const ownUpdate=()=>{void refresh();},authUpdate=()=>{void refreshCompetitionOwn().catch(()=>{});void refresh();},visible=()=>{if(!document.hidden)void refresh();};
 window.addEventListener('salah:listener-visibility',privacyUpdate);window.addEventListener('salah:competition-updated',ownUpdate);window.addEventListener('salah:popularity-updated',authUpdate);window.addEventListener('salah:counter-status',authUpdate);document.addEventListener('visibilitychange',visible);
 const progress=()=>{if(!closed&&!document.hidden)draw();};window.addEventListener('salah:personal-listening-progress',progress);
 const timer=setInterval(()=>void refresh(true),5000),phraseTimer=setInterval(()=>{const line=host.querySelector('#rank-intention');if(line&&!document.hidden)line.textContent=RANK_INTENTION_PHRASES[Math.floor(Date.now()/15000)%RANK_INTENTION_PHRASES.length];},15000);
 rows=cachedCompetition(period)||[];loading=!rows.length;draw();void refresh();void preloadCompetition();void refreshCompetitionOwn().catch(()=>{});
 return()=>{closed=true;generation++;clearInterval(timer);clearInterval(phraseTimer);window.removeEventListener('salah:personal-listening-progress',progress);window.removeEventListener('salah:listener-visibility',privacyUpdate);window.removeEventListener('salah:competition-updated',ownUpdate);window.removeEventListener('salah:popularity-updated',authUpdate);window.removeEventListener('salah:counter-status',authUpdate);document.removeEventListener('visibilitychange',visible);};
}
