import{APP_NEWS_UNTIL}from './app-release.js';
export const releaseHighlightActive=(now=Date.now())=>Number.isFinite(now)&&now<Date.parse(APP_NEWS_UNTIL);
// Retained for compatible cached imports; the obsolete promotion is no longer rendered.
export function releaseHighlightMarkup(){return '';}
export function bindReleaseHighlight(){}
