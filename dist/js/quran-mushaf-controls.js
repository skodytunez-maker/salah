import{t}from './i18n.js';
import{esc}from './ui.js';
// Color names and swatches follow Quran Foundation QCF V4 / Quran.com TajweedBar.
const RULES=[['edgham','Edgham'],['mad-2','Mad2'],['mad-2-4-6','Mad246'],['mad-4-5','Mad45'],['mad-6','Mad6'],['ekhfa','Ekhfa'],['qalqala','Qalqala'],['tafkhim','Tafkhim']];
// Preserve the public tuple contract; resolve translated labels when consumed.
export const MUSHAF_COLOR_RULES=RULES.map(([key,name])=>Object.defineProperties([key],{1:{enumerable:true,get:()=>t('quranUi.mushafRule'+name+'Title')},2:{enumerable:true,get:()=>t('quranUi.mushafRule'+name+'Text')}}));
const leaf=(key,tag='span',attrs='')=>'<'+tag+' data-i18n="'+key+'"'+attrs+'>'+esc(t(key))+'</'+tag+'>';
export function mushafThemeButton(theme){return '<span class="mushaf-theme-symbol" aria-hidden="true">◐</span>'+leaf(theme==='night'?'quranUi.mushafLight':'quranUi.mushafDark');}
export function mushafColorGuideMarkup(){
 return '<dialog id="mushaf-colors-dialog" class="mushaf-colors-dialog" aria-labelledby="mushaf-colors-title"><div class="mushaf-colors-heading">'+leaf('quranUi.mushafColorsTitle','h2',' id="mushaf-colors-title"')+'<button type="button" id="mushaf-colors-close" data-i18n-aria-label="quranUi.mushafColorsClose" aria-label="'+esc(t('quranUi.mushafColorsClose'))+'" autofocus>×</button></div>'+leaf('quranUi.mushafColorsIntro','p',' class="mushaf-colors-intro"')+leaf('quranUi.mushafColorsNote','p',' id="mushaf-colors-note" hidden')+'<ul class="mushaf-color-rules">'+RULES.map(([key,name])=>'<li><span class="mushaf-color-swatch" data-rule="'+key+'" aria-hidden="true"></span><div>'+leaf('quranUi.mushafRule'+name+'Title','strong')+leaf('quranUi.mushafRule'+name+'Text','p')+'</div></li>').join('')+'</ul><p class="mushaf-colors-source">'+leaf('quranUi.mushafColorsAdapted')+' <a href="https://github.com/quran/quran.com-frontend-next/blob/aff1a035b09b66f28047b3216edcae4c5c949a49/src/components/QuranReader/TajweedBar/TajweedBar.tsx" target="_blank" rel="noopener" data-i18n="quranUi.mushafColorsSource">'+esc(t('quranUi.mushafColorsSource'))+'</a></p></dialog>';
}
