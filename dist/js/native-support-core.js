const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createNativeSupportClient({plugin,getSession,register,notice=()=>{},open=()=>{}}){
 let revision=0,actor=null,session=null,receipt='',tail=Promise.resolve(),pendingTap=null;
 const taps=new Set();
 const queue=task=>{const result=tail.catch(()=>{}).then(task);tail=result.catch(()=>{});return result;};
 async function bounded(task,ms=15000){let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('native_support_timeout')),ms)})]);}finally{clearTimeout(timer)}}
 const valid=s=>UUID.test(s?.user?.id||'')&&s.user.email_confirmed_at&&!s.user.is_anonymous;
 function tap(value){if(!UUID.test(value?.user||'')||!UUID.test(value.thread||''))return;pendingTap=value;if(actor===value.user){const key=value.tap||value.user+':'+value.thread;if(!taps.has(key)){taps.add(key);if(taps.size>50)taps.delete(taps.values().next().value);open(value.thread);}pendingTap=null;}}
 async function sync({enable=false}={}){
  const id=revision,current=session,expectedActor=actor;
  if(!actor||!current)return {ready:false,message:'Войдите в аккаунт.'};
  return queue(async()=>{
   if(id!==revision)return {ready:false};
   const status=await bounded(plugin.getStatus(),2000);if(id!==revision||actor!==expectedActor)return {ready:false};if(!status.supported)return {ready:false,message:'На этом устройстве недоступна служба уведомлений Google.'};
   if(!enable&&!status.enabled)return {ready:false};
   const result=await bounded(enable?plugin.enable({user:expectedActor}):plugin.getRegistration({user:expectedActor}),enable?60000:15000);
   if(id!==revision||!valid(current)||current.user.id!==actor)return {ready:false};
   if(!UUID.test(result?.device||'')||typeof result.token!=='string'||result.token.length<100||result.token.length>4096)throw Error('invalid_native_registration');
   const signature=current.user.id+':'+result.device+':'+result.token+':'+current.access_token;
   if(signature!==receipt){await register(current,result);if(id!==revision)return {ready:false};receipt=signature;}
   return {ready:true};
  });
 }
 async function accountChanged(knownSession=undefined){
  const previous=actor,id=++revision;actor=null;session=null;const current=knownSession===undefined?await bounded(getSession(),10000):knownSession;if(id!==revision)return;
  const next=valid(current)?current.user.id:null;
  if(next!==previous)receipt='';actor=next;session=next?current:null;
  // Account clearing must not wait behind a stalled token request.
  await bounded(plugin.setAccount({user:actor||''}),2000);
  if(id!==revision)return;
  const clicked=await bounded(plugin.consumeTap(),2000);if(id!==revision)return;tap(clicked);if(pendingTap)tap(pendingTap);
  if(actor)await sync();
 }
 function message(value){if(actor&&value?.user===actor&&UUID.test(value.id||'')&&UUID.test(value.thread||''))notice({actor,pending:1,latest:{id:value.id,thread:value.thread}});}
 return {accountChanged,enable:()=>sync({enable:true}),sync,message,tap,stop(){revision++;actor=session=pendingTap=null;receipt='';}};
}
