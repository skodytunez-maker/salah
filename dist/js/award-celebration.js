import{safeAward,awardInfo,awardArtwork,awardPeriod,awardMetric}from './quran-awards-core.js';
import{createAwardPresentations}from './award-celebration-core.js';
import{competitionOwn}from './competition-client.js';
import{settings}from './storage.js';
let layer=null,started=false;
export const awardReducedMotion=()=>settings.motion||settings.transitions===false||matchMedia('(prefers-reduced-motion: reduce)').matches;
export function hideAwardCelebration(reason='dismissed'){layer?.finish(reason);}
export async function showAwardCelebration(value,{isActive=()=>true,canShow=()=>true,onReady=()=>{},onClose=()=>{},reduced=awardReducedMotion()}={}){
 const row=safeAward(value);if(!row||!isActive()||layer)return null;
 const picture=new Image();picture.src=awardArtwork(row.kind);let loadTimer;
 try{await Promise.race([picture.decode(),new Promise((_,reject)=>{loadTimer=setTimeout(()=>reject(Error('award_image_timeout')),6000);})]);}catch{return null;}finally{clearTimeout(loadTimer);}
 if(!isActive()||!canShow()||layer||document.hidden)return null;
 const info=awardInfo(row.kind),previous=document.activeElement,root=document.createElement('div');
 root.className='founder-welcome award-presentation'+(reduced?' founder-welcome-reduced':'');root.style.setProperty('--award-color',info.color);root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Вручение награды · '+info.title);root.tabIndex=-1;
 root.innerHTML='<div class="founder-welcome-content award-presentation-content"><span class="award-presentation-eyebrow">НАГРАДА SALAH</span><div class="founder-medal-light award-presentation-medal" aria-hidden="true"><span class="award-presentation-orbit"></span></div><h2></h2><p class="award-presentation-period"></p><p class="award-presentation-metric"></p><button type="button" class="founder-welcome-close">Спасибо</button></div>';
 root.querySelector('.award-presentation-medal').append(picture);root.querySelector('h2').textContent=info.title;root.querySelector('.award-presentation-period').textContent=awardPeriod(row);root.querySelector('.award-presentation-metric').textContent=awardMetric(row);
 const button=root.querySelector('button'),background=[],timers=[];let closed=false,removed=false;
 const check=()=>{if(!isActive()||document.hidden)finish('inactive');};
 const key=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish('dismissed');}else if(event.key==='Tab'){event.preventDefault();button.focus();}};
 const remove=reason=>{if(removed)return;removed=true;timers.forEach(clearTimeout);root.remove();for(const [element,inert]of background)if(element.isConnected)element.inert=inert;if(layer?.root===root)layer=null;window.removeEventListener('hashchange',check);window.removeEventListener('salah:counter-status',check);document.removeEventListener('visibilitychange',check);window.dispatchEvent(new window.Event('salah:award-presentation-ended'));if(reason!=='inactive'&&isActive()){onClose();if(previous?.isConnected&&!previous.closest('[inert]'))previous.focus?.();}};
 const finish=reason=>{
  if(closed){if(reason==='inactive')remove(reason);return;}closed=true;timers.forEach(clearTimeout);document.removeEventListener('keydown',key,true);
  if(reason==='inactive'||reduced){remove(reason);return;}root.classList.add('founder-welcome-ending');timers.push(setTimeout(()=>remove(reason),420));
 };
 onReady();if(!isActive())return null;
 for(const element of document.body.children)if(!['SCRIPT','STYLE','LINK'].includes(element.tagName)){background.push([element,element.inert]);element.inert=true;}
 layer={root,finish};document.body.append(root);button.onclick=()=>finish('dismissed');button.focus();document.addEventListener('keydown',key,true);window.addEventListener('hashchange',check);window.addEventListener('salah:counter-status',check);document.addEventListener('visibilitychange',check);timers.push(setTimeout(()=>finish('finished'),15000));return root;
}
export function initAwardCelebrations({getAccount,canShow=()=>true,playback}){
 if(started)return;started=true;let timer=null,scope=getAccount()?.userId||null;
 const permitted=()=>getAccount()?.signedIn&&!document.hidden&&location.hash.split('?')[0]==='#home'&&!document.getElementById('modal')?.open&&!document.querySelector('.founder-welcome,.series-celebration,.friend-invite-dialog')&&canShow();
 const engine=createAwardPresentations({storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},getAccount,getAwards:()=>competitionOwn()?.awards,canShow:permitted,show:(row,{isActive})=>showAwardCelebration(row,{isActive:()=>isActive()&&!document.hidden&&location.hash.split('?')[0]==='#home',canShow:permitted})});
 const schedule=()=>{clearTimeout(timer);const id=getAccount()?.signedIn?getAccount().userId:null;if(id!==scope){scope=id;hideAwardCelebration('inactive');engine.reset();}if(document.hidden||!canShow()||location.hash.split('?')[0]!=='#home')hideAwardCelebration('inactive');timer=setTimeout(()=>void engine.observe(),700);};
 for(const event of ['hashchange','online','salah:counter-status','salah:competition-updated','salah:release-dismissed','salah:award-presentation-ended'])window.addEventListener(event,schedule);
 document.addEventListener('visibilitychange',schedule);document.getElementById('modal')?.addEventListener('close',schedule);playback?.subscribe?.(schedule);schedule();
}
