import{MUSHAF_PAGES}from './quran-mushaf-pages.js';
export const MUSHAF_PAGE_COUNT=MUSHAF_PAGES.length;
export const MUSHAF_LAST_KEY='quran-mushaf-last-page';
export const MUSHAF_BOOKMARKS_KEY='quran-mushaf-bookmarks';
export const MUSHAF_PREFERENCES_KEY='quran-mushaf-preferences';
export const validMushafPage=page=>Number.isInteger(page)&&page>=1&&page<=MUSHAF_PAGE_COUNT;
export function parseMushafPage(value){if(typeof value!=='string'||!/^[1-9]\d{0,2}$/.test(value))return null;const page=Number(value);return validMushafPage(page)?page:null;}
export const mushafUrl=page=>'#quran?view=mushaf&page='+(validMushafPage(page)?page:1);
export function normalizeMushafBookmarks(value){return Array.isArray(value)?[...new Set(value.filter(validMushafPage))].sort((a,b)=>a-b):[];}
export function mushafPageForPosition(surah,ayah=1){if(!Number.isInteger(surah)||!Number.isInteger(ayah))return null;const i=MUSHAF_PAGES.findIndex(ranges=>ranges.some(([s,first,last])=>s===surah&&ayah>=first&&ayah<=last));return i<0?null:i+1;}
export function mushafPreferences(value){return {size:[26,30,34,40,46].includes(value?.size)?value.size:30,theme:value?.theme==='paper'?'paper':'night',edition:value?.editionChosen===true&&value?.edition==='madani'?'madani':'tajweed',editionChosen:value?.editionChosen===true,follow:value?.follow!==false};}
// A mushaf is bound on the right: the next sheet is turned to the right.
export function mushafSwipe(start,end){if(!start||!end||![start.x,start.y,end.x,end.y].every(Number.isFinite))return 0;const x=end.x-start.x,y=end.y-start.y;return Math.abs(x)>=70&&Math.abs(x)>Math.abs(y)*1.5?(x>0?1:-1):0;}
export function mushafPageMarkup(groups,index,escape){
 return groups.map(({surah,verses})=>(verses[0].ayah===1?'<h2 class="mushaf-surah" lang="ar" dir="rtl">'+escape(index.surahs[surah-1].arabicName)+'</h2>':'')+'<p class="mushaf-text" dir="rtl" lang="ar">'+verses.map(v=>'<span class="mushaf-ayah" data-mushaf-verse="'+surah+':'+v.ayah+'"><span class="mushaf-ayah-text">'+escape(v.arabic)+'</span><bdi class="mushaf-ayah-number" aria-label="Аят '+v.ayah+'">'+String(v.ayah).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d])+'</bdi></span>').join(' ')+'</p>').join('');
}
export async function loadMushafPage(page,loadSurah){
 if(!validMushafPage(page))throw Error('Такой страницы нет');
 return Promise.all(MUSHAF_PAGES[page-1].map(async([surah,first,last])=>{
  const data=await loadSurah(surah),verses=data.verses.slice(first-1,last);
  if(data.number!==surah||verses.length!==last-first+1||verses.some((v,i)=>v.ayah!==first+i||v.page!==page||typeof v.arabic!=='string'||!v.arabic.trim()))throw Error('Не удалось проверить страницу');
  return {surah,verses};
 }));
}
