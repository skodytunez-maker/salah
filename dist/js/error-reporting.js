import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
const KEY='salah:diagnostics-v1';
export const ERROR_ROUTES=['home','knowledge','quran','adhkar','more','account','settings','calendar','qibla','umrah','support','learning','other'];
export const ERROR_KINDS=['script','promise','resource','slow'];
export const ERROR_MODULES=['app','quran','adhkar','qibla','support','settings','qr-login','account-devices','weather','other'];
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
export async function sendErrorBatch(events,version){
 const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/error-summary',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),version,events}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('unavailable');
}
export function createErrorReporter({version,win=globalThis.window,doc=globalThis.document,nav=globalThis.navigator,storage=null,send=sendErrorBatch,setTimer=setTimeout,clearTimer=clearTimeout,Observer=globalThis.PerformanceObserver}={}){
 try{storage=storage||globalThis.localStorage;}catch{}
 let enabled=diagnosticEnabled(storage),timer=null,disposed=false,sending=false,units=0;const pending=new Map();
 const allowed=()=>enabled&&!disposed&&nav?.doNotTrack!=='1';
 const flush=async()=>{clearTimer(timer);timer=null;if(!allowed()||doc?.hidden||nav?.onLine===false||sending||!pending.size)return;sending=true;const keys=[...pending.keys()].slice(0,10),batch=keys.map(k=>pending.get(k));keys.forEach(k=>pending.delete(k));try{await send(batch,version);}catch{}finally{sending=false;if(allowed()&&pending.size)timer=setTimer(flush,10000);}};
 const record=(kind,module='other')=>{
  if(!allowed()||doc?.hidden||units>=20)return;const context=errorContext(win),key=[context.route,context.screen,kind,module].join(':');units++;const row=pending.get(key)||{...context,kind,module,count:0};row.count++;pending.set(key,row);if(!timer)timer=setTimer(flush,10000);
 };
 let networkWindow=[];
 const expected=reason=>{if(!expectedDiagnosticFailure(reason))return false;if(reason.name==='TypeError'&&allowed()&&nav?.onLine!==false&&!doc?.hidden){const stamp=Date.now();networkWindow=networkWindow.filter(t=>stamp-t<=60000);networkWindow.push(stamp);if(networkWindow.length>=3){record('resource');networkWindow=[];}}return true;};
 const error=e=>{if(expected(e?.error))return;const resource=e?.target&&e.target!==win;const source=resource?(e.target.currentSrc||e.target.src||e.target.href):e?.filename;if(!ownDiagnosticSource(source,win))return;if(resource&&(nav?.onLine===false||!['SCRIPT','LINK','IMG'].includes(e.target.tagName)))return;record(resource?'resource':'script',errorModule(source));};
 const rejection=e=>{if(!expected(e?.reason))record('promise')};
 const resume=()=>{if(!doc?.hidden&&pending.size&&allowed()&&!timer)timer=setTimer(flush,1000);};
 win?.addEventListener?.('error',error,true);win?.addEventListener?.('unhandledrejection',rejection);doc?.addEventListener?.('visibilitychange',resume);win?.addEventListener?.('online',resume);
 let observer=null,slowWindow=[];
 try{if(Observer?.supportedEntryTypes?.includes('longtask')){observer=new Observer(list=>{for(const entry of list.getEntries()){if(entry.duration<2000||!allowed()||doc?.hidden)continue;const stamp=Number(entry.startTime);if(!Number.isFinite(stamp))continue;slowWindow=slowWindow.filter(t=>stamp-t<=30000&&stamp>=t);slowWindow.push(stamp);if(slowWindow.length>=2){record('slow');slowWindow=[];}};});observer.observe({entryTypes:['longtask']});}}catch{}
 return{enabled:()=>enabled,setEnabled(value){try{storage.setItem(KEY,value?'true':'false');enabled=!!value;}catch{enabled=false;return false;}if(!enabled){pending.clear();slowWindow=[];networkWindow=[];clearTimer(timer);timer=null;}return true;},flush,dispose(){disposed=true;pending.clear();clearTimer(timer);observer?.disconnect();win?.removeEventListener?.('error',error,true);win?.removeEventListener?.('unhandledrejection',rejection);doc?.removeEventListener?.('visibilitychange',resume);win?.removeEventListener?.('online',resume);}};
}
export function mountDiagnosticSetting(container,reporter){
 const panel=document.createElement('details');panel.className='settings-extra diagnostic-setting';panel.innerHTML='<summary>Отчёты о сбоях</summary><div class="diagnostic-setting-body"><label class="switch-row"><span>Сообщать о сбоях</span><input type="checkbox" aria-label="Сообщать о сбоях"></label><p class="muted">При включении SALAH автоматически сообщает о возникающих сбоях. Это не проверка по кнопке. Без текста ошибок и личных данных.</p><p role="status"></p></div>';container.append(panel);const input=panel.querySelector('input');input.checked=reporter.enabled();input.onchange=()=>{if(!reporter.setEnabled(input.checked)){input.checked=false;panel.querySelector('[role=status]').textContent='Не удалось сохранить настройку.';}};
}
