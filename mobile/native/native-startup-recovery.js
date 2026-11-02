async function salahNativeStartupRecovery({origin,versionCode,webVersion},env=globalThis){
 if(env.location.origin!==origin||!Number.isSafeInteger(versionCode)||!Number.isSafeInteger(webVersion))return false;
 env.__SALAH_NATIVE_BOOT__=Object.freeze({versionCode,webVersion});
 // The APK and its verified web bundle already provide offline assets. An old
 // browser worker at localhost must not substitute a previous app shell.
 const workers=env.navigator.serviceWorker;
 if(!workers)return false;
 const registrations=await workers.getRegistrations().catch(()=>[]);
 const local=registrations.filter(registration=>{
  try{return new URL(registration.scope).origin===origin;}catch{return false;}
 });
 const controlled=Boolean(workers.controller);
 if(!local.length&&!controlled)return false;
 const removed=await Promise.all(local.map(registration=>registration.unregister().catch(()=>false)));
 if(removed.some(value=>value!==true))return false;
 // Keep storage, account credentials, Quran downloads and the current route.
 // Native code runs this recovery once per Activity; it cannot reload in a loop.
 env.location.replace(env.location.href);
 return true;
}
