import{ownerDateMessageLeaf,ownerPercentLeaf,uiNumberLeaf,ownerMessage,ownerLeaf,ownerText,ownerMarkup,ownerError,ownerHeading,ownerDate,ownerDateLeaf,ownerPaint,watchOwnerUi,stopOwnerUi,uiMessage,uiLeaf,uiSet,uiRaw,uiAttrs,uiAttribute,uiAttributeAttrs,t,getLocale}from './owner-i18n.js';
import{mountOwnerGeoMembers}from './owner-geo-members.js';
import{createOwnerCardHistory}from './owner-card-navigation.js';
import{esc}from './ui.js';
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export function geographyModel(value,period){
 if(![1,7,30].includes(period)||value?.period!==period||!['total','withCity','withCountry','otherCities','otherCountries'].every(k=>integer(value[k]))||value.withCity>value.total||value.withCountry>value.withCity)throw Error('invalid_geography');
 const name=s=>typeof s==='string'&&s.trim()&&s.length<=160&&!/[\u0000-\u001f\u007f]/.test(s);
 const rows=(key,isCity)=>{const list=value[key];if(!Array.isArray(list)||list.length>100)throw Error('invalid_geography');const seen=new Set();for(const row of list){if(!name(row?.name)||!integer(row.accounts)||row.accounts<1||isCity&&row.country!==null&&!name(row.country))throw Error('invalid_geography');const id=JSON.stringify([row.name,isCity?row.country:null]);if(seen.has(id))throw Error('invalid_geography');seen.add(id);}return list.map(row=>({...row}));};
 const cities=rows('cities',true),countries=rows('countries',false);
 if(cities.reduce((n,r)=>n+r.accounts,0)+value.otherCities!==value.withCity||countries.reduce((n,r)=>n+r.accounts,0)+value.otherCountries!==value.withCountry)throw Error('invalid_geography');
 return{...value,cities,countries};
}
const number=n=>n.toLocaleString(getLocale());
function rowsHtml(model,tab,all){
 const list=tab==='cities'?model.cities:model.countries,known=tab==='cities'?model.withCity:model.withCountry,other=tab==='cities'?model.otherCities:model.otherCountries;
 const shown=all?list:list.slice(0,5),percent=n=>ownerPercentLeaf(n/model.total);
 return (shown.length?'<ol class="owner-geo-list">'+shown.map((row,index)=>'<li><button type="button" class="owner-geo-row" data-geo-index="'+index+'"><div><span lang="" dir="auto" translate="no">'+esc([row.name,tab==='cities'?row.country:null].filter(Boolean).join(', '))+'</span><strong>'+uiNumberLeaf(row.accounts)+' <small>'+percent(row.accounts)+'</small></strong></div><span class="owner-geo-track" aria-hidden="true"><i style="width:'+Math.max(1,Math.round(row.accounts/model.total*100))+'%"></i></span><span class="owner-geo-arrow" aria-hidden="true">›</span></button></li>').join('')+'</ol>':'<p class="owner-geo-note">'+ownerLeaf(model.total?'Данные пока не переданы.':'За этот период пока нет посещений аккаунтов.')+'</p>')+(list.length>5?'<button type="button" class="text-button" data-geo-more aria-expanded="'+all+'">'+(all?ownerLeaf('Свернуть список'):uiLeaf('ownerUi.showAll','Показать все · {count}',{count:list.length}))+'</button>':'')+(other?"<p class=\"owner-geo-note\"><span data-i18n=\"ownerUi.others\">Другие:</span> "+uiNumberLeaf(other)+'</p>':'')+(model.total>known?'<p class="owner-geo-note">'+ownerLeaf(tab==='cities'?'Без города':'Без страны')+': '+uiNumberLeaf(model.total-known)+'</p>':'');
}
export function mountOwnerGeography(host,{load,loadMembers=null,onUser=()=>{},isActive=()=>true}={}){
 let generation=0,disposed=false,model=null,period=7,tab='cities',all=false,members=null,openerIndex=0;
 const alive=()=>!disposed&&isActive();
 const win=host.ownerDocument.defaultView;
 const closeMembers=()=>{members?.dispose();members=null;};
 const returnToList=()=>{closeMembers();render();host.querySelector('[data-geo-index="'+openerIndex+'"]')?.focus({preventScroll:true});};
 const nested=createOwnerCardHistory({key:'salahOwnerGeography',win,isActive:()=>!disposed&&host.isConnected,dismiss:returnToList,onRoute:()=>win.dispatchEvent(new win.Event('salah:route-history'))});
 const render=(message='')=>{
  if(!alive()){ownerPaint(host,'');return;}
  if(members)return;
  ownerPaint(host,"<section class=\"owner-geography\" aria-label=\"География аккаунтов\" data-i18n-aria-label=\"ownerUi.accountGeography\"><div class=\"owner-geo-heading\"><h2 data-i18n=\"ownerUi.geography\">География</h2><small>"+(model?uiLeaf('ownerUi.amountOf','{part} из {total}',{part:model.withCity,total:model.total}):ownerLeaf('Аккаунты SALAH'))+'</small></div><div class="owner-geo-body"><p class="owner-geo-note">'+(period===1?ownerLeaf('Аккаунты SALAH за 24 часа'):uiLeaf('ownerUi.accountsPeriod','Аккаунты SALAH за {count} дней',{count:period}))+" <span data-i18n=\"ownerUi.chosenPrayerCity\">· выбранный город намаза</span></p><div class=\"owner-geo-tabs\" role=\"group\" aria-label=\"География аккаунтов\" data-i18n-aria-label=\"ownerUi.accountGeography\"><button type=\"button\" data-geo-tab=\"cities\" aria-pressed=\""+(tab==='cities')+"\"><span data-i18n=\"ownerUi.cities\">Города</span></button><button type=\"button\" data-geo-tab=\"countries\" aria-pressed=\""+(tab==='countries')+"\"><span data-i18n=\"ownerUi.countries\">Страны</span></button></div><p class=\"owner-geo-status\" role=\"status\" aria-live=\"polite\">"+ownerLeaf(message)+'</p><div data-geo-rows>'+(model?rowsHtml(model,tab,all):'')+'</div>'+(!model&&message?"<button type=\"button\" class=\"text-button\" data-geo-retry data-i18n=\"common.retry\">Повторить</button>":'')+'</div></section>');
  host.querySelectorAll('[data-geo-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.geoTab;all=false;render(message);host.querySelector('[data-geo-tab="'+tab+'"]').focus({preventScroll:true});});
  const more=host.querySelector('[data-geo-more]');if(more)more.onclick=()=>{all=!all;render(message);host.querySelector('[data-geo-more]')?.focus({preventScroll:true});};
  host.querySelectorAll('[data-geo-index]').forEach(button=>{button.disabled=!loadMembers;button.onclick=()=>{if(!loadMembers||!model||!nested.open())return;openerIndex=Number(button.dataset.geoIndex);const row=(tab==='cities'?model.cities:model.countries)[openerIndex];const selection={kind:tab==='cities'?'city':'country',city:tab==='cities'?row.name:null,country:tab==='cities'?row.country:row.name};ownerPaint(host,'<section class="owner-geography"><div class="owner-geo-body owner-geo-members owner-users"></div></section>');members=mountOwnerGeoMembers(host.querySelector('.owner-geo-members'),{load:loadMembers,isActive:alive,onUser,onDenied:()=>clear(),onBack:nested.back});void members.open(selection,period);};});
  const retry=host.querySelector('[data-geo-retry]');if(retry)retry.onclick=()=>refresh(period);
 };
 const refresh=async days=>{
  const version=++generation;
  if(period!==days){if(members)nested.back();closeMembers();model=null;all=false;}else if(members)void members.refresh();period=days;render(model?'Обновляем…':'Загружаем…');
  try{const value=await load(days);if(version!==generation||!alive())return;model=geographyModel(value,days);render();}
  catch(error){if(version!==generation||disposed)return;if(error?.status===401||error?.status===403||!alive()){clear();return;}render(model?'Не удалось обновить. Показаны последние данные.':'Не удалось загрузить географию.');}
 };
 const clear=()=>{generation++;nested.reset();closeMembers();model=null;ownerPaint(host,'');};
 const resetView=()=>{nested.reset();closeMembers();tab='cities';all=false;openerIndex=0;render();};
 return{refresh,clear,resetView,dispose(){clear();nested.dispose();disposed=true;}};
}
