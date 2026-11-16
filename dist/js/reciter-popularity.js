import{uiLeaf,uiAttribute,setUiMessage,uiMessage,uiError}from './ui.js';
import{initGuestCompetition,recordGuestListening}from './guest-competition.js';
import{initListenerPresence}from './listener-presence.js';
import{personalDataAllowed}from './audience.js';
import{initCompetition}from './competition-client.js';
import{safeListener}from './reciter-ranking-core.js';
import{read,write}from './storage.js';
import{esc,closeModal}from './ui.js';
import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{RECITERS,reciterInfo}from './quran-reciters.js';
import{createListeningMeter,listeningDayKey,listeningPeriodTotals,addListeningDay}from './reciter-popularity-core.js';
import{createCreditMinuteMeter}from './listening-credit-core.js';
import{createListeningCredit}from './listening-credit.js';
import{listeningTime,rankingModal,rankingErrorMessage}from './ranking-ui.js';
const KEY='reciter-popularity-consent-v1',endpoint=OWNER_PROJECT_URL+'/functions/v1/reciter-popularity';
let account=()=>({signedIn:false}),client=()=>null,cache=null,loaded=0,inflight=null,initialized=false,currentCredit=null;
export const listeningCreditPaused=()=>currentCredit?currentCredit.paused():null;
const rankingData=new Map();let selectedGlobalPeriod='month';
const allowed={has:id=>RECITERS.some(r=>!r.variantOf&&r.id===id)};
export const popularityEnabled=()=>personalDataAllowed()&&!!account().signedIn&&!!account().userId&&read(KEY+':'+account().userId,true)===true;

let visibilityRevision=0;
export async function loadPopularReciters(){
 if(!personalDataAllowed())return [];
 const period=selectedGlobalPeriod,revision=visibilityRevision;
 if(cache&&Date.now()-loaded<60000)return cache;if(inflight)return inflight;
 const task=(async()=>{
  const response=await fetch(endpoint+'?period='+period,{headers:{apikey:OWNER_PUBLIC_KEY},credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('unavailable');const data=await response.json();if(!Array.isArray(data.items)||![1,7,30].includes(data.windowDays))throw Error('invalid');
  const ids=[...new Set(data.items.filter(id=>allowed.has(id)))].slice(0,100);
  if(selectedGlobalPeriod!==period||visibilityRevision!==revision)return ids;
  rankingData.clear();for(const row of data.ranking||[])if(allowed.has(row.reciter)&&Number.isSafeInteger(row.minutes)&&row.minutes>0)rankingData.set(row.reciter,{minutes:row.minutes,seconds:Number.isSafeInteger(row.seconds)&&row.seconds>0?row.seconds:row.minutes*60,listeners:Array.isArray(row.listeners)?row.listeners.map(safeListener).filter(Boolean).slice(0,4):[]});
  cache=ids;loaded=Date.now();return ids;
 })();inflight=task;try{return await task;}finally{if(inflight===task)inflight=null;}
}
export function popularConsentMarkup(){const signed=account().signedIn;return "<details class=\"popular-participation\"><summary>"+uiLeaf("rankingUi.accounting")+"</summary><p>"+uiLeaf("rankingUi.accountingDisclosure")+"</p><p>"+uiLeaf("rankingUi.nightDisclosure")+"</p>"+(signed?'<label><input type="checkbox" data-popular-consent '+(popularityEnabled()?'checked':'')+"> "+uiLeaf("rankingUi.countMyListening")+"</label><p>"+uiLeaf("rankingUi.optOutDisclosure")+"</p>":"<a class=\"text-button\" href=\"#account\">"+uiLeaf("rankingUi.saveHistoryAccount")+"</a>")+''+'</details>';} 
export function bindPopularConsent(host){const input=host.querySelector('[data-popular-consent]');if(input)input.onchange=()=>{if(!write(KEY+':'+(account().userId||'device'),input.checked)){input.checked=popularityEnabled();return;}window.dispatchEvent(new Event('salah:popularity-consent'));};bindListenerPrivacy(host);}
const PERSONAL='reciter-personal-listening-v1:',localScope=()=>PERSONAL+(account().userId||'device');let workingKey=null,working=null;
function cleanTotals(data){const totals={};if(data&&typeof data==='object')for(const [id,n]of Object.entries(data))if(allowed.has(id)&&Number.isFinite(n)&&n>0&&n<315360000)totals[id]=n;return totals;}
function sanitizedPersonal(data){const days={},cutoff=new Date();cutoff.setDate(cutoff.getDate()-92);const first=listeningDayKey(cutoff),last=listeningDayKey(Date.now());if(data?.days&&typeof data.days==='object')for(const [day,rows]of Object.entries(data.days))if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&day>=first&&day<=last&&listeningDayKey(new Date(day+'T12:00:00'))===day)days[day]=cleanTotals(rows);return {since:typeof data?.since==='string'?data.since:new Date().toISOString(),dailySince:typeof data?.dailySince==='string'&&Number.isFinite(Date.parse(data.dailySince))?data.dailySince:new Date().toISOString(),totals:cleanTotals(data?.totals),days};}
export function personalListening(period='all'){const data=workingKey===localScope()&&working?working:sanitizedPersonal(read(localScope(),null));return period==='all'?data:{...data,totals:listeningPeriodTotals(data,period)};}
export function personalTop(period='all'){return Object.entries(personalListening(period).totals).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([id])=>id);}
export const formatListeningTime=listeningTime;
export {listeningDayKey};
export function initReciterPopularity({playback,ruqyah=null,getAccount,getClient,now=Date.now}){if(initialized)return;initialized=true;account=getAccount;client=getClient;let dirty=false,creditDirty=false,queueDirty=false,eligible=null,eligibleKey=null,lastFlush=0,currentUser=null,sending=false,pending=[],retryAt=0,finalSample=false;
 const credit=createListeningCredit({getAccount,now,beforeAction:()=>{sample();flush();}});currentCredit=credit;initGuestCompetition({getAccount,getClient,now,credit});
 const flush=()=>{if(creditDirty&&eligibleKey&&eligible&&write(eligibleKey,{...eligible,version:1}))creditDirty=false;if(dirty&&workingKey&&working){lastFlush=now();if(write(workingKey,working)){dirty=false;window.dispatchEvent(new Event('salah:personal-listening'));}}};
 const sharedMeter=createCreditMinuteMeter({onMinute:(reciter,createdAt)=>{if(allowed.has(reciter)&&pending.length<120){pending.push({reciter,eventId:crypto.randomUUID(),consent:true,createdAt});queueDirty=true;}}});
 const localMeter=createListeningMeter({onProgress:(id,seconds)=>{if(!allowed.has(id)||!working)return;working.totals[id]=(working.totals[id]||0)+seconds;addListeningDay(working.days,id,seconds,now());dirty=true;
  for(const part of credit.segments(seconds,now())){eligible.totals[id]=(eligible.totals[id]||0)+part.seconds;addListeningDay(eligible.days,id,part.seconds,part.at);creditDirty=true;recordGuestListening(id,part.seconds,part.at,{final:finalSample});if(popularityEnabled())sharedMeter.progress(id,part.seconds,part.at);}
  if(finalSample)window.dispatchEvent(new Event('salah:personal-listening-final'));
  window.dispatchEvent(new Event('salah:personal-listening-progress'));}});
 const queueKey=()=> 'reciter-minute-queue-v2:'+currentUser;
 const persistQueue=()=>{if(currentUser)write(queueKey(),pending);queueDirty=false;};
 const savedQueue=()=>{const rows=read(queueKey(),[]);return Array.isArray(rows)?rows.filter(p=>allowed.has(p?.reciter)&&/^[a-f0-9-]{36}$/i.test(p?.eventId||'')&&p.consent===true&&Number.isFinite(p.createdAt)&&p.createdAt<=now()&&now()-p.createdAt<2592000000).slice(0,120):[];};
 const clearShared=()=>{sharedMeter.reset();pending=[];retryAt=0;if(!popularityEnabled())persistQueue();};window.addEventListener('salah:popularity-consent',clearShared);window.addEventListener('pagehide',()=>{sample({final:true});flush();});document.addEventListener('visibilitychange',()=>{sample({final:document.hidden});flush();});
 // Both players share exclusive audio focus. A retained ruqyah record owns its
 // progress, even while paused; the previous Quran position must not be sampled.
 const listeningState=()=>{const s=ruqyah?.state;return s?.record?{reciter:s.record.reciter,recordingId:s.record.id,status:s.status,positionSeconds:s.positionSeconds,seekRevision:s.seekRevision}:playback.state;};
 const sample=(options={})=>{const auth=account(),key=localScope();if(workingKey!==key){flush();workingKey=key;working=sanitizedPersonal(read(key,null));eligibleKey='reciter-competition-credit-v1:'+(auth.userId||'device');const saved=read(eligibleKey,null);eligible=sanitizedPersonal(saved?.version===1?saved:saved===null?working:{});creditDirty=true;localMeter.reset();}if(currentUser!==auth.userId){currentUser=auth.userId;clearShared();if(popularityEnabled())pending=savedQueue();}const state={...listeningState()};if(Number.isFinite(state.trackPositionSeconds))state.positionSeconds=state.trackPositionSeconds;if(state.reciter){const reciter=reciterInfo(state.reciter);state.reciter=reciter.variantOf||reciter.id;}finalSample=options?.final===true||state.status!=='playing';localMeter.sample(state,now(),true);credit.tick(!!state.reciter&&['playing','paused'].includes(state.status));
  // Media events can continue while iOS suspends setInterval. Checkpoint real
  // progress here too, with bounded writes, and save the short tail on pause/end.
  if(dirty&&(state.status!=='playing'||now()-lastFlush>=5000))flush();
  const enabled=popularityEnabled()&&auth.signedIn&&!!auth.userId;if(!enabled){clearShared();return;}if(queueDirty)persistQueue();};
 playback.subscribe(sample);ruqyah?.subscribe(sample);
 initCompetition({getAccount:getAccount,getClient:getClient,getSnapshot:()=>eligibleKey==='reciter-competition-credit-v1:'+(account().userId||'device')&&eligible?eligible:{totals:{},days:{}},isEnabled:popularityEnabled,credit});
 initListenerPresence({playback,getAccount,isEnabled:popularityEnabled});
 setInterval(async()=>{sample();if(now()-lastFlush>=15000){lastFlush=now();flush();}if(!popularityEnabled()||!account().signedIn||sending||!pending.length||now()<retryAt||navigator.onLine===false)return;sending=true;const item=pending[0],user=currentUser;try{const {data,error}=await client().auth.getSession();if(error||!data?.session||data.session.user.id!==user)return;if(!popularityEnabled()||currentUser!==user)return;const response=await fetch(endpoint,{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({reciter:item.reciter,eventId:item.eventId,consent:true,occurredAt:item.createdAt,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}),credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(response.ok){const result=await response.json();if(result.ok===true&&result.counted===true){if(currentUser===user&&pending[0]===item){pending.shift();persistQueue();}loaded=0;window.dispatchEvent(new Event('salah:popularity-updated'));}else retryAt=now()+60000;}else if(response.status===400){if(currentUser===user&&pending[0]===item){pending.shift();persistQueue();}}else retryAt=now()+60000;}catch{retryAt=now()+15000;}finally{sending=false;}},1000);
}

export const publicListenerPhoto=id=>endpoint+'?avatar='+encodeURIComponent(id);
const visibility=new Map();
export const rankingListeners=id=>rankingData.get(id)?.listeners||[];
export const rankingSeconds=id=>rankingData.get(id)?.seconds||0;
export const globalRankingPeriod=()=>selectedGlobalPeriod;
export function setGlobalRankingPeriod(period){if(['day','week','month'].includes(period)){selectedGlobalPeriod=period;cache=null;loaded=0;inflight=null;rankingData.clear();}}
async function profileRequest(body){
 const user=account().userId;if(!account().signedIn||!user)throw uiError('rankingUi.signInRequired');
 const {data,error}=await client().auth.getSession();if(error||!data?.session||data.session.user.id!==user)throw uiError('rankingUi.signInRequired');
 if(account().userId!==user)throw uiError('rankingUi.accountChanged');const response=await fetch(endpoint+(body?'':'?profile=me'),{method:body?'POST':'GET',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw uiError('rankingUi.saveTryAgain');const result=await response.json();
 if(account().userId!==user)throw uiError('rankingUi.accountChanged');if(!['hidden','initial','profile'].includes(result.mode))throw uiError('rankingUi.settingUnavailable');
 visibility.set(user,result.mode);if(body){window.dispatchEvent(new CustomEvent('salah:listener-visibility',{detail:{mode:result.mode}}));visibilityRevision++;cache=null;loaded=0;inflight=null;rankingData.clear();}return result.mode;
}

export function listenerPrivacyMarkup({allowJoin=true}={}){if(!account().signedIn)return '';return "<div class=\"rank-privacy-bar\"><span id=\"listener-privacy-hint\" class=\"muted\">"+uiLeaf("rankingUi.anonymity")+"</span><label class=\"switch-row listener-icon-switch\"><span class=\"listener-mode-icon listener-mode-public\"><svg viewBox=\"0 0 24 24\" role=\"img\" "+uiAttribute("rankingUi.visibleNicknamePhoto",{},"aria-label")+" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg></span><input type=\"checkbox\" id=\"listener-anonymous\" role=\"switch\" "+uiAttribute("rankingUi.anonymousSwitch",{},"aria-label")+" checked disabled><span class=\"listener-mode-icon listener-mode-anonymous\"><svg viewBox=\"0 0 24 24\" role=\"img\" "+uiAttribute("rankingUi.hiddenNicknamePhoto",{},"aria-label")+" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m3 3 18 18M9.5 5.3A12.8 12.8 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 4M6.2 6.2A19 19 0 0 0 2 12s3.5 7 10 7a12.8 12.8 0 0 0 5.8-1.8M9.9 9.9a3 3 0 0 0 4.2 4.2\"/></svg></span></label>"+(allowJoin?"<button type=\"button\" class=\"text-button\" id=\"listener-join-anonymous\" hidden>"+uiLeaf("rankingUi.joinAnonymously")+"</button>":'')+'<p id="listener-mode-status" class="muted" role="status"></p></div>';}
function bindListenerPrivacy(host){
 const anon=host.querySelector('#listener-anonymous'),join=host.querySelector('#listener-join-anonymous'),hint=host.querySelector('#listener-privacy-hint'),line=host.querySelector('#listener-mode-status');if(!anon)return;
 const user=account().userId;let current='hidden';
 const paint=mode=>{if(!anon.isConnected||account().userId!==user)return;current=mode;anon.checked=mode!=='profile';anon.disabled=false;if(join){join.disabled=false;join.hidden=mode!=='hidden';}setUiMessage(hint,uiMessage(mode==='hidden'?'rankingUi.youHidden':'rankingUi.anonymity'));};
 void profileRequest().then(paint).catch(()=>{setUiMessage(line,uiMessage('rankingUi.privacyLoadFailed'));});
 const save=async mode=>{if(account().userId!==user)return;anon.disabled=true;if(join)join.disabled=true;setUiMessage(line,uiMessage('rankingUi.saving'));try{paint(await profileRequest({profileMode:mode}));setUiMessage(line,'');window.dispatchEvent(new Event('salah:popularity-updated'));}catch(e){paint(current);setUiMessage(line,rankingErrorMessage(e));}};
 if(join)join.onclick=()=>void save('initial');
 anon.onchange=()=>{if(!anon.checked){rankingModal("<div class=\"modal-head\"><h2>"+uiLeaf("rankingUi.showIdentityQuestion")+"</h2><button class=\"text-button\" data-close>"+uiLeaf("rankingUi.cancel")+"</button></div><p>"+uiLeaf("rankingUi.showIdentityDisclosure")+"</p><button class=\"button\" id=\"listener-confirm-public\">"+uiLeaf("rankingUi.showIdentity")+"</button>");document.getElementById('listener-confirm-public').onclick=()=>{closeModal();void save('profile');};anon.checked=true;}else void save('initial');};
}
