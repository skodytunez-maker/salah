import{mountQrScanner}from './qr-scanner.js';
import{mountAccountDevices}from './account-devices.js';
import{captureQrApproval,hasQrApproval,mountQrApproval,mountQrLogin,stopQrLogin,setQrApproval}from './qr-login.js';
import{mountOwnerAccount}from './admin.js';
import{accountAuthClient,checkAccountSession,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{createCounterSync}from './counter-sync-core.js';
import{esc,modal}from './ui.js';
let engine=null,session=null,timer=null,busy=null,status='local',reason='',host=null,accountScreen=0,accountArea=null;
export const counterSyncStatus=()=>({status,reason,userId:session?.user?.id||null,signedIn:!!session?.user?.email_confirmed_at&&!session.user.is_anonymous});
function emailErrorMessage(error){
 if(navigator.onLine===false)return 'Нет соединения. Подключитесь к интернету и повторите отправку.';
 if(error?.status===429||['over_email_send_rate_limit','over_request_rate_limit'].includes(error?.code))return 'Слишком много запросов. Подождите немного и попробуйте снова.';
 if(error?.status>=500||error?.code==='unexpected_failure')return 'Отправка писем временно недоступна. Попробуйте позже.';
 return 'Не удалось отправить письмо. Попробуйте через минуту.';
}
function loginErrorMessage(error,method){
 if(navigator.onLine===false||error?.message==='offline')return 'Нет соединения. Подключитесь к интернету и повторите вход.';
 if(error?.status===429||error?.code==='over_request_rate_limit')return 'Слишком много попыток входа. Подождите немного и попробуйте снова.';
 if(error?.status>=500||error?.status===408||['unexpected_failure','request_timeout'].includes(error?.code)||['AuthRetryableFetchError','AbortError','TimeoutError'].includes(error?.name))return 'Сервис входа временно недоступен. Попробуйте ещё раз чуть позже.';
 if(method==='code'&&['otp_expired','invalid_credentials','invalid_code'].includes(error?.code))return 'Код неверен или истёк. Проверьте код из последнего письма или запросите новый.';
 if(method==='password'&&['invalid_credentials','invalid_login'].includes(error?.code))return 'Не удалось войти. Проверьте почту и пароль.';
 return 'Не удалось проверить '+(method==='code'?'код':'вход')+'. Попробуйте ещё раз.';
}
const notice=()=>{window.dispatchEvent(new Event('salah:counter-status'));updateStatus();};
function lock(fn){return navigator.locks?.request?navigator.locks.request('salah:adhkar-progress-v2',fn):Promise.resolve(fn());}
function getEngine(){return engine||(engine=createCounterSync({storage:localStorage,uuid:()=>crypto.randomUUID(),withLock:lock,changed:kind=>{if(kind==='saved'||kind==='account')window.dispatchEvent(new Event('salah:counter-restored'));},request:async(uid,component)=>{
 const {data,error}=await accountAuthClient().auth.getSession();if(error||!data.session||data.session.user.id!==uid)throw Error('sign_in_required');
 const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/adhkar-sync',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(component),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'storage_unavailable');return result;
}}));}
export async function synchronizeCounters({verifySession=false}={}){
 if(busy){schedule(verifySession);return busy;}
 const wasSignedIn=counterSyncStatus().signedIn;
 busy=(async()=>{try{const checked=await checkAccountSession({force:verifySession});if(checked.state==='unavailable'||checked.state==='changed')throw Error('auth_unavailable');const next=checked.session;const uid=next?.user?.id||null;session=next;await getEngine().activate(uid);if(!uid){status='local';reason=checked.state==='revoked'?'session_expired':'';notice();return{ok:false,reason:'signed_out'};}status='saving';notice();const result=await getEngine().sync();status=result.ok?'saved':'pending';reason=result.reason||'';notice();return result;}catch{status='pending';reason='storage_unavailable';notice();return{ok:false,reason};}})();let result;try{result=await busy;}finally{busy=null;}
 if(wasSignedIn&&!counterSyncStatus().signedIn&&host&&location.hash.split('?')[0]==='#account'&&host.querySelector('#account-form-area')===accountArea)await showCounterAccount(host,'Вход завершён. Войдите снова с новым паролем или кодом из письма.',true);
 return result;
}
let pendingSessionCheck=false;
function schedule(verify=false){pendingSessionCheck=pendingSessionCheck||verify===true;clearTimeout(timer);timer=setTimeout(()=>{const verifySession=pendingSessionCheck;pendingSessionCheck=false;synchronizeCounters({verifySession});},700);}
export function initCounterAccounts(){
 accountAuthClient().auth.onAuthStateChange(event=>{if(event!=='TOKEN_REFRESHED')queueMicrotask(schedule);});
 window.addEventListener('salah:counter-changed',schedule);
 window.addEventListener('storage',e=>{if(e.key==='salah:adhkar-progress-v2')schedule();});
 window.addEventListener('online',()=>schedule(true));window.addEventListener('pageshow',()=>schedule(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(true);});setInterval(()=>{if(session&&!document.hidden)synchronizeCounters({verifySession:true});},30000);schedule(true);
}
function statusText(){return status==='saved'?'':status==='saving'?'Сохраняем счёт…':reason==='mfa_required'?'Подтвердите вход через Google Authenticator.':status==='pending'?(navigator.onLine===false?'Счёт сохранён на устройстве. Подключитесь к интернету.':reason==='try_later'?'Счёт сохранён на устройстве. Повторим сохранение через минуту.':['local_data_invalid','invalid_counts','invalid_component','device_changed'].includes(reason)?'Счёт сохранён на устройстве. Не удалось подготовить данные для облака.':'Счёт сохранён на устройстве. Облачное сохранение временно недоступно.'):'Счёт хранится на этом устройстве.';}
function updateStatus(){const el=document.getElementById('account-sync-status');if(el&&counterSyncStatus().signedIn){el.textContent=statusText();el.hidden=status==='saved';el.setAttribute('data-sync-reason',['local_data_invalid','invalid_counts','invalid_component','device_changed','account_changed','auth_unavailable','invalid_session','sign_in_required','try_later','storage_unavailable','mfa_required'].includes(reason)?reason:reason?'unavailable':'');}const mfa=document.getElementById('account-mfa');if(mfa)mfa.hidden=reason!=='mfa_required';}
export async function showCounterAccount(container,message='',force=false,mode=''){
 // Returning from the mail app repaints this route. Keep the current form and
 // code step; explicit account actions below request a fresh screen.
 if(captureQrApproval())force=true;
 if(!force&&host===container&&accountArea&&location.hash.split('?')[0]==='#account'&&container.querySelector('#account-form-area')===accountArea){if(new URLSearchParams(location.hash.split('?')[1]||'').get('owner')==='1'){const panel=container.querySelector('.owner-account');if(panel)panel.open=true;}return;}
 stopQrLogin();const screen=++accountScreen;host=container;
 container.innerHTML='<section class="panel section owner-login"><div class="account-title-row"><h1 id="counter-account-heading">Вход и регистрация</h1><span class="account-verified-badge" id="counter-account-verified" role="img" aria-label="Вход выполнен" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7 12.3 3.2 3.1 6.8-7.1" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div><p id="account-sync-status" class="muted" role="status">Проверяем вход…</p><div id="account-form-area"></div><a class="button" id="account-mfa" href="#account?owner=1" hidden>Подтвердить защищённый вход</a></section>';
 const area=container.querySelector('#account-form-area');accountArea=area;
 const active=()=>host===container&&screen===accountScreen&&location.hash.split('?')[0]==='#account'&&container.querySelector('#account-form-area')===area;
 const report=text=>{if(active()){const notice=container.querySelector('#account-sync-status');const inline=area.querySelector('#counter-password-status'),passwordMode=inline&&!area.querySelector('#counter-account-login').hidden;notice.textContent=passwordMode?'':text;if(passwordMode)inline.textContent=text;else if(text)notice.scrollIntoView?.({block:'nearest'});}};
 const secureEntry=container.querySelector('#account-mfa');
 secureEntry.onclick=event=>{event.preventDefault();if(!active())return;location.hash='#account?owner=1';void showCounterAccount(container,'',true);};
 // QR approval checks the current SDK session and the QR server directly.
 // Counter synchronisation is unrelated and must not delay the phone prompt.
 if(hasQrApproval()&&new URLSearchParams(location.hash.split('?')[1]||'').get('owner')!=='1'){
  area.innerHTML='<p class="muted" role="status">Открываем подтверждение QR…</p>';
  try{const current=await accountAuthClient().auth.getSession();if(!active())return;const qrSession=current.data?.session;
   if(!current.error&&qrSession?.user?.email_confirmed_at&&!qrSession.user.is_anonymous){await mountQrApproval(area,qrSession,()=>showCounterAccount(container,'',true));return;}
  }catch{}
 }
 await synchronizeCounters();if(!active())return;
 if(counterSyncStatus().signedIn&&hasQrApproval()&&new URLSearchParams(location.hash.split('?')[1]||'').get('owner')!=='1'){await mountQrApproval(area,session,()=>showCounterAccount(container,'',true));return;}
 if(counterSyncStatus().signedIn){
  container.querySelector('#counter-account-heading').textContent='Мой аккаунт';
  container.querySelector('#counter-account-verified').hidden=false;
  area.innerHTML='<div id="account-owner-panel" hidden></div><details class="settings-extra account-details"'+(mode==='password'?' open':'')+'><summary>Данные аккаунта</summary><div class="account-details-content"><form id="counter-profile"><label for="counter-profile-nick">Ник</label><div class="account-nickname-row"><input id="counter-profile-nick" type="text" autocomplete="nickname" minlength="2" maxlength="40" required value="'+esc(session.user.user_metadata?.nickname||'')+'"><button class="account-nickname-save" type="submit" aria-label="Сохранить ник" title="Сохранить ник" data-saved="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button></div></form><p>'+esc(session.user.email||'Ваш аккаунт')+'</p><button class="button" id="counter-sync-now">Сохранить счёт</button><div class="account-delete-area"><h3>Удаление аккаунта</h3><p class="muted">Аккаунт, облачный счёт азкаров и обращения в поддержку будут удалены без возможности восстановления.</p><button class="button account-delete-button" id="counter-account-delete">Удалить аккаунт</button></div><details class="settings-extra" id="counter-password-settings"'+(mode==='password'?' open':'')+'><summary>Изменить пароль</summary><form id="counter-password-update"><label for="counter-new-password">Новый пароль</label><input id="counter-new-password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><label for="counter-repeat-password">Повторите пароль</label><input id="counter-repeat-password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><p class="muted owner-note">Не менее 12 символов.</p><button class="button" type="submit">Сохранить новый пароль</button><a class="text-button" id="counter-password-mfa" href="#account?owner=1" hidden>Подтвердить через Google Authenticator</a></form></details></div></details><button class="text-button" id="counter-account-out">Выйти</button>';
  mountAccountDevices(area,{isActive:active,userId:session.user.id});
  mountQrScanner(area,{isActive:active,onStop:stopQrLogin,onScan:request=>{if(active()){setQrApproval(request);history.replaceState(history.state,'',location.pathname+location.search+'#account');void showCounterAccount(container,'',true);}}});
  void mountOwnerAccount(area.querySelector('#account-owner-panel'),{isActive:active});
  const profile=area.querySelector('#counter-profile'),profileInput=profile.querySelector('input'),profileSave=profile.querySelector('button');let savedNickname=profileInput.value.trim(),savingNickname=false;
  const updateNicknameSaveState=()=>{const changed=profileInput.value.trim()!==savedNickname;profileSave.setAttribute('data-dirty',String(changed));profileSave.setAttribute('aria-label',changed?'Сохранить ник':'Ник сохранён');profileSave.setAttribute('title',changed?'Сохранить ник':'Ник сохранён');if(!savingNickname)profileSave.disabled=!changed;};
  updateNicknameSaveState();profileInput.oninput=updateNicknameSaveState;
  profile.onsubmit=async e=>{
   e.preventDefault();if(!active())return;const form=e.currentTarget,button=form.querySelector('button'),input=form.querySelector('input'),nickname=input.value.trim();if(button.disabled||savingNickname)return;savingNickname=true;button.disabled=true;button.setAttribute('aria-label','Сохраняю ник');button.setAttribute('title','Сохраняю ник');
   try{const {error}=await accountAuthClient().auth.updateUser({data:{nickname}});if(error)throw error;if(active())savedNickname=nickname;}
   catch{if(active())report('Не удалось сохранить ник. Попробуйте позже.');}
   finally{if(active()){savingNickname=false;updateNicknameSaveState();}}
  };
  area.querySelector('#counter-password-update').onsubmit=async e=>{
   e.preventDefault();if(!active())return;const form=e.currentTarget,button=form.querySelector('button'),password=form.querySelector('#counter-new-password'),repeat=form.querySelector('#counter-repeat-password');if(button.disabled)return;
   if(password.value.length<12||password.value.length>128){report('Пароль должен содержать от 12 до 128 символов.');return;}
   if(password.value!==repeat.value){report('Пароли не совпадают.');return;}
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
     password.value='';repeat.value='';form.querySelector('#counter-password-mfa').hidden=false;report('Сначала подтвердите вход через Google Authenticator, затем вернитесь в «Мой аккаунт».');return;
    }
    const {error}=await auth.updateUser({password:password.value});password.value='';repeat.value='';if(error)throw error;
    if(active()){form.querySelector('#counter-password-mfa').hidden=true;report('Пароль изменён. Для следующего входа используйте новый пароль.');}
   }catch(error){password.value='';repeat.value='';if(active())report(error?.message==='offline'?'Нет соединения. Подключитесь к интернету и повторите.':'Не удалось изменить пароль. Повторите вход по коду и попробуйте снова.');}
   finally{if(active())button.disabled=false;}
  };
  area.querySelector('#counter-sync-now').onclick=()=>synchronizeCounters();
  area.querySelector('#counter-account-delete').onclick=()=>{
   if(!active())return;
   modal('<div class="modal-head"><h2>Удалить аккаунт?</h2><button type="button" class="button secondary" data-close>Закрыть</button></div><p>Будут безвозвратно удалены аккаунт, ник, облачный счёт азкаров и обращения в поддержку. Данные SALAH, сохранённые только на этом устройстве, останутся.</p><label for="counter-delete-confirmation">Для подтверждения введите слово УДАЛИТЬ</label><input id="counter-delete-confirmation" type="text" autocomplete="off" maxlength="16"><p id="counter-delete-status" class="muted" role="status"></p><div class="button-row"><button type="button" class="button account-delete-button" id="counter-delete-submit" disabled>Удалить аккаунт и данные</button><button type="button" class="button secondary" data-close>Отмена</button></div>');
   const dialog=document.getElementById('modal'),input=dialog.querySelector('#counter-delete-confirmation'),submit=dialog.querySelector('#counter-delete-submit'),statusLine=dialog.querySelector('#counter-delete-status');
   input.addEventListener('input',()=>{submit.disabled=input.value.trim().toLocaleUpperCase('ru-RU')!=='УДАЛИТЬ';});
   submit.onclick=async()=>{
    if(!active()||input.value.trim().toLocaleUpperCase('ru-RU')!=='УДАЛИТЬ'||submit.disabled)return;
    submit.disabled=true;input.disabled=true;submit.textContent='Удаляем…';statusLine.textContent='Удаляем аккаунт и связанные облачные данные…';
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
     dialog.close();if(active())await showCounterAccount(container,localCleared?'Аккаунт удалён вместе с облачными данными.':'Аккаунт удалён. Не удалось очистить часть локальных данных на этом устройстве.',true);
    }catch(error){
     if(dialog.open){submit.disabled=false;input.disabled=false;submit.textContent='Удалить аккаунт и данные';statusLine.textContent=error?.message==='offline'?'Нет соединения. Подключитесь к интернету и повторите.':error?.message==='session_expired'?'Сеанс завершён. Войдите снова и повторите удаление.':'Не удалось удалить аккаунт. Попробуйте позже.';}
    }
   };
   input.focus();
  };
  area.querySelector('#counter-account-out').onclick=async()=>{
   if(!active())return;const button=area.querySelector('#counter-account-out');if(button.disabled)return;button.disabled=true;
   try{await synchronizeCounters();const {error}=await accountAuthClient().auth.signOut({scope:'local'});if(error)throw error;await synchronizeCounters();if(active())await showCounterAccount(container,'',true);}
   catch{report('Не удалось выйти. Проверьте соединение.');}
   finally{if(active())button.disabled=false;}
  };
 }else{
  const recovery=mode==='recover';if(recovery)container.querySelector('#counter-account-heading').textContent='Восстановить пароль';
  area.innerHTML=recovery?'<form id="counter-account-email-form" novalidate><label for="counter-account-email">Электронная почта</label><input id="counter-account-email" placeholder="name@mail.ru" type="email" autocomplete="email" required><button class="button" type="submit">Получить код</button><p class="muted owner-note">Введите почту вашего аккаунта. После подтверждения можно задать новый пароль.</p></form><button class="text-button" id="counter-recovery-back">Вернуться ко входу</button>':'<form id="counter-account-email-form" novalidate><label for="counter-account-nickname">Ник</label><input id="counter-account-nickname" type="text" autocomplete="nickname" minlength="2" maxlength="40" required><label for="counter-account-email">Электронная почта</label><input id="counter-account-email" placeholder="name@mail.ru" type="email" autocomplete="email" required><button class="button" type="submit">Получить код для входа или регистрации</button><p class="muted owner-note">При первом входе создаётся личный аккаунт. Подтвердите почту кодом из письма.</p></form><button class="text-button" type="button" id="counter-login-method" aria-controls="counter-account-email-form counter-account-login" aria-expanded="false">Войти с паролем</button><form id="counter-account-login" novalidate hidden><label for="counter-password-email">Электронная почта</label><input id="counter-password-email" type="email" autocomplete="username" required><label for="counter-account-password">Пароль</label><input id="counter-account-password" type="password" autocomplete="current-password" required><p class="muted" id="counter-password-status" role="status"></p><button class="button" type="submit">Войти</button><button class="text-button" type="button" id="counter-password-forgot">Забыли пароль?</button></form>';
  if(!recovery){mountQrLogin(area,()=>showCounterAccount(container,'',true));if(hasQrApproval())await mountQrApproval(area,null,()=>showCounterAccount(container,'',true));}
  const forgot=area.querySelector('#counter-password-forgot');if(forgot)forgot.onclick=()=>{if(active())return showCounterAccount(container,'',true,'recover');};
  if(recovery)area.querySelector('#counter-recovery-back').onclick=()=>{if(active())return showCounterAccount(container,'',true);};
  const mailForm=area.querySelector('#counter-account-email-form'),mailActive=()=>active()&&area.querySelector('#counter-account-email-form')===mailForm;
  mailForm.onsubmit=async e=>{
   e.preventDefault();if(!mailActive())return;const email=mailForm.querySelector('input[type=email]').value.trim(),nickname=recovery?null:mailForm.querySelector('#counter-account-nickname').value.trim(),button=mailForm.querySelector('button');if(button.disabled)return;button.disabled=true;
   if(!email||!mailForm.querySelector('input[type=email]').checkValidity()){button.disabled=false;report('Введите электронную почту в формате name@mail.ru.');mailForm.querySelector('input[type=email]').focus();return;}
   if(!recovery&&(nickname.length<2||nickname.length>40)){button.disabled=false;report('Укажите ник: от 2 до 40 символов.');mailForm.querySelector('#counter-account-nickname').focus();return;}
   const label=button.textContent;button.textContent='Отправляем код…';report('Отправляем письмо с кодом…');
   try{
    if(navigator.onLine===false)throw Error('offline');
    const {error}=await accountAuthClient().auth.signInWithOtp({email,options:recovery?{shouldCreateUser:false}:{shouldCreateUser:true,data:{nickname}}});if(error)throw error;if(!mailActive())return;
    mailForm.innerHTML='<p class="muted">Введите код из письма SALAH, отправленного на '+esc(email)+'. Можно проверить папку «Спам».</p><label for="counter-email-code">Код из письма</label><input id="counter-email-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" minlength="6" maxlength="8" required><button class="button" type="submit">Подтвердить и войти</button><button class="text-button" type="button" id="counter-email-resend">Отправить новый код</button><button class="text-button" type="button" id="counter-email-change">Изменить почту</button>';
    let sentAt=Date.now(),resending=false,verifying=false;
    mailForm.querySelector('#counter-email-resend').onclick=async()=>{
     if(!mailActive()||resending||verifying)return;
     const remaining=Math.ceil((60000-(Date.now()-sentAt))/1000);
     if(remaining>0){report('Новый код можно отправить через '+remaining+' с.');return;}
     const resend=mailForm.querySelector('#counter-email-resend'),confirm=mailForm.querySelector('button[type=submit]');resending=true;resend.disabled=true;confirm.disabled=true;resend.textContent='Отправляем код…';
     try{
      if(navigator.onLine===false)throw Error('offline');
      const {error}=await accountAuthClient().auth.signInWithOtp({email,options:recovery?{shouldCreateUser:false}:{shouldCreateUser:true,data:{nickname}}});if(error)throw error;
      if(!mailActive())return;sentAt=Date.now();mailForm.querySelector('#counter-email-code').value='';report('Новое письмо отправлено. Введите код из последнего письма.');
     }catch(error){if(mailActive())report(emailErrorMessage(error));}
     finally{resending=false;if(mailActive()){resend.disabled=false;confirm.disabled=false;resend.textContent='Отправить новый код';}}
    };
    mailForm.querySelector('#counter-email-change').onclick=()=>{if(mailActive())return showCounterAccount(container,'',true,recovery?'recover':'');};
    mailForm.onsubmit=async event=>{
     event.preventDefault();if(!mailActive()||resending||verifying)return;
     const code=mailForm.querySelector('input'),submit=mailForm.querySelector('button[type=submit]'),resend=mailForm.querySelector('#counter-email-resend'),token=code.value.trim();
     if(!/^[0-9]{6,8}$/.test(token)){report('Введите код из письма: от 6 до 8 цифр.');code.focus();return;}
     if(navigator.onLine===false){report('Нет соединения. Подключитесь к интернету и повторите вход.');return;}
     verifying=true;submit.disabled=true;resend.disabled=true;submit.textContent='Проверяем код…';report('Проверяем код из письма…');
     try{
      const {data,error}=await accountAuthClient().auth.verifyOtp({email,token,type:'email'});
      if(error)throw error;
      if(!data?.session?.user?.email_confirmed_at)throw {code:'invalid_code'};
      code.value='';
     }catch(error){
      verifying=false;
      if(mailActive()){submit.disabled=false;resend.disabled=false;submit.textContent='Подтвердить и войти';report(loginErrorMessage(error,'code'));}
      return;
     }
     if(!mailActive())return;
     // Recovery keeps the existing nickname and never creates an account.
     if(recovery){if(mailActive())await showCounterAccount(container,'Почта подтверждена. Задайте новый пароль.',true,'password');return;}
     let nicknameSaved=false;try{const {error}=await accountAuthClient().auth.updateUser({data:{nickname}});nicknameSaved=!error;}catch{}
     if(mailActive())await showCounterAccount(container,nicknameSaved?'':'Вход подтверждён. Не удалось сохранить ник. Его можно изменить здесь.',true);
    };
    mailForm.querySelector('input').focus();report(recovery?'Если аккаунт с этой почтой существует, письмо с кодом отправлено.':'Письмо с кодом отправлено.');
   }catch(error){if(mailActive()){button.disabled=false;button.textContent=label;report(recovery&&['otp_disabled','user_not_found','signup_disabled'].includes(error?.code)?'Если аккаунт с этой почтой существует, письмо с кодом отправлено.':emailErrorMessage(error));}}
  };
  const passwordLogin=area.querySelector('#counter-account-login'),method=area.querySelector('#counter-login-method');
  if(method)method.onclick=()=>{if(!active())return;const passwordMode=passwordLogin.hidden;const from=passwordMode?mailForm.querySelector('input[type=email]'):passwordLogin.querySelector('input[type=email]'),to=passwordMode?passwordLogin.querySelector('input[type=email]'):mailForm.querySelector('input[type=email]');if(from&&to)to.value=from.value.trim();mailForm.hidden=passwordMode;passwordLogin.hidden=!passwordMode;method.textContent=passwordMode?'Войти по коду':'Войти с паролем';method.setAttribute('aria-expanded',String(passwordMode));container.querySelector('#counter-account-heading').textContent=passwordMode?'Вход с паролем':'Вход и регистрация';report('');(to||mailForm.querySelector('input'))?.focus();};
  if(passwordLogin){const submitPassword=async e=>{
   e.preventDefault();if(!active())return;const form=passwordLogin,button=form.querySelector('button'),password=form.querySelector('input[type=password]');if(button.disabled)return;
   const emailInput=form.querySelector('input[type=email]');if(!emailInput.value.trim()||!emailInput.checkValidity()){report('Введите электронную почту в формате name@mail.ru.');emailInput.focus();return;}
   if(!password.value){report('Введите пароль.');password.focus();return;}
   if(navigator.onLine===false){report('Нет соединения. Подключитесь к интернету и повторите.');return;}
   button.disabled=true;button.textContent='Входим…';report('Проверяем почту и пароль…');
   try{const {data,error}=await accountAuthClient().auth.signInWithPassword({email:form.querySelector('input[type=email]').value.trim(),password:password.value});password.value='';if(error)throw error;if(!data?.session?.user?.email_confirmed_at)throw {code:'invalid_login'};if(active())await showCounterAccount(container,'',true);}
   catch(error){password.value='';if(active()){button.disabled=false;button.textContent='Войти';report(loginErrorMessage(error,'password'));}}
  };passwordLogin.onsubmit=submitPassword;passwordLogin.querySelector('button[type=submit]').onclick=submitPassword;
  }
 }
 updateStatus();if(!counterSyncStatus().signedIn)report('');if(message)report(message);
}
