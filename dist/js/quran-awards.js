import{esc,closeModal,toast,uiLeaf,uiAttribute,setUiAttribute,uiMessage,setUiMessage}from './ui.js';
import{t,getLocale,subscribeLanguage,translateUi}from './i18n.js';
import{rankingTime,renderRankingTimes,rankingModal}from './ranking-ui.js';
import{showAwardCelebration}from './award-celebration.js';
import{showSeriesCelebration}from './series-celebration.js';
import{seriesColor}from './series-celebration-core.js';
import{competitionOwn,refreshCompetitionOwn,competitionAvatar}from './competition-client.js';
import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{reciterInfo}from './quran-reciters.js';
import{reciterImageUrl}from './approved-catalog.js';
import{rankTime}from './reciter-ranking-core.js';
import{mountAwardHistory,awardUiTitle,awardUiRule,awardUiPeriod,awardUiMetric,awardUiDayWord,awardUiIdentityLabel}from './quran-award-history.js';
import{QURAN_AWARDS,awardInfo,awardPeriod,awardShareIdentity,safeAward,safeAwardState,weekDays,dayCountLabel,calendarAward,awardArtwork,awardMetric,hourAwardProgress,awardCollectionCounts}from './quran-awards-core.js';
const endpoint=OWNER_PROJECT_URL+'/functions/v1/reciter-competition';
const emblem=(kind,locked=false)=>{const a=awardInfo(kind);return '<span class="award-emblem'+(a.artwork?' award-emblem-medallion':'')+(locked?' award-locked':'')+'" style="--award-color:'+a.color+'"><img src="'+awardArtwork(kind)+'" alt=""></span>';};
const counts=awardCollectionCounts;
const titleKey=kind=>'rankingUi.awardTitle'+kind[0].toUpperCase()+kind.slice(1);
const weekday=day=>{const text=new Intl.DateTimeFormat(getLocale(),{weekday:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));return text[0].toLocaleUpperCase(getLocale())+text.slice(1);};
const titleMarkup=(kind,record=null)=>typeof record?.title==='string'&&record.title.length?esc(record.title):uiLeaf(titleKey(kind));
const stored=value=>esc(JSON.stringify(value));
const periodMarkup=(row,tag='strong')=>'<'+tag+' data-award-period="'+stored({kind:row.kind,start:row.start,end:row.end})+'">'+esc(awardUiPeriod(row))+'</'+tag+'>';
const metricMarkup=(row,tag='small')=>'<'+tag+' data-award-metric="'+stored({kind:row.kind,seconds:row.seconds})+'">'+esc(awardUiMetric(row))+'</'+tag+'>';
const hourProgress=(heard,kind)=>{const a=awardInfo(kind),seconds=Number.isSafeInteger(heard)&&heard>=0?heard:0;return t('rankingUi.awardHoursProgress',{heard:rankingTime(seconds),remaining:rankingTime(Math.max(0,a.hours*3600-seconds))});};
function paintAwardFields(root){
 for(const node of root.querySelectorAll('[data-award-rule]'))node.textContent=awardUiRule(node.dataset.awardRule);
 for(const [attribute,format]of [['awardPeriod',awardUiPeriod],['awardMetric',awardUiMetric],['awardHoursProgress',value=>hourProgress(value.heard,value.kind)]]){
  const selector='[data-'+attribute.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase())+']';for(const node of root.querySelectorAll(selector)){try{node.textContent=format(JSON.parse(node.dataset[attribute]));}catch{}}
 }renderRankingTimes(root);
}
function paintAccountLabels(host,state){
 translateUi(host);paintAwardFields(host);if(!state)return;
 const got=counts(state);for(const button of host.querySelectorAll('[data-award-kind]')){const kind=button.dataset.awardKind,count=got[kind]||0;setUiAttribute(button,'aria-label',count&&calendarAward(kind)&&count>1?'rankingUi.awardMiniWins':count?'rankingUi.awardMiniEarned':'rankingUi.awardMiniMissing',{title:awardUiTitle(kind),count});}
 for(const node of host.querySelectorAll('[data-award-weekday]')){const day=JSON.parse(node.dataset.awardWeekday),label=weekday(day.day);node.querySelector('span').textContent=label;setUiAttribute(node,'aria-label',day.heard?'rankingUi.awardWeekdayHeard':day.protected?'rankingUi.awardWeekdayProtected':day.today?'rankingUi.awardWeekdayToday':'rankingUi.awardWeekday',{weekday:label,number:day.number});}
}
export function accountAwardsMarkup(state,{selected='received',seriesView='current'}={}){
 const got=counts(state),received=Object.values(got).filter(Boolean).length,visible=QURAN_AWARDS.filter(a=>selected==='received'?got[a.kind]>0:!got[a.kind]),days=seriesView==='best'?state.streak.best:state.streak.current;
 return '<div class="award-section-head"><h2>'+uiLeaf('rankingUi.awardEveryDay')+'</h2><button type="button" class="text-button" data-award-help '+uiAttribute('rankingUi.awardCounterHelpAria')+'>'+uiLeaf('rankingUi.awardCounterHelp')+'</button></div><button type="button" class="award-streak-head" data-series-switch aria-pressed="'+(seriesView==='best')+'" '+uiAttribute(seriesView==='current'?'rankingUi.awardShowBest':'rankingUi.awardShowCurrent')+'><strong>'+days+'</strong><span>'+uiLeaf('rankingUi.awardDayWord',{count:days})+uiLeaf(seriesView==='best'?'rankingUi.awardBestSuffix':'rankingUi.awardCurrentSuffix')+'</span><img class="series-switch-arrow" src="./assets/arrow-left.svg" alt=""></button><div class="award-reserves"><span class="award-reserve-chip"><img src="./assets/icons/shield-heart.svg" alt=""><span>'+uiLeaf('rankingUi.awardReserve')+'<strong>'+state.streak.freezes+'/3</strong></span></span><span class="award-reserve-chip award-refill-chip"><img src="./assets/icons/arrows-rotate.svg" alt=""><span>'+uiLeaf('rankingUi.awardRefill')+'<strong>'+state.streak.refillDays+'/7</strong><progress max="7" value="'+state.streak.refillDays+'" '+uiAttribute('rankingUi.awardRefillAria',{count:state.streak.refillDays})+'></progress></span></span></div><div class="award-week" '+uiAttribute('rankingUi.awardWeekListening')+'>'+weekDays(state.day,state.streak.days,state.streak.protectedDays).map(d=>'<div class="award-day'+(d.heard?' is-heard':'')+(d.protected?' is-protected':'')+(d.today?' is-today':'')+(d.future?' is-future':'')+'" data-award-weekday="'+stored(d)+'" '+uiAttribute(d.heard?'rankingUi.awardWeekdayHeard':d.protected?'rankingUi.awardWeekdayProtected':d.today?'rankingUi.awardWeekdayToday':'rankingUi.awardWeekday',{weekday:weekday(d.day),number:d.number})+'><span>'+esc(weekday(d.day))+'</span><b>'+d.number+'</b><span class="award-day-dot" aria-hidden="true"></span></div>').join('')+'</div><div class="award-section-head" style="margin-top:20px"><h2><button type="button" class="award-heading-switch" data-award-account-switch aria-pressed="'+(selected==='missing')+'" '+uiAttribute(selected==='received'?'rankingUi.awardShowMissing':'rankingUi.awardShowReceived')+'>'+uiLeaf(selected==='received'?'rankingUi.awardMy':'rankingUi.awardMissing')+'<img src="./assets/arrow-left.svg" alt="" class="'+(selected==='received'?'points-next':'')+'"></button></h2><span class="award-total">'+received+'/'+QURAN_AWARDS.length+'</span></div><div class="award-mini-list award-earned-carousel" role="group" '+uiAttribute(selected==='received'?'rankingUi.awardReceivedCarousel':'rankingUi.awardMissingCarousel')+' data-count="'+visible.length+'">'+visible.map(a=>'<button type="button" class="award-mini" data-award-kind="'+a.kind+'" '+uiAttribute(got[a.kind]&&calendarAward(a.kind)&&got[a.kind]>1?'rankingUi.awardMiniWins':got[a.kind]?'rankingUi.awardMiniEarned':'rankingUi.awardMiniMissing',{title:awardUiTitle(a.kind),count:got[a.kind]})+'>'+emblem(a.kind,!got[a.kind])+'<small>'+titleMarkup(a.kind)+(calendarAward(a.kind)&&got[a.kind]>1?' · '+got[a.kind]:'')+'</small>'+(!got[a.kind]?'<span class="award-mini-status">'+uiLeaf('rankingUi.awardAhead')+'</span>':'')+'</button>').join('')+'</div>'+(visible.length?'':'<p class="award-note">'+uiLeaf(selected==='received'?'rankingUi.awardNoReceived':'rankingUi.awardAllReceived')+'</p>');
}
export function mountAccountAwards(container,{userId,isActive=()=>true}){
 const host=container.querySelector('#account-awards');if(!host)return;
 let closed=false,last='',state=null,selected='received',seriesView='current',offLanguage=()=>{};
 const valid=()=>!closed&&host.isConnected&&isActive();
 const dispose=()=>{closed=true;offLanguage();for(const e of ['salah:competition-updated','salah:counter-status','hashchange'])window.removeEventListener(e,updated);};
 const draw=()=>{
  if(!valid()){dispose();return;}const own=competitionOwn();if(!own?.awards)return;
  try{state=safeAwardState(own.awards);}catch{return;}const signature=JSON.stringify([state,selected,seriesView]);if(signature===last)return;last=signature;
  host.innerHTML=accountAwardsMarkup(state,{selected,seriesView});paintAccountLabels(host,state);host.querySelector('[data-award-help]').onclick=()=>{rankingModal('<div class="modal-head"><h2>'+uiLeaf('rankingUi.awardDaysTitle')+'</h2><button class="text-button" data-close>'+uiLeaf('common.close')+'</button></div><p>'+uiLeaf('rankingUi.awardDaysHelp')+'</p><p>'+uiLeaf('rankingUi.awardStreakHelp')+'</p><p class="muted">'+uiLeaf('rankingUi.awardTimezoneHelp')+'</p><button type="button" class="button secondary" id="series-animation-preview">'+uiLeaf('rankingUi.awardPreviewAnimation')+'</button>');document.getElementById('series-animation-preview').onclick=()=>{closeModal();showSeriesCelebration({from:state.streak.current,to:state.streak.current+1,color:seriesColor(state.streak.current+1),preview:true});};};
  host.querySelector('[data-series-switch]').onclick=()=>{seriesView=seriesView==='current'?'best':'current';draw();host.querySelector('[data-series-switch]').focus();};
  host.querySelector('[data-award-account-switch]').onclick=()=>{selected=selected==='received'?'missing':'received';draw();host.querySelector('[data-award-account-switch]').focus();};
  host.querySelectorAll('[data-award-kind]').forEach(b=>b.onclick=()=>showAwardDetail(state,b.dataset.awardKind,{isActive:valid}));
 };
 const updated=()=>{if(!valid()){dispose();return;}draw();};
 host.innerHTML='<p class="award-note" role="status">'+uiLeaf('rankingUi.awardLoading')+'</p>';
 offLanguage=subscribeLanguage(()=>{if(!closed&&host.isConnected)paintAccountLabels(host,state);});
 for(const e of ['salah:competition-updated','salah:counter-status','hashchange'])window.addEventListener(e,updated);
 draw();void refreshCompetitionOwn({force:true}).then(draw).catch(()=>{if(valid())host.innerHTML='<p class="award-note">'+uiLeaf('rankingUi.awardUnavailable')+'</p><button type="button" class="text-button" data-awards-retry>'+uiLeaf('rankingUi.awardRetry')+'</button>';const b=host.querySelector('[data-awards-retry]');if(b)b.onclick=()=>void refreshCompetitionOwn({force:true}).then(draw).catch(()=>toast(uiMessage('rankingUi.awardCheckConnection')));});
 return dispose;
}
function protectAwardDialog(isActive){
 const dialog=document.getElementById('modal'),check=()=>{if(!isActive())closeModal();};
 window.addEventListener('salah:counter-status',check);window.addEventListener('hashchange',check);
 dialog.addEventListener('close',()=>{window.removeEventListener('salah:counter-status',check);window.removeEventListener('hashchange',check);},{once:true});
}
export function showAwardCollection(state,{isActive=()=>true}={}){
 if(!isActive())return;let selected='received';const got=counts(state);
 const draw=()=>{
  rankingModal('<div class="award-collection award-fixed-header"><div class="modal-head"><h2 tabindex="-1" autofocus>'+uiLeaf('rankingUi.awardMy')+'</h2><button type="button" class="award-dialog-close" data-close '+uiAttribute('rankingUi.awardCloseAria')+'><img src="./assets/x-lg.svg" alt=""></button></div><div class="award-scroll-body"><div class="award-filter" role="group" '+uiAttribute('rankingUi.awardCollection')+'><button type="button" data-award-tab="received" aria-pressed="'+(selected==='received')+'">'+uiLeaf('rankingUi.awardReceived')+'</button><button type="button" data-award-tab="missing" aria-pressed="'+(selected==='missing')+'">'+uiLeaf('rankingUi.awardMissing')+'</button></div><div class="award-grid">'+QURAN_AWARDS.filter(a=>selected==='received'?got[a.kind]:!got[a.kind]).map(a=>'<button type="button" class="award-tile" data-award-kind="'+a.kind+'">'+emblem(a.kind,!got[a.kind])+'<strong>'+titleMarkup(a.kind)+'</strong><small>'+(got[a.kind]?(calendarAward(a.kind)?uiLeaf('rankingUi.awardWins',{count:got[a.kind]}):uiLeaf('rankingUi.awardEarned')):uiLeaf('rankingUi.awardAhead'))+'</small></button>').join('')+'</div>'+(selected==='received'&&!Object.values(got).some(Boolean)?'<p class="award-note">'+uiLeaf('rankingUi.awardCollectionEmpty')+'</p>':'')+'<p class="award-collection-note">'+uiLeaf('rankingUi.awardIntention')+'</p></div></div>',paintAwardFields);
  document.getElementById('modal').scrollTop=0;const root=document.getElementById('modal-content');root.querySelector('.modal-head h2')?.focus({preventScroll:true});root.querySelectorAll('[data-award-tab]').forEach(b=>b.onclick=()=>{if(isActive()){selected=b.dataset.awardTab;draw();}});
  root.querySelectorAll('[data-award-kind]').forEach(b=>b.onclick=()=>showAwardDetail(state,b.dataset.awardKind,{isActive}));
 };
 draw();protectAwardDialog(isActive);
}
export function showAwardDetail(state,kind,{isActive=()=>true}={}){
 if(!isActive())return;const a=awardInfo(kind);if(!a)return;const history=state.items.filter(x=>x.kind===kind).sort((a,b)=>b.end.localeCompare(a.end)||b.id.localeCompare(a.id));
 const note=history.length?(calendarAward(kind)?uiLeaf('rankingUi.awardWins',{count:state.historyCounts?.[kind]||history.length}):uiLeaf('rankingUi.awardObtained')):calendarAward(kind)?uiLeaf('rankingUi.awardPeriodEnds'):a.readingJuz?uiLeaf('rankingUi.awardJuzProgress',{count:state.learning.juz.length,total:a.readingJuz}):a.adhkarDays?uiLeaf('rankingUi.awardAdhkarProgress',{count:state.learning.adhkarDays,total:a.adhkarDays}):a.days?uiLeaf('rankingUi.awardStreakProgress',{count:a.days}):a.hours?'<span data-award-hours-progress="'+stored({kind,heard:state.listeningSeconds})+'">'+esc(hourProgress(state.listeningSeconds,kind))+'</span>':uiLeaf('rankingUi.awardFounderAvailable');
 rankingModal('<div class="award-collection award-fixed-header award-detail-dialog"><div class="modal-head"><button type="button" class="text-button" data-award-back>'+uiLeaf('rankingUi.awardAll')+'</button><button type="button" class="award-dialog-close" data-close '+uiAttribute('rankingUi.awardCloseAria')+'><img src="./assets/x-lg.svg" alt=""></button></div><div class="award-scroll-body"><div class="award-detail">'+emblem(kind,!history.length)+'<h3 tabindex="-1" autofocus>'+titleMarkup(kind)+'</h3><p data-award-rule="'+kind+'">'+esc(awardUiRule(kind))+'</p><p class="award-note">'+note+'</p>'+(history.length?'<button type="button" class="button secondary award-replay" data-award-celebrate="'+history[0].id+'">'+uiLeaf('rankingUi.awardWatchPresentation')+'</button>':'')+'</div>'+history.map(row=>'<button type="button" class="award-winner-entry" data-award-result="'+row.id+'">'+emblem(kind)+'<span>'+periodMarkup(row)+metricMarkup(row)+'</span></button>').join('')+'</div></div>',paintAwardFields);
 document.getElementById('modal').scrollTop=0;const root=document.getElementById('modal-content');root.querySelector('.award-detail h3')?.focus({preventScroll:true});root.querySelector('[data-award-back]').onclick=()=>showAwardCollection(state,{isActive});bindAwardReplay(root,history[0],{isActive,onClose:()=>showAwardDetail(state,kind,{isActive})});protectAwardDialog(isActive);
 root.querySelectorAll('[data-award-result]').forEach(b=>b.onclick=async()=>{if(!isActive())return;b.disabled=true;try{await refreshCompetitionOwn({force:true});if(!isActive())return;const current=safeAwardState(competitionOwn()?.awards),row=current.items.find(x=>x.id===b.dataset.awardResult);if(!row)throw Error('missing');await showWinnerCard({...row,listener:current.listener},{isActive,own:true});}catch{if(isActive())toast(uiMessage('rankingUi.awardCardOpenFailed'));}finally{if(b.isConnected)b.disabled=false;}});
}
function bindAwardReplay(root,row,{isActive,onClose}){
 const button=root.querySelector('[data-award-celebrate]');if(!button)return;
 const dialog=document.getElementById('modal'),stillOpen=()=>dialog.open&&button.isConnected;
 button.onclick=async()=>{if(button.disabled||!isActive()||!stillOpen())return;button.disabled=true;
  try{
   const shown=await showAwardCelebration(row,{isActive,canShow:stillOpen,onReady:closeModal,onClose});
   if(!shown&&isActive()&&stillOpen())toast(uiMessage('rankingUi.awardPresentationFailed'));
  }catch{if(isActive()&&stillOpen())toast(uiMessage('rankingUi.awardPresentationFailed'));}finally{if(button.isConnected)button.disabled=false;}
 };
}

export async function loadAwardWinners(){
 const response=await fetch(endpoint+'?winners=1',{headers:{apikey:OWNER_PUBLIC_KEY},credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('unavailable');const data=await response.json();if(!Array.isArray(data.items))throw Error('invalid');
 return data.items.map(safeAward).filter(a=>a&&a.listener);
}
export async function showAwardWinners({isActive=()=>true}={}){
 rankingModal('<div class="award-collection"><div class="modal-head"><h2>'+uiLeaf('rankingUi.historyTitleSalah')+'</h2><button class="text-button" data-close>'+uiLeaf('common.close')+'</button></div><p class="award-note" role="status">'+uiLeaf('rankingUi.historyLoading')+'</p></div>');
 const root=document.getElementById('modal-content'),current=root.firstElementChild;
 try{const rows=await loadAwardWinners();if(!isActive()||!current.isConnected)return;
  current.classList.add('award-fixed-header','award-history-dialog');
  current.innerHTML='<div class="modal-head"><h2>'+uiLeaf('rankingUi.historyTitle')+'</h2><button class="text-button" data-close>'+uiLeaf('common.close')+'</button></div><div class="award-scroll-body"><div data-award-history></div><p class="award-collection-note">'+uiLeaf('rankingUi.historyIntention')+'</p></div>';
  current.querySelector('[data-close]').onclick=closeModal;
  mountAwardHistory(current.querySelector('[data-award-history]'),rows,{isActive,onCard:async b=>{if(b.disabled)return;b.disabled=true;try{const fresh=(await loadAwardWinners()).find(x=>x.id===b.dataset.awardWinner);if(!current.isConnected||!isActive())return;if(!fresh)throw Error('hidden');await showWinnerCard(fresh,{isActive});}catch{if(current.isConnected)toast(uiMessage('rankingUi.historyCardUnavailable'));}finally{if(b.isConnected)b.disabled=false;}}});
 }catch{if(current.isConnected)current.innerHTML='<div class="modal-head"><h2>'+uiLeaf('rankingUi.historyTitleSalah')+'</h2><button class="text-button" data-close>'+uiLeaf('common.close')+'</button></div><p class="award-note">'+uiLeaf('rankingUi.historyLoadFailed')+'</p><button class="text-button" data-award-retry>'+uiLeaf('rankingUi.awardRetry')+'</button>';current.querySelector('[data-close]')?.addEventListener('click',closeModal);current.querySelector('[data-award-retry]')?.addEventListener('click',()=>void showAwardWinners({isActive}));}
}
const image=async(src)=>{const img=new Image();img.src=src;await img.decode();return img;};
const lines=(ctx,text,width)=>{const words=String(text).split(/\s+/),rows=[];let row='';for(const word of words){const next=row?row+' '+word:word;if(row&&ctx.measureText(next).width>width){rows.push(row);row=word;}else row=next;}if(row)rows.push(row);return rows;};
export async function renderWinnerCard(row){
 const a=awardInfo(row.kind),who=awardShareIdentity(row.listener),r=calendarAward(row.kind)?reciterInfo(row.reciter):null,canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d');
 // Export pixels retain their creation language. Locale changes update the
 // connected editor/ARIA and never regenerate the prepared image or its file.
 const text={title:awardUiTitle(row.kind,row),identity:awardUiIdentityLabel(row.listener),period:awardUiPeriod(row),metric:awardUiMetric(row),intention:t('rankingUi.awardExportIntention'),consistency:t('rankingUi.awardConsistency'),author:t('rankingUi.awardExportAuthor'),metricLabel:t(r?'rankingUi.awardExportFavourite':row.kind==='founder'?'rankingUi.awardExportFounder':a.readingJuz?'rankingUi.awardExportJuz':a.adhkarDays?'rankingUi.awardExportAdhkar':a.hours?'rankingUi.awardExportHours':'rankingUi.awardExportDays')};
 const [logo,icon,portrait]=await Promise.all([image('./favicon.svg'),image(awardArtwork(row.kind)),r?image(reciterImageUrl(r.portrait)).catch(()=>null):Promise.resolve(null)]);
 let face=null;if(who.photo&&who.id)try{const response=await fetch(competitionAvatar(who.id),{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(6000)});if(response.ok&&/^image\/jpeg/.test(response.headers.get('content-type')||'')){const blob=await response.blob();if(blob.size<=200000){const url=URL.createObjectURL(blob);try{face=await image(url);}finally{URL.revokeObjectURL(url);}}}}catch{}
 ctx.fillStyle='#0d1424';ctx.fillRect(0,0,1080,1920);ctx.strokeStyle=a.color;ctx.globalAlpha=.3;ctx.lineWidth=2;ctx.strokeRect(58,58,964,1804);ctx.globalAlpha=1;
 ctx.drawImage(logo,506,180,68,68);ctx.textAlign='center';ctx.fillStyle='#e7d5ae';ctx.font='72px Georgia, serif';ctx.fillText('SALAH',540,326);ctx.fillStyle=a.color;ctx.font='25px sans-serif';ctx.fillText(text.intention,540,379);
 if(r)ctx.drawImage(icon,490,455,100,100);ctx.fillStyle='#f4f0e5';ctx.font='bold 52px Georgia,serif';ctx.fillText(text.title,540,637);ctx.font='24px sans-serif';ctx.fillStyle='#a9b4c8';ctx.fillText(text.period,540,687);
 if(portrait){const x=380,y=748,w=320,h=370,scale=Math.max(w/portrait.naturalWidth,h/portrait.naturalHeight);ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,26);ctx.clip();ctx.drawImage(portrait,x+(w-portrait.naturalWidth*scale)/2,y+(h-portrait.naturalHeight*scale)/2,portrait.naturalWidth*scale,portrait.naturalHeight*scale);ctx.restore();}
 if(!r)ctx.drawImage(icon,335,730,410,410);ctx.fillStyle='#f4f0e5';ctx.font='30px sans-serif';let y=1168;for(const line of lines(ctx,r?r.name:text.consistency,820)){ctx.fillText(line,540,y);y+=42;}
 ctx.strokeStyle=a.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(540,1290,52,0,Math.PI*2);ctx.stroke();ctx.save();ctx.beginPath();ctx.arc(540,1290,46,0,Math.PI*2);ctx.clip();if(face){const k=Math.max(92/face.naturalWidth,92/face.naturalHeight);ctx.drawImage(face,540-face.naturalWidth*k/2,1290-face.naturalHeight*k/2,face.naturalWidth*k,face.naturalHeight*k);}else{ctx.fillStyle='#202c40';ctx.fillRect(488,1238,104,104);ctx.font='34px sans-serif';ctx.fillStyle=a.color;ctx.fillText(who.label==='Ник скрыт'?'С':String(row.listener?.initial||'С').slice(0,2),540,1302);}ctx.restore();
 ctx.fillStyle='#f4f0e5';ctx.font='bold 40px sans-serif';y=1410;for(const line of lines(ctx,text.identity,840)){ctx.fillText(line,540,y);y+=50;}
 ctx.fillStyle=a.color;ctx.font='bold 48px sans-serif';ctx.fillText(text.metric,540,1565);ctx.font='23px sans-serif';ctx.fillStyle='#a9b4c8';ctx.fillText(text.metricLabel,540,1612);
 ctx.font='30px sans-serif';ctx.fillStyle='#d8be88';ctx.fillText('Saadi Kobilov',540,1740);ctx.font='21px sans-serif';ctx.fillStyle='#a9b4c8';ctx.fillText(text.author,540,1778);return canvas;
}
const downloadAward=file=>{const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);};
export async function showWinnerCard(row,{isActive=()=>true,own=false}={}){
 if(!isActive())return;const paint=root=>{paintAwardFields(root);const canvas=root.querySelector('[data-award-preview] canvas');if(canvas)setUiAttribute(canvas,'aria-label','rankingUi.awardCardAria',{title:awardUiTitle(row.kind,row),name:awardUiIdentityLabel(row.listener)});};
 rankingModal('<div class="award-collection"><div class="modal-head"><h2>'+uiLeaf('rankingUi.awardWinnerCardTitle')+'</h2><button class="text-button" data-close>'+uiLeaf('common.close')+'</button></div><div data-award-preview></div><p class="award-note" data-award-status role="status">'+uiLeaf('rankingUi.awardCardPreparing')+'</p><div class="award-card-actions"><button class="button" data-award-share disabled>'+uiLeaf('rankingUi.awardShare')+'</button><button class="button secondary" data-award-save disabled>'+uiLeaf('rankingUi.awardSave')+'</button></div>'+(own?'<button type="button" class="button secondary award-replay" data-award-celebrate="'+row.id+'">'+uiLeaf('rankingUi.awardWatchPresentation')+'</button>':'')+'</div>',paint);
 const root=document.getElementById('modal-content'),preview=root.querySelector('[data-award-preview]'),line=root.querySelector('[data-award-status]'),send=root.querySelector('[data-award-share]'),save=root.querySelector('[data-award-save]');let file=null,valid=true;
 const revoke=()=>{valid=false;send.disabled=save.disabled=true;if(preview.isConnected)closeModal();};const checkAccount=()=>{if(!isActive())revoke();};
 window.addEventListener('salah:listener-visibility',revoke);window.addEventListener('salah:counter-status',checkAccount);document.getElementById('modal').addEventListener('close',()=>{valid=false;file=null;window.removeEventListener('salah:listener-visibility',revoke);window.removeEventListener('salah:counter-status',checkAccount);},{once:true});
 try{const canvas=await renderWinnerCard(row);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error()),'image/png'));if(!valid||!preview.isConnected||!isActive())return;file=new File([blob],'SALAH-'+row.kind+'-'+row.start+'.png',{type:'image/png'});canvas.className='award-card-preview';preview.replaceChildren(canvas);paint(root);setUiMessage(line,uiMessage('rankingUi.awardCardFormat'));send.disabled=save.disabled=false;}catch{if(line.isConnected)setUiMessage(line,uiMessage('rankingUi.awardCardCreateFailed'));}
 save.onclick=()=>{if(valid&&isActive()&&file)downloadAward(file);};
 send.onclick=async()=>{if(!valid||!isActive()||!file)return;try{if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'SALAH · '+awardUiTitle(row.kind,row)});else{downloadAward(file);toast(uiMessage('rankingUi.awardCardSaved'));}}catch(e){if(e.name!=='AbortError')toast(uiMessage('rankingUi.awardCardShareFailed'));}};
 if(own)bindAwardReplay(root,row,{isActive,onClose:()=>void showWinnerCard(row,{isActive,own})});
 protectAwardDialog(isActive);
}
