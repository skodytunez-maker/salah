let manualCheck=null;
const CHECK_INTERVAL=5*60*1000;

export async function checkAppUpdate(){
 return manualCheck?manualCheck(true):'unavailable';
}

export async function registerAppWorker({toast=()=>{}}={}) {
 if (!('serviceWorker' in navigator)) return;
 manualCheck=null;
 let requested=false,reloaded=false,banner=null,lastCheck=Date.now(),checking=null;
 const startedAt=Date.now();let startupUntouched=true;
 const cancelStartup=()=>{startupUntouched=false};
 const inputs=['pointerdown','touchstart','keydown'];
 inputs.forEach(type=>document.addEventListener(type,cancelStartup,{capture:true,passive:true}));
 window.addEventListener('hashchange',cancelStartup);
 const finishStartup=()=>{startupUntouched=false;inputs.forEach(type=>document.removeEventListener(type,cancelStartup,true));window.removeEventListener('hashchange',cancelStartup)};
 const watched=new WeakSet();
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(requested&&!reloaded){reloaded=true;location.reload();}
  else if(banner){banner.remove();banner=null;}
 });
 try {
  const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
  function offer(){
   if(requested||!registration.waiting||!navigator.serviceWorker.controller||banner)return;
   banner=document.createElement('div');banner.className='app-update';banner.setAttribute('role','status');
   const text=document.createElement('span');text.textContent='Новая версия SALAH';
   const button=document.createElement('button');button.type='button';button.textContent='Обновить';
   button.onclick=()=>{requested=true;button.disabled=true;if(registration.waiting)registration.waiting.postMessage({type:'SALAH_APPLY_UPDATE'});else location.reload()};
   banner.append(text,button);document.body.append(banner);
  }
  function watch(worker){
   if(!worker||watched.has(worker))return;
   watched.add(worker);
   worker.addEventListener('statechange',()=>{if(worker.state==='installed')offer()});
   if(worker.state==='installed')offer();
  }
  // register() can resolve after updatefound has already fired.
  // A previously downloaded update is applied at a fresh launch only.
  // New downloads during reading wait for the next launch or the manual button.
  if(registration.waiting&&navigator.serviceWorker.controller&&startupUntouched&&document.visibilityState==='visible'&&Date.now()-startedAt<1000){
   try{requested=true;registration.waiting.postMessage({type:'SALAH_APPLY_UPDATE'});}catch{requested=false}
  }
  finishStartup();
  watch(registration.installing);if(!requested)offer();
  registration.addEventListener('updatefound',()=>watch(registration.installing));
  async function check(force=false){
   offer();
   if(registration.waiting&&navigator.serviceWorker.controller)return 'available';
   if(registration.installing){watch(registration.installing);return 'loading';}
   if(checking)return checking;
   if(navigator.onLine===false)return 'offline';
   const gap=Date.now()-lastCheck;
   if(!force&&gap>=0&&gap<CHECK_INTERVAL)return 'current';
   lastCheck=Date.now();
   checking=(async()=>{
    await registration.update();
    watch(registration.installing);offer();
    return registration.waiting&&navigator.serviceWorker.controller?'available':registration.installing?'loading':'current';
   })();
   try{return await checking;}finally{checking=null;}
  }
  manualCheck=check;
  const resume=()=>{if(document.visibilityState==='visible')check().catch(()=>{});};
  document.addEventListener('visibilitychange',resume);
  window.addEventListener('online',resume);
  return registration;
 }catch{toast('Офлайн-режим пока недоступен.')}finally{finishStartup()}
}
