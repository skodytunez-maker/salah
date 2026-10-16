import{esc}from './ui.js';
import{formatListeningTime}from './reciter-popularity-core.js';
export function listeningSummaryMarkup(seconds,{personal=false}={}){
 const value=Number.isSafeInteger(seconds)&&seconds>=0?formatListeningTime(seconds):'…';
 return '<div class="listening-summary'+(personal?' reciter-personal-total':'')+'" data-listening-summary><span>'+(personal?'Всего прослушано':'Вместе прослушали')+'</span><strong data-listening-total aria-live="off">'+esc(value)+'</strong></div>';
}
export function updateListeningSummary(host,seconds){const element=host.querySelector('[data-listening-total]');if(!element)return;const value=Number.isSafeInteger(seconds)&&seconds>=0?formatListeningTime(seconds):'…';if(element.textContent!==value)element.textContent=value;}
