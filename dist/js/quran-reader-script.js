import{loadPrintedPage,printedPageForPosition,ensurePrintedFont,trimPrintedFonts}from './quran-mushaf-print.js';
import{arabicWithHints,hintsLegend}from './tajweed.js';
import{MUSHAF_COLOR_RULES}from './quran-mushaf-controls.js';
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Use the same verified word cells and page fonts as the printed mushaf.
// A verse can cross a page boundary; each word retains its own page font.
export async function readerWordsForSurah(surah,edition,load=loadPrintedPage){
 const first=printedPageForPosition(surah,1,edition),last=surah===114?604:printedPageForPosition(surah+1,1,edition),verses=new Map();
 if(!first||!last)throw Error('Нет печатной разметки суры');
 for(let page=first;page<=last;page++)for(const line of await load(page,edition))for(const [s,ayah,position,glyph]of line[3]){
  if(s!==surah)continue;if(!verses.has(ayah))verses.set(ayah,[]);verses.get(ayah).push({page,position,glyph});
 }
 return verses;
}
export const readerHasBasmala=(surah,verse)=>surah!==1&&surah!==9&&verse.ayah===1&&verse.arabic.startsWith('بِسْمِ');
export function readerVerseMarkup(words,surah,verse,edition){
 const suffix=edition==='madani'?'Madani':'';
 const word=(page,glyph)=>'<span class="quran-medina-word" data-font-page="'+page+'" style="font-family:SALAHMushaf'+page+suffix+'" aria-hidden="true">'+escape(glyph)+'</span>';
 const basmala=readerHasBasmala(surah,verse)?'<span class="quran-medina-basmala" aria-hidden="true">'+word(1,'ﱁ ﱂ ﱃ ﱄ')+'</span>':'';
 return '<span class="quran-medina-accessible">'+escape(verse.arabic)+'</span>'+basmala+words.map(w=>word(w.page,w.glyph)).join(' ');
}
export function readerScriptGuide(){
 return '<details class="quran-hint-guide"><summary>Цветовые подсказки</summary><p>Мединское начертание · те же цвета, что в мусхафе.</p><ul class="mushaf-color-rules">'+MUSHAF_COLOR_RULES.map(([key,title,text])=>'<li><span class="mushaf-color-swatch" data-rule="'+key+'" aria-hidden="true"></span><div><strong>'+title+'</strong><p>'+text+'</p></div></li>').join('')+'</ul><details class="quran-script-fallback-guide"><summary>Если мединский шрифт не загрузился</summary><p>Остаётся обычный арабский текст с разметкой Al Quran Cloud.</p>'+hintsLegend()+'</details></details>';
}
export function mountReaderScript(shell,surah,initial,dependencies={}){
 const loadWords=dependencies.loadWords||readerWordsForSurah,ensureFont=dependencies.ensureFont||ensurePrintedFont,trimFonts=dependencies.trimFonts||trimPrintedFonts;
 const paragraphs=new Map(surah.verses.map(v=>[shell.querySelector('#quran-ayah-'+v.ayah+' .quran-arabic'),v]).filter(([p])=>p));
 const near=new Set(),rendered=new Map(),pending=new Map(),requests=new Set(),layouts=new Map();let options={...initial},revision=0,disposed=false;
 const edition=()=>options.hints?'tajweed':'madani';
 const fallback=(paragraph,verse)=>{paragraph.innerHTML=options.hints?arabicWithHints(verse):escape(verse.arabic);delete paragraph.dataset.medinaEdition;rendered.delete(paragraph);};
 const trim=()=>{const pages=new Set();for(const value of [...rendered.values(),...requests])if(value.edition===edition())for(const page of value.pages)pages.add(page);trimFonts([...pages],edition());};
 const layout=key=>{if(!layouts.has(key))layouts.set(key,loadWords(surah.number,key).catch(error=>{layouts.delete(key);throw error;}));return layouts.get(key);};
 async function render(paragraph){
  if(disposed||!options.arabic||!near.has(paragraph)||rendered.get(paragraph)?.edition===edition())return;
  const key=edition(),ticket=revision;if(pending.get(paragraph)===ticket)return;pending.set(paragraph,ticket);let request;
  try{
   const verse=paragraphs.get(paragraph),words=(await layout(key)).get(verse.ayah);if(!words?.length)throw Error('Нет слов аята');
   if(disposed||ticket!==revision||!near.has(paragraph))return;
   const pages=[...new Set(words.map(w=>w.page).concat(readerHasBasmala(surah.number,verse)?[1]:[]))];
   request={edition:key,pages};requests.add(request);
   await Promise.all(pages.map(page=>ensureFont(page,key)));
   if(disposed||ticket!==revision||!near.has(paragraph))return;
   paragraph.innerHTML=readerVerseMarkup(words,surah.number,verse,key);paragraph.dataset.medinaEdition=key;rendered.set(paragraph,{edition:key,pages});
  }catch{/* Keep the readable original text when the layout or font is unavailable. */}
  finally{requests.delete(request);if(pending.get(paragraph)===ticket)pending.delete(paragraph);trim();}
 }
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){const paragraph=entry.target;if(entry.isIntersecting){near.add(paragraph);void render(paragraph);}else{near.delete(paragraph);if(rendered.has(paragraph))fallback(paragraph,paragraphs.get(paragraph));}}trim();},{rootMargin:'600px 0px'});
 for(const paragraph of paragraphs.keys())observer.observe(paragraph);
 const retry=()=>{for(const paragraph of near)void render(paragraph);};window.addEventListener('online',retry);
 return {update(next){const changed=options.hints!==next.hints||options.arabic!==next.arabic;options={...next};if(!changed)return;revision++;for(const [paragraph,verse]of paragraphs)fallback(paragraph,verse);retry();trim();},dispose(){disposed=true;revision++;observer.disconnect();window.removeEventListener('online',retry);near.clear();rendered.clear();trim();}};
}
