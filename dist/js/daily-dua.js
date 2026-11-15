import{uiMessage,uiLeaf,uiSet,uiRaw,uiParts,uiAttribute,uiAttributeAttrs,uiHtml,watchPracticeUi}from './practice-i18n.js';
import{duaCategoryKey,duaCategoryLabel,duaCategoryLeaf}from './daily-dua-ui.js';
import{duaThemeGrid}from './daily-dua-themes.js';
import{duaRecording}from './daily-dua-recordings.js';
import{duaAudioMarkup,mountDuaPronunciation}from './dua-pronunciation.js';
import{read,write}from './storage.js';
import{esc,toast}from './ui.js';
import{validateDuaCatalogue,safeDuaSource,cleanDuaFavorites,filterDuas,duaRoute,duaPassage}from './daily-dua-core.js';

let stopDuaLanguage=()=>{};
function paint(html){stopDuaLanguage();host.innerHTML=uiHtml(html);stopDuaLanguage=watchPracticeUi(host,updateResultLabel);}
let disposePronunciation=null;
const stopPronunciation=()=>{disposePronunciation?.();disposePronunciation=null;};
let catalogue=null,host=null,generation=0,controller=null,timer=null,state=null,callbacks=null,readingIds=[];
const sizes=[16,18,20,22,24,28];
const prefKeys={arabic:'adhkar-arabic',transliteration:'adhkar-translit',translation:'adhkar-translation'};
const duaParentKey='salahDuaParent';
const themeParentKey='salahDuaThemeParent';
const icon=name=>"<img src=\"./assets/"+name+".svg\" alt=\"\">";
const favorites=()=>cleanDuaFavorites(read('daily-dua-favorites',[]),catalogue);
const selected=()=>filterDuas(catalogue,state,favorites());
const categoryName=id=>catalogue.categories.find(c=>c.id===id)?.name||'';
const size=()=>{const value=read('adhkar-font-size',18);return sizes.includes(value)?value:18};
function texts(){const result={arabic:read(prefKeys.arabic,false),transliteration:read(prefKeys.transliteration,true),translation:read(prefKeys.translation,true)};if(!Object.values(result).some(Boolean))result.transliteration=true;return result}

export function stopDailyDuas(){stopDuaLanguage();stopDuaLanguage=()=>{};stopPronunciation();generation++;controller?.abort();controller=null;clearTimeout(timer);timer=null;host=null;callbacks=null;document.body.classList.remove('daily-dua-reading')}
export async function showDailyDuas(container,options={}){
 stopDailyDuas();host=container;callbacks=options;const version=generation;
 document.body.classList.add('adhkar-signature','adhkar-hybrid');
 document.body.classList.remove('adhkar-reading','adhkar-focus');
 paint("<section class=\"daily-dua-shell\"><h1 data-i18n=\"duaUi.dailyDuas\">Повседневные дуа</h1><p role=\"status\" data-i18n=\"duaUi.loading\">Открываем сборник…</p></section>");
 try{
  if(!catalogue){
   controller=new AbortController();timer=setTimeout(()=>controller?.abort(),12000);
   const response=await fetch('./data/daily-dua.json',{signal:controller.signal});if(!response.ok)throw Error('Unavailable');
   const value=validateDuaCatalogue(await response.json());if(version!==generation)return;catalogue=value;
   clearTimeout(timer);timer=null;controller=null;
  }
  if(version!==generation)return;
  state=duaRoute(location.hash,catalogue);readingIds=selected().map(item=>item.id);
  if(state.item&&readingIds.includes(state.item))reader();else{state.item=null;library()}
 }catch{
  if(version!==generation)return;
  clearTimeout(timer);timer=null;controller=null;
  paint("<section class=\"daily-dua-shell\"><button class=\"text-button\" id=\"dua-back\" data-i18n=\"adhkarUi.back\">К азкарам</button><h1 data-i18n=\"duaUi.unavailable\">Сборник пока недоступен</h1><p class=\"muted\" data-i18n=\"duaUi.connectionHint\">Проверьте соединение и попробуйте ещё раз.</p><button class=\"button\" id=\"dua-retry\" data-i18n=\"common.retry\">Повторить</button></section>");
  host.querySelector('#dua-back').onclick=()=>callbacks?.onBack?.();
  host.querySelector('#dua-retry').onclick=()=>showDailyDuas(container,options);
 }
}
function remember(){
 const params=new URLSearchParams({view:'duas'});
 if(state.category)params.set('category',state.category);if(state.query)params.set('q',state.query);if(state.favoritesOnly)params.set('favorites','1');if(state.item)params.set('item',state.item);if(state.item&&state.variant)params.set('variant',state.variant);
 const hash='#adhkar?'+params;
 try{
  if(state.item&&!window.history.state?.[duaParentKey]){
   // Keep the filtered library as a real parent for native iPhone Back.
   // Paging and wording changes replace this reader entry only.
   const parent={...window.history.state};delete parent[duaParentKey];
   const listParams=new URLSearchParams(params);listParams.delete('item');listParams.delete('variant');
   window.history.replaceState(parent,'','#adhkar?'+listParams);
   const child={...parent,[duaParentKey]:true};delete child.salahRouteStep;
   window.history.pushState(child,'',hash);
   window.dispatchEvent(new Event('salah:route-history'));
  }else window.history.replaceState(window.history.state,'',hash);
 }catch{try{window.history.replaceState(window.history.state,'',hash)}catch{}}
 callbacks?.onRoute?.();
}
function backToLibrary(){
 if(window.history.state?.[duaParentKey]){try{window.history.back();return}catch{}}
 library();window.scrollTo(0,0);
}
function favoriteButton(item){const saved=favorites().includes(item.id);return "<button type=\"button\" class=\"dua-favorite\" data-dua-favorite=\""+item.id+'" aria-pressed="'+saved+'"'+uiAttributeAttrs('aria-label',saved?'duaUi.favoriteRemove':'duaUi.favoriteAdd',{name:item.title})+">"+icon(saved?'star-fill':'star')+"</button>"}
function toggleFavorite(id){
 const previous=favorites(),next=previous.includes(id)?previous.filter(value=>value!==id):[...previous,id];
 if(!write('daily-dua-favorites',next)){toast(uiMessage('duaUi.favoriteSaveFailed','Избранное не сохранилось. Проверьте доступ к хранилищу.'));return}
 if(state.item){const button=host.querySelector('[data-dua-favorite]');const item=catalogue.items.find(i=>i.id===id);const saved=next.includes(id);button.setAttribute('aria-pressed',String(saved));uiAttribute(button,'aria-label',saved?'duaUi.favoriteRemove':'duaUi.favoriteAdd',saved?'Убрать из избранного: {name}':'В избранное: {name}',{name:item.title});button.innerHTML=icon(saved?'star-fill':'star')}else results();
}
function bindFavorites(){host.querySelectorAll('[data-dua-favorite]').forEach(button=>button.onclick=()=>toggleFavorite(button.dataset.duaFavorite))}
function library(){stopPronunciation();
 state.item=null;delete state.variant;remember();document.body.classList.remove('daily-dua-reading','adhkar-focus');
 paint("<section class=\"daily-dua-shell\"><div class=\"dua-top\"><button type=\"button\" class=\"text-button\" id=\"dua-back\" data-i18n=\"adhkarUi.back\">К азкарам</button><span class=\"eyebrow\" data-i18n=\"duaUi.collection\">СБОРНИК</span></div><div class=\"dua-heading\"><h1 data-i18n=\"duaUi.dailyDuas\">Повседневные дуа</h1><p data-i18n=\"duaUi.dayMoments\">Для привычных моментов дня</p></div><label class=\"dua-search-label\" for=\"dua-search\" data-i18n=\"duaUi.search\">Найти дуа</label><input id=\"dua-search\" type=\"search\" maxlength=\"120\" autocomplete=\"off\" placeholder=\"Тревога, дорога, родители\" data-i18n-placeholder=\"duaUi.searchPlaceholder\" value=\""+esc(state.query)+"\"><div class=\"dua-filters\"><label for=\"dua-category\"><span data-i18n=\"duaUi.situation\">Ситуация</span><select id=\"dua-category\"><option value=\"\" data-i18n=\"duaUi.allSituations\">Все ситуации</option>"+catalogue.categories.map(c=>"<option value=\""+c.id+'" '+(state.category===c.id?'selected':'')+' data-i18n="'+duaCategoryKey(c.id)+"\">"+esc(duaCategoryLabel(c.id,c.name))+"</option>").join('')+"</select></label><button type=\"button\" class=\"dua-saved-filter\" id=\"dua-favorites-only\" aria-pressed=\""+state.favoritesOnly+"\">"+icon('star')+"<span data-i18n=\"adhkarUi.favorites\">Избранное</span></button></div><div class=\"dua-quick-search\" aria-label=\"Популярные ситуации\" data-i18n-aria-label=\"duaUi.popular\"><button type=\"button\" data-dua-query=\"перед дорогой\" data-i18n=\"duaUi.travelShortcut\">В дорогу</button><button type=\"button\" data-dua-query=\"когда тревожно\" data-i18n=\"duaUi.distressShortcut\">Когда тревожно</button><button type=\"button\" data-dua-query=\"за родителей\" data-i18n=\"duaUi.parentsShortcut\">За родителей</button></div><p class=\"dua-result-count\" id=\"dua-result-count\" role=\"status\"></p><div id=\"dua-results\"></div><details class=\"dua-editorial\"><summary data-i18n=\"duaUi.aboutTexts\">О текстах</summary><p lang=\"ru\" translate=\"no\">"+esc(catalogue.editorial)+"</p></details></section>");
 host.querySelector('#dua-back').onclick=()=>callbacks?.onBack?.();
 host.querySelectorAll('[data-dua-query]').forEach(button=>button.onclick=()=>{state.query=button.dataset.duaQuery;state.category='';state.favoritesOnly=false;library();});
 host.querySelector('#dua-search').oninput=e=>{state.query=e.target.value.slice(0,120);remember();results()};
 host.querySelector('#dua-category').onchange=e=>{state.category=e.target.value;remember();results()};
 host.querySelector('#dua-favorites-only').onclick=e=>{state.favoritesOnly=!state.favoritesOnly;e.currentTarget.setAttribute('aria-pressed',String(state.favoritesOnly));remember();results()};
 results();
}
function openTheme(id){
 const parent={...window.history.state};delete parent[duaParentKey];delete parent[themeParentKey];
 try{window.history.replaceState(parent,'','#adhkar?view=duas');window.history.pushState({...parent,[themeParentKey]:true},'','#adhkar?view=duas&category='+encodeURIComponent(id));window.dispatchEvent(new Event('salah:route-history'));}catch{}
 state.category=id;state.query='';state.favoritesOnly=false;library();window.scrollTo(0,0);
}
function updateResultLabel(){const count=host?.querySelector('#dua-result-count');if(!count||!state||!catalogue)return;const themed=!state.category&&!state.query.trim()&&!state.favoritesOnly,items=selected();if(themed)uiSet(count,'duaUi.chooseTheme','Выберите тему · {count} дуа',{count:catalogue.items.length});else uiParts(count,[...(state.category?[{key:duaCategoryKey(state.category),fallback:categoryName(state.category)},' · ']:[]),{key:'duaUi.count',fallback:'Дуа: {count}',parameters:{count:items.length}}]);}
function results(){
 const themed=!state.category&&!state.query.trim()&&!state.favoritesOnly,items=selected(),area=host.querySelector('#dua-results'),count=host.querySelector('#dua-result-count');
 const filters=host.querySelector('.dua-filters');filters.classList.toggle('dua-hub-filters',themed);host.querySelector('.dua-quick-search').hidden=themed;
 updateResultLabel();
 if(themed){area.innerHTML=uiHtml(duaThemeGrid(catalogue));area.querySelectorAll('[data-dua-theme]').forEach(button=>button.onclick=()=>openTheme(button.dataset.duaTheme));return;}
 area.innerHTML=uiHtml("<button type=\"button\" class=\"text-button dua-all-themes\" id=\"dua-themes-back\" data-i18n=\"duaUi.allThemes\">Все темы</button>"+(items.length?items.map(item=>"<article class=\"dua-list-card\"><button type=\"button\" class=\"dua-open\" data-dua-open=\""+item.id+"\"><small>"+duaCategoryLeaf(item.category,categoryName(item.category))+"</small><strong lang=\"ru\" translate=\"no\">"+esc(item.title)+"</strong><span lang=\"ru\" translate=\"no\">"+esc(item.occasion)+"</span></button>"+favoriteButton(item)+"</article>").join(''):"<div class=\"dua-empty\"><p>"+uiLeaf(state.favoritesOnly?'duaUi.noFavorites':'duaUi.noResults',state.favoritesOnly?'В этой подборке пока нет избранных дуа.':'Не нашли дуа по этому запросу.')+"</p></div>"));
 area.querySelector('#dua-themes-back').onclick=()=>{if(window.history.state?.[themeParentKey]&&!state.query&&!state.favoritesOnly){window.history.back();return;}state.category='';state.query='';state.favoritesOnly=false;library();window.scrollTo(0,0);};
 area.querySelectorAll('[data-dua-open]').forEach(button=>button.onclick=()=>{readingIds=items.map(item=>item.id);state.item=button.dataset.duaOpen;reader();window.scrollTo(0,0)});bindFavorites();
}
function variantButtons(item,passage){
 return item.variants?"<div class=\"dua-variants\" role=\"group\" aria-label=\"Вариант дуа Кунут\" data-i18n-aria-label=\"duaUi.variant\">"+item.variants.map(value=>"<button type=\"button\" data-dua-variant=\""+value.id+'" aria-pressed="'+(value.id===passage.id)+"\" lang=\"ru\" translate=\"no\">"+esc(value.label)+"</button>").join('')+"</div>":'';
}
function switchVariant(item,id){
 const passage=item.variants?.find(value=>value.id===id);if(!passage||state.variant===id)return;
 stopPronunciation();state.variant=id;remember();
 host.querySelector('[data-dua-passage="arabic"]').textContent=passage.arabic;
 host.querySelector('[data-dua-passage="transliteration"]').textContent=passage.transliteration;
 host.querySelector('.dua-meaning p').textContent=passage.translation;
 const audioRoot=host.querySelector('#dua-pronunciation');audioRoot.innerHTML=uiHtml(duaAudioMarkup(duaRecording(item,passage)));disposePronunciation=mountDuaPronunciation(audioRoot,duaRecording(item,passage));

 host.querySelectorAll('[data-dua-variant]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.duaVariant===id)));
}
function reader(direction=0){stopPronunciation();
 const item=catalogue.items.find(i=>i.id===state.item);if(!item){library();return}
 const index=readingIds.indexOf(item.id),shown=texts(),passage=duaPassage(item,state.variant);state.variant=passage===item?null:passage.id;remember();
 document.body.classList.add('daily-dua-reading');document.body.classList.toggle('adhkar-focus',read('adhkar-focus',true));
 paint("<section class=\"daily-dua-shell dua-reader\" data-slide=\""+(direction>0?'next':direction<0?'previous':'')+'" style="--dua-size:'+size()+"px\"><div class=\"dua-top\"><button type=\"button\" class=\"text-button\" id=\"dua-list\" data-i18n=\"duaUi.backCollection\">К сборнику</button><span>"+duaCategoryLeaf(item.category,categoryName(item.category))+"</span>"+favoriteButton(item)+"</div><div class=\"dua-heading\"><h1 lang=\"ru\" translate=\"no\">"+esc(item.title)+"</h1><p lang=\"ru\" translate=\"no\">"+esc(item.occasion)+"</p></div><details class=\"dua-reading-settings\"><summary data-i18n=\"adhkarUi.readingSettings\">Настройки чтения</summary><div class=\"dua-preferences\"><label><span data-i18n=\"adhkarUi.textSize\">Размер текста</span><select id=\"dua-size\">"+sizes.map(n=>"<option value=\""+n+'" '+(n===size()?'selected':'')+">"+n+"</option>").join('')+"</select></label>"+[['arabic','Арабский'],['transliteration','Транскрипция'],['translation','Перевод']].map(([key,label])=>"<label><input type=\"checkbox\" data-dua-text=\""+key+'" '+(shown[key]?'checked':'')+">"+uiLeaf({arabic:'adhkarUi.arabic',transliteration:'duaUi.transcription',translation:'adhkarUi.translation'}[key],label)+"</label>").join('')+"<label><input type=\"checkbox\" id=\"dua-focus\" "+(read('adhkar-focus',true)?'checked':'')+"><span data-i18n=\"adhkarUi.readingMode\">Режим чтения</span></label></div></details>"+variantButtons(item,passage)+"<article class=\"dua-passage\"><p class=\"dua-arabic\" translate=\"no\" data-dua-passage=\"arabic\" dir=\"rtl\" lang=\"ar\" "+(shown.arabic?'':'hidden')+">"+esc(passage.arabic)+"</p><p class=\"dua-transcription\" lang=\"ru\" translate=\"no\" data-dua-passage=\"transliteration\" "+(shown.transliteration?'':'hidden')+">"+esc(passage.transliteration)+"</p><div class=\"dua-meaning\" data-dua-passage=\"translation\" "+(shown.translation?'':'hidden')+"><small data-i18n=\"duaUi.meaning\">Перевод смысла</small><p lang=\"ru\" translate=\"no\">"+esc(passage.translation)+"</p></div></article><div id=\"dua-pronunciation\">"+duaAudioMarkup(duaRecording(item,passage))+"</div><nav class=\"dua-navigation\" aria-label=\"Переход между дуа\" data-i18n-aria-label=\"duaUi.navigation\"><button type=\"button\" class=\"button secondary\" id=\"dua-prev\" "+(index<=0?'disabled':'')+"><span data-i18n=\"duaUi.previous\">Предыдущее</span></button><button type=\"button\" class=\"button secondary\" id=\"dua-next\" "+(index<0||index===readingIds.length-1?'disabled':'')+"><span data-i18n=\"duaUi.next\">Следующее</span></button></nav></section>");
 disposePronunciation=mountDuaPronunciation(host.querySelector('#dua-pronunciation'),duaRecording(item,passage));
 host.querySelector('#dua-list').onclick=backToLibrary;bindFavorites();
 host.querySelectorAll('[data-dua-variant]').forEach(button=>button.onclick=()=>switchVariant(item,button.dataset.duaVariant));
 host.querySelector('#dua-prev').onclick=()=>navigate(index-1,-1);
 host.querySelector('#dua-next').onclick=()=>navigate(index+1,1);
 host.querySelector('#dua-size').onchange=e=>{const n=Number(e.target.value);if(!sizes.includes(n))return;write('adhkar-font-size',n);host.querySelector('.dua-reader').style.setProperty('--dua-size',n+'px')};
 host.querySelector('#dua-focus').onchange=e=>{write('adhkar-focus',e.target.checked);document.body.classList.toggle('adhkar-focus',e.target.checked)};
 host.querySelectorAll('[data-dua-text]').forEach(input=>input.onchange=e=>{
  const toggles=[...host.querySelectorAll('[data-dua-text]')];if(!toggles.some(toggle=>toggle.checked)){e.target.checked=true;toast(uiMessage('duaUi.keepText','Оставьте хотя бы один вид текста.'));return}
  const key=e.target.dataset.duaText;write(prefKeys[key],e.target.checked);host.querySelector('[data-dua-passage="'+key+'"]').hidden=!e.target.checked;
 });
}
function navigate(index,direction){if(index<0||index>=readingIds.length)return;state.item=readingIds[index];delete state.variant;reader(direction);window.scrollTo(0,0)}
