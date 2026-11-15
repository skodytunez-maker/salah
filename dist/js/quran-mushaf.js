import{t,getLocale,subscribeLanguage}from './i18n.js';
import{uiLeaf,uiTextAttributes,uiAttribute,setUiLabel,setUiAttribute,clearUiLabel,translateQuranUi,translateReciterGroups,bindQuranUi,quranModal,downloadErrorKey}from './quran-ui.js';
import{createMushafPages}from './quran-mushaf-page-cache.js';
import{markReadJuz,readJuzMarked}from './learning-progress.js';
import{juzEndingOn}from './learning-progress-core.js';
import{mushafColorGuideMarkup}from './quran-mushaf-controls.js';
import{mushafListeningOptions,mountMushafListening}from './quran-mushaf-listening.js';
import{loadPrintedPage,ensurePrintedFont,hasPrintedFont,trimPrintedFonts,printedVerseKeys,printedNeedsBasmala,printedPageMarkup,fitPrintedPage,printedPageForPosition}from './quran-mushaf-print.js';
import{read,write}from './storage.js';
import{esc,toast}from './ui.js';
import{loadSurah}from './quran-data.js';
import{MUSHAF_OFFLINE_MODE_KEY,ensureOfflineMushafFont,mushafOfflineOptions,mountMushafOffline}from './quran-mushaf-offline.js';
import{MUSHAF_PAGE_COUNT,MUSHAF_LAST_KEY,MUSHAF_BOOKMARKS_KEY,MUSHAF_PREFERENCES_KEY,validMushafPage,parseMushafPage,mushafUrl,normalizeMushafBookmarks,mushafPageForPosition,mushafPreferences,mushafSwipe,mushafPageMarkup,loadMushafPage}from './quran-mushaf-core.js';
export function mushafEntry(){
 const saved=read(MUSHAF_LAST_KEY,1),page=validMushafPage(saved)?saved:1;
 return '<a class="quran-mushaf-entry" href="'+mushafUrl(page)+"\"><span><strong>"+(uiLeaf('quranUi.mushafTitle'))+"</strong><small>"+(uiLeaf('quranUi.mushafEntryNote'))+"</small></span><span class=\"mushaf-entry-page\">"+(uiLeaf('quranUi.mushafPageShort'))+""+page+'<span aria-hidden="true"> →</span></span></a>';
}
export function mountMushaf(host,index,requestedPage=null){
 let closed=false,readingMode=false,touch=null,printLines=null,generation=0,listening=null,offlineControls=null,modeNavigation=false,fallbackActive=false,renderedUnicode=false,offlineRequested=read(MUSHAF_OFFLINE_MODE_KEY,false)===true||new URLSearchParams(location.hash.split('?')[1]||'').get('offline')==='1'||globalThis.navigator?.onLine===false,prefs=mushafPreferences(read(MUSHAF_PREFERENCES_KEY,{}));
 const unicodeMode=()=>offlineRequested||fallbackActive;
 const readingEdition=()=>unicodeMode()?'madani':prefs.edition;
 const pageForPosition=(surah,ayah=1)=>unicodeMode()?mushafPageForPosition(surah,ayah):printedPageForPosition(surah,ayah,prefs.edition);
 const paintEdition=()=>setUiLabel(host.querySelector('#mushaf-edition-name'),renderedUnicode?(fallbackActive?'offlineUi.fallbackCaption':'offlineUi.offlineCaption'):prefs.edition==='madani'?'quranUi.mushafMadaniHafs':'quranUi.mushafTajweedHafs');
 const saved=read(MUSHAF_LAST_KEY,1);let page=requestedPage===null?(validMushafPage(saved)?saved:1):parseMushafPage(requestedPage);
 if(page===null){host.innerHTML="<section class=\"panel section\"><h1>"+(uiLeaf('quranUi.mushafInvalidPage'))+"</h1><p>"+(uiLeaf('quranUi.mushafChoosePagePrefix'))+""+MUSHAF_PAGE_COUNT+'.</p><a class="button" href="'+mushafUrl(1)+"\">"+(uiLeaf('quranUi.mushafFirstPage'))+"</a></section>";const off=bindQuranUi(host);return()=>{closed=true;off();};}
 let requested=page;
 document.body.classList.add('quran-focus');
 const navigate=(p,automatic=false)=>{if(!closed&&validMushafPage(p)&&p!==requested){if(!automatic)listening?.manualNavigation(p);location.hash=mushafUrl(p);}};
 const bookmarkKey=()=>readingEdition()==='tajweed'?'quran-mushaf-tajweed-bookmarks':MUSHAF_BOOKMARKS_KEY;
 const bookmarks=()=>normalizeMushafBookmarks(read(bookmarkKey(),[]));
 const options=()=>"<details class=\"mushaf-options\"><summary "+(uiAttribute('quranUi.mushafNavigation',{},'aria-label'))+">Aa</summary><div class=\"mushaf-options-panel\"><h2>"+(uiLeaf('quranUi.go'))+"</h2><form id=\"mushaf-page-jump\"><label for=\"mushaf-page-input\">"+(uiLeaf('quranUi.mushafPageRange'))+"</label><div><input id=\"mushaf-page-input\" type=\"number\" inputmode=\"numeric\" min=\"1\" max=\"604\" step=\"1\" value=\""+page+"\" required><button type=\"submit\">"+(uiLeaf('quranUi.go'))+"</button></div></form><label>"+(uiLeaf('quranUi.mushafSurah'))+"<select id=\"mushaf-surah-select\"><option value=\"\" "+(uiTextAttributes('quranUi.mushafChooseSurah'))+">"+(esc(t('quranUi.mushafChooseSurah')))+"</option>"+index.surahs.map(s=>'<option value="'+s.number+'">'+s.number+'. '+esc(s.name)+'</option>').join('')+"</select></label><label>"+(uiLeaf('quranUi.mushafJuz'))+"<select id=\"mushaf-juz-select\"><option value=\"\" "+(uiTextAttributes('quranUi.mushafChooseJuz'))+">"+(esc(t('quranUi.mushafChooseJuz')))+"</option>"+index.juz.map(j=>'<option value="'+j.number+'">Джуз '+j.number+'</option>').join('')+"</select></label><h2>"+(uiLeaf('quranUi.mushafReading'))+"</h2><label>"+(uiLeaf('quranUi.mushafEdition'))+"<select id=\"mushaf-edition\"><option value=\"madani\" "+(prefs.edition==='madani'?'selected':'')+">"+(esc(t('quranUi.mushafMadani')))+"</option><option value=\"tajweed\" "+(prefs.edition==='tajweed'?'selected':'')+">"+(esc(t('quranUi.mushafTajweedEdition')))+"</option></select></label><label>"+(uiLeaf('quranUi.mushafScale'))+"<select id=\"mushaf-size\">"+[26,30,34,40,46].map(n=>'<option value="'+n+'" '+(prefs.size===n?'selected':'')+'>'+Math.round(n/30*100)+'%</option>').join('')+"</select></label><label>"+(uiLeaf('quranUi.mushafBackground'))+"<select id=\"mushaf-theme\"><option value=\"paper\" "+(prefs.theme==='paper'?'selected':'')+">"+(esc(t('quranUi.mushafPaper')))+"</option><option value=\"night\" "+(prefs.theme==='night'?'selected':'')+">"+(esc(t('quranUi.mushafNight')))+"</option></select></label>"+mushafOfflineOptions()+mushafListeningOptions()+"<h2>"+(uiLeaf('quranUi.bookmarks'))+"</h2><div id=\"mushaf-bookmarks\"></div><details class=\"mushaf-source\"><summary>"+(uiLeaf('quranUi.mushafTextSource'))+"</summary><p>"+(uiLeaf('quranUi.mushafSourceNote'))+"</p><a href=\"https://tanzil.net\" target=\"_blank\" rel=\"noopener\">"+(uiLeaf('quranUi.sourceTanzil'))+"</a><a href=\"https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/\" target=\"_blank\" rel=\"noopener\">Quran fonts provided by Quran Foundation</a></details></div></details>";
 host.innerHTML="<section class=\"mushaf-shell\"><div class=\"mushaf-top\"><a href=\"#quran\">"+(uiLeaf('quranUi.mushafBack'))+"</a><strong>"+(uiLeaf('quranUi.mushafTitle'))+"</strong><div class=\"mushaf-top-actions\"><button type=\"button\" id=\"mushaf-fullscreen\" class=\"mushaf-fullscreen\" "+(uiAttribute('quranUi.mushafFullscreen',{},'aria-label'))+" aria-pressed=\"false\" "+(uiAttribute('quranUi.mushafFullscreen',{},'title'))+"></button>"+options()+"</div></div><div class=\"mushaf-tools\"><span id=\"mushaf-status\" role=\"status\" aria-live=\"polite\">"+(uiLeaf('quranUi.mushafPagePrefix'))+""+page+" из 604</span><button type=\"button\" id=\"mushaf-bookmark\" disabled aria-pressed=\"false\">"+(uiLeaf('quranUi.mushafBookmark'))+"</button></div><article class=\"mushaf-paper\" tabindex=\"0\" aria-label=\"Арабский текст, страница "+page+"\" aria-busy=\"true\"><p class=\"mushaf-loading\">"+(uiLeaf('quranUi.mushafOpening'))+"</p></article><p class=\"mushaf-edition\" id=\"mushaf-edition-name\"></p><nav class=\"mushaf-pagination\" dir=\"rtl\" "+(uiAttribute('quranUi.mushafPagesLabel',{},'aria-label'))+"><button type=\"button\" id=\"mushaf-prev\" dir=\"ltr\" "+(page===1?'disabled':'')+">"+(uiLeaf('quranUi.mushafPrevious'))+"</button><span id=\"mushaf-page-number\" dir=\"ltr\">"+page+' / 604</span><button type="button" id="mushaf-next" dir="ltr" '+(page===604?'disabled':'')+">"+(uiLeaf('quranUi.mushafNext'))+"</button></nav><div id=\"mushaf-read-confirm\" class=\"mushaf-read-confirm\" hidden><small id=\"mushaf-read-juz-label\"></small><button type=\"button\" id=\"mushaf-read-juz\" class=\"button secondary\" disabled>"+(uiLeaf('quranUi.mushafJuzRead'))+"</button></div><p class=\"mushaf-swipe-note\">"+(uiLeaf('quranUi.mushafSwipeHint'))+"</p>"+mushafColorGuideMarkup()+'</section>';
 const shell=host.querySelector('.mushaf-shell'),paper=host.querySelector('.mushaf-paper'),mark=host.querySelector('#mushaf-bookmark'),status=host.querySelector('#mushaf-status');
 const screenButton=host.querySelector('#mushaf-fullscreen');
 const screenIcon=active=>'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+(active?'M3 9h6V3m6 0v6h6M3 15h6v6m6 0v-6h6':'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6')+'"/></svg>';
 function setReadingMode(value){
  if(closed)return;readingMode=!!value;
  document.body.classList.toggle('mushaf-reading',readingMode);shell.dataset.reading=String(readingMode);
  const label=readingMode?t('quranUi.mushafNormalView'):t('quranUi.mushafFullscreen');screenButton.setAttribute('aria-pressed',String(readingMode));screenButton.setAttribute('aria-label',label);screenButton.title=label;screenButton.innerHTML=screenIcon(readingMode);
  host.querySelector('.mushaf-options').open=false;if(colors.open)colors.close();
  requestAnimationFrame(()=>{if(!closed&&printLines)fitPrintedPage(paper,prefs.size);});
 }
 const escapeReading=e=>{if(e.key==='Escape'&&readingMode&&!e.defaultPrevented){e.preventDefault();setReadingMode(false);screenButton.focus();}};
 const colors=host.querySelector('#mushaf-colors-dialog');
 colors.querySelector('#mushaf-colors-close').onclick=()=>colors.close();colors.onclose=()=>{if(!closed)listening?.refresh();};
 const apply=()=>{colors.dataset.theme=prefs.theme;colors.querySelector('#mushaf-colors-note').hidden=renderedUnicode||prefs.edition!=='madani';shell.dataset.theme=prefs.theme;shell.dataset.edition=prefs.edition;shell.dataset.rendering=renderedUnicode?'unicode':'printed';paintEdition();shell.style.setProperty('--mushaf-size',prefs.size+'px');if(printLines)fitPrintedPage(paper,prefs.size);};
 apply();setReadingMode(false);screenButton.onclick=()=>setReadingMode(!readingMode);document.addEventListener('keydown',escapeReading);
 const drawBookmarks=()=>{const list=bookmarks(),box=host.querySelector('#mushaf-bookmarks');box.innerHTML=list.length?list.map(p=>'<a href="'+mushafUrl(p)+'" '+(p===page?'aria-current="page"':'')+'>'+uiLeaf('quranUi.mushafPagePrefix')+p+'</a>').join(''):"<p class=\"muted\">"+(uiLeaf('quranUi.mushafNoBookmarks'))+"</p>";const selected=list.includes(page);mark.setAttribute('aria-pressed',String(selected));setUiLabel(mark,selected?'quranUi.mushafSaved':'quranUi.mushafBookmark');setUiAttribute(mark,'aria-label',selected?'quranUi.mushafRemovePageBookmark':'quranUi.mushafSavePage',{page});};
 const readButton=host.querySelector('#mushaf-read-juz'),readBox=host.querySelector('#mushaf-read-confirm');
 const drawRead=()=>{const juz=juzEndingOn(page);readBox.hidden=!juz||!printLines||page!==requested;if(!juz)return;const done=readJuzMarked(juz.juz);setUiLabel(host.querySelector('#mushaf-read-juz-label'),'quranUi.mushafJuzRange',{juz:juz.juz,first:juz.first,last:juz.last});setUiLabel(readButton,done?'quranUi.mushafJuzMarked':'quranUi.mushafJuzRead');setUiAttribute(readButton,'aria-label',done?'quranUi.mushafJuzReadLabel':'quranUi.mushafMarkJuzRead',{juz:juz.juz});readButton.disabled=done||!printLines||page!==requested;};
 readButton.onclick=()=>{const juz=juzEndingOn(page);if(closed||!printLines||page!==requested||!juz)return;const result=markReadJuz(juz.juz);if(!result.ok)toast(result.reason==='sign_in'?t('quranUi.mushafSignIn'):t('quranUi.mushafMarkFailed'));drawRead();};
 window.addEventListener('salah:learning-progress',drawRead);
 drawBookmarks();
 mark.onclick=()=>{const list=bookmarks(),next=list.includes(page)?list.filter(p=>p!==page):[...list,page];if(write(bookmarkKey(),normalizeMushafBookmarks(next)))drawBookmarks();else toast(t('quranUi.mushafBookmarkFailed'));};
 host.querySelector('#mushaf-prev').onclick=()=>navigate(requested-1);
 host.querySelector('#mushaf-next').onclick=()=>navigate(requested+1);
 host.querySelector('#mushaf-page-jump').onsubmit=e=>{e.preventDefault();const input=host.querySelector('#mushaf-page-input'),target=parseMushafPage(input.value);if(target===null){input.setCustomValidity(t('quranUi.mushafPageValidation'));input.reportValidity();return;}input.setCustomValidity('');navigate(target);};
 host.querySelector('#mushaf-page-input').oninput=e=>e.target.setCustomValidity('');
 host.querySelector('#mushaf-surah-select').onchange=e=>{const p=pageForPosition(Number(e.target.value),1);if(p)navigate(p);};
 host.querySelector('#mushaf-juz-select').onchange=e=>{const j=index.juz[Number(e.target.value)-1],p=j&&pageForPosition(j.start.surah,j.start.ayah);if(p)navigate(p);};
 for(const [id,key]of [['mushaf-size','size'],['mushaf-theme','theme']])host.querySelector('#'+id).onchange=e=>{prefs=mushafPreferences({...prefs,[key]:key==='size'?Number(e.target.value):e.target.value});apply();listening?.updateTheme();if(!write(MUSHAF_PREFERENCES_KEY,prefs))toast(t('quranUi.mushafSettingsFailed'));};
 const touchStart=e=>{touch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;};
 const touchMove=e=>{if(e.touches.length!==1)touch=null;};
 const touchEnd=e=>{if(e.changedTouches.length!==1){touch=null;return;}const direction=mushafSwipe(touch,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY});touch=null;if(direction&&prefs.size<=30&&window.getSelection()?.isCollapsed!==false)navigate(requested+direction);};
 const touchCancel=()=>{touch=null;};
 paper.addEventListener('touchstart',touchStart,{passive:true});paper.addEventListener('touchmove',touchMove,{passive:true});paper.addEventListener('touchend',touchEnd,{passive:true});paper.addEventListener('touchcancel',touchCancel,{passive:true});
 const keydown=e=>{if(e.target!==paper||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();navigate(requested+(e.key==='ArrowLeft'?1:-1));}};
 paper.addEventListener('keydown',keydown);
 const pages=createMushafPages(async(target,edition)=>{
  if(edition==='unicode'){
   const [groups]=await Promise.all([loadMushafPage(target,loadSurah),ensureOfflineMushafFont()]);
   const lines=groups.map(({surah,verses},i)=>[i+1,'text',surah,verses.map(v=>[surah,v.ayah])]);
   return{kind:'unicode',lines,html:mushafPageMarkup(groups,index,esc,t('quranUi.ayahLabel'))};
  }
  const lines=await loadPrintedPage(target,edition),hasBasmala=printedNeedsBasmala(lines),keys=printedVerseKeys(lines),numbers=[...new Set(keys.map(k=>Number(k.split(':')[0])).concat(hasBasmala?[1]:[]))];
  let sources;try{[sources]=await Promise.all([Promise.all(numbers.map(n=>loadSurah(n))),ensurePrintedFont(target,edition),hasBasmala?ensurePrintedFont(1,edition):Promise.resolve()]);}catch(error){throw Object.assign(new Error('Printed page unavailable',{cause:error}),{mushafAnchor:keys[0]?.split(':').map(Number)});}
  const surahs=new Map(sources.map(s=>[s.number,s]));
  return{lines,hasBasmala,html:printedPageMarkup(lines,target,index,surahs,esc,hasBasmala?'ﱁ ﱂ ﱃ ﱄ':'',edition)};
 },{ready:(value,target,edition)=>value.kind==='unicode'||hasPrintedFont(target,edition)&&(!value.hasBasmala||hasPrintedFont(1,edition))});
 const retainFonts=()=>{if(closed)return;trimPrintedFonts([1,page,requested,...[-2,-1,1,2].map(n=>requested+n)].filter(validMushafPage),prefs.edition);};
 const commit=(value,target,edition,ticket)=>{
  if(closed||!shell.isConnected||ticket!==generation||edition!==(unicodeMode()?'unicode':prefs.edition))return;
  renderedUnicode=value.kind==='unicode';apply();offlineControls?.refresh();
  page=target;requested=target;paper.innerHTML=value.html;paper.setAttribute('aria-busy','false');setUiAttribute(paper,'aria-label','quranUi.mushafArabicPage',{page});mark.disabled=false;printLines=value.lines;
  setUiLabel(status,'quranUi.mushafPageCount',{page});
  host.querySelector('#mushaf-page-number').textContent=page+' / 604';host.querySelector('#mushaf-page-input').value=page;
  host.querySelector('#mushaf-prev').disabled=page===1;host.querySelector('#mushaf-next').disabled=page===604;
  if(modeNavigation){const params=new URLSearchParams(location.hash.split('?')[1]||'');params.set('view','mushaf');params.set('page',String(page));window.history.replaceState(window.history.state,'','#quran?'+params.toString());modeNavigation=false;}
  drawBookmarks();fitPrintedPage(paper,prefs.size);retainFonts();
  drawRead();readingCheckpoint={page,edition:readingEdition()};publishReadingCheckpoint();
  if(!write(MUSHAF_LAST_KEY,page))toast(t('quranUi.positionFailed'));
  listening?.setPage(page);listening?.refresh();
  requestAnimationFrame(()=>{if(!closed&&ticket===generation){fitPrintedPage(paper,prefs.size);window.scrollTo(0,0);}});
  void pages.neighbors(page,edition,()=>!closed&&ticket===generation).finally(retainFonts);
 };
 const openPage=(target=requested)=>{
  if(globalThis.navigator?.onLine===false)offlineRequested=true;
  const ticket=++generation,edition=unicodeMode()?'unicode':prefs.edition;requested=target;drawRead();status.onclick=null;status.onkeydown=null;status.removeAttribute('tabindex');status.setAttribute('role','status');
  const cached=pages.peek(target,edition);if(cached){commit(cached,target,edition,ticket);return;}
  paper.setAttribute('aria-busy','true');setUiLabel(status,'quranUi.mushafOpeningPage',{page:target});
  // Keep the readable page on screen until its replacement is complete.
  if(!printLines)paper.innerHTML="<p class=\"mushaf-loading\">"+(uiLeaf('quranUi.mushafOpeningFonts'))+"</p>";
  pages.prepare(target,edition).then(value=>commit(value,target,edition,ticket)).catch(error=>{
   if(closed||!shell.isConnected||ticket!==generation)return;
   if(edition!=='unicode'){fallbackActive=true;modeNavigation=true;const anchor=error.mushafAnchor,mapped=anchor&&mushafPageForPosition(anchor[0],anchor[1]);openPage(mapped||target);return;}
   if(fallbackActive){fallbackActive=false;modeNavigation=false;}
   paper.setAttribute('aria-busy','false');setUiLabel(status,'quranUi.mushafPageRetry',{page:target});status.tabIndex=0;status.setAttribute('role','button');
   const retry=()=>{status.onclick=null;status.onkeydown=null;status.removeAttribute('tabindex');status.setAttribute('role','status');openPage(target);};status.onclick=retry;status.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();retry();}};
   if(!printLines){paper.innerHTML="<div class=\"mushaf-error\"><h2>"+(uiLeaf('quranUi.mushafPageUnavailable'))+"</h2><p>"+(uiLeaf('quranUi.mushafLoadFailed'))+"</p><button type=\"button\" id=\"mushaf-retry\">"+(uiLeaf('common.retry'))+"</button></div>";host.querySelector('#mushaf-retry').onclick=retry;}
  }).finally(retainFonts);
 };
 host.querySelector('#mushaf-edition').onchange=e=>{const anchor=printLines&&printedVerseKeys(printLines)[0]?.split(':').map(Number);prefs=mushafPreferences({...prefs,edition:e.target.value,editionChosen:true});apply();if(!write(MUSHAF_PREFERENCES_KEY,prefs))toast(t('quranUi.mushafSettingsFailed'));const target=anchor&&pageForPosition(anchor[0],anchor[1])||page;drawBookmarks();if(target!==requested){navigate(target);return;}openPage(target);};
 listening=mountMushafListening(host,{page,index,getEdition:readingEdition,pageForPosition,getTheme:()=>prefs.theme,setTheme:theme=>{prefs=mushafPreferences({...prefs,theme});host.querySelector('#mushaf-theme').value=prefs.theme;apply();if(!write(MUSHAF_PREFERENCES_KEY,prefs))toast(t('quranUi.mushafBackgroundFailed'));},openColors:()=>{host.querySelector('.mushaf-options').open=false;colors.showModal();},getLines:()=>printLines,getFollow:()=>prefs.follow,setFollow:value=>{prefs=mushafPreferences({...prefs,follow:value});if(!write(MUSHAF_PREFERENCES_KEY,prefs))toast(t('quranUi.mushafSettingsFailed'));},navigate:p=>navigate(p,true)});
 offlineControls=mountMushafOffline(host,index,{getOffline:unicodeMode,onModeChange:value=>{
  const anchor=printLines&&printedVerseKeys(printLines)[0]?.split(':').map(Number);offlineRequested=value;fallbackActive=false;
  if(!write(MUSHAF_OFFLINE_MODE_KEY,value))toast(t('quranUi.mushafSettingsFailed'));
  const target=anchor&&pageForPosition(anchor[0],anchor[1])||page;modeNavigation=true;mark.disabled=true;host.querySelector('.mushaf-options').open=false;drawBookmarks();openPage(target);
 }});
 let readingCheckpoint=null;const publishReadingCheckpoint=()=>{if(!closed&&!document.hidden&&shell.isConnected&&readingCheckpoint){try{window.dispatchEvent(new window.CustomEvent('salah:reading-checkpoint',{detail:readingCheckpoint}));}catch{}}};
 window.addEventListener('salah:account-context-ready',publishReadingCheckpoint);document.addEventListener('visibilitychange',publishReadingCheckpoint);
 openPage();
 const resize=()=>{if(!closed&&printLines)fitPrintedPage(paper,prefs.size);};
 window.addEventListener('resize',resize);
 const paintLanguage=()=>{if(closed)return;translateQuranUi(host);
  const screenKey=readingMode?'quranUi.mushafNormalView':'quranUi.mushafFullscreen';setUiAttribute(screenButton,'aria-label',screenKey);setUiAttribute(screenButton,'title',screenKey);
  paintEdition();for(const number of paper.querySelectorAll('[data-ayah-number]'))number.setAttribute('aria-label',t('quranUi.ayahLabel')+' '+number.dataset.ayahNumber);
  for(const option of host.querySelectorAll('#mushaf-juz-select option'))if(option.value)setUiLabel(option,'quranUi.juzNumber',{number:Number(option.value)});
  for(const [selector,key]of [['#mushaf-edition [value=madani]','quranUi.mushafMadani'],['#mushaf-edition [value=tajweed]','quranUi.mushafTajweedEdition'],['#mushaf-theme [value=paper]','quranUi.mushafPaper'],['#mushaf-theme [value=night]','quranUi.mushafNight']])setUiLabel(host.querySelector(selector),key);
  setUiLabel(mark,mark.getAttribute('aria-pressed')==='true'?'quranUi.mushafSaved':'quranUi.mushafBookmark');setUiAttribute(mark,'aria-label',mark.getAttribute('aria-pressed')==='true'?'quranUi.mushafRemovePageBookmark':'quranUi.mushafSavePage',{page});
  setUiAttribute(paper,'aria-label','quranUi.mushafArabicPage',{page});
  const juz=juzEndingOn(page);if(juz){const done=readButton.disabled&&!!printLines&&page===requested;setUiLabel(readButton,done?'quranUi.mushafJuzMarked':'quranUi.mushafJuzRead');setUiAttribute(readButton,'aria-label',done?'quranUi.mushafJuzReadLabel':'quranUi.mushafMarkJuzRead',{juz:juz.juz});}
 };
 const offLanguage=subscribeLanguage(paintLanguage);paintLanguage();
 const dispose=()=>{closed=true;offLanguage();offlineControls?.dispose();document.removeEventListener('keydown',escapeReading);document.body.classList.remove('mushaf-reading');window.removeEventListener('salah:learning-progress',drawRead);window.removeEventListener('salah:account-context-ready',publishReadingCheckpoint);document.removeEventListener('visibilitychange',publishReadingCheckpoint);pages.dispose();if(colors.open)colors.close();listening?.dispose();touch=null;window.removeEventListener('resize',resize);paper.removeEventListener('touchstart',touchStart);paper.removeEventListener('touchmove',touchMove);paper.removeEventListener('touchend',touchEnd);paper.removeEventListener('touchcancel',touchCancel);paper.removeEventListener('keydown',keydown);document.body.classList.remove('quran-focus');};
 dispose.navigateTo=value=>{const target=parseMushafPage(value);if(closed||!shell.isConnected||target===null)return false;if(target!==requested||!printLines)openPage(target);return true;};
 return dispose;
}
