// Display-only helpers. No score, identity, credit or saved record is calculated here.
import{t,translateUi,subscribeLanguage}from './i18n.js';
import{modal,uiMessage}from './ui.js';
export function rankingTime(seconds){const value=Math.max(0,Math.floor(seconds||0)),hours=Math.floor(value/3600),minutes=Math.floor(value%3600/60),rest=value%60;return t(hours?(rest?'rankingUi.timeHoursMinutesSeconds':'rankingUi.timeHoursMinutes'):minutes?(rest?'rankingUi.timeMinutesSeconds':'rankingUi.timeMinutes'):'rankingUi.timeSeconds',{hours,minutes,seconds:rest});}
export function listeningTime(seconds){const value=Math.floor(Math.max(0,Number(seconds)||0)),minutes=Math.floor(value/60),rest=value%60;return !minutes?t(value?'rankingUi.timeSeconds':'rankingUi.timeZero',{seconds:value}):t(rest?'rankingUi.timeHoursMinutesSeconds':'rankingUi.timeHoursMinutes',{hours:Math.floor(minutes/60),minutes:minutes%60,seconds:rest});}
export function renderRankingTimes(root){
 for(const node of root?.querySelectorAll?.('[data-rank-ui-seconds]')||[]){const value=rankingTime(Number(node.dataset.rankUiSeconds));if(node.hasAttribute('data-rank-ui-text'))node.textContent=value;if(node.hasAttribute('data-rank-ui-aria')){node.setAttribute('aria-label',value);if(node.hasAttribute('title'))node.title=value;}}
 for(const node of root?.querySelectorAll?.('[data-rank-ui-listened]')||[])node.textContent=t('rankingUi.timeListened',{time:rankingTime(Number(node.dataset.rankUiListened))});
}
// The competition client keeps its transport errors and permission gates. Map
// only its known static UI messages at the display boundary.
const errors=new Map([
 ['Личные данные защищены','dataProtected'],['Войдите в аккаунт','signInRequired'],['Аккаунт изменился','accountChanged'],['Повторим синхронизацию чуть позже','syncLater'],['Не удалось сохранить. Проверьте соединение.','saveConnection'],['Не удалось сохранить устройство','deviceSaveFailed'],['Для уведомлений рейтинга пока используйте SALAH в браузере или с главного экрана.','notificationsBrowser'],['На iPhone сначала добавьте SALAH на экран «Домой».','notificationsHome'],['Уведомления не разрешены','notificationsDenied'],['Не удалось подключить уведомления','notificationsConnectFailed'],['Не удалось получить ключ уведомлений','notificationsKeyFailed']
]);
export const rankingErrorMessage=error=>error?.uiMessage||uiMessage('rankingUi.'+(errors.get(error?.message)||'saveFailed'));
let disposeModal=null;
export function rankingModal(markup,paint=()=>{}){disposeModal?.();modal(markup);const root=document.getElementById('modal-content'),dialog=root?.closest('dialog');if(!root||!dialog)return;const first=root.firstChild;let closed=false;const draw=()=>{if(closed)return;translateUi(root);renderRankingTimes(root);paint(root);};const off=subscribeLanguage(draw),observer=typeof MutationObserver==='function'?new MutationObserver(()=>{if(root.firstChild!==first)dispose();}):null;function dispose(){if(closed)return;closed=true;off();observer?.disconnect();dialog.removeEventListener('close',dispose);if(disposeModal===dispose)disposeModal=null;}observer?.observe(root,{childList:true});dialog.addEventListener('close',dispose,{once:true});disposeModal=dispose;draw();}
