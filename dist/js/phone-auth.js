import{createPhoneFlow,phoneError}from './phone-auth-core.js';
// Activate only after provider delivery, server guards and rate limits pass review.
export const PHONE_AUTH_READY=false;
export function mountPhoneAuth(host,{auth,accountId=null,isActive=()=>true,onVerified=()=>{}}){
 if(!PHONE_AUTH_READY)return;
 const flow=createPhoneFlow({auth,accountId,available:()=>PHONE_AUTH_READY});let sent=false,busy=false;
 host.innerHTML='<details class="settings-extra"><summary>'+(accountId?'Привязать телефон':'Войти по телефону')+'</summary><form novalidate><label>Страна<select name="country"><option value="RU">Россия +7</option><option value="TJ">Таджикистан +992</option></select></label><label>Телефон<input name="phone" type="tel" autocomplete="tel" required maxlength="40"></label><label hidden data-sms-code>Код из SMS<input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" maxlength="8"></label><p role="status" class="muted" data-sms-status></p><button type="submit" class="button">Получить SMS</button><button type="button" class="text-button" data-sms-resend hidden>Новый код</button>'+(accountId?'':'<p class="muted owner-note">Уже есть аккаунт? Войдите по почте и привяжите номер в профиле.</p>')+'</form></details>';
 const form=host.querySelector('form'),phone=form.elements.phone,country=form.elements.country,code=form.elements.code,button=form.querySelector('[type=submit]'),resend=form.querySelector('[data-sms-resend]'),status=form.querySelector('[data-sms-status]');
 const active=()=>isActive()&&host.querySelector('form')===form;
 const run=async action=>{if(busy||!active())return;busy=true;button.disabled=true;resend.disabled=true;status.textContent='Подождите…';try{await action();}catch(error){if(active())status.textContent=phoneError(error);}finally{busy=false;if(active()){button.disabled=false;resend.disabled=false;}}};
 const send=async()=>{await flow.send(phone.value,country.value);if(!active())return;sent=true;phone.disabled=true;country.disabled=true;form.querySelector('[data-sms-code]').hidden=false;code.required=true;resend.hidden=false;button.textContent='Подтвердить';status.textContent='Код отправлен.';code.value='';code.focus();};
 form.onsubmit=event=>{event.preventDefault();return run(async()=>{if(!sent)return send();await flow.verify(code.value);code.value='';if(active())await onVerified();});};
 resend.onclick=()=>run(send);
}
