import {APP_VERSION,APP_UPDATED_AT,APP_CHANGES} from './app-release.js';
import {esc,modal} from './ui.js';
let manualCheck=null;
const CHECK_INTERVAL=5*60*1000;
const SEEN_KEY='salah:update-last-seen-v1';
const currentRelease={version:APP_VERSION,date:APP_UPDATED_AT,changes:APP_CHANGES};
export function releaseDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value)).replace(/ г\.$/,''):'';}
export function validatedRelease(value){
 if(!value||!Number.isSafeInteger(value.version)||value.version<1||!releaseDate(value.date)||!Array.isArray(value.changes))return null;
 const changes=value.changes.filter(x=>typeof x==='string'&&x.trim()&&x.length<=240).slice(0,8);
 return changes.length?{version:value.version,date:value.date,changes}:null;
}
function acknowledge(){try{localStorage.setItem(SEEN_KEY,String(APP_VERSION));}catch{}}
function hasSeen(){try{return localStorage.getItem(SEEN_KEY)===String(APP_VERSION);}catch{return true;}}
export function showAppRelease(release=currentRelease,{available=false}={}){
 const safe=validatedRelease(release)||(available?{version:0,date:'',changes:['Улучшения SALAH. Подробности появятся после обновления.']}:currentRelease);
 modal('<div class="release-dialog"><span class="eyebrow">SALAH · '+esc(releaseDate(safe.date))+'</span><h2>'+(available?'Что изменится':'Что нового')+'</h2><ul>'+safe.changes.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><button class="button secondary" type="button" data-close>Понятно</button></div>');
 if(!available)acknowledge();
}
export async function checkAppUpdate(){return manualCheck?manualCheck(true):'unavailable';}
export async function registerAppWorker({toast=()=>{},canShowRelease=()=>true,showRelease=showAppRelease}={}) {
 if(!('serviceWorker' in navigator))return;
 manualCheck=null;
 let requested=false,reloaded=false,banner=null,lastCheck=0,checking=null,checkTimer=null,offerWorker=null,dismissedWorker=null;
 const startedAt=Date.now();let startupUntouched=true;
 const cancelStartup=()=>{startupUntouched=false};
 const inputs=['pointerdown','touchstart','keydown'];
 inputs.forEach(type=>document.addEventListener(type,cancelStartup,{capture:true,passive:true}));
 window.addEventListener('hashchange',cancelStartup);
 const finishStartup=()=>{startupUntouched=false;inputs.forEach(type=>document.removeEventListener(type,cancelStartup,true));window.removeEventListener('hashchange',cancelStartup)};
 const watched=new WeakSet();
 const clearBanner=()=>{banner?.remove();banner=null;};
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(requested&&!reloaded){reloaded=true;location.reload();}
  else if(offerWorker){clearBanner();offerWorker=null;toast('Обновление установлено.');}
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
   if(available){const button=document.createElement('button');button.type='button';button.textContent='Обновить';button.onclick=()=>{requested=true;button.disabled=true;if(registration.waiting)registration.waiting.postMessage({type:'SALAH_APPLY_UPDATE'});else location.reload();};actions.append(button);}
   const close=document.createElement('button');close.type='button';close.className='app-update-dismiss';close.textContent='×';close.setAttribute('aria-label',available?'Напомнить об обновлении при следующем запуске':'Закрыть уведомление об обновлении');close.onclick=()=>{if(available)dismissedWorker=registration.waiting;else acknowledge();clearBanner();};actions.append(close);banner.append(copy,actions);document.body.append(banner);
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
   if(registration.waiting!==worker||requested||dismissedWorker===worker&&!force)return;
   makeBanner({release:release||{version:APP_VERSION+1,date:'',changes:['Улучшения SALAH. Подробности появятся после обновления.']},available:true});
  }
  function watch(worker){if(!worker||watched.has(worker))return;watched.add(worker);worker.addEventListener('statechange',()=>{if(worker.state==='installed')void offer();});if(worker.state==='installed')void offer();}
  // Apply already downloaded updates only before the user starts interacting.
  if(registration.waiting&&navigator.serviceWorker.controller&&startupUntouched&&document.visibilityState==='visible'&&Date.now()-startedAt<1000){try{requested=true;registration.waiting.postMessage({type:'SALAH_APPLY_UPDATE'});}catch{requested=false}}
  const quietStartup=startupUntouched&&document.visibilityState==='visible'&&Date.now()-startedAt<1000&&!document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
  finishStartup();watch(registration.installing);
  if(!requested){if(registration.waiting)void offer();else if(!hasSeen()){
   // Show the installed release once; never replace an open form or dialog.
   if(quietStartup&&canShowRelease()&&!document.getElementById?.('modal')?.open){showRelease(currentRelease);acknowledge();}else makeBanner();
  }}
  registration.addEventListener('updatefound',()=>watch(registration.installing));
  async function check(force=false){
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
  const resume=()=>{if(checkTimer!==null)clearInterval(checkTimer);checkTimer=null;if(document.visibilityState!=='visible')return;void check().catch(()=>{});checkTimer=setInterval(()=>void check().catch(()=>{}),CHECK_INTERVAL);};
  document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);resume();return registration;
 }catch{toast('Офлайн-режим пока недоступен.');}finally{finishStartup()}
}
