import{t}from './i18n.js';
import{createAdhkarActivityQueue}from './adhkar-activity-core.js';
import{lessonAccountReturn}from './lesson-invitation.js';
import{hasFounderWelcomeSeen}from './founder-welcome-core.js';
import{accountProfileMarkup}from './account-summary-core.js';
import{mountStaffEntry}from './staff-cabinet.js';
import{mountAccountAwards}from './quran-awards.js';
import{mountAccountAvatar}from './account-avatar.js';
import{mountQrScanner}from './qr-scanner.js';
import{mountAccountDevices}from './account-devices.js';
import{captureQrApproval,hasQrApproval,mountQrApproval,mountQrLogin,stopQrLogin,setQrApproval}from './qr-login.js';
import{mountOwnerAccount}from './admin.js';
import{accountAuthClient,checkAccountSession,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{createCounterSync}from './counter-sync-core.js';
import{esc,modal,uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute}from './ui.js';
let activityQueue=null;
const getActivityQueue=()=>activityQueue||(activityQueue=createAdhkarActivityQueue({storage:localStorage}));
let engine=null,session=null,timer=null,busy=null,status='local',reason='',identityKnown=false,host=null,accountScreen=0,accountArea=null;
export const counterSyncStatus=()=>({status,reason,identityKnown,userId:session?.user?.id||null,signedIn:!!session?.user?.email_confirmed_at&&!session.user.is_anonymous,nickname:typeof session?.user?.user_metadata?.nickname==='string'?session.user.user_metadata.nickname.trim().slice(0,40):'',founderWelcomeSeen:hasFounderWelcomeSeen(session?.user)});
function emailErrorMessage(error){
 if(navigator.onLine===false)return uiMessage('accountUi.emailOffline');
 if(error?.status===429||['over_email_send_rate_limit','over_request_rate_limit'].includes(error?.code))return uiMessage('accountUi.emailLimit');
 if(error?.status>=500||error?.code==='unexpected_failure')return uiMessage('accountUi.emailUnavailable');
 return uiMessage('accountUi.emailFailed');
}
function loginErrorMessage(error,method){
 if(navigator.onLine===false||error?.message==='offline')return uiMessage('accountUi.loginOffline');
 if(error?.status===429||error?.code==='over_request_rate_limit')return uiMessage('accountUi.loginLimit');
 if(error?.status>=500||error?.status===408||['unexpected_failure','request_timeout'].includes(error?.code)||['AuthRetryableFetchError','AbortError','TimeoutError'].includes(error?.name))return uiMessage('accountUi.loginUnavailable');
 if(method==='code'&&['otp_expired','invalid_credentials','invalid_code'].includes(error?.code))return uiMessage('accountUi.codeInvalid');
 if(method==='password'&&['invalid_credentials','invalid_login'].includes(error?.code))return uiMessage('accountUi.credentialsInvalid');
 return uiMessage(method==='code'?'accountUi.codeCheckFailed':'accountUi.loginCheckFailed');
}
const notice=()=>{window.dispatchEvent(new Event('salah:counter-status'));updateStatus();};
function lock(fn){return navigator.locks?.request?navigator.locks.request('salah:adhkar-progress-v2',fn):Promise.resolve(fn());}
function getEngine(){return engine||(engine=createCounterSync({storage:localStorage,uuid:()=>crypto.randomUUID(),withLock:lock,changed:kind=>{if(kind==='saved'||kind==='account')window.dispatchEvent(new Event('salah:counter-restored'));},request:async(uid,component)=>{
 const {data,error}=await accountAuthClient().auth.getSession();if(error||!data.session||data.session.user.id!==uid)throw Error('sign_in_required');
 const activityDays=getActivityQueue().pending(uid),payload=activityDays.length?{...component,activityDays}:component;
 const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/adhkar-sync',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'storage_unavailable');if(activityDays.length)getActivityQueue().acknowledge(uid,activityDays);return result;
}}));}
// Profile access checks identity independently of the counter upload queue.
async function refreshAccountSession({verifySession=false}={}){
 identityKnown=false;notice();
 try{
  let checked;
  for(let attempt=0;attempt<3;attempt++){
   checked=await checkAccountSession({force:verifySession&&attempt===0});
   if(checked.state!=='changed')break;
  }
  if(checked.state==='unavailable'||checked.state==='changed')throw Error('auth_unavailable');
  const next=checked.session,uid=next?.user?.id||null;
  session=next;await getEngine().activate(uid);identityKnown=true;
  if(!uid){status='local';reason=checked.state==='revoked'?'session_expired':'';notice();return false;}
  return true;
 }catch(error){status='pending';reason=error?.message==='auth_unavailable'?'auth_unavailable':'storage_unavailable';notice();return false;}
}
export async function synchronizeCounters({verifySession=false}={}){
 if(busy){if(verifySession){await busy;return synchronizeCounters({verifySession:true});}schedule();return busy;}
 const wasSignedIn=counterSyncStatus().signedIn;
 busy=(async()=>{
  if(!await refreshAccountSession({verifySession}))return{ok:false,reason:reason||'signed_out'};
  const userId=session.user.id;status='saving';notice();
  try{
   const result=await getEngine().sync();
   if(session?.user?.id!==userId)return{ok:false,reason:'account_changed'};
   status=result.ok?'saved':'pending';reason=result.reason||'';notice();return result;
  }catch{if(session?.user?.id===userId){status='pending';reason='storage_unavailable';notice();}return{ok:false,reason:'storage_unavailable'};}
 })();let result;try{result=await busy;}finally{busy=null;}
 if(wasSignedIn&&!counterSyncStatus().signedIn&&host&&location.hash.split('?')[0]==='#account'&&host.querySelector('#account-form-area')===accountArea)await showCounterAccount(host,uiMessage('accountUi.sessionEnded'),true);
 if(counterSyncStatus().signedIn&&host&&location.hash.split('?')[0]==='#account'&&host.querySelector('#account-form-area')===accountArea&&(accountArea.querySelector('#account-session-retry')||!wasSignedIn&&accountArea.querySelector('#counter-account-email-form')))await showCounterAccount(host,'',true);
 return result;
}
let pendingSessionCheck=false;
function schedule(verify=false){pendingSessionCheck=pendingSessionCheck||verify===true;clearTimeout(timer);timer=setTimeout(()=>{const verifySession=pendingSessionCheck;pendingSessionCheck=false;synchronizeCounters({verifySession});},700);}
export function initCounterAccounts(){
 accountAuthClient().auth.onAuthStateChange(event=>{if(event!=='TOKEN_REFRESHED'){identityKnown=false;notice();queueMicrotask(schedule);}});
 window.addEventListener('salah:counter-changed',schedule);
 window.addEventListener('salah:adhkar-counted',event=>{const state=counterSyncStatus();if(!state.signedIn||event.detail?.account!==state.userId)return;try{if(localStorage.getItem('salah:counter-active-account')!==state.userId)return;if(getActivityQueue().mark(state.userId,event.detail.day))schedule();}catch{}});
 window.addEventListener('storage',e=>{if(e.key==='salah:adhkar-progress-v2')schedule();});
 window.addEventListener('online',()=>schedule(true));window.addEventListener('pageshow',()=>schedule(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(true);});setInterval(()=>{if(session&&!document.hidden)synchronizeCounters({verifySession:true});},30000);schedule(true);
}
function statusText(){return status==='saved'?'':status==='saving'?uiMessage('accountUi.savingCount'):reason==='mfa_required'?uiMessage('accountUi.confirmMfa'):status==='pending'?(navigator.onLine===false?uiMessage('accountUi.countOffline'):reason==='try_later'?uiMessage('accountUi.countRetry'):['local_data_invalid','invalid_counts','invalid_component','device_changed'].includes(reason)?uiMessage('accountUi.countInvalid'):uiMessage('accountUi.countUnavailable')):uiMessage('accountUi.countLocal');}
function updateStatus(){const el=document.getElementById('account-sync-status');if(el&&counterSyncStatus().signedIn&&el.getAttribute('data-account-notice')!=='1'){setUiMessage(el,statusText());el.hidden=status==='saved';el.setAttribute('data-sync-reason',['local_data_invalid','invalid_counts','invalid_component','device_changed','account_changed','auth_unavailable','invalid_session','sign_in_required','try_later','storage_unavailable','mfa_required'].includes(reason)?reason:reason?'unavailable':'');}const mfa=document.getElementById('account-mfa');if(mfa)mfa.hidden=reason!=='mfa_required';}
export async function showCounterAccount(container,message='',force=false,mode=''){
 // Returning from the mail app repaints this route. Keep the current form and
 // code step; explicit account actions below request a fresh screen.
 if(captureQrApproval())force=true;
 if(!force&&host===container&&accountArea&&location.hash.split('?')[0]==='#account'&&container.querySelector('#account-form-area')===accountArea){if(new URLSearchParams(location.hash.split('?')[1]||'').get('owner')==='1'){const panel=container.querySelector('.owner-account');if(panel)panel.open=true;}return;}
 stopQrLogin();const screen=++accountScreen;host=container;
 container.innerHTML='<section class="panel section owner-login"><div class="account-title-row"><h1 id="counter-account-heading">'+uiLeaf('accountUi.myAccount')+'</h1><span class="account-verified-badge" id="counter-account-verified" role="img" '+uiAttribute('accountUi.signedIn',{},'aria-label')+' hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7 12.3 3.2 3.1 6.8-7.1" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div><p id="account-sync-status" class="muted" role="status">'+uiLeaf('accountUi.checkingSignIn')+'</p><div id="account-form-area"></div></section>';
 const area=container.querySelector('#account-form-area');accountArea=area;
 const active=()=>host===container&&screen===accountScreen&&location.hash.split('?')[0]==='#account'&&container.querySelector('#account-form-area')===area;
 const report=text=>{if(active()){const notice=container.querySelector('#account-sync-status');const inline=area.querySelector('#counter-password-status'),passwordMode=inline&&!area.querySelector('#counter-account-login').hidden;notice.setAttribute('data-account-notice',text&&!passwordMode?'1':'0');setUiMessage(notice,passwordMode?'':text);if(passwordMode)setUiMessage(inline,text);else if(text)notice.scrollIntoView?.({block:'nearest'});}};
 // QR approval checks the current SDK session and the QR server directly.
 // Counter synchronisation is unrelated and must not delay the phone prompt.
 if(hasQrApproval()&&new URLSearchParams(location.hash.split('?')[1]||'').get('owner')!=='1'){
  area.innerHTML='<p class="muted" role="status">'+uiLeaf('accountUi.openingQrApproval')+'</p>';
  try{const current=await accountAuthClient().auth.getSession();if(!active())return;const qrSession=current.data?.session;
   if(!current.error&&qrSession?.user?.email_confirmed_at&&!qrSession.user.is_anonymous){await mountQrApproval(area,qrSession,()=>showCounterAccount(container,'',true));return;}
  }catch{}
 }
 const accountReady=await refreshAccountSession();if(!active())return;
 if(accountReady)void synchronizeCounters();
 if(!counterSyncStatus().signedIn&&reason==='auth_unavailable'){
  setUiMessage(container.querySelector('#counter-account-heading'),uiMessage('accountUi.myAccount'));
  report(uiMessage('accountUi.sessionCheckFailed'));
  area.innerHTML='<button class="button" type="button" id="account-session-retry">'+uiLeaf('accountUi.retryCheck')+'</button>';
  area.querySelector('#account-session-retry').onclick=()=>{if(active())return showCounterAccount(container,'',true);};
  return;
 }
 if(counterSyncStatus().signedIn&&hasQrApproval()&&new URLSearchParams(location.hash.split('?')[1]||'').get('owner')!=='1'){await mountQrApproval(area,session,()=>showCounterAccount(container,'',true));return;}
 if(counterSyncStatus().signedIn){
  setUiMessage(container.querySelector('#counter-account-heading'),uiMessage('accountUi.myAccount'));
  container.querySelector('#counter-account-verified').hidden=false;
  area.innerHTML='<div id="account-owner-panel" hidden></div><div id="account-avatar-editor"></div>'+accountProfileMarkup(session.user.user_metadata?.nickname)+'<div id="account-awards" class="account-awards"></div><a class="button" id="account-mfa" href="#account?owner=1" hidden>'+uiLeaf('accountUi.secureSignIn')+'</a><details class="settings-extra account-details"'+(mode==='password'?' open':'')+'><summary>'+uiLeaf('accountUi.details')+'</summary><div class="account-details-content"><form id="counter-profile"><label for="counter-profile-nick">'+uiLeaf('accountUi.nickname')+'</label><div class="account-nickname-row"><input id="counter-profile-nick" type="text" autocomplete="nickname" minlength="2" maxlength="40" required value="'+esc(session.user.user_metadata?.nickname||'')+'"><button class="account-nickname-save" type="submit" '+uiAttribute('accountUi.saveNickname',{},'aria-label')+' '+uiAttribute('accountUi.saveNickname',{},'title')+' data-saved="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button></div></form><p>'+(session.user.email?esc(session.user.email):uiLeaf('accountUi.yourAccount'))+'</p><button class="button" id="counter-sync-now">'+uiLeaf('accountUi.saveCount')+'</button><div id="account-device-slot"></div><details class="settings-extra" id="counter-password-settings"'+(mode==='password'?' open':'')+'><summary>'+uiLeaf('accountUi.changePassword')+'</summary><form id="counter-password-update"><label for="counter-new-password">'+uiLeaf('accountUi.newPassword')+'</label><input id="counter-new-password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><label for="counter-repeat-password">'+uiLeaf('accountUi.repeatPassword')+'</label><input id="counter-repeat-password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><p class="muted owner-note">'+uiLeaf('accountUi.passwordHint')+'</p><button class="button" type="submit">'+uiLeaf('accountUi.savePassword')+'</button><a class="text-button" id="counter-password-mfa" href="#account?owner=1" hidden>'+uiLeaf('accountUi.confirmAuthenticator')+'</a></form></details><div class="account-delete-area"><h3>'+uiLeaf('accountUi.deletion')+'</h3><p class="muted">'+uiLeaf('accountUi.deletionNote')+'</p><button class="button account-delete-button" id="counter-account-delete">'+uiLeaf('accountUi.delete')+'</button></div></div></details><div id="account-team-panel" hidden></div><button class="button account-delete-button account-signout" id="counter-account-out">'+uiLeaf('accountUi.signOut')+'</button>';
  const lessonBack=lessonAccountReturn(location.hash);if(lessonBack){const link=document.createElement('a');link.href=lessonBack;link.className='button account-lesson-return';setUiMessage(link,uiMessage('accountUi.backLesson'));area.prepend(link);}
  const awardsUserId=session.user.id;mountAccountAwards(area,{userId:awardsUserId,isActive:()=>active()&&counterSyncStatus().userId===awardsUserId});
  const avatarUserId=session.user.id;mountAccountAvatar(area,{userId:avatarUserId,isActive:()=>active()&&counterSyncStatus().userId===avatarUserId});const devicePanel=mountAccountDevices(area,{isActive:active,userId:session.user.id,mountIn:area.querySelector('#account-device-slot')});const deviceConnect=document.createElement('button');deviceConnect.className='button secondary account-connect-device';devicePanel.querySelector('.account-device-body').append(deviceConnect);
  mountQrScanner(area,{isActive:active,entryButton:deviceConnect,entryLabel:t('accountUi.connectDevice'),entryLabelKey:'accountUi.connectDevice',onStop:stopQrLogin,onScan:request=>{if(active()){setQrApproval(request);history.replaceState(history.state,'',location.pathname+location.search+'#account');void showCounterAccount(container,'',true);}}});
  const secureEntry=container.querySelector('#account-mfa');
  secureEntry.onclick=event=>{event.preventDefault();if(!active())return;location.hash='#account?owner=1';void showCounterAccount(container,'',true);};
  void mountOwnerAccount(area.querySelector('#account-owner-panel'),{isActive:active});void mountStaffEntry(area.querySelector('#account-team-panel'),{isActive:active});
  area.querySelector('#account-profile-edit').onclick=()=>{if(!active())return;area.querySelector('.account-details').open=true;area.querySelector('#counter-profile-nick').focus();};
  const profile=area.querySelector('#counter-profile'),profileInput=profile.querySelector('input'),profileSave=profile.querySelector('button');let savedNickname=profileInput.value.trim(),savingNickname=false;
  const updateNicknameSaveState=()=>{const changed=profileInput.value.trim()!==savedNickname;profileSave.setAttribute('data-dirty',String(changed));setUiAttribute(profileSave,'aria-label',changed?'accountUi.saveNickname':'accountUi.nicknameSaved');setUiAttribute(profileSave,'title',changed?'accountUi.saveNickname':'accountUi.nicknameSaved');if(!savingNickname)profileSave.disabled=!changed;};
  updateNicknameSaveState();profileInput.oninput=updateNicknameSaveState;
  profile.onsubmit=async e=>{
   e.preventDefault();if(!active())return;const form=e.currentTarget,button=form.querySelector('button'),input=form.querySelector('input'),nickname=input.value.trim();if(button.disabled||savingNickname)return;savingNickname=true;button.disabled=true;setUiAttribute(button,'aria-label','accountUi.savingNickname');setUiAttribute(button,'title','accountUi.savingNickname');
   try{const {error}=await accountAuthClient().auth.updateUser({data:{nickname}});if(error)throw error;if(active()){savedNickname=nickname;setUiMessage(area.querySelector('#account-profile-name'),nickname);}}
   catch{if(active())report(uiMessage('accountUi.nicknameFailed'));}
   finally{if(active()){savingNickname=false;updateNicknameSaveState();}}
  };
  area.querySelector('#counter-password-update').onsubmit=async e=>{
   e.preventDefault();if(!active())return;const form=e.currentTarget,button=form.querySelector('button'),password=form.querySelector('#counter-new-password'),repeat=form.querySelector('#counter-repeat-password');if(button.disabled)return;
   if(password.value.length<12||password.value.length>128){report(uiMessage('accountUi.passwordLength'));return;}
   if(password.value!==repeat.value){report(uiMessage('accountUi.passwordMismatch'));return;}
   button.disabled=true;
   try{
    if(navigator.onLine===false)throw Error('offline');
    const auth=accountAuthClient().auth;
    // Ask the server about enrolled factors before a sensitive account change.
    const {data:factors,error:factorError}=await auth.mfa.listFactors();if(factorError||!factors)throw Error('auth_unavailable');
    const requiresMfa=(factors.totp||[]).some(f=>f.status==='verified');
    const {data:level,error:levelError}=await auth.mfa.getAuthenticatorAssuranceLevel();if(levelError||!level)throw Error('auth_unavailable');
    if(!active())return;
    if((requiresMfa||level.nextLevel==='aal2')&&level.currentLevel!=='aal2'){
     password.value='';repeat.value='';form.querySelector('#counter-password-mfa').hidden=false;report(uiMessage('accountUi.passwordMfa'));return;
    }
    const {error}=await auth.updateUser({password:password.value});password.value='';repeat.value='';if(error)throw error;
    if(active()){form.querySelector('#counter-password-mfa').hidden=true;report(uiMessage('accountUi.passwordChanged'));}
   }catch(error){password.value='';repeat.value='';if(active())report(error?.message==='offline'?uiMessage('accountUi.offline'):uiMessage('accountUi.passwordFailed'));}
   finally{if(active())button.disabled=false;}
  };
  area.querySelector('#counter-sync-now').onclick=()=>synchronizeCounters();
  area.querySelector('#counter-account-delete').onclick=()=>{
   if(!active())return;
   modal('<div class="modal-head"><h2>'+uiLeaf('accountUi.deleteTitle')+'</h2><button type="button" class="button secondary" data-close>'+uiLeaf('common.close')+'</button></div><p>'+uiLeaf('accountUi.deleteConfirmNote')+'</p><label for="counter-delete-confirmation">'+uiLeaf('accountUi.deleteWordHint')+'</label><input id="counter-delete-confirmation" type="text" autocomplete="off" maxlength="16"><p id="counter-delete-status" class="muted" role="status"></p><div class="button-row"><button type="button" class="button account-delete-button" id="counter-delete-submit" disabled>'+uiLeaf('accountUi.deleteData')+'</button><button type="button" class="button secondary" data-close>'+uiLeaf('common.cancel')+'</button></div>');
   const dialog=document.getElementById('modal'),input=dialog.querySelector('#counter-delete-confirmation'),submit=dialog.querySelector('#counter-delete-submit'),statusLine=dialog.querySelector('#counter-delete-status');
   input.addEventListener('input',()=>{submit.disabled=input.value.trim().toLocaleUpperCase('ru-RU')!=='УДАЛИТЬ';});
   submit.onclick=async()=>{
    if(!active()||input.value.trim().toLocaleUpperCase('ru-RU')!=='УДАЛИТЬ'||submit.disabled)return;
    submit.disabled=true;input.disabled=true;setUiMessage(submit,uiMessage('accountUi.deleting'));setUiMessage(statusLine,uiMessage('accountUi.deletingData'));
    try{
     if(navigator.onLine===false)throw Error('offline');
     const auth=accountAuthClient().auth,{data,error}=await auth.getSession();if(error||!data.session?.access_token)throw Error('session_expired');
     const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/account-delete',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({confirmation:'DELETE'}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});
     if(!response.ok){const failure=await response.json().catch(()=>({}));throw Error(failure.error||'deletion_unavailable');}
     const uid=session?.user?.id;
     try{await auth.signOut({scope:'local'});}catch{}
     let localCleared=true;
     try{if(uid)await getEngine().activate(null);}catch{localCleared=false;}
     try{if(uid){localStorage.removeItem('salah:counter-sync:'+uid);localStorage.removeItem('salah:counter-local:'+uid);localStorage.removeItem('salah:counter-free:'+uid);}localStorage.removeItem('salah-owner-session-v1');}catch{localCleared=false;}
     session=null;status='local';reason='';notice();window.dispatchEvent(new Event('salah:counter-restored'));
     dialog.close();if(active())await showCounterAccount(container,localCleared?uiMessage('accountUi.deleted'):uiMessage('accountUi.deletedLocalRemains'),true);
    }catch(error){
     if(dialog.open){submit.disabled=false;input.disabled=false;setUiMessage(submit,uiMessage('accountUi.deleteData'));setUiMessage(statusLine,error?.message==='offline'?uiMessage('accountUi.offline'):error?.message==='session_expired'?uiMessage('accountUi.deleteSessionEnded'):uiMessage('accountUi.deleteFailed'));}
    }
   };
   input.focus();
  };
  area.querySelector('#counter-account-out').onclick=async()=>{
   if(!active())return;const button=area.querySelector('#counter-account-out');if(button.disabled)return;button.disabled=true;
   try{await synchronizeCounters();const {error}=await accountAuthClient().auth.signOut({scope:'local'});if(error)throw error;await synchronizeCounters();if(active())await showCounterAccount(container,'',true);}
   catch{report(uiMessage('accountUi.signOutFailed'));}
   finally{if(active())button.disabled=false;}
  };
 }else{
  const recovery=mode==='recover';setUiMessage(container.querySelector('#counter-account-heading'),uiMessage('accountUi.signInRegistration'));if(recovery)setUiMessage(container.querySelector('#counter-account-heading'),uiMessage('accountUi.recoverPassword'));
  const emailFields=(recovery?'':'<label for="counter-account-nickname">'+uiLeaf('accountUi.nickname')+'</label><input id="counter-account-nickname" type="text" autocomplete="nickname" minlength="2" maxlength="40" required>')+'<label for="counter-account-email">'+uiLeaf('accountUi.email')+'</label><input id="counter-account-email" placeholder="name@mail.ru" type="email" autocomplete="email" required><button class="button" type="submit">'+
   uiLeaf(recovery?'accountUi.getCode':'accountUi.getRegistrationCode')+'</button><p class="muted owner-note">'+uiLeaf(recovery?'accountUi.recoveryNote':'accountUi.registrationNote')+'</p>';
  area.innerHTML='<form id="counter-account-email-form" novalidate>'+emailFields+'</form>'+(recovery?'<button class="text-button" id="counter-recovery-back">'+uiLeaf('accountUi.backSignIn')+'</button>':'<button class="text-button" type="button" id="counter-login-method" aria-controls="counter-account-email-form counter-account-login" aria-expanded="false">'+uiLeaf('accountUi.passwordSignIn')+'</button><form id="counter-account-login" novalidate hidden><label for="counter-password-email">'+uiLeaf('accountUi.email')+'</label><input id="counter-password-email" type="email" autocomplete="username" required><label for="counter-account-password">'+uiLeaf('accountUi.password')+'</label><input id="counter-account-password" type="password" autocomplete="current-password" required><p class="muted" id="counter-password-status" role="status"></p><button class="button" type="submit">'+uiLeaf('accountUi.signIn')+'</button><button class="text-button" type="button" id="counter-password-forgot">'+uiLeaf('accountUi.forgotPassword')+'</button></form>');
  if(!recovery){mountQrLogin(area,()=>showCounterAccount(container,'',true));if(hasQrApproval())await mountQrApproval(area,null,()=>showCounterAccount(container,'',true));}
  const forgot=area.querySelector('#counter-password-forgot');if(forgot)forgot.onclick=()=>{if(active())return showCounterAccount(container,'',true,'recover');};
  if(recovery)area.querySelector('#counter-recovery-back').onclick=()=>{if(active())return showCounterAccount(container,'',true);};
  const mailForm=area.querySelector('#counter-account-email-form'),mailActive=()=>active()&&area.querySelector('#counter-account-email-form')===mailForm;
  const sendEmailCode=async e=>{
   e.preventDefault();if(!mailActive())return;const email=mailForm.querySelector('input[type=email]').value.trim(),nickname=recovery?null:mailForm.querySelector('#counter-account-nickname').value.trim(),button=mailForm.querySelector('button');if(button.disabled)return;button.disabled=true;
   if(!email||!mailForm.querySelector('input[type=email]').checkValidity()){button.disabled=false;report(uiMessage('accountUi.emailInvalid'));mailForm.querySelector('input[type=email]').focus();return;}
   if(!recovery&&(nickname.length<2||nickname.length>40)){button.disabled=false;report(uiMessage('accountUi.nicknameInvalid'));mailForm.querySelector('#counter-account-nickname').focus();return;}
   const label=uiMessage(recovery?'accountUi.getCode':'accountUi.getRegistrationCode');setUiMessage(button,uiMessage('accountUi.sendingCode'));report(uiMessage('accountUi.sendingEmail'));
   try{
    if(navigator.onLine===false)throw Error('offline');
    const {error}=await accountAuthClient().auth.signInWithOtp({email,options:recovery?{shouldCreateUser:false}:{shouldCreateUser:true,data:{nickname}}});if(error)throw error;if(!mailActive())return;
    mailForm.innerHTML='<p class="muted">'+uiLeaf('accountUi.codeEmailNote',{email})+'</p><label for="counter-email-code">'+uiLeaf('accountUi.emailCode')+'</label><input id="counter-email-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" minlength="6" maxlength="8" required><button class="button" type="submit">'+uiLeaf('accountUi.verifyAndSignIn')+'</button><button class="text-button" type="button" id="counter-email-resend">'+uiLeaf('accountUi.resend')+'</button><button class="text-button" type="button" id="counter-email-change">'+uiLeaf('accountUi.changeEmail')+'</button>';
    let sentAt=Date.now(),resending=false,verifying=false;
    const changeEmail=mailForm.querySelector('#counter-email-change');
    mailForm.querySelector('#counter-email-resend').onclick=async()=>{
     if(!mailActive()||resending||verifying)return;
     const remaining=Math.ceil((60000-(Date.now()-sentAt))/1000);
     if(remaining>0){report(uiMessage('accountUi.resendWait',{seconds:remaining}));return;}
     const resend=mailForm.querySelector('#counter-email-resend'),confirm=mailForm.querySelector('button[type=submit]');resending=true;resend.disabled=true;confirm.disabled=true;changeEmail.disabled=true;setUiMessage(resend,uiMessage('accountUi.sendingCode'));
     try{
      if(navigator.onLine===false)throw Error('offline');
      const {error}=await accountAuthClient().auth.signInWithOtp({email,options:recovery?{shouldCreateUser:false}:{shouldCreateUser:true,data:{nickname}}});if(error)throw error;
      if(!mailActive())return;sentAt=Date.now();mailForm.querySelector('#counter-email-code').value='';report(uiMessage('accountUi.newEmailSent'));
     }catch(error){if(mailActive())report(emailErrorMessage(error));}
     finally{resending=false;if(mailActive()){resend.disabled=false;confirm.disabled=false;changeEmail.disabled=false;setUiMessage(resend,uiMessage('accountUi.resend'));}}
    };
    changeEmail.onclick=()=>{
     if(!mailActive()||resending||verifying||mailForm.querySelector('#counter-email-change')!==changeEmail)return;
     mailForm.innerHTML=emailFields;
     mailForm.onsubmit=sendEmailCode;
     if(!recovery)mailForm.querySelector('#counter-account-nickname').value=nickname;
     mailForm.querySelector('input[type=email]').focus();
     report('');
    };
    mailForm.onsubmit=async event=>{
     event.preventDefault();if(!mailActive()||resending||verifying)return;
     const code=mailForm.querySelector('input'),submit=mailForm.querySelector('button[type=submit]'),resend=mailForm.querySelector('#counter-email-resend'),token=code.value.trim();
     if(!/^[0-9]{6,8}$/.test(token)){report(uiMessage('accountUi.codeLength'));code.focus();return;}
     if(navigator.onLine===false){report(uiMessage('accountUi.loginOffline'));return;}
     verifying=true;submit.disabled=true;resend.disabled=true;changeEmail.disabled=true;setUiMessage(submit,uiMessage('accountUi.checkingCode'));report(uiMessage('accountUi.checkingEmailCode'));
     try{
      const {data,error}=await accountAuthClient().auth.verifyOtp({email,token,type:'email'});
      if(error)throw error;
      if(!data?.session?.user?.email_confirmed_at)throw {code:'invalid_code'};
      code.value='';
     }catch(error){
      verifying=false;
      if(mailActive()){submit.disabled=false;resend.disabled=false;changeEmail.disabled=false;setUiMessage(submit,uiMessage('accountUi.verifyAndSignIn'));report(loginErrorMessage(error,'code'));}
      return;
     }
     if(!mailActive())return;
     // Recovery keeps the existing nickname and never creates an account.
     if(recovery){if(mailActive())await showCounterAccount(container,uiMessage('accountUi.emailVerifiedPassword'),true,'password');return;}
     let nicknameSaved=false;try{const {error}=await accountAuthClient().auth.updateUser({data:{nickname}});nicknameSaved=!error;}catch{}
     if(mailActive())await showCounterAccount(container,nicknameSaved?'':uiMessage('accountUi.signedInNicknameFailed'),true);
    };
    mailForm.querySelector('input').focus();report(recovery?uiMessage('accountUi.recoveryEmailSent'):uiMessage('accountUi.emailSent'));
   }catch(error){if(mailActive()){button.disabled=false;setUiMessage(button,label);report(recovery&&['otp_disabled','user_not_found','signup_disabled'].includes(error?.code)?uiMessage('accountUi.recoveryEmailSent'):emailErrorMessage(error));}}
  };
  mailForm.onsubmit=sendEmailCode;
  const passwordLogin=area.querySelector('#counter-account-login'),method=area.querySelector('#counter-login-method');
  if(method)method.onclick=()=>{if(!active())return;const passwordMode=passwordLogin.hidden;const from=passwordMode?mailForm.querySelector('input[type=email]'):passwordLogin.querySelector('input[type=email]'),to=passwordMode?passwordLogin.querySelector('input[type=email]'):mailForm.querySelector('input[type=email]');if(from&&to)to.value=from.value.trim();mailForm.hidden=passwordMode;passwordLogin.hidden=!passwordMode;setUiMessage(method,passwordMode?uiMessage('accountUi.codeSignIn'):uiMessage('accountUi.passwordSignIn'));method.setAttribute('aria-expanded',String(passwordMode));setUiMessage(container.querySelector('#counter-account-heading'),passwordMode?uiMessage('accountUi.passwordSignInTitle'):uiMessage('accountUi.signInRegistration'));report('');(to||mailForm.querySelector('input'))?.focus();};
  if(passwordLogin){const submitPassword=async e=>{
   e.preventDefault();if(!active())return;const form=passwordLogin,button=form.querySelector('button'),password=form.querySelector('input[type=password]');if(button.disabled)return;
   const emailInput=form.querySelector('input[type=email]');if(!emailInput.value.trim()||!emailInput.checkValidity()){report(uiMessage('accountUi.emailInvalid'));emailInput.focus();return;}
   if(!password.value){report(uiMessage('accountUi.enterPassword'));password.focus();return;}
   if(navigator.onLine===false){report(uiMessage('accountUi.offline'));return;}
   button.disabled=true;setUiMessage(button,uiMessage('accountUi.signingIn'));report(uiMessage('accountUi.checkingCredentials'));
   try{const {data,error}=await accountAuthClient().auth.signInWithPassword({email:form.querySelector('input[type=email]').value.trim(),password:password.value});password.value='';if(error)throw error;if(!data?.session?.user?.email_confirmed_at)throw {code:'invalid_login'};if(active())await showCounterAccount(container,'',true);}
   catch(error){password.value='';if(active()){button.disabled=false;setUiMessage(button,uiMessage('accountUi.signIn'));report(loginErrorMessage(error,'password'));}}
  };passwordLogin.onsubmit=submitPassword;passwordLogin.querySelector('button[type=submit]').onclick=submitPassword;
  }
 }
 updateStatus();if(!counterSyncStatus().signedIn)report('');if(message)report(message);
}
