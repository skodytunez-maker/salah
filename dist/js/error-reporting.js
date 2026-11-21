import{settingsSectionLabel}from './settings-section-label.js';
import{uiLeaf,uiAttribute,bindUiLanguage,setUiMessage,uiMessage}from './ui.js';
import{personalDataAllowed}from './audience.js';
import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
const KEY='salah:diagnostics-v1';
export const ERROR_ROUTES=['home','knowledge','quran','adhkar','more','account','settings','calendar','qibla','umrah','support','learning','other'];
export const ERROR_KINDS=['script','promise','resource','slow'];
export const ERROR_MODULES=['app','quran','quran-navigation','adhkar','qibla','support','settings','qr-login','account-devices','weather','other'];
// Expected browser/network outcomes are not application faults. Never serialize reasons.
export function expectedDiagnosticFailure(reason){
 if(!reason||typeof reason!=='object')return false;
 if(['AbortError','NotAllowedError'].includes(reason.name))return true;
 const message=typeof reason.message==='string'?reason.message.slice(0,256):'';
 return reason.name==='TypeError'&&/^(failed to fetch|load failed|networkerror when attempting to fetch resource|network request failed)(?:[. :]|$)/i.test(message);
}
export function ownDiagnosticSource(source,win){
 if(!source)return true;
 if(!win?.location?.href)return true;
 try{return new URL(source,win.location.href).origin===new URL(win.location.href).origin}catch{return false}
}
export function errorContext(win){
 const route=String(win.location?.hash||'').split('?')[0].slice(1);const width=Number(win.innerWidth)||0;
 return{route:ERROR_ROUTES.includes(route)?route:'other',screen:width<700?'phone':width<1100?'tablet':'desktop'};
}
export function errorModule(filename){try{const name=new URL(filename).pathname.split('/').at(-1).replace(/\.js$/,'');if(ERROR_MODULES.includes(name))return name;for(const group of ['quran','adhkar','support','weather','settings'])if(name.startsWith(group+'-'))return group;return 'other';}catch{return 'other';}}
export function diagnosticEnabled(storage=null){try{return (storage||globalThis.localStorage).getItem(KEY)==='true';}catch{return false;}}
const QUEUE_PREFIX='salah:diagnostic-event-v2:';
const ACK_KEY='salah:diagnostic-confirmed-v2';
const RETRY_KEY='salah:diagnostic-retry-v2';
const EVENT_LIFETIME=24*60*60*1000; // Shorter than the server's two-day duplicate retention.
const CAPTURE_WINDOW=15*60*1000;
const MAX_EVENTS=20;
const MAX_PENDING=60;
const FIRST_DELAY=10000;
const MAX_RETRY=15*60*1000;
const ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function diagnosticId(){
 if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
 const bytes=crypto.getRandomValues(new Uint8Array(16));
 bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
 return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

function queueEvent(value,id,now){
 if(!value||!ID_PATTERN.test(id)||!Number.isSafeInteger(value.version)||value.version<1||value.version>1000000||!Number.isSafeInteger(value.at)||value.at>now||now-value.at>=EVENT_LIFETIME)return null;
 const event=value.event;
 if(!event||!ERROR_ROUTES.includes(event.route)||!ERROR_KINDS.includes(event.kind)||!ERROR_MODULES.includes(event.module)||!['phone','tablet','desktop'].includes(event.screen))return null;
 if(event.module==='quran-navigation'&&(event.route!=='quran'||event.kind!=='promise'))return null;
 return{id,version:value.version,at:value.at,test:value.test===true,event:{route:event.route,kind:event.kind,module:event.module,screen:event.screen,count:1}};
}

function retryAfter(value,now){
 if(!value)return 0;
 const seconds=/^\d+$/.test(value)?Number(value):NaN;
 const delay=Number.isFinite(seconds)?seconds*1000:Date.parse(value)-now;
 return Number.isFinite(delay)?Math.min(EVENT_LIFETIME,Math.max(0,delay)):0;
}

export async function sendErrorBatch(events,version,{id,signal,test=false,fetcher=globalThis.fetch}={}){
 if(!personalDataAllowed())return;
 if(!ID_PATTERN.test(id)||signal?.aborted)throw Error('diagnostic-send-cancelled');
 const controller=new AbortController();
 const cancel=()=>controller.abort();
 const deadline=setTimeout(cancel,10000);
 signal?.addEventListener('abort',cancel,{once:true});
 try{
  const headers={apikey:OWNER_PUBLIC_KEY,'Content-Type':'application/json'};
  if(test){
   const {data,error}=await accountAuthClient().auth.getSession();
   if(error)throw Error('diagnostic-session-unavailable');
   if(!data?.session)throw Object.assign(Error('diagnostic-owner-session-missing'),{status:401});
   headers.Authorization='Bearer '+data.session.access_token;
  }
  const response=await fetcher(OWNER_PROJECT_URL+'/functions/v1/error-summary'+(test?'?mode=test':''),{
   method:'POST',headers,body:JSON.stringify({id,version,events}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',
   signal:controller.signal
  });
  if(!response.ok)throw Object.assign(Error('diagnostic-response'),{status:response.status,retryAfter:retryAfter(response.headers.get('Retry-After'),Date.now())});
  const ack=await response.json();
  if(ack?.ok!==true||test&&(ack.id!==id||!Number.isFinite(Date.parse(ack.confirmedAt))))throw Error('diagnostic-ack-missing');
  return ack;
 }finally{
  clearTimeout(deadline);
  signal?.removeEventListener('abort',cancel);
 }
}

export function createErrorReporter({
 version,win=globalThis.window,doc=globalThis.document,nav=globalThis.navigator,storage=null,
 send=sendErrorBatch,setTimer=setTimeout,clearTimer=clearTimeout,Observer=globalThis.PerformanceObserver,
 now=()=>Date.now(),makeId=diagnosticId,random=Math.random
}={}){
 try{storage=storage||globalThis.localStorage;}catch{}
 let enabled=diagnosticEnabled(storage),disposed=false,timer=null,timerAt=0,active=null;
 let lastStatus='idle',lastTest=null,volatile=false,attempts=0,failedId=null,nextAttempt=0;
 let recent=[],networkWindow=[],slowWindow=[];
 const memory=new Map(),settled=new Map(),subscribers=new Set();
 const consent=()=>enabled&&diagnosticEnabled(storage)&&personalDataAllowed()&&![nav?.doNotTrack,win?.doNotTrack,nav?.msDoNotTrack].some(value=>value==='1'||value==='yes'||value===true);
 const allowed=()=>!disposed&&consent();
 const online=()=>nav?.onLine!==false;
 const visible=()=>!doc?.hidden;
 function readRetry(){
  try{
   const retry=JSON.parse(storage.getItem(RETRY_KEY));
   if(retry&&ID_PATTERN.test(retry.id)&&Number.isSafeInteger(retry.attempts)&&retry.attempts>0&&Number.isSafeInteger(retry.at)&&retry.at>now()&&retry.at-now()<=EVENT_LIFETIME){
    failedId=retry.id;attempts=retry.attempts;nextAttempt=Math.max(nextAttempt,retry.at);lastStatus='retrying';
   }
  }catch{}
 }
 function clearRetry(id){
  try{if(JSON.parse(storage.getItem(RETRY_KEY))?.id===id)storage.removeItem(RETRY_KEY);}catch{}
 }
 function readConfirmation(){
  try{const stamp=Number(storage.getItem(ACK_KEY));return Number.isSafeInteger(stamp)&&stamp>0&&stamp<=now()?stamp:null;}catch{return null;}
 }
 function remove(id){
  memory.delete(id);
  try{storage.removeItem(QUEUE_PREFIX+id);}catch{volatile=true;}
 }
 function storageKeys(){
  const keys=[];
  try{
   for(let i=0;i<storage.length;i++){
    const key=storage.key(i);
    if(key?.startsWith(QUEUE_PREFIX))keys.push(key);
   }
  }catch{volatile=true;}
  return keys;
 }
 function pending(){
  const stamp=now(),rows=new Map(memory);
  for(const[id,at]of settled)if(stamp-at>=EVENT_LIFETIME)settled.delete(id);
  for(const key of storageKeys()){
   const id=key.slice(QUEUE_PREFIX.length);
   if(settled.has(id))continue;
   let raw,parsed;
   try{raw=storage.getItem(key);}catch{volatile=true;continue;}
   try{parsed=JSON.parse(raw);}catch{}
   const row=queueEvent(parsed,id,stamp);
   if(row)rows.set(id,row);else remove(id);
  }
  for(const[id,row]of rows)if(!queueEvent(row,id,stamp)){rows.delete(id);remove(id);}
  return [...rows.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 }
 function status(){
  if(!allowed())return{state:'disabled',pending:0,lastConfirmedAt:null,volatile:false,testPending:false,lastTest:null};
  const rows=pending(),count=rows.length;
  let state=lastStatus;
  if(active)state='sending';
  else if(count&&!online())state='offline';
  else if(count&&state==='retrying')state='retrying';
  else if(count&&state!=='full'&&state!=='rejected')state='waiting';
  return{state,pending:count,lastConfirmedAt:readConfirmation(),volatile,testPending:rows.some(row=>row.test),lastTest};
 }
 function announce(){
  if(subscribers.size){const value=status();for(const listener of subscribers)try{listener(value);}catch{}}
 }
 function stopTimer(){
  if(timer!==null)clearTimer(timer);
  timer=null;timerAt=0;
 }
 function resetPolicy(){
  stopTimer();active?.controller.abort();memory.clear();
  for(const key of storageKeys())remove(key.slice(QUEUE_PREFIX.length));
  recent=[];networkWindow=[];slowWindow=[];
  try{for(const key of [ACK_KEY,RETRY_KEY])if(storage?.getItem(key)!==null)storage?.removeItem(key);}catch{}
  lastStatus='idle';lastTest=null;failedId=null;attempts=0;nextAttempt=0;
 }
 function schedule(delay=FIRST_DELAY){
  if(!allowed()||!online()||!visible()||active||!pending().length)return;
  const target=Math.max(now()+delay,nextAttempt);
  if(timer!==null&&timerAt<=target)return;
  stopTimer();timerAt=target;
  timer=setTimer(()=>{timer=null;timerAt=0;void flush();},Math.max(0,target-now()));
 }
 async function flush(){
  stopTimer();
  if(!allowed()){if(!disposed)resetPolicy();return;}
  if(!visible()||!online()||active){announce();return;}
  if(now()<nextAttempt){schedule(0);return;}
  const row=pending()[0];
  if(!row)return;
  if(failedId!==row.id){attempts=0;failedId=row.id;}
  const controller=new AbortController();
  active={controller};
  announce();
  try{
   const ack=await send([row.event],row.version,{id:row.id,signal:controller.signal,test:row.test});
   if(controller.signal.aborted||!allowed())return;
   if(ack?.ok!==true||row.test&&(ack.id!==row.id||!Number.isFinite(Date.parse(ack.confirmedAt))))throw Error('diagnostic-ack-missing');
   settled.set(row.id,now());remove(row.id);clearRetry(row.id);
   try{storage.setItem(ACK_KEY,String(now()));}catch{volatile=true;}
   if(row.test)lastTest={id:row.id,state:'sent'};
   lastStatus='sent';attempts=0;nextAttempt=0;
  }catch(error){
   if(controller.signal.aborted||!allowed())return;
   if([400,413,415,422].includes(error?.status)||row.test&&[401,403].includes(error?.status)){
    settled.set(row.id,now());remove(row.id);clearRetry(row.id);
    if(row.test)lastTest={id:row.id,state:'rejected'};
    lastStatus='rejected';attempts=0;nextAttempt=0;
   }else{
    attempts++;
    const backoff=Math.min(MAX_RETRY,FIRST_DELAY*2**Math.min(attempts-1,10));
    const jitter=Math.trunc(backoff*(.8+.2*random()));
    const requested=Number.isFinite(error?.retryAfter)?Math.max(0,error.retryAfter):0;
    nextAttempt=now()+Math.min(EVENT_LIFETIME,Math.max(jitter,requested));
    try{storage.setItem(RETRY_KEY,JSON.stringify({id:row.id,attempts,at:nextAttempt}));}catch{}
    lastStatus='retrying';
   }
  }finally{
   active=null;
   if(!disposed&&!allowed())resetPolicy();
   else schedule(FIRST_DELAY);
   announce();
  }
 }
 function record(kind,module='other',test=false,route){
  if(!allowed()){
   if(!disposed&&(enabled||memory.size))resetPolicy();
   return;
  }
  if(!visible())return;
  const stamp=now();
  recent=recent.filter(at=>at<=stamp&&stamp-at<CAPTURE_WINDOW);
  if(!test&&recent.length>=MAX_EVENTS)return;
  const rows=pending();
  if(test&&rows.some(row=>row.test))return;
  if(rows.length>=MAX_PENDING){lastStatus='full';announce();return;}
  let id;
  try{id=makeId();}catch{return;}
  const context=errorContext(win);
  const row=queueEvent({version,at:stamp,test,event:{...context,route:route??context.route,kind,module}},id,stamp);
  if(!row)return;
  // Unique keys are immutable. Another tab may deliver the same batch with
  // the same ID, but it cannot overwrite this tab's unacknowledged reports.
  try{storage.setItem(QUEUE_PREFIX+id,JSON.stringify(row));}
  catch{memory.set(id,row);volatile=true;}
  if(!test)recent.push(stamp);
  if(lastStatus!=='retrying')lastStatus='waiting';
  announce();schedule(test?0:FIRST_DELAY);
  return id;
 }
 const expected=reason=>{
  if(!expectedDiagnosticFailure(reason))return false;
  if(reason.name==='TypeError'&&allowed()&&online()&&visible()){
   const stamp=now();networkWindow=networkWindow.filter(at=>stamp-at<=60000);networkWindow.push(stamp);
   if(networkWindow.length>=3){record('resource');networkWindow=[];}
  }
  return true;
 };
 const error=e=>{
  if(expected(e?.error))return;
  const resource=e?.target&&e.target!==win;
  const source=resource?(e.target.currentSrc||e.target.src||e.target.href):e?.filename;
  if(!ownDiagnosticSource(source,win))return;
  if(resource&&(!online()||!['SCRIPT','LINK','IMG'].includes(e.target.tagName)))return;
  record(resource?'resource':'script',errorModule(source));
 };
 const rejection=e=>{if(!expected(e?.reason))record('promise');};
 const resume=()=>{
  if(!allowed()){if(!disposed)resetPolicy();}
  else if(visible())schedule(1000);
  announce();
 };
 const storageChanged=e=>{
  if(e.key===KEY||e.key===null){enabled=diagnosticEnabled(storage);resume();}
  else if(e.key===ACK_KEY)announce();
  else if(e.key===RETRY_KEY&&allowed()){readRetry();schedule(0);announce();}
  else if(e.key?.startsWith(QUEUE_PREFIX)){if(allowed())schedule();announce();}
 };
 win?.addEventListener?.('error',error,true);
 win?.addEventListener?.('unhandledrejection',rejection);
 doc?.addEventListener?.('visibilitychange',resume);
 win?.addEventListener?.('online',resume);
 win?.addEventListener?.('offline',announce);
 win?.addEventListener?.('storage',storageChanged);
 win?.addEventListener?.('pageshow',resume);
 let observer=null;
 try{
  if(Observer?.supportedEntryTypes?.includes('longtask')){
   observer=new Observer(list=>{
    for(const entry of list.getEntries()){
     if(entry.duration<2000||!allowed()||!visible())continue;
     const stamp=Number(entry.startTime);
     if(!Number.isFinite(stamp))continue;
     slowWindow=slowWindow.filter(at=>stamp-at<=30000&&stamp>=at);slowWindow.push(stamp);
     if(slowWindow.length>=2){record('slow');slowWindow=[];}
    }
   });
   observer.observe({entryTypes:['longtask']});
  }
 }catch{}
 if(allowed())readRetry();
 resume();
 return{
  enabled:()=>enabled,
  status,
  subscribe(listener){subscribers.add(listener);return()=>subscribers.delete(listener);},
  setEnabled(value){
   try{storage.setItem(KEY,value?'true':'false');enabled=Boolean(value);}
   catch{enabled=false;resetPolicy();announce();return false;}
   resume();
   return true;
  },
  flush,
  queueTest:()=>record('script','app',true,'settings'),
  queuePlayerNavigationFailure:()=>record('promise','quran-navigation',false,'quran'),
  dispose(){
   disposed=true;stopTimer();active?.controller.abort();memory.clear();subscribers.clear();observer?.disconnect();
   win?.removeEventListener?.('error',error,true);
   win?.removeEventListener?.('unhandledrejection',rejection);
   doc?.removeEventListener?.('visibilitychange',resume);
   win?.removeEventListener?.('online',resume);
   win?.removeEventListener?.('offline',announce);
   win?.removeEventListener?.('storage',storageChanged);
   win?.removeEventListener?.('pageshow',resume);
  }
 };
}
export function mountDiagnosticSetting(container,reporter){
 const panel=document.createElement('details');
 panel.className='settings-extra diagnostic-setting settings-subsection';
 panel.innerHTML='<summary>'+settingsSectionLabel('diagnostics',uiLeaf('extraUi.diagnosticTitle'))+'</summary><div class="diagnostic-setting-body"><label class="switch-row"><span>'+uiLeaf('extraUi.diagnosticLabel')+'</span><input type="checkbox" '+uiAttribute('extraUi.diagnosticLabel',{},'aria-label')+'></label><p class="muted">'+uiLeaf('extraUi.diagnosticDescription')+'</p><p role="status" class="muted"></p><p data-diagnostic-storage class="muted" hidden>'+uiLeaf('extraUi.diagnosticTemporary')+'</p></div>';
 container.append(panel);
 bindUiLanguage(panel);
 const input=panel.querySelector('input'),statusNode=panel.querySelector('[role=status]'),storageNote=panel.querySelector('[data-diagnostic-storage]');
 let saveFailed=false;
 const repaint=state=>{
  if(!panel.isConnected){stop();return;}
  input.checked=reporter.enabled();
  const key={idle:state.lastConfirmedAt?'diagnosticSent':'diagnosticReady',disabled:'diagnosticPaused',waiting:'diagnosticWaiting',offline:'diagnosticOffline',sending:'diagnosticSending',retrying:'diagnosticRetry',full:'diagnosticFull',sent:'diagnosticSent',rejected:'diagnosticRejected'}[state.state];
  setUiMessage(statusNode,saveFailed?uiMessage('extraUi.settingSaveFailed'):input.checked&&key?uiMessage('extraUi.'+key):null);
  storageNote.hidden=!input.checked||!state.volatile;
 };
 const stop=reporter.subscribe(repaint);
 input.onchange=()=>{
  saveFailed=!reporter.setEnabled(input.checked);
  repaint(reporter.status());
 };
 panel.ontoggle=()=>{if(panel.open)repaint(reporter.status());};
 repaint(reporter.status());
 return stop;
}
