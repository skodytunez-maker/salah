import {getLocale} from './i18n.js';
import {accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY} from './owner-auth.js';
import {esc,uiLeaf,uiMessage,setUiMessage} from './ui.js';
import {reciterInfo} from './quran-reciters.js';

const codeFormat=/^SALAH-[0-9A-F]{8}$/;
export function normalizeReferralCode(value){
 const code=value.trim().toUpperCase();
 return !code||codeFormat.test(code)?code:null;
}

function duration(seconds){
 const units=[['hour',Math.floor(seconds/3600)],['minute',Math.floor(seconds%3600/60)],['second',seconds%60]];
 const parts=units.filter(([,value])=>value>0);
 return (parts.length?parts:[units[1]]).map(([unit,value])=>
  new Intl.NumberFormat(getLocale(),{style:'unit',unit,unitDisplay:'short'}).format(value)
 ).join(' ');
}

export function referralInviteesMarkup(referrals){
 if(!Number.isSafeInteger(referrals?.count)||referrals.count<0||!Array.isArray(referrals.invitees)||
    referrals.invitees.length!==Math.min(referrals.count,100))return '';
 return '<p class="muted">'+uiLeaf('referralUi.directCount',{count:referrals.count})+'</p>'+
  (referrals.count?'<details class="settings-extra"><summary>'+uiLeaf('reciterAudience.whoInvited')+'</summary>'+
   '<ul>'+referrals.invitees.map(label=>'<li>'+(typeof label==='string'&&label.trim()?
    '<span lang="" dir="auto">'+esc(label.slice(0,40))+'</span>':uiLeaf('reciterAudience.hiddenInvitee'))+'</li>').join('')+'</ul>'+
   (referrals.count>100?'<p class="muted">'+uiLeaf('reciterAudience.invitedPreview')+'</p>':'')+'</details>':'');
}

export function referralRecommendationsMarkup(recommendations,formatTime=value=>esc(duration(value))){
 if(!Array.isArray(recommendations))return '';
 const rows=recommendations.flatMap(row=>{
  if(typeof row?.reciter!=='string'||!/^ar\.[a-z0-9_-]{1,80}$/.test(row.reciter)||
     !Number.isSafeInteger(row.seconds)||row.seconds<0)return [];
  try{return ['<div><dt lang="" dir="auto" translate="no">'+esc(reciterInfo(row.reciter).name)+'</dt><dd>'+
    formatTime(row.seconds)+'</dd></div>'];}
  catch{return [];}
 });
 return rows.length?'<div class="account-referral-recommendations"><h3>'+uiLeaf('referralUi.recommendations')+
  '</h3><dl>'+rows.join('')+'</dl></div>':'';
}

async function accountReferralRequest(action,userId){
 const {data,error}=await accountAuthClient().auth.getSession();
 const session=data?.session;
 if(error||session?.user?.id!==userId)throw Error('invalid_session');
 const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/account-referrals',{
  method:'POST',
  headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
  body:JSON.stringify({action}),
  cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw Error('referrals_unavailable');
 const summary=await response.json();
 if(!summary||!Number.isSafeInteger(summary.seconds)||summary.seconds<0||
     (summary.code===null?(summary.seconds!==0&&summary.scope!=='community')||action==='create':
      typeof summary.code!=='string'||!codeFormat.test(summary.code)))throw Error('invalid_summary');
 return summary;
}

export function mountAccountReferrals(area,{userId,isActive,request=accountReferralRequest,before=area.querySelector('#counter-account-out'),title='referralUi.title'}){
 const panel=document.createElement('details');
 panel.className='settings-extra account-devices';
 panel.innerHTML='<summary>'+uiLeaf(title)+'</summary><div class="account-device-body">'+
  '<div role="status"></div><section class="account-referral-total" data-referral-total hidden aria-labelledby="account-referral-ajr">'+
  '<h3 id="account-referral-ajr"'+(title==='referralUi.ajr'?' hidden':'')+'>'+uiLeaf('referralUi.ajr')+'</h3><p data-referral-duration aria-live="polite"></p><div data-referral-invitees></div>'+
  '<div data-referral-recommendations></div><p class="account-referral-intention">'+uiLeaf('referralUi.intention')+'</p></section>'+
  '<div data-referral-code hidden><label for="account-referral-code">'+
  uiLeaf('referralUi.code')+'</label><input id="account-referral-code" type="text" dir="ltr" readonly></div>'+
  '<div class="account-device-actions"><button class="button secondary" type="button" data-referral-create hidden>'+
  uiLeaf('referralUi.create')+'</button><button class="button secondary" type="button" data-referral-copy hidden>'+
  uiLeaf('referralUi.copy')+'</button><button class="button secondary" type="button" data-referral-refresh hidden>'+
  uiLeaf('settingsExtra.update')+'</button></div><p data-referral-copy-status role="status"></p></div>';
 area.insertBefore(panel,before);
 const status=panel.querySelector('[role="status"]'),copyStatus=panel.querySelector('[data-referral-copy-status]');
 const codeField=panel.querySelector('#account-referral-code'),codeGroup=panel.querySelector('[data-referral-code]');
 const total=panel.querySelector('[data-referral-total]'),totalDuration=panel.querySelector('[data-referral-duration]');
 const create=panel.querySelector('[data-referral-create]'),copy=panel.querySelector('[data-referral-copy]');
 const refresh=panel.querySelector('[data-referral-refresh]');
 const live=()=>panel.isConnected&&isActive();
 let busy=false;
 async function load(action){
  if(!live()||busy)return;
  busy=true;
  create.disabled=refresh.disabled=true;
  setUiMessage(copyStatus,'');
  setUiMessage(status,uiMessage('referralUi.loading'));
  try{
   const {code,seconds,referrals,scope,recommendations}=await request(action,userId);
   if(!live())return;
   const community=scope==='community';
   const reciterRows=community?'':referralRecommendationsMarkup(recommendations);
   codeField.value=code||'';
   codeGroup.hidden=copy.hidden=!code;
   refresh.hidden=!code&&!community&&!reciterRows;
   create.hidden=Boolean(code);
   total.hidden=!code&&!community&&!reciterRows;
   totalDuration.hidden=!code&&!community;
   const totalKey=community?'referralUi.communityTotal':'referralUi.total';
   setUiMessage(totalDuration,code||community?uiMessage(totalKey,{duration:duration(seconds)}):'');
   const invited=panel.querySelector('[data-referral-invitees]');
   const opened=invited.querySelector('details')?.open;
   invited.innerHTML=referralInviteesMarkup(referrals);
   if(opened&&invited.querySelector('details'))invited.querySelector('details').open=true;
   panel.querySelector('[data-referral-recommendations]').innerHTML=reciterRows;
   setUiMessage(status,code?'':uiMessage('referralUi.intro'));
  }catch{
   if(!live())return;
   refresh.hidden=false;
   setUiMessage(status,uiMessage('referralUi.unavailable'));
  }finally{
   busy=false;
   create.disabled=refresh.disabled=false;
  }
 }
 panel.ontoggle=event=>{if((!event||event.target===panel)&&panel.open)void load('summary');};
 create.onclick=()=>load('create');
 refresh.onclick=()=>load('summary');
 copy.onclick=async()=>{
  if(!live()||!codeField.value)return;
  try{
   await navigator.clipboard.writeText(codeField.value);
   if(live())setUiMessage(copyStatus,uiMessage('referralUi.copied'));
  }catch{
   if(live()){codeField.focus();codeField.select();}
  }
 };
}
