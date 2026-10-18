import{APP_NEWS_UNTIL}from './app-release.js';
import{showAppRelease}from './pwa-updates.js';
let expiryTimer=null;
export const releaseHighlightActive=(now=Date.now())=>Number.isFinite(now)&&now<Date.parse(APP_NEWS_UNTIL);
export function releaseHighlightMarkup(now=Date.now()){
 if(!releaseHighlightActive(now))return '';
 return '<button type="button" class="release-highlight" data-release-highlight><span class="release-highlight-images" aria-hidden="true"><img src="./assets/reciters/islamsobhi.jpg" alt=""><img src="./assets/updates/mushaf-357.png" alt=""></span><span><strong>Большое обновление SALAH</strong><small>Новые чтецы, мусхаф, скачивание и другие возможности</small><span class="release-highlight-action">Посмотреть все карточки →</span></span></button>';
}
export function bindReleaseHighlight(root,open=showAppRelease){
 clearTimeout(expiryTimer);const button=root.querySelector('[data-release-highlight]');if(!button)return;
 button.onclick=()=>open();const remaining=Date.parse(APP_NEWS_UNTIL)-Date.now();if(remaining<=0){button.remove();return;}
 expiryTimer=setTimeout(()=>button.remove(),Math.min(remaining,2147483647));
}
