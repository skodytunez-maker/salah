import{esc}from './ui.js';
export function visitorsModel(value,days){
 if(!value||value.days!==days||![1,7,30].includes(days)||!Number.isSafeInteger(value.guests)||value.guests<0||!Number.isSafeInteger(value.accounts)||value.accounts<0||!Number.isFinite(Date.parse(value.startedAt))||!Number.isFinite(Date.parse(value.updatedAt)))throw Error('invalid_visitors');
 return{days,guests:value.guests,accounts:value.accounts,startedAt:value.startedAt,updatedAt:value.updatedAt};
}
export function mountOwnerVisitors(host,{load,isActive=()=>true}){
 let generation=0,disposed=false,model=null,period=7,helpOpen=false;
 const alive=()=>!disposed&&isActive();
 const render=(message='')=>{
  if(!alive()){host.innerHTML='';return;}
  host.innerHTML='<section class="owner-geography owner-visitors" aria-label="Гости и аккаунты"><div class="owner-geo-heading"><h2>Гости и аккаунты</h2><small>'+(period===1?'24 часа':period+' дней')+'</small></div><div class="owner-geo-body">' +(model?'<dl class="owner-visitor-counts"><div><dt>Гости</dt><dd>'+model.guests.toLocaleString('ru-RU')+'</dd></div><div><dt>Вошли в аккаунт</dt><dd>'+model.accounts.toLocaleString('ru-RU')+'</dd></div></dl>':'')+'<div class="owner-visitor-foot">'+(model?'<small>Учёт с '+esc(new Date(model.startedAt).toLocaleDateString('ru-RU'))+'</small>':'')+'<button type="button" class="text-button" data-visitor-help="" aria-expanded="'+helpOpen+'">О гостях</button></div><p class="owner-geo-note owner-visitor-explanation" '+(helpOpen?'':'hidden')+'>Гости — разные устройства без входа. Учёт начался после обновления SALAH; прежние посещения сюда не входят. Один человек может попасть в гости и аккаунты, если вошёл за этот период.</p>'+'<p class="owner-geo-status" role="status" aria-live="polite">'+esc(message)+'</p>'+(!model&&message?'<button type="button" class="text-button" data-visitors-retry>Повторить</button>':'')+'</div></section>';
  host.querySelector('[data-visitor-help]').onclick=()=>{helpOpen=!helpOpen;render(message);host.querySelector('[data-visitor-help]').focus({preventScroll:true});};
  const retry=host.querySelector('[data-visitors-retry]');if(retry)retry.onclick=()=>refresh(period);
 };
 const clear=()=>{generation++;model=null;host.innerHTML='';};
 const refresh=async days=>{const version=++generation;if(period!==days)model=null;period=days;render(model?'Обновляем…':'Загружаем…');try{const value=await load(days);if(version!==generation||!alive())return;model=visitorsModel(value,days);render();}catch(e){if(version!==generation||disposed)return;if(e?.status===401||e?.status===403||!alive()){clear();return;}render(model?'Не удалось обновить. Показаны последние данные.':'Не удалось загрузить гостей и аккаунты.');}};
 return{refresh,clear,dispose(){clear();disposed=true;}};
}
