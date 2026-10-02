import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{createCounterSync}from './counter-sync-core.js';
import{esc}from './ui.js';
let engine=null,session=null,timer=null,busy=null,status='local',reason='',host=null,accountScreen=0,accountArea=null;
export const counterSyncStatus=()=>({status,reason,signedIn:!!session?.user?.email_confirmed_at&&!session.user.is_anonymous});
const notice=()=>{window.dispatchEvent(new Event('salah:counter-status'));updateStatus();};
function lock(fn){return navigator.locks?.request?navigator.locks.request('salah:adhkar-progress-v2',fn):Promise.resolve(fn());}
function getEngine(){return engine||(engine=createCounterSync({storage:localStorage,uuid:()=>crypto.randomUUID(),withLock:lock,changed:kind=>{if(kind==='saved'||kind==='account')window.dispatchEvent(new Event('salah:counter-restored'));},request:async(uid,component)=>{
 const {data,error}=await accountAuthClient().auth.getSession();if(error||!data.session||data.session.user.id!==uid)throw Error('sign_in_required');
 const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/adhkar-sync',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(component),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'storage_unavailable');return result;
}}));}
export async function synchronizeCounters(){
 if(busy){schedule();return busy;}
 busy=(async()=>{try{const {data,error}=await accountAuthClient().auth.getSession();if(error)throw error;const next=data.session;const uid=next?.user?.id||null;session=next;await getEngine().activate(uid);if(!uid){status='local';reason='';notice();return{ok:false,reason:'signed_out'};}status='saving';notice();const result=await getEngine().sync();status=result.ok?'saved':'pending';reason=result.reason||'';notice();return result;}catch{status='pending';reason='storage_unavailable';notice();return{ok:false,reason};}})();try{return await busy;}finally{busy=null;}
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>synchronizeCounters(),700);}
export function initCounterAccounts(){
 accountAuthClient().auth.onAuthStateChange(()=>queueMicrotask(schedule));
 window.addEventListener('salah:counter-changed',schedule);
 window.addEventListener('storage',e=>{if(e.key==='salah:adhkar-progress-v2')schedule();});
 window.addEventListener('online',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});setInterval(()=>{if(session&&!document.hidden)synchronizeCounters();},30000);schedule();
}
function statusText(){return status==='saved'?'Накопительный счёт сохранён в аккаунте.':status==='saving'?'Сохраняем счёт…':reason==='mfa_required'?'Подтвердите вход через Google Authenticator.':status==='pending'?'Счёт сохранён на устройстве. Синхронизация ожидает соединения.':'Счёт хранится на этом устройстве.';}
function updateStatus(){const el=document.getElementById('account-sync-status');if(el&&counterSyncStatus().signedIn)el.textContent=statusText();const mfa=document.getElementById('account-mfa');if(mfa)mfa.hidden=reason!=='mfa_required';}
export async function showCounterAccount(container,message='',force=false){
 // Returning from the mail app repaints this route. Keep the current form and
 // code step; explicit account actions below request a fresh screen.
 if(!force&&host===container&&accountArea&&location.hash.split('?')[0]==='#account'&&container.querySelector('#account-form-area')===accountArea)return;
 const screen=++accountScreen;host=container;
 container.innerHTML='<section class="panel section owner-login"><h1 id="counter-account-heading">Вход и регистрация</h1><p id="account-sync-status" class="muted" role="status">Проверяем вход…</p><div id="account-form-area"></div><a class="button" id="account-mfa" href="#admin" hidden>Подтвердить защищённый вход</a><a class="text-button" href="#more">Назад</a></section>';
 const area=container.querySelector('#account-form-area');accountArea=area;
 const active=()=>host===container&&screen===accountScreen&&location.hash.split('?')[0]==='#account'&&container.querySelector('#account-form-area')===area;
 const report=text=>{if(active())container.querySelector('#account-sync-status').textContent=text;};
 await synchronizeCounters();if(!active())return;
 if(counterSyncStatus().signedIn){
  container.querySelector('#counter-account-heading').textContent='Мой аккаунт';
  area.innerHTML='<p class="account-authorized" id="counter-account-authorized" role="status">Авторизован</p><h2>Данные аккаунта</h2><form id="counter-profile"><label for="counter-profile-nick">Ник</label><input id="counter-profile-nick" type="text" autocomplete="nickname" minlength="2" maxlength="40" required value="'+esc(session.user.user_metadata?.nickname||'')+'"><button class="text-button" type="submit">Сохранить ник</button></form><p>'+esc(session.user.email||'Ваш аккаунт')+'</p><button class="button" id="counter-sync-now">Сохранить счёт</button><button class="text-button" id="counter-account-out">Выйти</button>';
  area.querySelector('#counter-profile').onsubmit=async e=>{
   e.preventDefault();if(!active())return;const form=e.currentTarget,button=form.querySelector('button');if(button.disabled)return;button.disabled=true;
   try{const {error}=await accountAuthClient().auth.updateUser({data:{nickname:form.querySelector('input').value.trim()}});if(error)throw error;if(active())button.textContent='Ник сохранён';}
   catch{report('Не удалось сохранить ник. Попробуйте позже.');}
   finally{if(active())button.disabled=false;}
  };
  area.querySelector('#counter-sync-now').onclick=()=>synchronizeCounters();
  area.querySelector('#counter-account-out').onclick=async()=>{
   if(!active())return;const button=area.querySelector('#counter-account-out');if(button.disabled)return;button.disabled=true;
   try{await synchronizeCounters();const {error}=await accountAuthClient().auth.signOut({scope:'local'});if(error)throw error;await synchronizeCounters();if(active())await showCounterAccount(container,'',true);}
   catch{report('Не удалось выйти. Проверьте соединение.');}
   finally{if(active())button.disabled=false;}
  };
 }else{
  area.innerHTML='<form id="counter-account-email-form"><label for="counter-account-nickname">Ник</label><input id="counter-account-nickname" type="text" autocomplete="nickname" minlength="2" maxlength="40" required><label for="counter-account-email">Электронная почта</label><input id="counter-account-email" type="email" autocomplete="email" required><button class="button" type="submit">Получить код для входа или регистрации</button><p class="muted owner-note">При первом входе создаётся личный аккаунт. Подтвердите почту кодом из письма.</p></form><details class="settings-extra"><summary>Войти с паролем</summary><form id="counter-account-login"><label for="counter-password-email">Электронная почта</label><input id="counter-password-email" type="email" autocomplete="username" required><label for="counter-account-password">Пароль</label><input id="counter-account-password" type="password" autocomplete="current-password" required><button class="button" type="submit">Войти</button></form></details>';
  const mailForm=area.querySelector('#counter-account-email-form'),mailActive=()=>active()&&area.querySelector('#counter-account-email-form')===mailForm;
  mailForm.onsubmit=async e=>{
   e.preventDefault();if(!mailActive())return;const email=mailForm.querySelector('input[type=email]').value.trim(),nickname=mailForm.querySelector('#counter-account-nickname').value.trim(),button=mailForm.querySelector('button');if(button.disabled)return;button.disabled=true;
   if(nickname.length<2||nickname.length>40){button.disabled=false;report('Укажите ник: от 2 до 40 символов.');return;}
   try{
    const {error}=await accountAuthClient().auth.signInWithOtp({email,options:{shouldCreateUser:true,data:{nickname}}});if(error)throw error;if(!mailActive())return;
    mailForm.innerHTML='<p class="muted">Введите код из письма SALAH, отправленного на '+esc(email)+'. Можно проверить папку «Спам».</p><label for="counter-email-code">Код из письма</label><input id="counter-email-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" minlength="6" maxlength="8" required><button class="button" type="submit">Подтвердить и войти</button><button class="text-button" type="button" id="counter-email-change">Изменить почту</button>';
    mailForm.querySelector('#counter-email-change').onclick=()=>{if(mailActive())return showCounterAccount(container,'',true);};
    mailForm.onsubmit=async event=>{
     event.preventDefault();if(!mailActive())return;const code=mailForm.querySelector('input'),submit=mailForm.querySelector('button'),token=code.value.trim();if(submit.disabled)return;submit.disabled=true;
     try{if(!/^[0-9]{6,8}$/.test(token))throw Error('invalid_code');const {data,error}=await accountAuthClient().auth.verifyOtp({email,token,type:'email'});code.value='';if(error||!data?.session?.user?.email_confirmed_at)throw Error('invalid_code');}
     catch{code.value='';if(mailActive()){submit.disabled=false;report('Код неверен или истёк. Запросите новое письмо.');}return;}
     if(!mailActive())return;
     let nicknameSaved=false;try{const {error}=await accountAuthClient().auth.updateUser({data:{nickname}});nicknameSaved=!error;}catch{}
     if(mailActive())await showCounterAccount(container,nicknameSaved?'':'Вход подтверждён. Не удалось сохранить ник. Его можно изменить здесь.',true);
    };
    mailForm.querySelector('input').focus();report('Письмо с кодом отправлено.');
   }catch{if(mailActive()){button.disabled=false;report('Не удалось отправить письмо. Попробуйте через минуту.');}}
  };
  area.querySelector('#counter-account-login').onsubmit=async e=>{
   e.preventDefault();if(!active())return;const form=e.currentTarget,button=form.querySelector('button'),password=form.querySelector('input[type=password]');if(button.disabled)return;button.disabled=true;
   try{const {data,error}=await accountAuthClient().auth.signInWithPassword({email:form.querySelector('input[type=email]').value.trim(),password:password.value});password.value='';if(error||!data?.session?.user?.email_confirmed_at)throw Error('invalid_login');if(active())await showCounterAccount(container,'',true);}
   catch{password.value='';if(active()){button.disabled=false;report('Не удалось войти. Проверьте почту и пароль.');}}
  };
 }
 updateStatus();if(!counterSyncStatus().signedIn)report('');if(message)report(message);
}
