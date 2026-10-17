import{loadPrintedPage,ensurePrintedFont,trimPrintedFonts,printedVerseKeys,printedNeedsBasmala,printedPageMarkup,fitPrintedPage,printedPageForPosition}from './quran-mushaf-print.js';
import{read,write}from './storage.js';
import{esc,toast}from './ui.js';
import{loadSurah}from './quran-data.js';
import{MUSHAF_PAGE_COUNT,MUSHAF_LAST_KEY,MUSHAF_BOOKMARKS_KEY,MUSHAF_PREFERENCES_KEY,validMushafPage,parseMushafPage,mushafUrl,normalizeMushafBookmarks,mushafPageForPosition,mushafPreferences,mushafSwipe,mushafPageMarkup,loadMushafPage}from './quran-mushaf-core.js';
export function mushafEntry(){
 const saved=read(MUSHAF_LAST_KEY,1),page=validMushafPage(saved)?saved:1;
 return '<a class="quran-mushaf-entry" href="'+mushafUrl(page)+'"><span><strong>Мусхаф</strong><small>Мединский мусхаф · только арабский текст</small></span><span class="mushaf-entry-page">Стр. '+page+'<span aria-hidden="true"> →</span></span></a>';
}
export function mountMushaf(host,index,requestedPage=null){
 let closed=false,touch=null,printLines=null,generation=0,prefs=mushafPreferences(read(MUSHAF_PREFERENCES_KEY,{}));
 const saved=read(MUSHAF_LAST_KEY,1),page=requestedPage===null?(validMushafPage(saved)?saved:1):parseMushafPage(requestedPage);
 if(page===null){host.innerHTML='<section class="panel section"><h1>Такой страницы нет</h1><p>Выберите страницу от 1 до '+MUSHAF_PAGE_COUNT+'.</p><a class="button" href="'+mushafUrl(1)+'">Открыть первую страницу</a></section>';return()=>{closed=true;};}
 document.body.classList.add('quran-focus');
 const navigate=p=>{if(!closed&&validMushafPage(p)&&p!==page)location.hash=mushafUrl(p);};
 const bookmarkKey=()=>prefs.edition==='tajweed'?'quran-mushaf-tajweed-bookmarks':MUSHAF_BOOKMARKS_KEY;
 const bookmarks=()=>normalizeMushafBookmarks(read(bookmarkKey(),[]));
 const options=()=>'<details class="mushaf-options"><summary aria-label="Навигация и настройки мусхафа">Aa</summary><div class="mushaf-options-panel"><h2>Перейти</h2><form id="mushaf-page-jump"><label for="mushaf-page-input">Страница · 1–604</label><div><input id="mushaf-page-input" type="number" inputmode="numeric" min="1" max="604" step="1" value="'+page+'" required><button type="submit">Перейти</button></div></form><label>Сура<select id="mushaf-surah-select"><option value="">Выбрать суру</option>'+index.surahs.map(s=>'<option value="'+s.number+'">'+s.number+'. '+esc(s.name)+'</option>').join('')+'</select></label><label>Джуз<select id="mushaf-juz-select"><option value="">Выбрать джуз</option>'+index.juz.map(j=>'<option value="'+j.number+'">Джуз '+j.number+'</option>').join('')+'</select></label><h2>Чтение</h2><label>Издание<select id="mushaf-edition"><option value="madani" '+(prefs.edition==='madani'?'selected':'')+'>Мединский мусхаф</option><option value="tajweed" '+(prefs.edition==='tajweed'?'selected':'')+'>Цветной таджвид</option></select></label><label>Масштаб страницы<select id="mushaf-size">'+[26,30,34,40,46].map(n=>'<option value="'+n+'" '+(prefs.size===n?'selected':'')+'>'+Math.round(n/30*100)+'%</option>').join('')+'</select></label><label>Фон<select id="mushaf-theme"><option value="paper" '+(prefs.theme==='paper'?'selected':'')+'>Светлый</option><option value="night" '+(prefs.theme==='night'?'selected':'')+'>Тёмный</option></select></label><h2>Закладки</h2><div id="mushaf-bookmarks"></div><details class="mushaf-source"><summary>Источник текста</summary><p>Мединский мусхаф комплекса короля Фахда, чтение Хафс от Асыма: разметка издания 1421 г. х. (QCF V2). Цветной таджвид — отдельный вариант QCF V4. В каждом варианте 604 страницы с исходными строками. Разметка QUL, шрифты Quran Foundation. Арабский текст для доступного чтения — из проверенной библиотеки SALAH.</p><a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil · арабский текст</a><a href="https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/" target="_blank" rel="noopener">Quran fonts provided by Quran Foundation</a></details></div></details>';
 host.innerHTML='<section class="mushaf-shell"><div class="mushaf-top"><a href="#quran">← Коран</a><strong>Мусхаф</strong>'+options()+'</div><div class="mushaf-tools"><span id="mushaf-status" role="status" aria-live="polite">Страница '+page+' из 604</span><button type="button" id="mushaf-bookmark" disabled aria-pressed="false">☆ Закладка</button></div><article class="mushaf-paper" tabindex="0" aria-label="Арабский текст, страница '+page+'" aria-busy="true"><p class="mushaf-loading">Открываем страницу…</p></article><p class="mushaf-edition" id="mushaf-edition-name"></p><nav class="mushaf-pagination" aria-label="Страницы мусхафа"><button type="button" id="mushaf-prev" '+(page===1?'disabled':'')+'>← Предыдущая</button><span>'+page+' / 604</span><button type="button" id="mushaf-next" '+(page===604?'disabled':'')+'>Следующая →</button></nav><p class="mushaf-swipe-note">Перелистывайте кнопками или свайпом.</p></section>';
 const shell=host.querySelector('.mushaf-shell'),paper=host.querySelector('.mushaf-paper'),mark=host.querySelector('#mushaf-bookmark'),status=host.querySelector('#mushaf-status');
 const apply=()=>{shell.dataset.theme=prefs.theme;shell.dataset.edition=prefs.edition;host.querySelector('#mushaf-edition-name').textContent=prefs.edition==='madani'?'Мединский мусхаф · Хафс':'Цветной таджвид · Хафс';shell.style.setProperty('--mushaf-size',prefs.size+'px');if(printLines)fitPrintedPage(paper,prefs.size);};
 apply();
 const drawBookmarks=()=>{const list=bookmarks(),box=host.querySelector('#mushaf-bookmarks');box.innerHTML=list.length?list.map(p=>'<a href="'+mushafUrl(p)+'" '+(p===page?'aria-current="page"':'')+'>Страница '+p+'</a>').join(''):'<p class="muted">Сохранённых страниц пока нет.</p>';const selected=list.includes(page);mark.setAttribute('aria-pressed',String(selected));mark.textContent=selected?'★ Сохранена':'☆ Закладка';mark.setAttribute('aria-label',(selected?'Удалить закладку страницы ':'Сохранить страницу ')+page);};
 drawBookmarks();
 mark.onclick=()=>{const list=bookmarks(),next=list.includes(page)?list.filter(p=>p!==page):[...list,page];if(write(bookmarkKey(),normalizeMushafBookmarks(next)))drawBookmarks();else toast('Не удалось сохранить закладку');};
 host.querySelector('#mushaf-prev').onclick=()=>navigate(page-1);
 host.querySelector('#mushaf-next').onclick=()=>navigate(page+1);
 host.querySelector('#mushaf-page-jump').onsubmit=e=>{e.preventDefault();const input=host.querySelector('#mushaf-page-input'),target=parseMushafPage(input.value);if(target===null){input.setCustomValidity('Введите целую страницу от 1 до 604');input.reportValidity();return;}input.setCustomValidity('');navigate(target);};
 host.querySelector('#mushaf-page-input').oninput=e=>e.target.setCustomValidity('');
 host.querySelector('#mushaf-surah-select').onchange=e=>{const p=printedPageForPosition(Number(e.target.value),1,prefs.edition);if(p)navigate(p);};
 host.querySelector('#mushaf-juz-select').onchange=e=>{const j=index.juz[Number(e.target.value)-1],p=j&&printedPageForPosition(j.start.surah,j.start.ayah,prefs.edition);if(p)navigate(p);};
 for(const [id,key]of [['mushaf-size','size'],['mushaf-theme','theme']])host.querySelector('#'+id).onchange=e=>{prefs=mushafPreferences({...prefs,[key]:key==='size'?Number(e.target.value):e.target.value});apply();if(!write(MUSHAF_PREFERENCES_KEY,prefs))toast('Не удалось сохранить настройки чтения');};
 const touchStart=e=>{touch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;};
 const touchMove=e=>{if(e.touches.length!==1)touch=null;};
 const touchEnd=e=>{if(e.changedTouches.length!==1){touch=null;return;}const direction=mushafSwipe(touch,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY});touch=null;if(direction&&prefs.size<=30&&window.getSelection()?.isCollapsed!==false)navigate(page+direction);};
 const touchCancel=()=>{touch=null;};
 paper.addEventListener('touchstart',touchStart,{passive:true});paper.addEventListener('touchmove',touchMove,{passive:true});paper.addEventListener('touchend',touchEnd,{passive:true});paper.addEventListener('touchcancel',touchCancel,{passive:true});
 const keydown=e=>{if(e.target!==paper||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();navigate(page+(e.key==='ArrowRight'?1:-1));}};
 paper.addEventListener('keydown',keydown);
 const openPage=()=>{const ticket=++generation,edition=prefs.edition;paper.setAttribute('aria-busy','true');mark.disabled=true;paper.innerHTML='<p class="mushaf-loading">Открываем страницу и книжный шрифт…</p>';
 loadPrintedPage(page,edition).then(async lines=>{
  const hasBasmala=printedNeedsBasmala(lines),keys=printedVerseKeys(lines),numbers=[...new Set(keys.map(k=>Number(k.split(':')[0])).concat(hasBasmala?[1]:[]))];
  const [sources]=await Promise.all([Promise.all(numbers.map(n=>loadSurah(n))),ensurePrintedFont(page,edition),hasBasmala?ensurePrintedFont(1,edition):Promise.resolve()]);
  if(closed||!shell.isConnected||ticket!==generation)return;
  const surahs=new Map(sources.map(s=>[s.number,s]));
  const basmala=hasBasmala?'ﱁ ﱂ ﱃ ﱄ':'';
  paper.innerHTML=printedPageMarkup(lines,page,index,surahs,esc,basmala,edition);paper.setAttribute('aria-busy','false');mark.disabled=false;printLines=lines;
  status.textContent='Страница '+page+' из 604';
  fitPrintedPage(paper,prefs.size);trimPrintedFonts(hasBasmala?[page,1]:[page],edition);
  if(!write(MUSHAF_LAST_KEY,page))toast('Не удалось сохранить место чтения');
  requestAnimationFrame(()=>{if(!closed){fitPrintedPage(paper,prefs.size);window.scrollTo(0,0);}});
 }).catch(()=>{if(closed||!shell.isConnected||ticket!==generation)return;paper.setAttribute('aria-busy','false');paper.innerHTML='<div class="mushaf-error"><h2>Страница недоступна</h2><p>Не удалось загрузить страницу или книжный шрифт. Проверьте интернет и повторите.</p><button type="button" id="mushaf-retry">Повторить</button></div>';host.querySelector('#mushaf-retry').onclick=()=>{if(!closed)openPage();};});
 };
 host.querySelector('#mushaf-edition').onchange=e=>{const anchor=printLines&&printedVerseKeys(printLines)[0]?.split(':').map(Number);prefs=mushafPreferences({...prefs,edition:e.target.value});apply();if(!write(MUSHAF_PREFERENCES_KEY,prefs))toast('Не удалось сохранить настройки чтения');const target=anchor&&printedPageForPosition(anchor[0],anchor[1],prefs.edition);if(target&&target!==page){navigate(target);return;}drawBookmarks();printLines=null;openPage();};
 openPage();
 const resize=()=>{if(!closed&&printLines)fitPrintedPage(paper,prefs.size);};
 window.addEventListener('resize',resize);
 return()=>{closed=true;touch=null;window.removeEventListener('resize',resize);paper.removeEventListener('touchstart',touchStart);paper.removeEventListener('touchmove',touchMove);paper.removeEventListener('touchend',touchEnd);paper.removeEventListener('touchcancel',touchCancel);paper.removeEventListener('keydown',keydown);document.body.classList.remove('quran-focus');};
}
