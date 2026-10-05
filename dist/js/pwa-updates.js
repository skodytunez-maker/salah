import {APP_VERSION,APP_UPDATED_AT,APP_CHANGES,APP_ANNOUNCEMENT} from './app-release.js';
import {esc,modal} from './ui.js';
let manualCheck=null;
const CHECK_INTERVAL=5*60*1000;
const LEGACY_SEEN_KEY='salah:update-last-seen-v1';
const SEEN_KEY='salah:update-announcement-seen-v2';
const SOFT_RELOAD_KEY='salah:update-reload-transition-v1';
let reloadInProgress=false,restoreTransition=false;
try{restoreTransition=sessionStorage.getItem(SOFT_RELOAD_KEY)==='1';if(restoreTransition){sessionStorage.removeItem(SOFT_RELOAD_KEY);document.documentElement.classList.add('salah-update-restoring');}}catch{}
export function finishAppUpdateTransition(){if(!restoreTransition)return;restoreTransition=false;const root=document.documentElement;requestAnimationFrame(()=>{root.classList.add('salah-update-restoring-done');setTimeout(()=>root.classList.remove('salah-update-restoring','salah-update-restoring-done'),360);});}
async function reloadAfterUpdate(){if(reloadInProgress)return;reloadInProgress=true;if(!document.documentElement?.classList||typeof requestAnimationFrame!=='function'){location.reload();return}const root=document.documentElement;root.classList.add('salah-update-leaving');requestAnimationFrame(()=>root.classList.add('salah-update-leaving-active'));await new Promise(resolve=>setTimeout(resolve,360));try{sessionStorage.setItem(SOFT_RELOAD_KEY,'1')}catch{}location.reload();}

export function publicReleaseChanges(changes){return Array.isArray(changes)?changes.filter(x=>typeof x==='string'&&x.trim()&&x.length<=240&&!/владел|админ|owner|admin/iu.test(x)).slice(0,8):[];}
const currentRelease={version:APP_VERSION,date:APP_UPDATED_AT,changes:publicReleaseChanges(APP_CHANGES),announcement:APP_ANNOUNCEMENT};
export function releaseDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value)).replace(/ г\.$/,''):'';}
export function validatedRelease(value){
 if(!value||!Number.isSafeInteger(value.version)||value.version<1||!releaseDate(value.date)||!Array.isArray(value.changes))return null;
 const changes=publicReleaseChanges(value.changes);
 const announcement=value.announcement&&value.announcement.version<=value.version?validatedRelease({...value.announcement,announcement:null}):null;
 return changes.length?{version:value.version,date:value.date,changes,...(announcement?{announcement}:{})}:null;
}
function acknowledge(release=APP_ANNOUNCEMENT){try{localStorage.setItem(SEEN_KEY,String(Math.max(Number(localStorage.getItem(SEEN_KEY))||0,release.version)));}catch{}}
export function hasSeenAnnouncement(release=APP_ANNOUNCEMENT){try{return Math.max(Number(localStorage.getItem(SEEN_KEY))||0,Number(localStorage.getItem(LEGACY_SEEN_KEY))||0)>=release.version;}catch{return true;}}
export function showAppRelease(release=APP_ANNOUNCEMENT,{available=false,acknowledgeAnnouncement=true,onClose=null}={}){
 const safe=validatedRelease(release)||(available?{version:0,date:'',changes:['Улучшения SALAH. Подробности появятся после обновления.']}:APP_ANNOUNCEMENT);
 modal('<div class="release-dialog"><span class="eyebrow">SALAH · '+esc(releaseDate(safe.date))+'</span><h2 tabindex="-1" autofocus>'+(available?'Что изменится':'Что нового')+'</h2><ul>'+safe.changes.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><button class="button secondary" type="button" data-close>Понятно</button></div>');
 if(typeof onClose==='function'){const dialog=document.getElementById('modal'),closed=()=>onClose();dialog.addEventListener('close',closed,{once:true});}
 if(!available&&acknowledgeAnnouncement)acknowledge(safe);
}
export async function checkAppUpdate(){return manualCheck?manualCheck(true):'unavailable';}
export async function registerAppWorker({toast=()=>{},canShowRelease=()=>true,canAutoUpdate=()=>true,showRelease=showAppRelease}={}) {
 if(!('serviceWorker' in navigator))return;
 manualCheck=null;
 let requested=false,reloaded=false,banner=null,lastCheck=0,checking=null,checkTimer=null,offerWorker=null,dismissedWorker=null;
 const startedAt=Date.now();let startupUntouched=true,lastInteraction=-Infinity;
 const cancelStartup=()=>{startupUntouched=false;lastInteraction=Date.now()};
 const inputs=['pointerdown','touchstart','keydown'];
 inputs.forEach(type=>document.addEventListener(type,cancelStartup,{capture:true,passive:true}));
 window.addEventListener('hashchange',cancelStartup);
 const finishStartup=()=>{startupUntouched=false};
 const watched=new WeakSet();
 const clearBanner=()=>{banner?.remove();banner=null;};
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(requested&&!reloaded){reloaded=true;void reloadAfterUpdate();}
  else if(offerWorker){const announced=Boolean(banner);clearBanner();offerWorker=null;if(announced)toast('Обновление установлено.');}
 });
 try {
  const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
  function makeBanner({release=currentRelease,available=false}={}){
   clearBanner();banner=document.createElement('aside');banner.className='app-update';banner.setAttribute('role','status');banner.setAttribute('aria-label',available?'Обновление SALAH':'SALAH обновлён');
   const copy=document.createElement('div');copy.className='app-update-copy';
   const title=document.createElement('strong');title.textContent=available?'Новая версия SALAH':'SALAH обновлён';
   const detail=document.createElement('button');detail.type='button';detail.className='app-update-details';detail.textContent=releaseDate(release.date)?releaseDate(release.date)+' · Что нового':'Посмотреть изменения';
   detail.onclick=()=>{showAppRelease(release,{available});if(!available)clearBanner();};copy.append(title,detail);
   const actions=document.createElement('div');actions.className='app-update-actions';
   if(available){const button=document.createElement('button');button.type='button';button.textContent='Обновить';button.onclick=()=>{requested=true;button.disabled=true;if(registration.waiting)registration.waiting.postMessage({type:'SALAH_APPLY_UPDATE'});else void reloadAfterUpdate();};actions.append(button);}
   const close=document.createElement('button');close.type='button';close.className='app-update-dismiss';close.textContent='×';close.setAttribute('aria-label','Закрыть уведомление об обновлении');close.onclick=()=>{if(available)dismissedWorker=registration.waiting;acknowledge(release.announcement||release);clearBanner();};actions.append(close);banner.append(copy,actions);document.body.append(banner);
  }
  async function offer(force=false){
   const worker=registration.waiting;
   if(requested||!worker||!navigator.serviceWorker.controller||(!force&&dismissedWorker===worker)||offerWorker===worker&&banner)return;
   offerWorker=worker;
   // Ask the waiting worker: an older offline shell must not label a new release with its own date.
   const release=await new Promise(resolve=>{
    let settled=false,channel;
    const done=value=>{if(settled)return;settled=true;clearTimeout(timer);channel?.port1.close();resolve(validatedRelease(value));};
    const timer=setTimeout(()=>done(null),1500);
    try{channel=new MessageChannel();channel.port1.onmessage=event=>done(event.data);worker.postMessage({type:'SALAH_RELEASE_INFO'},[channel.port2]);}catch{done(null);}
   });
   if(registration.waiting!==worker||requested||dismissedWorker===worker&&!force||offerWorker===worker&&banner)return;
   if(!force&&(!release?.announcement||hasSeenAnnouncement(release.announcement)))return;
   makeBanner({release:(!force?release.announcement:release)||{version:APP_VERSION+1,date:'',changes:['Улучшения SALAH. Подробности появятся после обновления.']},available:true});
  }
  function applyAutomatically(){
   if(requested||!registration.waiting||!navigator.serviceWorker.controller||document.visibilityState!=='visible'||Date.now()-lastInteraction<5000||document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]')||document.querySelector?.('dialog[open]')||!canAutoUpdate())return false;
   try{requested=true;registration.waiting.postMessage({type:'SALAH_APPLY_UPDATE'});return true;}catch{requested=false;return false;}
  }
  function watch(worker){if(!worker||watched.has(worker))return;watched.add(worker);worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&!applyAutomatically())void offer();});if(worker.state==='installed'&&!applyAutomatically())void offer();}
  // A downloaded update can activate later too, once the app is at a safe resting screen.
  applyAutomatically();
  const quietStartup=startupUntouched&&document.visibilityState==='visible'&&Date.now()-startedAt<1000&&!document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
  finishStartup();watch(registration.installing);
  if(!requested){if(registration.waiting)void offer();else if(!hasSeenAnnouncement()){
   // Show the installed release once; never replace an open form or dialog.
   if(quietStartup&&canShowRelease()&&!document.getElementById?.('modal')?.open){showRelease(APP_ANNOUNCEMENT);acknowledge();}else if(canShowRelease())makeBanner({release:APP_ANNOUNCEMENT});
  }}
  registration.addEventListener('updatefound',()=>watch(registration.installing));
  async function check(force=false){
   if(!force&&applyAutomatically())return 'loading';
   void offer(force);
   if(registration.waiting&&navigator.serviceWorker.controller)return 'available';
   if(registration.installing){watch(registration.installing);return 'loading';}
   if(checking)return checking;
   if(navigator.onLine===false)return 'offline';
   const gap=Date.now()-lastCheck;if(!force&&gap>=0&&gap<CHECK_INTERVAL)return 'current';lastCheck=Date.now();
   checking=(async()=>{await registration.update();watch(registration.installing);void offer(force);return registration.waiting&&navigator.serviceWorker.controller?'available':registration.installing?'loading':'current';})();
   try{return await checking;}finally{checking=null;}
  }
  manualCheck=check;
  const resume=()=>{if(checkTimer!==null)clearInterval(checkTimer);checkTimer=null;if(document.visibilityState!=='visible')return;void check().catch(()=>{});checkTimer=setInterval(()=>{if(!applyAutomatically())void check().catch(()=>{});},5000);};
  document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);resume();return registration;
 }catch{toast('Офлайн-режим пока недоступен.');}finally{finishStartup()}
}
