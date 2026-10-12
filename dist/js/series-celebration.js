import{createSeriesCelebration}from './series-celebration-core.js';
import{competitionOwn}from './competition-client.js';
import{personalListening}from './reciter-popularity.js';
import{listeningDayKey}from './reciter-popularity-core.js';
import{dayCountLabel}from './quran-awards-core.js';
let started=false,layer=null,timer=null;
export function hideSeriesCelebration(){clearTimeout(timer);timer=null;layer?.remove();layer=null;}
export function showSeriesCelebration(event){
 hideSeriesCelebration();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 layer=document.createElement('div');layer.className='series-celebration'+(reduced?' series-celebration-reduced':'');layer.style.setProperty('--series-color',event.color);layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');layer.setAttribute('aria-label',event.to+' '+dayCountLabel(event.to)+' в серии');
 const content=document.createElement('div');content.className='series-celebration-content';
 const heading=document.createElement('p');heading.textContent=event.preview?'Предпросмотр анимации':'С Кораном каждый день';heading.className='series-celebration-heading';
 const digits=document.createElement('div');digits.className='series-celebration-digits';digits.setAttribute('aria-hidden','true');
 const previous=document.createElement('span');previous.className='series-celebration-old';previous.textContent=String(event.from);
 const next=document.createElement('span');next.className='series-celebration-new';next.textContent=String(event.to);digits.append(previous,next);
 const caption=document.createElement('p');caption.className='series-celebration-caption';caption.textContent=event.preview?'Счётчик не меняется':dayCountLabel(event.to)+' в серии';
 content.append(heading,digits,caption);layer.append(content);document.body.append(layer);
 timer=setTimeout(()=>{if(layer){layer.classList.add('series-celebration-ending');timer=setTimeout(hideSeriesCelebration,reduced?1:320);}},reduced?1400:2300);
}
export function initSeriesCelebration({getAccount}){
 if(started)return;started=true;const engine=createSeriesCelebration({storage:localStorage,getUser:getAccount,getOwn:()=>competitionOwn()?.awards,getLocalDay:()=>{const day=listeningDayKey(Date.now()),values=personalListening().days?.[day]||{};return{day,seconds:Object.values(values).reduce((n,s)=>n+(Number.isFinite(s)?s:0),0)};},isVisible:()=>!document.hidden&&!document.getElementById('modal')?.open,show:showSeriesCelebration});
 let scope=getAccount()?.userId||null;
 const auth=()=>{const id=getAccount()?.signedIn?getAccount().userId:null;if(scope!==id){hideSeriesCelebration();engine.reset();scope=id;}engine.observe();};
 window.addEventListener('salah:counter-status',auth);window.addEventListener('salah:competition-updated',()=>engine.observe());
 window.addEventListener('salah:personal-listening-progress',()=>engine.progress());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hideSeriesCelebration();else engine.observe();});
 document.getElementById('modal')?.addEventListener('close',()=>engine.observe());engine.observe();
}
