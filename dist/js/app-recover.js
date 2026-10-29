// Independent of app.js: release 418 cannot link its main module or run its updater.
(() => {
 const minimumVersion=419,button=document.getElementById('repair-app'),status=document.getElementById('repair-status');
 function releaseOf(worker){
  return new Promise(resolve=>{
   let channel,finished=false;
   const done=value=>{if(finished)return;finished=true;clearTimeout(timer);channel?.port1.close();resolve(value);};
   const timer=setTimeout(()=>done(null),2000);
   try{channel=new MessageChannel();channel.port1.onmessage=event=>done(event.data);worker.postMessage({type:'SALAH_RELEASE_INFO'},[channel.port2]);}catch{done(null);}
  });
 }
 function correctedWorker(registration){
  return new Promise((resolve,reject)=>{
   const watched=new Map(),checking=new WeakSet();
   const cleanup=()=>{clearTimeout(timer);registration.removeEventListener('updatefound',changed);for(const[worker,listener]of watched)worker.removeEventListener('statechange',listener);};
   const timer=setTimeout(()=>{cleanup();reject(Error('update_timeout'));},30000);
   const inspect=async worker=>{
    if(!worker||checking.has(worker)||!['installed','activating','activated'].includes(worker.state))return;
    checking.add(worker);const release=await releaseOf(worker);
    if(Number.isSafeInteger(release?.version)&&release.version>=minimumVersion&&worker.state!=='redundant'){cleanup();resolve(worker);}
   };
   const changed=()=>{for(const worker of [registration.waiting,registration.installing,registration.active]){
    if(!worker)continue;
    if(!watched.has(worker)){const listener=()=>void inspect(worker);watched.set(worker,listener);worker.addEventListener('statechange',listener);}
    void inspect(worker);
   }};
   registration.addEventListener('updatefound',changed);changed();
  });
 }
 function activate(worker){
  if(worker.state==='activated')return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const done=error=>{clearTimeout(timer);worker.removeEventListener('statechange',changed);error?reject(error):resolve();};
   const changed=()=>{if(worker.state==='activated')done();else if(worker.state==='redundant')done(Error('update_replaced'));};
   const timer=setTimeout(()=>done(Error('activation_timeout')),15000);
   worker.addEventListener('statechange',changed);
   try{worker.postMessage({type:'SALAH_APPLY_UPDATE'});changed();}catch(error){done(error);}
  });
 }
 button.onclick=async()=>{
  if(button.disabled)return;button.disabled=true;status.textContent='Загружаем исправление…';
  try{
   if(navigator.onLine===false)throw Error('offline');
   if('serviceWorker' in navigator){
    const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    await registration.update();
    const worker=await correctedWorker(registration);await activate(worker);
   }
   status.textContent='Готово. Открываем SALAH…';location.replace('./#home');
  }catch{status.textContent='Не удалось загрузить исправление. Проверьте интернет и нажмите ещё раз.';button.disabled=false;}
 };
})();
