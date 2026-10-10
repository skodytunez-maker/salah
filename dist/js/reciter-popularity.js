import{safeListener}from './reciter-ranking-core.js';
import{read,write}from './storage.js';
import{esc,modal,closeModal}from './ui.js';
import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{RECITERS,reciterInfo}from './quran-reciters.js';
import{createListeningMeter,formatListeningTime,listeningDayKey,listeningPeriodTotals,addListeningDay}from './reciter-popularity-core.js';
const KEY='reciter-popularity-consent-v1',endpoint=OWNER_PROJECT_URL+'/functions/v1/reciter-popularity';
let account=()=>({signedIn:false}),client=()=>null,cache=null,loaded=0,inflight=null,initialized=false;
const rankingData=new Map();let selectedGlobalPeriod='month';
const allowed=new Set(RECITERS.filter(r=>!r.variantOf).map(r=>r.id));
export const popularityEnabled=()=>!!account().signedIn&&!!account().userId&&read(KEY+':'+account().userId,true)===true;

let visibilityRevision=0;
export async function loadPopularReciters(){
 const period=selectedGlobalPeriod,revision=visibilityRevision;
 if(cache&&Date.now()-loaded<60000)return cache;if(inflight)return inflight;
 const task=(async()=>{
  const response=await fetch(endpoint+'?period='+period,{headers:{apikey:OWNER_PUBLIC_KEY},credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('unavailable');const data=await response.json();if(!Array.isArray(data.items)||![1,7,30].includes(data.windowDays))throw Error('invalid');
  const ids=[...new Set(data.items.filter(id=>allowed.has(id)))].slice(0,33);
  if(selectedGlobalPeriod!==period||visibilityRevision!==revision)return ids;
  rankingData.clear();for(const row of data.ranking||[])if(allowed.has(row.reciter)&&Number.isSafeInteger(row.minutes)&&row.minutes>0)rankingData.set(row.reciter,{minutes:row.minutes,seconds:Number.isSafeInteger(row.seconds)&&row.seconds>0?row.seconds:row.minutes*60,listeners:Array.isArray(row.listeners)?row.listeners.map(safeListener).filter(Boolean).slice(0,4):[]});
  cache=ids;loaded=Date.now();return ids;
 })();inflight=task;try{return await task;}finally{if(inflight===task)inflight=null;}
}
export function popularConsentMarkup(){const signed=account().signedIn;return '<details class="popular-participation"><summary>Учёт прослушиваний</summary><p>Новые прослушивания учитываются автоматически, по умолчанию анонимно. Ник и фото доступны только после вашего выбора. Учитываем только минуты воспроизведения Корана. Отправляются чтец, отметка минуты и случайный код события. Для защиты от повторов сервер хранит технический код аккаунта, а не имя или почту. Аяты не отправляются. Записи хранятся 30 дней.</p>'+(signed?'<label><input type="checkbox" data-popular-consent '+(popularityEnabled()?'checked':'')+'> Учитывать мои прослушивания</label><p>Можно отключить в любой момент. Уже учтённые минуты остаются в общем рейтинге до истечения срока хранения.</p>':'<a class="text-button" href="#account">Войти для участия</a>')+''+'</details>';} 
export function bindPopularConsent(host){const input=host.querySelector('[data-popular-consent]');if(input)input.onchange=()=>{if(!write(KEY+':'+(account().userId||'device'),input.checked)){input.checked=popularityEnabled();return;}window.dispatchEvent(new Event('salah:popularity-consent'));};bindListenerPrivacy(host);}
const PERSONAL='reciter-personal-listening-v1:',localScope=()=>PERSONAL+(account().userId||'device');let workingKey=null,working=null;
function cleanTotals(data){const totals={};if(data&&typeof data==='object')for(const [id,n]of Object.entries(data))if(allowed.has(id)&&Number.isFinite(n)&&n>0&&n<315360000)totals[id]=n;return totals;}
function sanitizedPersonal(data){const days={},cutoff=new Date();cutoff.setDate(cutoff.getDate()-92);const first=listeningDayKey(cutoff),last=listeningDayKey(Date.now());if(data?.days&&typeof data.days==='object')for(const [day,rows]of Object.entries(data.days))if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&day>=first&&day<=last&&listeningDayKey(new Date(day+'T12:00:00'))===day)days[day]=cleanTotals(rows);return {since:typeof data?.since==='string'?data.since:new Date().toISOString(),dailySince:typeof data?.dailySince==='string'&&Number.isFinite(Date.parse(data.dailySince))?data.dailySince:new Date().toISOString(),totals:cleanTotals(data?.totals),days};}
export function personalListening(period='all'){const data=workingKey===localScope()&&working?working:sanitizedPersonal(read(localScope(),null));return period==='all'?data:{...data,totals:listeningPeriodTotals(data,period)};}
export function personalTop(period='all'){return Object.entries(personalListening(period).totals).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([id])=>id);}
export {formatListeningTime,listeningDayKey};
export function initReciterPopularity({playback,getAccount,getClient,now=Date.now}){if(initialized)return;initialized=true;account=getAccount;client=getClient;let dirty=false,lastFlush=0,currentUser=null,sending=false,pending=[];
 const flush=()=>{if(dirty&&workingKey&&working){if(write(workingKey,working)){dirty=false;window.dispatchEvent(new Event('salah:personal-listening'));}}};
 const localMeter=createListeningMeter({onProgress:(id,seconds)=>{if(!allowed.has(id)||!working)return;working.totals[id]=(working.totals[id]||0)+seconds;addListeningDay(working.days,id,seconds,now());dirty=true;}}),sharedMeter=createListeningMeter();
 const clearShared=()=>{sharedMeter.reset();pending=[];};window.addEventListener('salah:popularity-consent',clearShared);window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
 const sample=()=>{const auth=account(),key=localScope();if(workingKey!==key){flush();workingKey=key;working=sanitizedPersonal(read(key,null));localMeter.reset();}if(currentUser!==auth.userId){currentUser=auth.userId;clearShared();}const state=playback.state;if(state.reciter){const reciter=reciterInfo(state.reciter);state.reciter=reciter.variantOf||reciter.id;}localMeter.sample(state,now(),true);const enabled=popularityEnabled()&&auth.signedIn&&!!auth.userId;const ready=sharedMeter.sample(state,now(),enabled);if(!enabled){clearShared();return;}for(const reciter of ready)if(allowed.has(reciter)&&pending.length<4)pending.push({reciter,eventId:crypto.randomUUID(),consent:true});};
 playback.subscribe(sample);
 setInterval(async()=>{sample();if(now()-lastFlush>=15000){lastFlush=now();flush();}if(!popularityEnabled()||!account().signedIn||sending||!pending.length||navigator.onLine===false)return;sending=true;const item=pending[0],user=currentUser;try{const {data,error}=await client().auth.getSession();if(error||!data?.session||data.session.user.id!==user)return;if(!popularityEnabled()||currentUser!==user)return;const response=await fetch(endpoint,{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(item),credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(response.ok){if(pending[0]===item)pending.shift();loaded=0;window.dispatchEvent(new Event('salah:popularity-updated'));}else if(response.status>=400&&response.status<500){if(pending[0]===item)pending.shift();}}catch{}finally{sending=false;}},1000);
}

export const publicListenerPhoto=id=>endpoint+'?avatar='+encodeURIComponent(id);
const visibility=new Map();
export const rankingListeners=id=>rankingData.get(id)?.listeners||[];
export const rankingSeconds=id=>rankingData.get(id)?.seconds||0;
export const globalRankingPeriod=()=>selectedGlobalPeriod;
export function setGlobalRankingPeriod(period){if(['day','week','month'].includes(period)){selectedGlobalPeriod=period;cache=null;loaded=0;inflight=null;rankingData.clear();}}
async function profileRequest(body){
 const user=account().userId;if(!account().signedIn||!user)throw Error('Войдите в аккаунт');
 const {data,error}=await client().auth.getSession();if(error||!data?.session||data.session.user.id!==user)throw Error('Войдите в аккаунт');
 if(account().userId!==user)throw Error('Аккаунт изменился');const response=await fetch(endpoint+(body?'':'?profile=me'),{method:body?'POST':'GET',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Не удалось сохранить. Попробуйте ещё раз.');const result=await response.json();
 if(account().userId!==user)throw Error('Аккаунт изменился');if(!['hidden','initial','profile'].includes(result.mode))throw Error('Не удалось получить настройку');
 visibility.set(user,result.mode);if(body){visibilityRevision++;cache=null;loaded=0;inflight=null;rankingData.clear();}return result.mode;
}

export function listenerPrivacyMarkup(){if(!account().signedIn)return '';return '<div class="rank-privacy-bar"><span id="listener-privacy-hint" class="muted">Анонимность</span><label class="switch-row listener-icon-switch"><span class="listener-mode-icon listener-mode-public"><img src="./assets/icons/user.svg" alt="Ник и фото видны"></span><input type="checkbox" id="listener-anonymous" role="switch" aria-label="Анонимный режим: скрыть ник и фото" checked disabled><span class="listener-mode-icon listener-mode-anonymous"><img src="./assets/icons/user-ninja.svg" alt="Анонимно"></span></label><button type="button" class="text-button" id="listener-join-anonymous" hidden>Участвовать анонимно</button><p id="listener-mode-status" class="muted" role="status"></p></div>';}
function bindListenerPrivacy(host){
 const anon=host.querySelector('#listener-anonymous'),join=host.querySelector('#listener-join-anonymous'),hint=host.querySelector('#listener-privacy-hint'),line=host.querySelector('#listener-mode-status');if(!anon||!join)return;
 const user=account().userId;let current='hidden';
 const paint=mode=>{if(!anon.isConnected||account().userId!==user)return;current=mode;anon.checked=mode!=='profile';anon.disabled=false;join.disabled=false;join.hidden=mode!=='hidden';hint.textContent=mode==='hidden'?'Вы скрыты':'Анонимность';};
 void profileRequest().then(paint).catch(()=>{line.textContent='Не удалось загрузить настройку. Откройте раздел ещё раз.';});
 const save=async mode=>{if(account().userId!==user)return;anon.disabled=join.disabled=true;line.textContent='Сохраняем…';try{paint(await profileRequest({profileMode:mode}));line.textContent='';window.dispatchEvent(new Event('salah:popularity-updated'));}catch(e){paint(current);line.textContent=e.message;}};
 join.onclick=()=>void save('initial');
 anon.onchange=()=>{if(!anon.checked){modal('<div class="modal-head"><h2>Показать ник и фото?</h2><button class="text-button" data-close>Отмена</button></div><p>Все, кто откроет общий топ SALAH, увидят ваш ник и фото рядом с чтецами, которых вы слушаете. Это можно отключить в любой момент.</p><button class="button" id="listener-confirm-public">Показать ник и фото</button>');document.getElementById('listener-confirm-public').onclick=()=>{closeModal();void save('profile');};anon.checked=true;}else void save('initial');};
}
