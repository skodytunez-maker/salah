// Shared phone flow for SALAH and SAHABA. Auth owns OTPs and account identity.
export function normalizePhone(value,country='RU'){
 const raw=String(value||'').trim();if(!/^[+\d\s().-]+$/.test(raw)||raw.length>40||/\+/.test(raw.slice(1)))throw Error('invalid_phone');
 let digits=raw.replace(/\D/g,'');
 if(!raw.startsWith('+')){
  if(country==='RU'&&/^89\d{9}$/.test(digits))digits='7'+digits.slice(1);
  else if(country==='RU'&&/^9\d{9}$/.test(digits))digits='7'+digits;
  else if(country==='TJ'&&/^\d{9}$/.test(digits))digits='992'+digits;
 }
 if(!/^79\d{9}$/.test(digits)&&!/^992\d{9}$/.test(digits))throw Error('invalid_phone');
 return '+'+digits;
}
export function confirmedAccount(user){return !!user&&!user.is_anonymous&&!!(user.email_confirmed_at||(user.phone_confirmed_at&&/^(?:\+)?(?:79\d{9}|992\d{9})$/.test(user.phone||'')));}
export function phoneError(error){
 if(error?.message==='invalid_phone')return 'Введите номер России (+7) или Таджикистана (+992).';
 if(error?.message==='invalid_code')return 'Введите код из SMS: от 6 до 8 цифр.';
 if(error?.message==='mfa_required')return 'Сначала подтвердите вход через Google Authenticator.';
 if(['account_changed','sign_in_required'].includes(error?.message))return 'Аккаунт изменился. Войдите снова и повторите привязку.';
 if(error?.status===429||error?.message==='cooldown')return 'Подождите минуту перед повторной отправкой.';
 if(['otp_expired','invalid_credentials'].includes(error?.code))return 'Код неверен или истёк. Запросите новый.';
 if(['phone_exists','phone_already_exists'].includes(error?.code))return 'Не удалось привязать номер. Проверьте его или обратитесь в поддержку.';
 return 'Не удалось выполнить запрос SMS. Проверьте интернет и попробуйте позже.';
}
export function createPhoneFlow({auth,accountId=null,now=Date.now,available=()=>false}){
 let phone='',sentAt=null,pending=false;
 const remaining=()=>sentAt===null?0:Math.max(0,Math.ceil((sentAt+60000-now())/1000));
 const run=async fn=>{if(pending)throw Error('busy');pending=true;try{if(!await available())throw Error('sms_unavailable');return await fn();}finally{pending=false;}};
 const unwrap=result=>{if(result.error)throw result.error;return result.data;};
 const identity=async()=>{
  const data=unwrap(await auth.getUser());const user=data?.user;
  if(!confirmedAccount(user)||user.id!==accountId)throw Error('account_changed');
  return user;
 };
 const requireMfa=async()=>{
  const factors=unwrap(await auth.mfa.listFactors()),level=unwrap(await auth.mfa.getAuthenticatorAssuranceLevel());
  if(!factors||!level)throw Error('auth_unavailable');
  if(((factors.totp||[]).some(f=>f.status==='verified')||level.nextLevel==='aal2')&&level.currentLevel!=='aal2')throw Error('mfa_required');
 };
 return {
  remaining,
  async send(value,country){return run(async()=>{
   if(remaining())throw Error('cooldown');const next=normalizePhone(value,country);
   if(phone&&next!==phone)throw Error('phone_changed');
   if(accountId){await identity();await requireMfa();await identity();unwrap(await auth.updateUser({phone:next}));}
   else{const data=unwrap(await auth.getSession());if(data?.session)throw Error('account_changed');unwrap(await auth.signInWithOtp({phone:next,options:{channel:'sms',shouldCreateUser:true}}));}
   phone=next;sentAt=now();return phone;
  });},
  async verify(token){return run(async()=>{
   if(!phone||sentAt===null)throw Error('code_not_sent');if(!/^[0-9]{6,8}$/.test(String(token).trim()))throw Error('invalid_code');
   if(accountId){await identity();await requireMfa();await identity();}
   else{const data=unwrap(await auth.getSession());if(data?.session)throw Error('account_changed');}
   const data=unwrap(await auth.verifyOtp({phone,token:String(token).trim(),type:accountId?'phone_change':'sms'}));
   const fresh=unwrap(await auth.getUser());const user=fresh?.user;
   if(!confirmedAccount(user)||!user.phone_confirmed_at||normalizePhone(user.phone)!==phone||!user.id||(accountId&&user.id!==accountId)||(!accountId&&data?.session?.user?.id!==user.id))throw Error('invalid_session');
   return user;
  });}
 };
}
