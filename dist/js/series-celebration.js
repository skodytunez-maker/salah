import{createSeriesCelebration,isQuranCelebrationRoute}from './series-celebration-core.js';
import{competitionOwn,syncCompetitionNow}from './competition-client.js';
import{personalListening}from './reciter-popularity.js';
import{listeningDayKey}from './reciter-popularity-core.js';
import{t,subscribeLanguage}from './i18n.js';
let started=false,layer=null,timer=null,offLanguage=()=>{};
export function hideSeriesCelebration(){offLanguage();offLanguage=()=>{};clearTimeout(timer);timer=null;const present=layer;layer?.remove();layer=null;if(present)window.dispatchEvent(new window.Event('salah:award-presentation-ended'));}
export function showSeriesCelebration(event){
 hideSeriesCelebration();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 layer=document.createElement('div');layer.className='series-celebration'+(reduced?' series-celebration-reduced':'');layer.style.setProperty('--series-color',event.color);layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');
 const content=document.createElement('div');content.className='series-celebration-content';
 const heading=document.createElement('p');heading.className='series-celebration-heading';
 const digits=document.createElement('div');digits.className='series-celebration-digits';digits.setAttribute('aria-hidden','true');
 const previous=document.createElement('span');previous.className='series-celebration-old';previous.textContent=String(event.from);
 const next=document.createElement('span');next.className='series-celebration-new';next.textContent=String(event.to);digits.append(previous,next);
 const caption=document.createElement('p');caption.className='series-celebration-caption';
 const root=layer,paint=()=>{root.setAttribute('aria-label',t('rankingUi.celebrationStreakAria',{count:event.to}));heading.textContent=t(event.preview?'rankingUi.celebrationPreview':'rankingUi.awardEveryDay');caption.textContent=t(event.preview?'rankingUi.celebrationPreviewNote':'rankingUi.celebrationStreakCaption',{count:event.to});};paint();
 content.append(heading,digits,caption);layer.append(content);document.body.append(layer);offLanguage=subscribeLanguage(paint);
 timer=setTimeout(()=>{if(layer){layer.classList.add('series-celebration-ending');timer=setTimeout(hideSeriesCelebration,reduced?1:320);}},reduced?1400:2300);
}
export function initSeriesCelebration({getAccount}){
 if(started)return;started=true;const engine=createSeriesCelebration({storage:localStorage,getUser:getAccount,getOwn:()=>competitionOwn()?.awards,getLocalDay:()=>{const day=listeningDayKey(Date.now()),values=personalListening().days?.[day]||{};return{day,seconds:Object.values(values).reduce((n,s)=>n+(Number.isFinite(s)?s:0),0)};},isVisible:()=>isQuranCelebrationRoute(location.hash)&&!document.hidden&&!document.getElementById('modal')?.open&&!document.querySelector('.founder-welcome'),show:showSeriesCelebration});
 let scope=getAccount()?.userId||null;
 const auth=()=>{const id=getAccount()?.signedIn?getAccount().userId:null;if(scope!==id){hideSeriesCelebration();engine.reset();scope=id;}engine.observe();};
 window.addEventListener('salah:counter-status',auth);window.addEventListener('salah:competition-updated',()=>engine.observe());
 window.addEventListener('salah:personal-listening-progress',()=>{if(isQuranCelebrationRoute(location.hash)&&engine.progress())void syncCompetitionNow(true);});
 window.addEventListener('hashchange',()=>{if(!isQuranCelebrationRoute(location.hash)){hideSeriesCelebration();engine.cancelPending();}engine.observe();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hideSeriesCelebration();else engine.observe();});
 document.getElementById('modal')?.addEventListener('close',()=>engine.observe());engine.observe();
}
