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
const number=n=>n.toLocaleString('ru-RU');
function rowsHtml(model,tab,all){
 const list=tab==='cities'?model.cities:model.countries,known=tab==='cities'?model.withCity:model.withCountry,other=tab==='cities'?model.otherCities:model.otherCountries;
 const shown=all?list:list.slice(0,5),percent=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n/model.total*100)+'%';
 return (shown.length?'<ol class="owner-geo-list">'+shown.map(row=>'<li><div><span>'+esc([row.name,tab==='cities'?row.country:null].filter(Boolean).join(', '))+'</span><strong>'+number(row.accounts)+' <small>'+percent(row.accounts)+'</small></strong></div><span class="owner-geo-track" aria-hidden="true"><i style="width:'+Math.max(1,Math.round(row.accounts/model.total*100))+'%"></i></span></li>').join('')+'</ol>':'<p class="owner-geo-note">'+(model.total?'Данные пока не переданы.':'За этот период пока нет посещений аккаунтов.')+'</p>')+(list.length>5?'<button type="button" class="text-button" data-geo-more aria-expanded="'+all+'">'+(all?'Свернуть список':'Показать все · '+list.length)+'</button>':'')+(other?'<p class="owner-geo-note">Другие: '+number(other)+'</p>':'')+(model.total>known?'<p class="owner-geo-note">Без '+(tab==='cities'?'города':'страны')+': '+number(model.total-known)+'</p>':'');
}
export function mountOwnerGeography(host,{load,isActive=()=>true}={}){
 let generation=0,disposed=false,model=null,period=7,tab='cities',all=false;
 const alive=()=>!disposed&&isActive();
 const render=(message='')=>{
  if(!alive()){host.innerHTML='';return;}
  host.innerHTML='<section class="owner-geography" aria-label="География аккаунтов"><div class="owner-geo-heading"><h2>География</h2><small>'+(model?number(model.withCity)+' из '+number(model.total):'Аккаунты SALAH')+'</small></div><div class="owner-geo-body"><p class="owner-geo-note">Аккаунты SALAH за '+(period===1?'24 часа':period+' дней')+' · выбранный город намаза</p><div class="owner-geo-tabs" role="group" aria-label="География аккаунтов"><button type="button" data-geo-tab="cities" aria-pressed="'+(tab==='cities')+'">Города</button><button type="button" data-geo-tab="countries" aria-pressed="'+(tab==='countries')+'">Страны</button></div><p class="owner-geo-status" role="status" aria-live="polite">'+esc(message)+'</p><div data-geo-rows>'+(model?rowsHtml(model,tab,all):'')+'</div>'+(!model&&message?'<button type="button" class="text-button" data-geo-retry>Повторить</button>':'')+'</div></section>';
  host.querySelectorAll('[data-geo-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.geoTab;all=false;render(message);host.querySelector('[data-geo-tab="'+tab+'"]').focus({preventScroll:true});});
  const more=host.querySelector('[data-geo-more]');if(more)more.onclick=()=>{all=!all;render(message);host.querySelector('[data-geo-more]')?.focus({preventScroll:true});};
  const retry=host.querySelector('[data-geo-retry]');if(retry)retry.onclick=()=>refresh(period);
 };
 const refresh=async days=>{
  const version=++generation;
  if(period!==days){model=null;all=false;}period=days;render(model?'Обновляем…':'Загружаем…');
  try{const value=await load(days);if(version!==generation||!alive())return;model=geographyModel(value,days);render();}
  catch(error){if(version!==generation||disposed)return;if(error?.status===401||error?.status===403||!alive()){clear();return;}render(model?'Не удалось обновить. Показаны последние данные.':'Не удалось загрузить географию.');}
 };
 const clear=()=>{generation++;model=null;host.innerHTML='';};
 return{refresh,clear,dispose(){clear();disposed=true;}};
}
