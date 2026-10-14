import {title,esc} from './ui.js';
export const MONTHLY_SUPPORT_AMOUNTS=Object.freeze([150,300,500]);
export const CUSTOM_SUPPORT_MIN=150;
let selectedAmount=300,customSelected=false,customValue='150';
const amountLabel=amount=>new Intl.NumberFormat('ru-RU').format(amount)+' ₽';
export function validateCustomSupportAmount(value){
 const text=String(value??'').trim();
 if(!/^[0-9]+$/.test(text))return {valid:false,message:'Введите сумму целыми рублями.'};
 const amount=Number(text);
 if(!Number.isSafeInteger(amount))return {valid:false,message:'Введите меньшую сумму.'};
 if(amount<CUSTOM_SUPPORT_MIN)return {valid:false,message:'Своя сумма — от 150 ₽ в месяц.'};
 return {valid:true,amount};
}
export function monthlySupportMarkup(amount=300,{custom=false,value='150'}={}){
 const selected=MONTHLY_SUPPORT_AMOUNTS.includes(amount)?amount:300,validation=validateCustomSupportAmount(value);
 return '<section class="financial-support"><a class="financial-support-back" href="#more"><span aria-hidden="true">‹</span> Меню</a>'+title('Поддержать SALAH')+
 '<p class="financial-support-intro">Помогите нам развивать приложение<br>и сохранять его доступным для всех.</p>'+
 '<section class="financial-support-card" aria-labelledby="monthly-support-title">'+
 '<div class="financial-support-emblem" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 38S8 28 8 17c0-9 12-12 16-3 4-9 16-6 16 3 0 11-16 21-16 21Z"/><path d="M24 7V3m13 7 3-3M11 10 8 7"/></svg></div>'+
 '<h2 id="monthly-support-title">Ежемесячная поддержка</h2><p class="financial-support-purpose">На работу сервиса и новые возможности SALAH.</p>'+
 '<fieldset class="financial-support-amounts"><legend>Выберите сумму в месяц</legend>'+MONTHLY_SUPPORT_AMOUNTS.map(option=>'<label><input type="radio" name="salah-monthly-support" value="'+option+'" '+(!custom&&option===selected?'checked':'')+'><span><strong>'+amountLabel(option)+'</strong><small>в месяц</small></span></label>').join('')+
 '<label class="financial-support-custom-option"><input type="radio" name="salah-monthly-support" value="custom" '+(custom?'checked':'')+'><span><strong>Своя сумма</strong><small>от 150 ₽ в месяц</small></span></label></fieldset>'+
 '<div class="financial-support-custom" '+(!custom?'hidden':'')+'><label for="monthly-support-custom-amount">Сумма в месяц, ₽</label><input id="monthly-support-custom-amount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="16" value="'+esc(value)+'" aria-describedby="monthly-support-custom-error" aria-invalid="'+Boolean(custom&&!validation.valid)+'"><p id="monthly-support-custom-error" aria-live="polite" '+(!custom||validation.valid?'hidden':'')+'>'+(!validation.valid?validation.message:'')+'</p></div>'+
 '<div class="financial-support-total"><span>Выбранная сумма</span><output aria-live="polite" aria-atomic="true" data-monthly-support-total>'+(custom?(validation.valid?amountLabel(validation.amount)+' / месяц':'—'):amountLabel(selected)+' / месяц')+'</output></div>'+
 '<button class="button financial-support-unavailable" type="button" disabled aria-describedby="monthly-support-note">Оплата скоро появится</button>'+
 '<p class="financial-support-note" id="monthly-support-note">Оплату включим после одобрения ЮKassa.<br>Сейчас деньги не списываются.</p></section>'+
 '<div class="financial-support-free"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1V4Zm9 1v15"/></svg><p>Все функции SALAH остаются бесплатными.<br>Поддержка — только по вашему желанию.</p></div></section>';
}
export function mountFinancialSupport(host){
 if(!host.querySelector('.financial-support'))host.innerHTML=monthlySupportMarkup(selectedAmount,{custom:customSelected,value:customValue});
 const total=host.querySelector('[data-monthly-support-total]'),custom=host.querySelector('.financial-support-custom'),amount=host.querySelector('#monthly-support-custom-amount'),error=host.querySelector('#monthly-support-custom-error');
 const updateCustom=()=>{
  customValue=amount.value;
  const result=validateCustomSupportAmount(customValue);
  amount.setAttribute('aria-invalid',String(!result.valid));
  error.hidden=result.valid;error.textContent=result.valid?'':result.message;
  total.textContent=result.valid?amountLabel(result.amount)+' / месяц':'—';
 };
 amount.oninput=()=>{if(customSelected)updateCustom();};
 for(const input of host.querySelectorAll('input[name="salah-monthly-support"]')){
  input.onchange=()=>{
   if(!input.checked)return;
   customSelected=input.value==='custom';custom.hidden=!customSelected;
   if(customSelected){updateCustom();amount.focus({preventScroll:true});return;}
   const value=Number(input.value);if(!MONTHLY_SUPPORT_AMOUNTS.includes(value))return;selectedAmount=value;total.textContent=amountLabel(value)+' / месяц';
  };
 }
}
