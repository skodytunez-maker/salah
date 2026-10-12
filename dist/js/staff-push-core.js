const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createStaffPushClient({getUserId,request,platform,provider,readDevice,writeDevice,workerAccount=async()=>{}}){
 let revision=0,actor=null,state={enabled:false,supported:true},busy=null;const listeners=new Set();
 const paint=value=>{state=value;for(const fn of listeners)fn(state);};
 const current=(version,user)=>revision===version&&getUserId()===user;
 function scope(){const user=getUserId();if(user!==actor){revision++;actor=user;void workerAccount(null).catch(()=>{});paint({enabled:false,supported:true});}return user;}
 async function device(user){if(platform==='android'){const status=await provider.status();if(!status.staffMessages)throw Error('Обновите Android-приложение для уведомлений команды.');if(!status.staffEnabled)return null;return(await provider.registration(user)).device;}return readDevice(user)||null;}
 async function refresh({renew=false}={}){
  const user=scope(),version=revision;if(!UUID.test(user||'')){await workerAccount(null);return state;}
  if(busy){const pending=busy;await pending.task;if(pending.user!==user&&current(version,user))return refresh({renew});return state;}
  const task=(async()=>{try{await provider.prepare?.();const id=await device(user);if(!current(version,user))return state;if(!id){await workerAccount(null);paint({enabled:false,supported:true});return state;}
   const result=await request('chat.push.status',{device:id});if(!current(version,user))return state;let enabled=result.enabled===true;
   if(renew&&(enabled||result.reason==='expired')){const data=await provider.registration(user);if(!current(version,user))return state;if(data)enabled=(await request('chat.push.register',{device:id,account:user,platform,renew:true,...(platform==='web'?{subscription:data.subscription}:{token:data.token})})).enabled===true;else enabled=false;}
   if(!current(version,user))return state;await workerAccount(enabled?user:null);if(current(version,user))paint({enabled,supported:true});
  }catch(error){if(current(version,user)){await workerAccount(null).catch(()=>{});paint({enabled:false,supported:false,message:error.message});}}return state;})();busy={user,task};try{return await task}finally{if(busy?.task===task)busy=null;}
 }
 async function enable(){
  const user=scope(),version=++revision;if(!UUID.test(user||''))throw Error('Войдите в кабинет команды.');
  // Permission is requested by the provider immediately inside the tap handler.
  const registrationTask=provider.enable(user);
  try{const data=await registrationTask;if(!current(version,user))throw Error('Аккаунт изменился.');const id=platform==='android'?data.device:readDevice(user)||crypto.randomUUID();if(!UUID.test(id||''))throw Error('Телефон не подтвердил регистрацию.');if(!writeDevice(user,id))throw Error('Не удалось сохранить подключение.');await workerAccount(user);if(!current(version,user))throw Error('Аккаунт изменился.');
   const result=await request('chat.push.register',{device:id,account:user,platform,...(platform==='web'?{subscription:data.subscription}:{token:data.token})});if(!current(version,user))throw Error('Аккаунт изменился.');if(result.enabled!==true)throw Error('Не удалось подключить уведомления.');paint({enabled:true,supported:true});return state;
  }catch(error){if(current(version,user)){await workerAccount(null).catch(()=>{});await provider.disable?.().catch(()=>{});paint({enabled:false,supported:true,message:error.message});}throw error;}
 }
 async function disable(){const user=scope(),version=++revision;if(!UUID.test(user||''))return;const id=readDevice(user)||await device(user);if(id)await request('chat.push.remove',{device:id,account:user});if(!current(version,user))return;await provider.disable?.();await workerAccount(null);paint({enabled:false,supported:true});}
 return{refresh,enable,disable,subscribe(fn){listeners.add(fn);fn(state);return()=>listeners.delete(fn);},stop(){revision++;actor=null;busy=null;listeners.clear();void workerAccount(null).catch(()=>{});}};
}
