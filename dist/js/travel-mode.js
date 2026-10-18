import{settings,updateSettings}from './storage.js';
import{esc,toast,closeModal}from './ui.js';
import{openCityDialog}from './city-dialog.js';
const cityFields=city=>city?{name:city.name,country:city.country||'',latitude:city.latitude,longitude:city.longitude,timezone:city.timezone}:null;
export const travelCityKey=city=>city?JSON.stringify([city.latitude,city.longitude,city.timezone]):'';
export const travelHomeCity=state=>state.travelHomeCity||state.city;
export function travelCitySelection(city,state=settings){const value=cityFields(city);return{city:value,[state.travelEnabled&&state.travelActive==='away'?'travelCity':'travelHomeCity']:value};}
export function travelActivation(state,side){if(!state.travelEnabled||!['home','away'].includes(side))return null;const city=side==='away'?state.travelCity:travelHomeCity(state);return city?{travelActive:side,city}:null;}
export const isTravelSwipe=(dx,dy,elapsed)=>Number.isFinite(dx)&&Number.isFinite(dy)&&elapsed>=0&&elapsed<=1400&&Math.abs(dx)>=56&&Math.abs(dy)<=Math.max(26,Math.abs(dx)*.55);
export function bindTravelSwipe(surface,onSwitch){
 if(!surface)return;let start=null,block=false;
 surface.addEventListener('pointerdown',e=>{block=false;start=e.isPrimary!==false&&e.button===0&&!e.target.closest('a,input,select,textarea,[data-no-swipe]')?{x:e.clientX,y:e.clientY,at:e.timeStamp,id:e.pointerId}:null;});
 surface.addEventListener('pointercancel',()=>{start=null;});
 surface.addEventListener('pointerup',e=>{const point=start;start=null;if(!point||e.pointerId!==point.id||!isTravelSwipe(e.clientX-point.x,e.clientY-point.y,e.timeStamp-point.at)||window.getSelection()?.isCollapsed===false)return;block=true;onSwitch(e.clientX<point.x?'away':'home');});
 surface.addEventListener('click',e=>{if(block){block=false;e.preventDefault();e.stopImmediatePropagation();}},true);
}
function save(patch,hooks){const changed=travelCityKey(settings.city)!==travelCityKey(patch.city??settings.city);if(changed)hooks.onBeforeChange?.();const saved=updateSettings(patch);hooks.onChange?.({cityChanged:changed});if(!saved)toast('Изменение действует в этом сеансе. Не удалось сохранить настройки.');return saved;}
function choose(side,hooks,activate=false){openCityDialog(side==='away'?settings.travelCity:travelHomeCity(settings),city=>{const value=cityFields(city),active=settings.travelEnabled&&(settings.travelActive===side||activate),patch={[side==='away'?'travelCity':'travelHomeCity']:value,...(active?{city:value,travelActive:side}:{})};closeModal();save(patch,hooks);hooks.redraw?.();});}
export function travelHomeMarkup(){if(!settings.travelEnabled)return '';return '<div class="travel-home" aria-label="Местности путника"><div class="travel-places" role="group" aria-label="Выбрать расписание">'+[['home','Дом',travelHomeCity(settings)],['away','В пути',settings.travelCity]].map(([side,label,city])=>'<button type="button" data-travel-side="'+side+'" aria-pressed="'+(settings.travelActive===side)+'"><small>'+label+'</small><span>'+esc(city?.name||'Выбрать город')+'</span></button>').join('')+'</div><p>Азан и уведомления: '+esc(settings.city?.name||'выберите город')+'</p></div>';}
export function bindTravelHome(host,hooks={}){if(!settings.travelEnabled)return;const activate=side=>{const patch=travelActivation(settings,side);if(!patch){if(side==='away')choose(side,hooks,true);return;}if(settings.travelActive!==side)save(patch,hooks);};host.querySelectorAll('[data-travel-side]').forEach(button=>button.onclick=()=>activate(button.dataset.travelSide));bindTravelSwipe(host.querySelector('.central-prayer.timetable'),activate);}
export function mountTravelSettings(host,hooks={}){
 if(!host)return;function draw(){if(!host.isConnected)return;const open=host.querySelector('details')?.open;host.innerHTML='<details class="settings-extra travel-settings" '+(open?'open':'')+'><summary>Режим путника</summary><label class="switch-row" for="travel-enabled"><span>Две местности на главной</span><input type="checkbox" id="travel-enabled" '+(settings.travelEnabled?'checked':'')+'></label><p class="muted">Переключайте таблицу свайпом или кнопками «Дом» и «В пути». Азан, уведомления и виджет следуют выбранной местности и её часовому поясу.</p><div '+(settings.travelEnabled?'':'hidden')+'><button type="button" class="button secondary" id="travel-home-city">Дом · '+esc(travelHomeCity(settings)?.name||'Выбрать город')+'</button><button type="button" class="button secondary" id="travel-away-city">В пути · '+esc(settings.travelCity?.name||'Выбрать город')+'</button><p class="muted">Сейчас: '+esc(settings.city?.name||'город не выбран')+'. При выключении возвращается домашняя местность.</p></div></details>';
 host.querySelector('#travel-enabled').onchange=e=>{const enabled=e.target.checked,home=settings.travelEnabled?travelHomeCity(settings):settings.city;save({travelEnabled:enabled,travelHomeCity:home,travelActive:'home',city:home},hooks);draw();};
 for(const side of ['home','away'])host.querySelector('#travel-'+side+'-city').onclick=()=>choose(side,{...hooks,redraw:draw});
 }draw();
}
