import{personalDataAllowed}from './audience.js';
import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{read,write}from './storage.js';
import{RECITERS}from './quran-reciters.js';
import{listeningDayKey,listeningPeriodTotals}from './reciter-popularity-core.js';
import{safeListener}from './reciter-ranking-core.js';
import{createCompetitionFastProgress}from './competition-fast-progress.js';
const endpoint=OWNER_PROJECT_URL+'/functions/v1/reciter-competition',allowed=new Set(RECITERS.filter(r=>!r.variantOf).map(r=>r.id));
const boards=new Map(),favoriteBoards=new Map(),boardRequests=new Map(),aggregateTotals=new Map(),rowRevisions=new Map(),thinRosters=new Map(),liveControllers=new Set();let readEpoch=0,liveReadPending=null;
export function cachedCompetition(period='all',{mode='total'}={}){const entry=(mode==='favorite'?favoriteBoards:boards).get(listeningDayKey(Date.now())+':'+period);return entry&&Date.now()-entry.at<10000?entry.rows.slice():null;}
export function competitionListeningTotal(period='all'){return aggregateTotals.get(listeningDayKey(Date.now())+':'+period)?.seconds??null;}
export function clearCompetitionCache(){readEpoch++;boards.clear();favoriteBoards.clear();aggregateTotals.clear();rowRevisions.clear();thinRosters.clear();for(const request of boardRequests.values())request.controller.abort();boardRequests.clear();for(const controller of liveControllers)controller.abort();}
export function preloadCompetition(){return loadCompetition('all').catch(()=>[]);}
let account=()=>({signedIn:false}),client=()=>null,snapshot=()=>({totals:{},days:{}}),enabled=()=>false,credit=null,initialized=false,own=null,scope=null,inflight=null,ownRequest=null,lastUpload=0,lastOwn=0,lastSignature='',retryAt=0,localSnapshotRef=null,localSnapshotOwner=null;
let fastProgress=null,uploadQueue=Promise.resolve();
// A full recovery waits for a cancelled compact upload to settle. Neither path
// changes the meter, and an older cumulative request cannot lower server credit.
function upload(body,options={}){const task=uploadQueue.catch(()=>{}).then(()=>{if(options.signal?.aborted)throw Error('cancelled');return request(body,options);});uploadQueue=task.catch(()=>{});return task;}
export const competitionOwn=()=>own&&scope===account().userId?own:null;
// Read the already metered, competition-eligible snapshot. Display code must
// never substitute full personal history, which continues while Top is paused.
export function localCompetitionTotals(period='all'){
 if(!account().signedIn||!account().userId||!competitionOwn())return {};
 const source=snapshot();if(source!==localSnapshotRef){localSnapshotRef=source;localSnapshotOwner=account().userId;}
 if(localSnapshotOwner!==account().userId)return {};
 const totals=listeningPeriodTotals(source,period);
 return Object.fromEntries(Object.entries(totals).filter(([id,n])=>allowed.has(id)&&Number.isFinite(n)&&n>=0));
}
export const competitionAvatar=id=>endpoint+'?avatar='+encodeURIComponent(id);
const announce=()=>window.dispatchEvent(new Event('salah:competition-updated'));
async function request(body=null,{signal,keepalive=false,userId=account().userId}={}){
 if(!personalDataAllowed())throw Error('Личные данные защищены');
 const user=userId;if(!account().signedIn||!user||account().userId!==user)throw Error('Войдите в аккаунт');
 // Auth status events can run inside the SDK session lock. Leave that callback before requesting the session.
 await new Promise(resolve=>setTimeout(resolve,0));if(account().userId!==user)throw Error('Аккаунт изменился');
 const{data,error}=await client().auth.getSession();if(error||data?.session?.user?.id!==user||account().userId!==user)throw Error('Войдите в аккаунт');
 const requestSignal=signal||AbortSignal.timeout(15000);if(requestSignal.aborted)throw Error('cancelled');
 const response=await fetch(endpoint+(body?'':'?own=true&day='+listeningDayKey(Date.now())+'&participation='+(enabled()?'on':'off')),{method:body?'POST':'GET',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',referrerPolicy:'no-referrer',signal:requestSignal,keepalive});
 if(account().userId!==user)throw Error('Аккаунт изменился');if(!response.ok){const error=Error(response.status===429?'Повторим синхронизацию чуть позже':'Не удалось сохранить. Проверьте соединение.');error.status=response.status;throw error;}const result=await response.json();if(requestSignal.aborted)throw Error('cancelled');if(account().userId!==user)throw Error('Аккаунт изменился');credit?.receive('account:'+user,result,{resumeCredit:body?.resumeCredit});return result;
}
export const sendCompetitionPresence=(packet,options)=>request(packet,options);
export async function refreshCompetitionOwn({force=false}={}){
 const user=account().signedIn?account().userId:null;if(!user){own=null;scope=null;return null;}if(scope!==user){scope=user;own=null;lastOwn=lastUpload=retryAt=0;lastSignature='';}
 if(ownRequest?.user===user){const result=await ownRequest.task;return force?refreshCompetitionOwn({force:true}):result;}
 if(!force&&own&&Date.now()-lastOwn<5000)return own;
 const entry={user,task:null};ownRequest=entry;entry.task=(async()=>{const data=await request();if(user!==account().userId)return null;const changed=JSON.stringify(own)!==JSON.stringify(data);own=data;lastOwn=Date.now();if(changed)announce();return own;})();try{return await entry.task;}finally{if(ownRequest===entry)ownRequest=null;}
}
export async function saveCompetitionSettings(values){await request({action:'settings',...values});await refreshCompetitionOwn({force:true});}
export function sharedPersonalTotals(local,period){const cloud=competitionOwn()?.totals?.[period];if(!cloud)return local;const merged={...local};for(const[id,n]of Object.entries(cloud))if(allowed.has(id)&&Number.isSafeInteger(n)&&n>=0)merged[id]=Math.max(merged[id]||0,n);return merged;}
function favoriteOrder(rows){
 if(!rows.some(row=>row.totalSeconds!==undefined))return rows;
 const sorted=rows.slice().sort((a,b)=>b.seconds-a.seconds||a.id.localeCompare(b.id));let rank=1;
 return sorted.map((row,index)=>{if(index&&row.seconds!==sorted[index-1].seconds)rank=index+1;return {...row,rank};});
}
const boardStore=mode=>mode==='favorite'?favoriteBoards:boards;
const revisionKey=(day,period,mode)=>day+':'+period+':'+mode;
const currentReadScope=()=>{const state=account();return state?.signedIn?'account:'+state.userId:'guest';};
function readRevision(value){if(value===undefined)return null;if(!Number.isSafeInteger(value)||value<0)throw Error('invalid_revision');return value;}
function revisionCurrent(incoming,current){return current===undefined||current===null||incoming!==null&&incoming>=current;}
function saveAggregate(day,period,seconds,revision){
 if(!Number.isSafeInteger(seconds)||seconds<0)return false;
 const key=day+':'+period,before=aggregateTotals.get(key);
 if(!revisionCurrent(revision,before?.revision))return false;
 if(before?.revision!==null&&before?.revision!==undefined&&before.revision===revision)return false;
 aggregateTotals.set(key,{seconds,revision});return !before||before.seconds!==seconds;
}
function pruneBoards(day){for(const cache of[boards,favoriteBoards,aggregateTotals,rowRevisions,thinRosters])for(const key of cache.keys())if(!key.startsWith(day+':'))cache.delete(key);}
function parseFullRows(items,startedAt){
 const seen=new Set();return items.flatMap(row=>{
  const person=safeListener(row);if(!person||seen.has(person.id)||!allowed.has(row.reciter)||!Number.isSafeInteger(row.seconds)||row.seconds<=0||!Number.isSafeInteger(row.rank)||row.rank<=0)return[];seen.add(person.id);
  const total=Number.isSafeInteger(row.totalSeconds)&&row.totalSeconds>=row.seconds?row.totalSeconds:null,ids=new Set();
  const reciters=total!==null&&Array.isArray(row.reciters)?row.reciters.filter(item=>{if(!allowed.has(item?.reciter)||ids.has(item.reciter)||!Number.isSafeInteger(item.seconds)||item.seconds<=0||item.seconds>total)return false;ids.add(item.reciter);return true;}).map(({reciter,seconds})=>({reciter,seconds})):[];
  return[{...person,...(total!==null?{totalSeconds:total,reciters}:{}),listeningUntil:Number.isInteger(row.activeForSeconds)&&row.activeForSeconds>0&&row.activeForSeconds<=45?startedAt+row.activeForSeconds*1000:0,reciter:row.reciter,seconds:row.seconds,rank:row.rank,awards:Array.isArray(row.awards)?row.awards.filter(k=>k==='week'||k==='month').slice(0,2):[]}];
 });
}
function saveFullBoard(day,period,mode,rows,{revision,totalSeconds,limited=false}){
 const key=day+':'+period,watermark=revisionKey(day,period,mode),previous=rowRevisions.get(watermark),store=boardStore(mode),before=store.get(key),fence=thinRosters.get(watermark);
 if(!revisionCurrent(revision,previous)||!revisionCurrent(revision,aggregateTotals.get(key)?.revision)){
  // Metadata can take longer than the one-second numeric feed. Hydrate only
  // identities that are still public in its latest roster and have the same
  // privacy mode. Every numeric/topology field comes from that newer roster;
  // an old full response never restores old scores, ranks, IDs or visibility.
  if(revision===null||!fence||fence.revision!==previous||!revisionCurrent(fence.revision,aggregateTotals.get(key)?.revision))return false;
  const full=new Map(rows.map(row=>[row.id,row])),known=new Map((before?.rows||[]).map(row=>[row.id,row])),hydrated=[],metadataRevisions=new Map();
  for(const next of fence.items.values()){
   const matches=row=>row&&row.mode===next.mode&&!!row.guest===next.guest;
   const old=known.get(next.id),candidate=full.get(next.id),oldRevision=before?.metadataRevisions?.get(next.id)??null;
   const useFull=matches(candidate)&&(!matches(old)||oldRevision===null||revision>=oldRevision),metadata=useFull?candidate:matches(old)?old:null;
   if(!metadata)continue;
   hydrated.push({...metadata,reciter:next.reciter,seconds:next.seconds,rank:next.rank,...(metadata.totalSeconds!==undefined?{totalSeconds:next.totalSeconds,reciters:next.reciters.map(item=>({...item}))}:{}),listeningUntil:next.activeForSeconds?fence.startedAt+next.activeForSeconds*1000:0});
   metadataRevisions.set(next.id,useFull?revision:oldRevision);
  }
  store.set(key,{...before,rows:hydrated,metadataRevisions,at:Date.now(),totalSeconds:aggregateTotals.get(key)?.seconds??totalSeconds,limited:fence.limited,revision:fence.revision});return true;
 }
 // An equal-version full response may add metadata after a numeric patch, but
 // it cannot restore an ID or public identity mode that the patch removed.
 if(fence&&revision===fence.revision&&rows.some(row=>!fence.items.has(row.id)||fence.items.get(row.id).mode!==row.mode||fence.items.get(row.id).guest!==!!row.guest))return false;
 store.set(key,{rows,metadataRevisions:new Map(rows.map(row=>[row.id,revision])),at:Date.now(),totalSeconds,limited,revision});if(revision!==null)rowRevisions.set(watermark,revision);
 if(fence&&(revision===null||revision>fence.revision))thinRosters.delete(watermark);return true;
}
export async function loadCompetition(period='all',{force=false,mode='total'}={}){
 if(!personalDataAllowed())return [];
 if(!['all','day','week','month'].includes(period)||!['total','favorite'].includes(mode))throw Error('invalid');
 const day=listeningDayKey(Date.now()),cached=cachedCompetition(period,{mode});if(cached&&!force)return cached;
 const legacy=mode==='favorite'&&boards.get(day+':'+period)?.limited===true,requestKey=day+(legacy?':favorite':':total');
 const pending=boardRequests.get(requestKey);
 if(pending)await pending.task;
 else{
  const controller=new AbortController(),startedAt=Date.now(),epoch=readEpoch,scope=currentReadScope(),timeout=setTimeout(()=>controller.abort(),11000),entry={controller,task:null};
  entry.task=(async()=>{
   let response;for(let attempt=0;attempt<2;attempt++){try{response=await fetch(endpoint+'?boards=1'+(legacy?'':'&details=reciters')+'&day='+day,{headers:{apikey:OWNER_PUBLIC_KEY},credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});if(![502,503,504].includes(response.status)||attempt)break;}catch(error){if(controller.signal.aborted||attempt||error.name==='AbortError')throw error;}await new Promise(resolve=>setTimeout(resolve,400));if(controller.signal.aborted)throw Error('cancelled');}
   if(!response.ok)throw Error('unavailable');const data=await response.json();if(data.day!==day||!data.boards)throw Error('invalid');
   const parsed=[];for(const p of['all','day','week','month']){const board=data.boards[p];if(!Array.isArray(board?.items))throw Error('invalid');parsed.push([p,parseFullRows(board.items,startedAt),board.limited===true,readRevision(board.revision)]);}
   if(controller.signal.aborted||epoch!==readEpoch||!personalDataAllowed()||scope!==currentReadScope()||day!==listeningDayKey(Date.now()))throw Error('cancelled');pruneBoards(day);
   for(const[p,rows,limited,revision]of parsed){
    const totalSeconds=Number.isSafeInteger(data.listeningTotals?.[p])&&data.listeningTotals[p]>=0?data.listeningTotals[p]:null;
    saveAggregate(day,p,totalSeconds,revision);
    if(legacy)saveFullBoard(day,p,'favorite',rows,{revision,totalSeconds,limited});
    else{
     // Legacy fallback rows can be ranked by one reciter and lack a calendar total.
     if((p==='week'||p==='month')&&rows.some(row=>row.totalSeconds===undefined))continue;
     saveFullBoard(day,p,'total',rows,{revision,totalSeconds,limited});if(!limited)saveFullBoard(day,p,'favorite',favoriteOrder(rows),{revision,totalSeconds,limited});
    }
   }
  })();boardRequests.set(requestKey,entry);
  try{await entry.task;}finally{clearTimeout(timeout);if(boardRequests.get(requestKey)===entry)boardRequests.delete(requestKey);}
 }
 const result=cachedCompetition(period,{mode});
 // A capped overall board cannot tell us who would enter a favorite-reciter leaderboard.
 if(!result&&mode==='favorite'&&!legacy&&boards.get(day+':'+period)?.limited)return loadCompetition(period,{mode,force:true});
 if(!result&&mode==='total'&&(period==='week'||period==='month'))throw Error('unavailable');
 return result||[];
}
function parseThinRows(items){
 if(!Array.isArray(items)||items.length>1000)throw Error('invalid_live_items');const seen=new Set();
 return items.map(row=>{
  if(!row||!/^[-a-f0-9]{36}$/i.test(row.id||'')||seen.has(row.id)||!['initial','profile'].includes(row.mode)||typeof row.guest!=='boolean'||!allowed.has(row.reciter)||!Number.isSafeInteger(row.seconds)||row.seconds<=0||!Number.isSafeInteger(row.totalSeconds)||row.totalSeconds<row.seconds||!Number.isSafeInteger(row.rank)||row.rank<1)throw Error('invalid_live_row');seen.add(row.id);
  const ids=new Set(),reciters=row.reciters===undefined?[]:row.reciters;
  if(!Array.isArray(reciters)||reciters.length>allowed.size)throw Error('invalid_live_reciters');
  const parsed=reciters.map(item=>{if(!allowed.has(item?.reciter)||ids.has(item.reciter)||!Number.isSafeInteger(item.seconds)||item.seconds<=0||item.seconds>row.totalSeconds)throw Error('invalid_live_reciters');ids.add(item.reciter);return{reciter:item.reciter,seconds:item.seconds};});
  if(!Number.isSafeInteger(row.activeForSeconds)||row.activeForSeconds<0||row.activeForSeconds>45)throw Error('invalid_live_presence');
  return{id:row.id,mode:row.mode,guest:row.guest,reciter:row.reciter,seconds:row.seconds,totalSeconds:row.totalSeconds,rank:row.rank,reciters:parsed,activeForSeconds:row.activeForSeconds};
 });
}
function applyThinBoard(data,startedAt){
 const{day,period,mode,revision,listeningTotal}=data,key=day+':'+period,watermark=revisionKey(day,period,mode),beforeRevision=rowRevisions.get(watermark);
 if(beforeRevision!==undefined&&revision<=beforeRevision||!revisionCurrent(revision,aggregateTotals.get(key)?.revision))return{accepted:false,changed:false,needsRefresh:false};
 const items=parseThinRows(data.items),byId=new Map(items.map(row=>[row.id,row])),cache=boardStore(mode),before=cache.get(key);let changed=saveAggregate(day,period,listeningTotal,revision),needsRefresh=!before;
 const removed=new Set(),rows=[],previousIds=new Set((before?.rows||[]).map(row=>row.id));
 for(const row of before?.rows||[]){
  const next=byId.get(row.id);
  if(!next||next.mode!==row.mode||next.guest!==!!row.guest){removed.add(row.id);needsRefresh=true;changed=true;continue;}
  const sameReciter=row.reciter===next.reciter,oldIds=(row.reciters||[]).map(item=>item.reciter).join(','),newIds=next.reciters.map(item=>item.reciter).join(',');
  if(!sameReciter||row.rank!==next.rank||oldIds!==newIds)needsRefresh=true;
  const values=new Map(next.reciters.map(item=>[item.reciter,item.seconds])),reciters=row.reciters?.map(item=>({...item,seconds:values.get(item.reciter)??item.seconds}));
  const seconds=sameReciter?next.seconds:values.get(row.reciter)??row.seconds;
  const merged={...row,seconds,...(row.totalSeconds!==undefined?{totalSeconds:next.totalSeconds,reciters}:{}),listeningUntil:next.activeForSeconds?startedAt+next.activeForSeconds*1000:0};
  if(row.seconds!==merged.seconds||row.totalSeconds!==merged.totalSeconds||JSON.stringify(row.reciters)!==JSON.stringify(merged.reciters))changed=true;rows.push(merged);
 }
 if(items.some(item=>!previousIds.has(item.id)))needsRefresh=true;
 if(before)cache.set(key,{...before,rows,at:Date.now(),totalSeconds:listeningTotal,revision});
 rowRevisions.set(watermark,revision);thinRosters.set(watermark,{revision,items:byId,startedAt,limited:typeof data.limited==='boolean'?data.limited:before?.limited??items.length>=1000});
 // The inactive score mode may have a different capped roster and different
 // ranks. Never manufacture its ordering from a partial selected-mode patch.
 if(changed||needsRefresh){const other=boardStore(mode==='total'?'favorite':'total');other.delete(key);}
 return{accepted:true,changed,needsRefresh,removed:[...removed],roster:items.map(({id,mode,guest})=>({id,mode,guest}))};
}
async function fetchCompetitionUpdate(period='all',{mode='total',signal,getScope=currentReadScope}={}){
 if(!personalDataAllowed()||!['all','day','week','month'].includes(period)||!['total','favorite'].includes(mode))throw Error('invalid_live_scope');
 const day=listeningDayKey(Date.now()),scope=getScope(),epoch=readEpoch,startedAt=Date.now(),controller=new AbortController(),abort=()=>controller.abort(),timeout=setTimeout(abort,10000);
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});liveControllers.add(controller);
 try{
  const response=await fetch(endpoint+'?live=1&day='+day+'&period='+period+'&mode='+mode,{headers:{apikey:OWNER_PUBLIC_KEY},credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});if(!response.ok)throw Error('unavailable');const data=await response.json();
  if(controller.signal.aborted||epoch!==readEpoch||!personalDataAllowed()||scope!==getScope()||day!==listeningDayKey(Date.now()))throw Error('cancelled');
  if(data.day!==day||data.period!==period||data.mode!==mode||readRevision(data.revision)===null||!Number.isSafeInteger(data.listeningTotal)||data.listeningTotal<0)throw Error('invalid_live_scope');
  pruneBoards(day);return{...applyThinBoard(data,startedAt),day,period,mode,revision:data.revision};
 }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);liveControllers.delete(controller);}
}
export async function loadCompetitionUpdate(period='all',options={}){
 // A route/account switch may abort a fetch whose rejection has not settled
 // yet. Wait for that one request instead of creating a second live request.
 while(liveReadPending){await liveReadPending.catch(()=>{});if(options.signal?.aborted)throw Error('cancelled');}
 if(options.signal?.aborted)throw Error('cancelled');const task=fetchCompetitionUpdate(period,options);liveReadPending=task;
 try{return await task;}finally{if(liveReadPending===task)liveReadPending=null;}
}
// Only this visible Top consumes the thin feed. One request at a time, no
// interpolation, no hidden/offline backlog and no ownership of any audio.
export function watchCompetitionUpdates(period,{mode='total',onUpdate=()=>{},onError=()=>{},getScope=currentReadScope,doc=document,win=window,schedule=setTimeout,cancel=clearTimeout,now=Date.now}={}){
 let stopped=false,timer=null,controller=null,generation=0,failures=0,lastStart=-Infinity;const initialScope=getScope();
 const active=()=>!stopped&&!doc.hidden&&win.navigator?.onLine!==false&&personalDataAllowed()&&getScope()===initialScope;
 const clear=()=>{if(timer!==null)cancel(timer);timer=null;};
 const queue=delay=>{clear();if(active())timer=schedule(tick,delay);};
 async function tick(){
  timer=null;if(!active()||controller)return;const request=controller=new AbortController(),token=++generation;lastStart=now();
  try{const result=await loadCompetitionUpdate(period,{mode,signal:request.signal,getScope});if(stopped||request.signal.aborted||token!==generation||!active())return;failures=0;if(result.accepted)onUpdate(result);}
  catch(error){if(!stopped&&!request.signal.aborted&&token===generation&&active()&&error.message!=='cancelled'){failures=Math.min(4,failures+1);onError(error);}}
  finally{if(controller===request)controller=null;if(!stopped)queue(failures?Math.min(15000,1000*2**failures):Math.max(0,1000-Math.max(0,now()-lastStart)));}
 }
 const resume=()=>{generation++;clear();controller?.abort();if(active()){failures=0;if(!controller)queue(Math.max(0,1000-Math.max(0,now()-lastStart)));}};
 doc.addEventListener('visibilitychange',resume);win.addEventListener('online',resume);win.addEventListener('offline',resume);queue(0);
 return()=>{if(stopped)return;stopped=true;generation++;clear();controller?.abort();controller=null;doc.removeEventListener('visibilitychange',resume);win.removeEventListener('online',resume);win.removeEventListener('offline',resume);};
}
function deviceId(){const key='competition-device-v1:'+account().userId;let id=read(key,null);if(!/^[a-f0-9-]{36}$/i.test(id||'')){id=crypto.randomUUID();if(!write(key,id))throw Error('Не удалось сохранить устройство');}return id;}
export async function connectCompetitionNotifications(period){
 if(window.Capacitor?.isNativePlatform?.())throw Error('Для уведомлений рейтинга пока используйте SALAH в браузере или с главного экрана.');
 if(!isSecureContext||!('Notification'in window)||!navigator.serviceWorker||!('PushManager'in window))throw Error('На iPhone сначала добавьте SALAH на экран «Домой».');
 const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(permission!=='granted')throw Error('Уведомления не разрешены');
 const configResponse=await fetch(OWNER_PROJECT_URL+'/functions/v1/background-reminders/config',{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(!configResponse.ok)throw Error('Не удалось подключить уведомления');const config=await configResponse.json();
 const text=config.publicKey||config.vapidPublicKey;if(typeof text!=='string')throw Error('Не удалось получить ключ уведомлений');const bytes=Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const registration=await navigator.serviceWorker.getRegistration('./')||await navigator.serviceWorker.register('./sw.js');await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Телефон не ответил. Повторите подключение.')),15000))]);const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
 const result=await request({action:'device',device:deviceId(),subscription:subscription.toJSON()});if(result.ok!==true)throw Error('Не удалось сохранить устройство');await saveCompetitionSettings({notify:true,period});
}
export async function syncCompetitionNow(force=false,{recovery=false}={}){
 const user=account().signedIn?account().userId:null;if(scope!==user){scope=user;own=null;lastSignature='';lastUpload=lastOwn=retryAt=0;}
 fastProgress?.refresh();
 if(!user||!enabled()||navigator.onLine===false||inflight||Date.now()<retryAt)return;
 const task=(async()=>{try{
  if(!own||Date.now()-lastOwn>60000)await refreshCompetitionOwn();fastProgress?.refresh();if(user!==account().userId||!own?.enabled||own.mode==='hidden')return;
  const source=snapshot(),totals=Object.fromEntries(Object.entries(source.totals||{}).filter(([id,n])=>allowed.has(id)&&Number.isFinite(n)&&n>=0).map(([id,n])=>[id,Math.floor(n)]));
  const days=Object.fromEntries(Object.entries(source.days||{}).map(([day,rows])=>[day,Object.fromEntries(Object.entries(rows).filter(([id,n])=>allowed.has(id)&&Number.isFinite(n)&&n>=0).map(([id,n])=>[id,Math.floor(n)]))]));
  const resumeCredit=credit?.resumeToken('account:'+user),signature=JSON.stringify({totals,days,resumeCredit});if(!Object.keys(totals).length||signature===lastSignature&&!force||!resumeCredit&&!recovery&&Date.now()-lastUpload<15000)return;
  const body={action:'snapshot',device:deviceId(),totals,days,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',...(resumeCredit?{resumeCredit}:{})},token=fastProgress?.beginFull();
  let result;try{result=await upload(body,{userId:user});}catch(error){fastProgress?.failFull(token);throw error;}if(user!==account().userId)return;fastProgress?.acknowledgeFull(token,{totals,days},result);lastSignature=signature;lastUpload=Date.now();await refreshCompetitionOwn({force:true});
 }catch{if(user===account().userId)retryAt=Date.now()+15000;}})();inflight=task;try{await task;}finally{if(inflight===task)inflight=null;}
}
export function initCompetition({getAccount,getClient,getSnapshot,isEnabled,credit:creditPolicy=null}){if(!personalDataAllowed()||initialized)return;initialized=true;account=getAccount;client=getClient;snapshot=getSnapshot;enabled=isEnabled;credit=creditPolicy;
 localSnapshotRef=snapshot();localSnapshotOwner=account().userId;
 fastProgress=createCompetitionFastProgress({getContext:()=>{const state=account(),user=state.signedIn?state.userId:null;return{scope:user?'account:'+user:null,enabled:!!user&&personalDataAllowed()&&enabled()&&own?.enabled===true&&own.mode!=='hidden',online:navigator.onLine!==false,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'};},send:(body,options)=>{const user=options.scope?.slice(8);if(!user||account().userId!==user)throw Error('Аккаунт изменился');return upload({...body,device:deviceId()},{...options,userId:user});},requestFull:()=>syncCompetitionNow(true,{recovery:true})});
 const progress=({final=false}={})=>fastProgress.sample(snapshot(),{final});window.addEventListener('salah:personal-listening-progress',()=>progress());window.addEventListener('salah:personal-listening-final',()=>progress({final:true}));window.addEventListener('offline',()=>fastProgress.refresh());
 setInterval(()=>void syncCompetitionNow(),15000);window.addEventListener('salah:listening-credit-action',()=>void syncCompetitionNow());window.addEventListener('salah:personal-listening',()=>void syncCompetitionNow());window.addEventListener('online',()=>void syncCompetitionNow());window.addEventListener('salah:counter-status',()=>void syncCompetitionNow());window.addEventListener('salah:popularity-updated',()=>{lastOwn=0;void syncCompetitionNow();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)void syncCompetitionNow();});void syncCompetitionNow();
}
