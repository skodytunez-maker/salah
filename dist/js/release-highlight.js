import{APP_NEWS_UNTIL}from './app-release.js';
import{showAppRelease,hasSeenAnnouncement}from './pwa-updates.js';
let expiryTimer=null,dismissListener=null;
export const releaseHighlightActive=(now=Date.now())=>Number.isFinite(now)&&now<Date.parse(APP_NEWS_UNTIL);
export function releaseHighlightMarkup(now=Date.now(),{home=false}={}){
 if(!releaseHighlightActive(now)||home&&hasSeenAnnouncement())return '';
 return '<button type="button" class="release-highlight" data-release-highlight'+(home?' data-release-home':'')+'><span class="release-highlight-images" aria-hidden="true"><img src="./assets/reciters/islamsobhi.jpg" alt=""><img src="./assets/updates/mushaf-357.png" alt=""></span><span><strong>Большое обновление SALAH</strong><small>Новые чтецы, мусхаф, скачивание и другие возможности</small><span class="release-highlight-action">Посмотреть все карточки →</span></span></button>';
}
export function bindReleaseHighlight(root,open=showAppRelease){
 clearTimeout(expiryTimer);if(dismissListener){window.removeEventListener('salah:release-dismissed',dismissListener);dismissListener=null;}const button=root.querySelector('[data-release-highlight]');if(!button)return;
 if(button.hasAttribute('data-release-home')){dismissListener=()=>{if(hasSeenAnnouncement()){button.remove();clearTimeout(expiryTimer);}};window.addEventListener('salah:release-dismissed',dismissListener);}
 button.onclick=()=>open();const remaining=Date.parse(APP_NEWS_UNTIL)-Date.now();if(remaining<=0){button.remove();return;}
 expiryTimer=setTimeout(()=>button.remove(),Math.min(remaining,2147483647));
}
