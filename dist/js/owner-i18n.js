import ru from './i18n/owner/ru.js';
import{t,getLocale}from './i18n.js';
import{esc,setUiMessage}from './ui.js';
import{uiMessage,uiLeaf,uiSet,uiRaw,uiSource,uiSourceLeaf,uiSourceMessage,uiAttrs,uiAttribute,uiAttributeAttrs,uiHtml,uiNumberLeaf,uiNumberSet,watchPracticeUi}from './practice-i18n.js';
export{uiMessage,uiLeaf,uiSet,uiRaw,uiAttrs,uiAttribute,uiAttributeAttrs,uiNumberLeaf,uiNumberSet};
export{t,getLocale};
// Only controlled owner UI values enter this map. Names, geography and messages
// remain source text and never pass through a reverse lookup.
export const OWNER_TEXT_KEYS=Object.freeze({...Object.fromEntries(Object.entries(ru).filter(([,value])=>typeof value==='string'&&!value.includes('{')).map(([key,value])=>[value,key])),Назад:'common.back',Закрыть:'common.close',Повторить:'common.retry',Отмена:'common.cancel',Обновить:'ownerUi.refresh',Главная:'nav.home',Знания:'nav.knowledge',Коран:'nav.quran',Азкары:'nav.adhkar',Меню:'nav.menu',Настройки:'common.settings',Кибла:'menu.qibla'});
export const ownerMessage=value=>uiSourceMessage(value,OWNER_TEXT_KEYS);
export const ownerLeaf=value=>uiSourceLeaf(value,OWNER_TEXT_KEYS);
export const ownerText=(node,value)=>uiSource(node,value,OWNER_TEXT_KEYS);
export const ownerMarkup=html=>uiHtml(html);
export function ownerPaint(host,html){if(host.hasAttribute?.('data-i18n')){host.removeAttribute('data-i18n');if(!host.hasAttribute('data-i18n-aria-label')&&!host.hasAttribute('data-i18n-title')&&!host.hasAttribute('data-i18n-placeholder'))host.removeAttribute('data-i18n-params');}host.removeAttribute?.('data-practice-number');host.innerHTML=ownerMarkup(html);if(host.firstElementChild)watchOwnerUi(host);else stopOwnerUi(host);}
export function ownerError(node,error){if(error?.uiMessage)setUiMessage(node,error.uiMessage);else ownerText(node,error?.message||error||'Не удалось выполнить действие.');}
export function ownerErrorLeaf(error){return error?.uiMessage?uiLeaf(error.uiMessage.key,error.message,error.uiMessage.params):ownerLeaf(error?.message||error||'Не удалось выполнить действие.');}
export function ownerHeading(label){return'<div class="page-head"><div><h1>'+ownerLeaf(label)+'</h1><p></p></div></div>';}
const dateFormats={utcFullDate:{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'},numericDate:{day:'2-digit',month:'2-digit',year:'numeric'},visitTime:{hour:'2-digit',minute:'2-digit',hour12:false},date:{day:'numeric',month:'short',year:'numeric'},longDate:{day:'numeric',month:'long',year:'numeric'},dateTime:{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'},shortDateTime:{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'},full:{},time:{hour:'2-digit',minute:'2-digit'},clock:{hour:'2-digit',minute:'2-digit',second:'2-digit'},dayMonth:{day:'numeric',month:'short'},utcDate:{timeZone:'UTC',day:'numeric',month:'short'},utcLongDate:{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}};
export function ownerDate(value,format='dateTime',fallback='Нет данных'){const date=new Date(value);return value!==null&&value!==undefined&&Number.isFinite(date.getTime())?date.toLocaleString(getLocale(),{...(dateFormats[format]||dateFormats.dateTime),hourCycle:'h23'}):ownerMessage(fallback);}
export function ownerDateLeaf(value,format='dateTime',fallback='Нет данных'){const date=new Date(value);if(value===null||value===undefined||!Number.isFinite(date.getTime()))return ownerLeaf(fallback);return'<span data-owner-ui-date="'+esc(date.toISOString())+'" data-owner-ui-format="'+esc(Object.hasOwn(dateFormats,format)?format:'dateTime')+'">'+esc(ownerDate(value,format,fallback))+'</span>';}
export function setOwnerDate(node,value,format='dateTime'){if(!node)return;const date=new Date(value);if(value===null||value===undefined||!Number.isFinite(date.getTime())){node.removeAttribute('data-owner-ui-date');ownerText(node,'Нет данных');return;}node.setAttribute('data-owner-ui-date',date.toISOString());node.setAttribute('data-owner-ui-format',Object.hasOwn(dateFormats,format)?format:'dateTime');uiRaw(node,ownerDate(value,format));}
export function ownerDateMessageLeaf(key,value,format='date',parameter='date'){const date=new Date(value),name='ownerUi.'+key;if(value===null||value===undefined||!Number.isFinite(date.getTime()))return ownerLeaf('Нет данных');if(!Object.hasOwn(ru,name)||!['date','time'].includes(parameter))throw Error('invalid_owner_ui_date_message');return'<span data-owner-ui-date-message="'+esc(name)+'" data-owner-ui-date-param="'+parameter+'" data-owner-ui-date-format="'+esc(format)+'" data-owner-ui-stamp="'+esc(date.toISOString())+'">'+uiLeaf(name,ru[name],{[parameter]:ownerDate(value,format)})+'</span>';}
function percent(value){const locale=getLocale(),sign=new Intl.NumberFormat(locale,{style:'percent'}).formatToParts(0).find(part=>part.type==='percentSign')?.value||'%';return new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(value*100)+sign;}
export function ownerPercentLeaf(value){return Number.isFinite(value)?'<span data-owner-ui-percent="'+esc(String(value))+'">'+esc(percent(value))+'</span>':ownerLeaf('Нет данных');}
const bindings=new WeakMap();
export function stopOwnerUi(host){bindings.get(host)?.();bindings.delete(host);}
export function watchOwnerUi(host,afterTranslate=()=>{}){
 bindings.get(host)?.();
 const off=watchPracticeUi(host,()=>{
  for(const node of host.querySelectorAll('[data-owner-ui-date]'))uiRaw(node,ownerDate(node.getAttribute('data-owner-ui-date'),node.getAttribute('data-owner-ui-format')));
  for(const node of host.querySelectorAll('[data-owner-ui-title-date]'))node.setAttribute('title',ownerDate(node.getAttribute('data-owner-ui-title-date'),'full'));
  for(const node of host.querySelectorAll('[data-owner-ui-updated-clock]'))uiSet(node,'ownerUi.updatedTime','Обновлено: {time}',{time:ownerDate(node.getAttribute('data-owner-ui-updated-clock'),'clock')});
  for(const node of host.querySelectorAll('[data-owner-ui-date-message]')){const key=node.getAttribute('data-owner-ui-date-message'),parameter=node.getAttribute('data-owner-ui-date-param');if(Object.hasOwn(ru,key)&&['date','time'].includes(parameter))uiSet(node,key,ru[key],{[parameter]:ownerDate(node.getAttribute('data-owner-ui-stamp'),node.getAttribute('data-owner-ui-date-format'))});}
  for(const node of host.querySelectorAll('[data-owner-ui-percent]')){const value=Number(node.getAttribute('data-owner-ui-percent'));if(Number.isFinite(value))uiRaw(node,percent(value));}
  afterTranslate();
 });
 bindings.set(host,off);return()=>{off();if(bindings.get(host)===off)bindings.delete(host);};
}
