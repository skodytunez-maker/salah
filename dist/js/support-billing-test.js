import{esc,title}from './ui.js';
import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
const TERMS='salah-monthly-test-2026-10-20';
const messages={test_configuration_required:'Нужно подключить тестовый магазин ЮKassa. Реальная оплата выключена.',test_account_required:'Тест оплаты доступен только участникам проверки.',payment_in_progress:'Предыдущий платёж ещё проверяется. Новый платёж не создан.',already_active:'Поддержка уже подключена.',sign_in_required:'Войдите в аккаунт, чтобы продолжить.',account_changed:'Аккаунт изменился. Повторите проверку.'};
export function testBillingMarkup(state={status:'loading'}){
 const date=value=>value?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Moscow'}).format(new Date(value)):'—';
 const start=['none','cancelled'].includes(state.status)&&!state.needsReview&&!state.inFlight;
 return '<section class="financial-support"><a class="financial-support-back" href="#more">‹ Меню</a>'+title('Поддержать SALAH')+'<section class="financial-support-card"><h2>Тест ежемесячной поддержки</h2><p class="financial-support-note">Проверка ЮKassa · реальные деньги не списываются.</p>'+
 (state.status==='signed-out'?'<p>Войдите в аккаунт для проверки.</p><a class="button secondary" href="#account">Войти</a>':state.status==='loading'?'<p role="status">Проверяем подключение…</p>':
 '<p>'+(state.status==='error'?'Подключение не проверено.':state.status==='active'?'Тестовая поддержка подключена: '+esc(state.amount)+' ₽ в месяц. Следующая дата: '+esc(date(state.nextChargeAt))+'.':state.status==='pending'?'Ожидаем подтверждения тестового платежа.':state.status==='cancelled'?'Поддержка отключена. Новые списания не создаются.':'Поддержка ещё не подключена.')+'</p>'+
 (state.method?.last4?'<p>Карта •••• '+esc(state.method.last4)+'</p>':'')+
 (state.needsReview?'<p role="alert">Платёж требует проверки. Повторная оплата заблокирована.</p>':'')+
 (start?'<form data-test-checkout><label for="support-test-amount">Сумма в месяц, ₽</label><input class="input" id="support-test-amount" type="number" min="150" max="15000" step="1" value="300" required><label style="display:flex;gap:12px;margin:20px 0;text-align:left"><input type="checkbox" required data-test-consent><span>Согласен сохранить способ оплаты для ежемесячной поддержки: выбранная сумма при подключении, затем раз в календарный месяц. Отключить можно здесь в любое время. Если в месяце нет нужного числа, платёж приходится на последний день месяца. Уже отправленный платёж может завершиться после отключения. Все функции SALAH остаются бесплатными.</span></label><button class="button" type="submit" data-test-pay>Перейти к тестовой оплате</button></form>':'')+
 (state.status==='active'||state.status==='pending'?'<button class="button support-subscription-unlink" type="button" data-test-unlink>Отключить поддержку и отвязать</button>':'')+
 '<button class="button secondary" type="button" data-test-refresh style="margin-top:12px">Проверить состояние</button>')+
 '<p role="alert" data-test-error hidden></p><p class="muted">Тестовая поддержка не даёт платных функций.</p></section></section>';
}
export function createTestBillingRequest({account,client,fetcher=fetch}){
 return async(action,details={})=>{
  const id=account().signedIn?account().userId:null;if(!id)throw Error('sign_in_required');
  const {data,error}=await client().auth.getSession(),session=data?.session;
  if(error||session?.user?.id!==id)throw Error('sign_in_required');
  if(!account().signedIn||account().userId!==id)throw Error('account_changed');
  const r=await fetcher(OWNER_PROJECT_URL+'/functions/v1/support-billing-test',{method:action?'POST':'GET',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+session.access_token,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify({action,...details})}:{}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
  if(!account().signedIn||account().userId!==id)throw Error('account_changed');
  const result=await r.json();if(!r.ok)throw Error(result.error||'request_failed');
  if(result.environment!=='test'||result.paymentEnabled!==false||result.testPaymentEnabled!==true||!['none','pending','active','cancelled'].includes(result.status)||action==='unlink'&&result.unlinked!==true)throw Error('invalid_response');
  if(result.confirmationUrl){const url=new URL(result.confirmationUrl);if(url.protocol!=='https:'||url.hostname!=='yoomoney.ru'||url.username||url.password||url.port)throw Error('invalid_response');}
  return result;
 };
}
export function mountTestBilling(host,options){
 host._supportBillingTestCleanup?.();host.querySelector('[data-support-subscription]')?._subscriptionCleanup?.();
 const request=createTestBillingRequest(options);let disposed=false,busy=false,generation=0,current={status:'loading'},scope;
 const active=()=>!disposed&&host.isConnected&&location.hash.split('?')[0]==='#support-salah'&&new URLSearchParams(location.hash.split('?')[1]||'').get('billing')==='test';
 function render(state){
  current=state;host.innerHTML=testBillingMarkup(state);
  host.querySelector('[data-test-refresh]')?.addEventListener('click',()=>run('reconcile'));
  host.querySelector('[data-test-unlink]')?.addEventListener('click',()=>run('unlink'));
  host.querySelector('[data-test-checkout]')?.addEventListener('submit',event=>{
   event.preventDefault();const amount=Number(host.querySelector('#support-test-amount').value),consent=host.querySelector('[data-test-consent]').checked;
   if(!Number.isSafeInteger(amount)||amount<150||amount>15000||!consent)return;
   void run('checkout',{amount,consent,termsVersion:TERMS});
  });
 }
 async function run(action,details){
  if(busy||!active())return;busy=true;const n=++generation,id=options.account().userId;
  for(const e of host.querySelectorAll('button,input'))e.disabled=true;
  try{
   const result=await request(action,details);
   if(!active()||n!==generation||id!==options.account().userId)return;
   render(result);
   if(action==='checkout'&&result.confirmationUrl)location.assign(result.confirmationUrl);
  }catch(error){
   if(!active()||n!==generation)return;
   render(options.account().signedIn?(current.status==='loading'?{status:'error'}:current):{status:'signed-out'});
   const message=host.querySelector('[data-test-error]');message.hidden=false;message.textContent=messages[error.message]||'Не удалось подтвердить результат. Проверьте состояние перед повторной оплатой.';
  }finally{if(n===generation)busy=false;}
 }
 const changed=()=>{const id=options.account().signedIn?options.account().userId:null;if(scope===id)return;scope=id;generation++;busy=false;render(id?{status:'loading'}:{status:'signed-out'});if(id)void run();};
 const route=()=>{if(!active())cleanup();};
 function cleanup(){disposed=true;generation++;window.removeEventListener('hashchange',route);window.removeEventListener('salah:counter-status',changed);host._supportBillingTestCleanup=null;}
 host._supportBillingTestCleanup=cleanup;window.addEventListener('hashchange',route);window.addEventListener('salah:counter-status',changed);changed();
}
