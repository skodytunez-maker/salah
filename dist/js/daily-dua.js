import{read,write}from './storage.js';
import{esc,toast}from './ui.js';
import{validateDuaCatalogue,safeDuaSource,cleanDuaFavorites,filterDuas,duaRoute,duaPassage}from './daily-dua-core.js';

let catalogue=null,host=null,generation=0,controller=null,timer=null,state=null,callbacks=null,readingIds=[];
const sizes=[16,18,20,22,24,28];
const prefKeys={arabic:'adhkar-arabic',transliteration:'adhkar-translit',translation:'adhkar-translation'};
const icon=name=>'<img src="./assets/'+name+'.svg" alt="">';
const favorites=()=>cleanDuaFavorites(read('daily-dua-favorites',[]),catalogue);
const selected=()=>filterDuas(catalogue,state,favorites());
const categoryName=id=>catalogue.categories.find(c=>c.id===id)?.name||'';
const size=()=>{const value=read('adhkar-font-size',18);return sizes.includes(value)?value:18};
function texts(){const result={arabic:read(prefKeys.arabic,false),transliteration:read(prefKeys.transliteration,true),translation:read(prefKeys.translation,true)};if(!Object.values(result).some(Boolean))result.transliteration=true;return result}

export function stopDailyDuas(){generation++;controller?.abort();controller=null;clearTimeout(timer);timer=null;host=null;callbacks=null;document.body.classList.remove('daily-dua-reading')}
export async function showDailyDuas(container,options={}){
 stopDailyDuas();host=container;callbacks=options;const version=generation;
 document.body.classList.add('adhkar-signature','adhkar-hybrid');
 document.body.classList.remove('adhkar-reading','adhkar-focus');
 host.innerHTML='<section class="daily-dua-shell"><h1>Повседневные дуа</h1><p role="status">Открываем сборник…</p></section>';
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
  host.innerHTML='<section class="daily-dua-shell"><button class="text-button" id="dua-back">К азкарам</button><h1>Сборник пока недоступен</h1><p class="muted">Проверьте соединение и попробуйте ещё раз.</p><button class="button" id="dua-retry">Повторить</button></section>';
  host.querySelector('#dua-back').onclick=()=>callbacks?.onBack?.();
  host.querySelector('#dua-retry').onclick=()=>showDailyDuas(container,options);
 }
}
function remember(){
 const params=new URLSearchParams({view:'duas'});
 if(state.category)params.set('category',state.category);if(state.query)params.set('q',state.query);if(state.favoritesOnly)params.set('favorites','1');if(state.item)params.set('item',state.item);if(state.item&&state.variant)params.set('variant',state.variant);
 try{window.history.replaceState(window.history.state,'','#adhkar?'+params)}catch{}
 callbacks?.onRoute?.();
}
function favoriteButton(item){const saved=favorites().includes(item.id);return '<button type="button" class="dua-favorite" data-dua-favorite="'+item.id+'" aria-pressed="'+saved+'" aria-label="'+(saved?'Убрать из избранного: ':'В избранное: ')+esc(item.title)+'">'+icon(saved?'star-fill':'star')+'</button>'}
function toggleFavorite(id){
 const previous=favorites(),next=previous.includes(id)?previous.filter(value=>value!==id):[...previous,id];
 if(!write('daily-dua-favorites',next)){toast('Избранное не сохранилось. Проверьте доступ к хранилищу.');return}
 if(state.item){const button=host.querySelector('[data-dua-favorite]');const item=catalogue.items.find(i=>i.id===id);const saved=next.includes(id);button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',(saved?'Убрать из избранного: ':'В избранное: ')+item.title);button.innerHTML=icon(saved?'star-fill':'star')}else results();
}
function bindFavorites(){host.querySelectorAll('[data-dua-favorite]').forEach(button=>button.onclick=()=>toggleFavorite(button.dataset.duaFavorite))}
function library(){
 state.item=null;delete state.variant;remember();document.body.classList.remove('daily-dua-reading','adhkar-focus');
 host.innerHTML='<section class="daily-dua-shell"><div class="dua-top"><button type="button" class="text-button" id="dua-back">К азкарам</button><span class="eyebrow">СБОРНИК</span></div><div class="dua-heading"><h1>Повседневные дуа</h1><p>Для привычных моментов дня</p></div><label class="dua-search-label" for="dua-search">Найти дуа</label><input id="dua-search" type="search" maxlength="120" autocomplete="off" placeholder="Например, перед едой" value="'+esc(state.query)+'"><div class="dua-filters"><label for="dua-category">Ситуация<select id="dua-category"><option value="">Все ситуации</option>'+catalogue.categories.map(c=>'<option value="'+c.id+'" '+(state.category===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label><button type="button" class="dua-saved-filter" id="dua-favorites-only" aria-pressed="'+state.favoritesOnly+'">'+icon('star')+'<span>Избранное</span></button></div><p class="dua-result-count" id="dua-result-count" role="status"></p><div id="dua-results"></div><details class="dua-editorial"><summary>О текстах</summary><p>'+esc(catalogue.editorial)+'</p></details></section>';
 host.querySelector('#dua-back').onclick=()=>callbacks?.onBack?.();
 host.querySelector('#dua-search').oninput=e=>{state.query=e.target.value.slice(0,120);remember();results()};
 host.querySelector('#dua-category').onchange=e=>{state.category=e.target.value;remember();results()};
 host.querySelector('#dua-favorites-only').onclick=e=>{state.favoritesOnly=!state.favoritesOnly;e.currentTarget.setAttribute('aria-pressed',String(state.favoritesOnly));remember();results()};
 results();
}
function results(){
 const items=selected();host.querySelector('#dua-result-count').textContent='Дуа: '+items.length;
 host.querySelector('#dua-results').innerHTML=items.length?items.map(item=>'<article class="dua-list-card"><button type="button" class="dua-open" data-dua-open="'+item.id+'"><small>'+esc(categoryName(item.category))+'</small><strong>'+esc(item.title)+'</strong><span>'+esc(item.occasion)+'</span></button>'+favoriteButton(item)+'</article>').join(''):'<div class="dua-empty"><p>'+(state.favoritesOnly?'В этой подборке пока нет избранных дуа.':'Не нашли дуа по этому запросу.')+'</p><button type="button" class="text-button" id="dua-clear">Показать все дуа</button></div>';
 host.querySelectorAll('[data-dua-open]').forEach(button=>button.onclick=()=>{readingIds=items.map(item=>item.id);state.item=button.dataset.duaOpen;reader();window.scrollTo(0,0)});
 const clear=host.querySelector('#dua-clear');if(clear)clear.onclick=()=>{state.category='';state.query='';state.favoritesOnly=false;library()};
 bindFavorites();
}
function variantButtons(item,passage){
 return item.variants?'<div class="dua-variants" role="group" aria-label="Вариант дуа Кунут">'+item.variants.map(value=>'<button type="button" data-dua-variant="'+value.id+'" aria-pressed="'+(value.id===passage.id)+'">'+esc(value.label)+'</button>').join('')+'</div>':'';
}
function switchVariant(item,id){
 const passage=item.variants?.find(value=>value.id===id);if(!passage||state.variant===id)return;
 state.variant=id;remember();
 host.querySelector('[data-dua-passage="arabic"]').textContent=passage.arabic;
 host.querySelector('[data-dua-passage="transliteration"]').textContent=passage.transliteration;
 host.querySelector('.dua-meaning p').textContent=passage.translation;
 const link=host.querySelector('.dua-source a');link.href=safeDuaSource(passage.source.url);link.textContent=passage.source.label;
 host.querySelectorAll('[data-dua-variant]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.duaVariant===id)));
}
function reader(direction=0){
 const item=catalogue.items.find(i=>i.id===state.item);if(!item){library();return}
 const index=readingIds.indexOf(item.id),shown=texts(),passage=duaPassage(item,state.variant);state.variant=passage===item?null:passage.id;remember();
 document.body.classList.add('daily-dua-reading');document.body.classList.toggle('adhkar-focus',read('adhkar-focus',true));
 host.innerHTML='<section class="daily-dua-shell dua-reader" data-slide="'+(direction>0?'next':direction<0?'previous':'')+'" style="--dua-size:'+size()+'px"><div class="dua-top"><button type="button" class="text-button" id="dua-list">К сборнику</button><span>'+esc(categoryName(item.category))+'</span>'+favoriteButton(item)+'</div><div class="dua-heading"><h1>'+esc(item.title)+'</h1><p>'+esc(item.occasion)+'</p></div><details class="dua-reading-settings"><summary>Настройки чтения</summary><div class="dua-preferences"><label>Размер текста<select id="dua-size">'+sizes.map(n=>'<option value="'+n+'" '+(n===size()?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'+[['arabic','Арабский'],['transliteration','Транскрипция'],['translation','Перевод']].map(([key,label])=>'<label><input type="checkbox" data-dua-text="'+key+'" '+(shown[key]?'checked':'')+'>'+label+'</label>').join('')+'<label><input type="checkbox" id="dua-focus" '+(read('adhkar-focus',true)?'checked':'')+'>Режим чтения</label></div></details>'+variantButtons(item,passage)+'<article class="dua-passage"><p class="dua-arabic" data-dua-passage="arabic" dir="rtl" lang="ar" '+(shown.arabic?'':'hidden')+'>'+esc(passage.arabic)+'</p><p class="dua-transcription" data-dua-passage="transliteration" '+(shown.transliteration?'':'hidden')+'>'+esc(passage.transliteration)+'</p><div class="dua-meaning" data-dua-passage="translation" '+(shown.translation?'':'hidden')+'><small>Перевод смысла</small><p>'+esc(passage.translation)+'</p></div></article><details class="dua-source"><summary>Источник</summary><a href="'+esc(safeDuaSource(passage.source.url))+'" target="_blank" rel="noopener noreferrer">'+esc(passage.source.label)+'</a><p>Транскрипция: ك — к, ق — қ; аа, ии, уу — долгие звуки. Кириллица не передаёт все особенности произношения.</p></details><nav class="dua-navigation" aria-label="Переход между дуа"><button type="button" class="button secondary" id="dua-prev" '+(index<=0?'disabled':'')+'>Предыдущее</button><button type="button" class="button secondary" id="dua-next" '+(index<0||index===readingIds.length-1?'disabled':'')+'>Следующее</button></nav></section>';
 host.querySelector('#dua-list').onclick=()=>{library();window.scrollTo(0,0)};bindFavorites();
 host.querySelectorAll('[data-dua-variant]').forEach(button=>button.onclick=()=>switchVariant(item,button.dataset.duaVariant));
 host.querySelector('#dua-prev').onclick=()=>navigate(index-1,-1);
 host.querySelector('#dua-next').onclick=()=>navigate(index+1,1);
 host.querySelector('#dua-size').onchange=e=>{const n=Number(e.target.value);if(!sizes.includes(n))return;write('adhkar-font-size',n);host.querySelector('.dua-reader').style.setProperty('--dua-size',n+'px')};
 host.querySelector('#dua-focus').onchange=e=>{write('adhkar-focus',e.target.checked);document.body.classList.toggle('adhkar-focus',e.target.checked)};
 host.querySelectorAll('[data-dua-text]').forEach(input=>input.onchange=e=>{
  const toggles=[...host.querySelectorAll('[data-dua-text]')];if(!toggles.some(toggle=>toggle.checked)){e.target.checked=true;toast('Оставьте хотя бы один вид текста.');return}
  const key=e.target.dataset.duaText;write(prefKeys[key],e.target.checked);host.querySelector('[data-dua-passage="'+key+'"]').hidden=!e.target.checked;
 });
}
function navigate(index,direction){if(index<0||index>=readingIds.length)return;state.item=readingIds[index];delete state.variant;reader(direction);window.scrollTo(0,0)}
