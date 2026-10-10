import{captureCompetitionLayout,animateCompetitionChange}from './competition-motion.js';
import{read,write}from './storage.js';
import{esc,toast}from './ui.js';
import{counterSyncStatus}from './counter-account.js';
import{RECITERS}from './quran-reciters.js';
import{RECITER_FAVORITES_KEY,normalizeReciterFavorites}from './quran-reciter-favorites.js';
import{RANK_INTENTION_PHRASES,rankTime}from './reciter-ranking-core.js';
import{listenerPrivacyMarkup,bindPopularConsent}from './reciter-popularity.js';
import{loadCompetition,competitionOwn,refreshCompetitionOwn,saveCompetitionSettings,connectCompetitionNotifications,syncCompetitionNow}from './competition-client.js';
import{competitionMarkup,bindCompetitionView,updateCompetitionTimes}from './competition-view.js';
export function mountCompetition(host,heading){
 const params=new URLSearchParams(location.hash.split('?')[1]||'');let period=params.get('period')||read('competition-period','all'),rows=[],loading=true,error=false,closed=false,generation=0,busy=false,renderKey='';
 if(!['day','week','month','all'].includes(period))period='all';
 const periods=[['day','День'],['week','Неделя'],['month','Месяц'],['all','Всё время']],leaders={day:'Лидер дня',week:'Лидер недели',month:'Лидер месяца',all:'Лидер SALAH'};
 function draw(){if(closed)return;const own=competitionOwn(),signed=counterSyncStatus().signedIn,me=own?rows.find(p=>p.id===own.id):null,count=RECITERS.filter(r=>!r.variantOf).length,favorites=normalizeReciterFavorites(read(RECITER_FAVORITES_KEY,[]),RECITERS).length;
 const key=JSON.stringify({period,busy,signed,favorites,count,own:own?{id:own.id,mode:own.mode,enabled:own.enabled,notify:own.notify,period:own.period}:null,loading:loading&&!rows.length,error,rows:rows.map(({seconds,...person})=>person)});
 if(key===renderKey){updateCompetitionTimes(host,rows);const self=host.querySelector('[data-competition-self]');if(self&&me)self.textContent='Вы: '+me.rank+' место · '+rankTime(me.seconds);return;}renderKey=key;
 let html='<section class="quran-library quran-reciters-library rank-page competition-page">'+heading()+'<nav class="reciter-filter-tabs" aria-label="Каталог чтецов"><a href="#quran?view=reciters">Все '+count+'</a><a href="#quran?view=reciters&filter=favorites">Избранные '+favorites+'</a><a href="#quran?view=reciters&filter=ruqyah">Рукъя</a></nav><nav class="reciter-top-tabs" aria-label="Топы"><a class="reciter-top-tab reciter-top-personal" href="#quran?view=reciters&filter=my-top"><span><strong>Мой топ</strong><small>Ваше время</small></span></a><a class="reciter-top-tab reciter-top-global" href="#quran?view=reciters&filter=salah-top" aria-current="page"><span><strong>Топ SALAH</strong><small>Слушатели</small></span></a></nav>';
 html+='<div class="competition-heading"><p class="rank-intention" id="rank-intention" aria-live="off">'+RANK_INTENTION_PHRASES[Math.floor(Date.now()/15000)%RANK_INTENTION_PHRASES.length]+'</p></div><div class="reciter-period-tabs" role="group" aria-label="Период">'+periods.map(([p,label])=>'<button type="button" data-competition-period="'+p+'" aria-pressed="'+(p===period)+'">'+label+'</button>').join('')+'</div>';
 html+='<div class="competition-caption"><span>'+leaders[period]+'</span>'+(me?'<b data-competition-self>Вы: '+me.rank+' место · '+esc(rankTime(me.seconds))+'</b>':'')+'</div>';
 html+=loading&&!rows.length?'<p class="reciter-empty">Загружаем рейтинг…</p>':error&&!rows.length?'<p class="reciter-empty">Рейтинг временно недоступен.<button class="text-button" id="competition-retry">Повторить</button></p>':competitionMarkup(rows);
 if(error&&rows.length)html+='<p class="muted competition-sync-note">Показан последний загруженный результат.</p>';
 if(!signed)html+='<a class="text-button" href="#account">Войти в аккаунт</a>';
 else if(own){html+='<div class="competition-settings">'+(!own.enabled?'<p class="muted competition-explanation">Учёт в рейтинге отключён для этого аккаунта.</p>':'')+(own.enabled?listenerPrivacyMarkup({allowJoin:false}):'')+'<div class="competition-controls">'+(own.enabled?'<button type="button" class="text-button competition-notify" id="competition-notify" aria-pressed="'+own.notify+'" '+(busy?'disabled':'')+'><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 17h12l-2-3V9a4 4 0 0 0-8 0v5l-2 3Zm4 3h4"/></svg>'+(own.notify?'Обгон: включено':'Сообщать об обгоне')+'</button>':'')+'</div>'+(own.notify?'<small class="muted">Уведомления: '+periods.find(([p])=>p===own.period)[1].toLocaleLowerCase('ru')+'</small>':'')+'</div>';}
 html+='<p class="competition-explanation muted">Место — по времени вашего самого прослушиваемого чтеца за этот период.</p></section>';const before=captureCompetitionLayout(host);host.innerHTML=html;bindCompetitionView(host);animateCompetitionChange(host,before);bindPopularConsent(host);
 host.querySelectorAll('[data-competition-period]').forEach(button=>button.onclick=()=>{period=button.dataset.competitionPeriod;write('competition-period',period);rows=[];loading=true;draw();void refresh();});const retry=host.querySelector('#competition-retry');if(retry)retry.onclick=()=>void refresh();
 const notify=host.querySelector('#competition-notify');if(notify)notify.onclick=()=>void act(async()=>{if(own.notify)await saveCompetitionSettings({notify:false});else await connectCompetitionNotifications(period);});
 }
 async function act(action){if(busy)return;busy=true;draw();try{await action();}catch(e){toast(e.message||'Не удалось сохранить');}finally{busy=false;draw();}}
 async function refresh(){if(closed||document.hidden)return;const token=++generation;try{const data=await loadCompetition(period);if(closed||token!==generation)return;rows=data;loading=false;error=false;}catch{if(closed||token!==generation)return;loading=false;error=true;}draw();}
 const privacyUpdate=()=>{const own=competitionOwn();if(own){rows=rows.filter(row=>row.id!==own.id);draw();}void refresh();};
 const ownUpdate=()=>{void refresh();},authUpdate=()=>{void refreshCompetitionOwn().catch(()=>{});void refresh();},visible=()=>{if(!document.hidden)void refresh();};
 window.addEventListener('salah:listener-visibility',privacyUpdate);window.addEventListener('salah:competition-updated',ownUpdate);window.addEventListener('salah:popularity-updated',authUpdate);window.addEventListener('salah:counter-status',authUpdate);document.addEventListener('visibilitychange',visible);
 const timer=setInterval(()=>void refresh(),15000),phraseTimer=setInterval(()=>{const line=host.querySelector('#rank-intention');if(line&&!document.hidden)line.textContent=RANK_INTENTION_PHRASES[Math.floor(Date.now()/15000)%RANK_INTENTION_PHRASES.length];},15000);
 draw();void refresh();void refreshCompetitionOwn().catch(()=>{});
 return()=>{closed=true;generation++;clearInterval(timer);clearInterval(phraseTimer);window.removeEventListener('salah:listener-visibility',privacyUpdate);window.removeEventListener('salah:competition-updated',ownUpdate);window.removeEventListener('salah:popularity-updated',authUpdate);window.removeEventListener('salah:counter-status',authUpdate);document.removeEventListener('visibilitychange',visible);};
}
