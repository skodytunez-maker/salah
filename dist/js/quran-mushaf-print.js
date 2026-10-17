import{PRINT_LAYOUT_SHA256,PRINT_VERSE_PAGES,MADANI_LAYOUT_SHA256,MADANI_VERSE_PAGES}from './quran-mushaf-print-index.js';
export const PRINT_FONT_ORIGIN='https://verses.quran.foundation';
export const printedPageForPosition=(surah,ayah=1,edition='madani')=>(edition==='tajweed'?PRINT_VERSE_PAGES:MADANI_VERSE_PAGES)[surah+':'+ayah]??null;
const dataPromises=new Map();const fonts=new Map(),pendingFonts=new Map();
export async function loadPrintedPage(page,edition='tajweed'){
 const key=edition==='madani'?'madani':'tajweed';
 if(!Number.isInteger(page)||page<1||page>604)throw Error('Такой страницы нет');
 if(!dataPromises.has(key))dataPromises.set(key,(async()=>{
  const response=await fetch('./data/mushaf-print/'+(key==='madani'?'madani-layout.json':'layout.json'));if(!response.ok)throw Error('Страницы недоступны');
  const bytes=await response.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==(key==='madani'?MADANI_LAYOUT_SHA256:PRINT_LAYOUT_SHA256))throw Error('Не удалось проверить печатную разметку');
  const data=JSON.parse(new TextDecoder().decode(bytes));if(data.schema!==1||data.pages?.length!==604)throw Error('Неполный мусхаф');return data.pages;
 })().catch(e=>{dataPromises.delete(key);throw e;}));
 return (await dataPromises.get(key))[page-1];
}
function fontPalette(page,family){
 if(document.getElementById('mushaf-palette-'+page))return;
 const style=document.createElement('style');style.id='mushaf-palette-'+page;
 style.textContent='@font-palette-values --mushaf-light-'+page+'{font-family:"'+family+'";base-palette:0}@font-palette-values --mushaf-dark-'+page+'{font-family:"'+family+'";base-palette:1}.mushaf-shell[data-theme=paper] [data-font-page="'+page+'"]{font-palette:--mushaf-light-'+page+'}.mushaf-shell[data-theme=night] [data-font-page="'+page+'"]{font-palette:--mushaf-dark-'+page+'}';
 document.head.append(style);
}
export async function ensurePrintedFont(page,edition='tajweed'){
 const madani=edition==='madani',key=(madani?'madani:':'tajweed:')+page;
 if(!Number.isInteger(page)||page<1||page>604)throw Error('Неизвестный шрифт');
 if(fonts.has(key)){const face=fonts.get(key);fonts.delete(key);fonts.set(key,face);return face.family;}
 if(!pendingFonts.has(key))pendingFonts.set(key,(async()=>{
  // Runtime rendering from the documented provider CDN; font files are not redistributed in the app.
  const family='SALAHMushaf'+page+(madani?'Madani':''),face=new FontFace(family,'url("'+PRINT_FONT_ORIGIN+'/fonts/quran/hafs/'+(madani?'v2/woff2/':'v4/colrv1/woff2/')+'p'+page+'.woff2")');
  let timer;try{await Promise.race([face.load(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Шрифт пока не загрузился')),18000);})]);}finally{clearTimeout(timer);}
  document.fonts.add(face);if(!madani)fontPalette(page,family);fonts.set(key,face);return family;
 })().finally(()=>pendingFonts.delete(key)));
 return pendingFonts.get(key);
}
export function trimPrintedFonts(retained=[],edition='tajweed'){const keep=new Set(retained.map(page=>(edition==='madani'?'madani:':'tajweed:')+page));for(const [page,face]of fonts){if(fonts.size<=8)break;if(!keep.has(page)){document.fonts.delete(face);fonts.delete(page);}}}
export const printedVerseKeys=lines=>[...new Set(lines.flatMap(line=>line[3].map(w=>w[0]+':'+w[1])))];
export const printedNeedsBasmala=lines=>lines.some(line=>line[1]==='basmala');
export function printedPageMarkup(lines,page,index,surahs,escape,basmalaGlyphs,edition='tajweed'){
 const suffix=edition==='madani'?'Madani':'';
 const keys=printedVerseKeys(lines),first=keys[0]?.split(':').map(Number),meta=first&&index.surahs[first[0]-1],juz=first&&surahs.get(first[0])?.verses[first[1]-1]?.juz;
 const header='<div class="mushaf-print-meta"><span>Джуз '+(juz||'')+'</span><strong>'+escape(meta?.name||'Мусхаф')+'</strong></div><div class="mushaf-print-number">'+page+'</div>';
 const rows=lines.map(([number,type,surah,words],lineIndex)=>{
  if(type==='surah-header')return '<div class="mushaf-print-line mushaf-print-heading" data-print-line="'+number+'" data-print-type="'+type+'"><span lang="ar" dir="rtl">'+escape(index.surahs[surah-1].arabicName)+'</span></div>';
  if(type==='basmala')return '<div class="mushaf-print-line mushaf-print-basmala" data-print-line="'+number+'" data-print-type="'+type+'"><span class="mushaf-print-glyph" data-font-page="1" style="font-family:SALAHMushaf1'+suffix+'" lang="ar" dir="rtl" aria-label="'+escape(surahs.get(1)?.verses[0].arabic||'')+'">'+escape(basmalaGlyphs)+'</span></div>';
  const centered=page<=2||lines[lineIndex+1]?.[1]==='surah-header'||(page===604&&lineIndex===lines.length-1);
  return '<div class="mushaf-print-line'+(centered?' mushaf-print-centered':'')+'" data-print-line="'+number+'" data-print-type="text" dir="rtl" lang="ar">'+words.map(([s,a,w,glyph])=>'<span class="mushaf-print-word mushaf-print-glyph" data-font-page="'+page+'" data-verse="'+s+':'+a+'" aria-hidden="true" style="font-family:SALAHMushaf'+page+suffix+'">'+escape(glyph)+'</span>').join('')+'</div>';
 }).join('');
 const accessible='<div class="mushaf-accessible">'+keys.map(key=>{const [s,a]=key.split(':').map(Number),verse=surahs.get(s)?.verses[a-1];return '<span class="mushaf-ayah-text" lang="ar" dir="rtl">'+escape(verse?.arabic||'')+'</span>';}).join(' ')+'</div>';
 return header+'<div class="mushaf-print-scroll"><div class="mushaf-print-page" data-print-page="'+page+'">'+rows+'</div></div><div class="mushaf-print-number mushaf-print-number-bottom">'+page+'</div>'+accessible;
}
export function printedFitSize(available,naturalAt40,zoom=1){if(!Number.isFinite(available)||available<=0||!Number.isFinite(naturalAt40)||naturalAt40<=0)return 24;return Math.max(15,Math.min(48,available*40/naturalAt40))*Math.max(.8,Math.min(1.55,zoom));}
export function fitPrintedPage(paper,size=30){
 const sheet=paper.querySelector('.mushaf-print-page');if(!sheet)return;
 const scroll=paper.querySelector('.mushaf-print-scroll'),width=scroll.clientWidth||paper.clientWidth;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx||!width)return;
 let max=1;for(const line of sheet.querySelectorAll('[data-print-type=text]')){const words=[...line.querySelectorAll('.mushaf-print-word')];let sum=0;for(const word of words){ctx.font='40px "'+word.style.fontFamily.replaceAll('"','')+'"';sum+=ctx.measureText(word.textContent).width;}max=Math.max(max,sum+Math.max(0,words.length-1)*(line.classList.contains('mushaf-print-centered')?8.8:2));}
 const zoom=Math.max(.8,Math.min(1.55,size/30)),fit=printedFitSize(width-6,max,zoom);sheet.style.width=(Math.max(1,zoom)*100)+'%';sheet.style.setProperty('--mushaf-print-size',fit+'px');sheet.dataset.fit=String(fit);
}
