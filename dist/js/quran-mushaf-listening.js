import{mushafThemeButton}from './quran-mushaf-controls.js';
import{quranPlayback}from './quran-session.js';
import{RECITERS,reciterInfo,reciterHasSurah,reciterOptions}from './quran-reciters.js';
import{timingUrl}from './quran-timing.js';
import{printedVerseKeys,printedPageForPosition}from './quran-mushaf-print.js';
import{createMushafFollower,mushafAudioPosition}from './quran-mushaf-follow.js';
import{loadSurah}from './quran-data.js';
import{read,write}from './storage.js';
import{actionIcon}from './action-icons.js';
import{toast}from './ui.js';
let arrival=null;
const chosen=()=>{const current=quranPlayback.state;const id=current.surah?current.reciter:read('quran-preferences',{}).reciter;return RECITERS.some(r=>r.id===id)?id:'ar.alafasy';};
export function mushafListeningOptions(){
 return '<h2>Прослушивание</h2><label>Чтец<select id="mushaf-reciter">'+reciterOptions(chosen(),read('quran-reciter-favorites',[]))+'</select></label><label class="mushaf-follow-setting"><input type="checkbox" id="mushaf-auto-follow"> Автоперелистывание</label><p class="mushaf-listening-help">Подсвечивать звучащий аят и переходить к следующей странице. При ручном перелистывании слежение приостанавливается.</p>';
}
export function mountMushafListening(host,{page,index,getEdition,getLines,getFollow,setFollow,navigate,getTheme=()=> 'night',setTheme=()=>{},openColors=()=>{},playback=quranPlayback,load=loadSurah}){
 const paper=host.querySelector('.mushaf-paper'),anchor=host.querySelector('.mushaf-tools'),select=host.querySelector('#mushaf-reciter'),check=host.querySelector('#mushaf-auto-follow');
 const panel=document.createElement('div');panel.className='mushaf-listening';panel.innerHTML='<div class="mushaf-actions" role="group" aria-label="Чтение и прослушивание"><button type="button" id="mushaf-listen" disabled>'+actionIcon('play')+'<span>Слушать</span></button><button type="button" id="mushaf-theme-toggle"></button><button type="button" id="mushaf-colors" aria-haspopup="dialog" aria-controls="mushaf-colors-dialog"><span class="mushaf-colors-symbol" aria-hidden="true"><i></i><i></i><i></i></span><span>Цвета</span></button></div><div class="mushaf-listening-detail"><div class="mushaf-listening-copy"><button type="button" id="mushaf-listening-reciter"></button><small id="mushaf-listening-status" role="status" aria-live="polite"></small></div><button type="button" id="mushaf-follow-current" hidden>К аяту</button></div>';anchor.after(panel);
 let closed=false,starting=0,selected=chosen(),observedReciter=playback.state.reciter,lastHighlighted=null,lastScrolled=null,edition=getEdition(),loaded=false;
 const handed=arrival?.page===page&&arrival.edition===edition&&Date.now()<=arrival.until?arrival:null;arrival=null;
 let follower=createMushafFollower({page,edition,automatic:handed?.automatic,manual:handed?.automatic===false});
 const button=panel.querySelector('#mushaf-listen'),caption=button.querySelector('span'),status=panel.querySelector('#mushaf-listening-status'),reader=panel.querySelector('#mushaf-listening-reciter'),resume=panel.querySelector('#mushaf-follow-current');
 const themeButton=panel.querySelector('#mushaf-theme-toggle');
 const drawTheme=()=>{themeButton.innerHTML=mushafThemeButton(getTheme());themeButton.setAttribute('aria-label',getTheme()==='night'?'Включить светлый фон':'Включить тёмный фон');};
 drawTheme();themeButton.onclick=()=>{setTheme(getTheme()==='night'?'paper':'night');drawTheme();};
 panel.querySelector('#mushaf-colors').onclick=openColors;
 const pageKeys=()=>getLines()?printedVerseKeys(getLines()):[];
 const canSync=(reciter,surah)=>reciterInfo(reciter).format==='verse'||!!timingUrl({number:surah},reciter);
 function scrollToAyah(key,force=false){
  if(!key||(!force&&key===lastScrolled)||(host.querySelector('.mushaf-options')?.open||host.querySelector('#mushaf-colors-dialog')?.open))return;
  const word=paper.querySelector('[data-verse="'+key+'"]');if(!word)return;
  lastScrolled=key;const rect=word.getBoundingClientRect(),top=host.querySelector('.mushaf-top')?.getBoundingClientRect().bottom||60,dock=document.getElementById('quran-global-player'),bottom=dock&&!dock.hidden?dock.getBoundingClientRect().top:innerHeight-20;
  if(force||rect.top<top+12||rect.bottom>bottom-16)word.scrollIntoView?.({block:'center',inline:'nearest',behavior:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 function draw(state){
  if(closed)return;
  if(state.reciter&&state.reciter!==observedReciter&&RECITERS.some(r=>r.id===state.reciter)){selected=state.reciter;select.value=selected;}observedReciter=state.reciter;
  check.checked=getFollow();reader.textContent=reciterInfo(selected).name;
  const keys=pageKeys(),first=keys[0]?.split(':').map(Number),available=!!first&&reciterHasSurah(selected,first[0]);
  const moving=['playing','loading'].includes(state.status),point=mushafAudioPosition(state),mode=follower.update(state,getFollow()&&!host.querySelector('#mushaf-colors-dialog')?.open);
  button.disabled=!loaded||!available;caption.textContent=moving?'Пауза':point&&keys.includes(point.key)&&selected===state.reciter?'Продолжить':'Слушать';
  button.setAttribute('aria-label',moving?'Пауза прослушивания':caption.textContent);button.setAttribute('aria-busy',String(state.status==='loading'));
  const old=button.querySelector('svg'),icon=document.createElement('span');icon.innerHTML=actionIcon(moving?'pause':'play');old?.replaceWith(icon.firstChild);
  resume.hidden=!point||mode.following&&!!mode.key;
  const message=!loaded?'Открываем страницу…':!available?'Нет записи этой суры':state.status==='error'&&state.timingStatus==='unavailable'?'Разметка аятов недоступна. Выберите другого чтеца.':point?(index.surahs[point.surah-1].name+' · Аят '+point.ayah+(mode.held?' · слежение на паузе':state.status==='paused'?' · на паузе':'')):state.status==='loading'?'Загрузка аудио и разметки…':state.surah&&state.timingStatus==='unavailable'?'Сура целиком · без подсветки':first&&!canSync(selected,first[0])?'Сура целиком · без подсветки':'С текущей страницы';
  if(status.textContent!==message)status.textContent=message;
  if(mode.key!==lastHighlighted){
   paper.querySelectorAll('.mushaf-print-word').forEach(word=>word.classList.toggle('is-playing-ayah',word.dataset.verse===mode.key));
   lastHighlighted=mode.key;
  }
  if(mode.following&&mode.key&&state.status==='playing')scrollToAyah(mode.key);
  if(mode.target){arrival={page:mode.target,edition:getEdition(),automatic:true,until:Date.now()+10000};navigate(mode.target);}
 }
 async function startAt(surah,ayah){
  const ticket=++starting,reciter=selected;button.disabled=true;
  try{
   const data=await load(surah);if(closed||ticket!==starting)return;
   follower.resume();check.checked=getFollow();
   if(canSync(reciter,surah))await playback.startFromAyah(data,reciter,ayah);
   else await playback.start(data,reciter,0,true,false,0,false);
  }catch{if(!closed&&ticket===starting)toast('Не удалось включить запись. Попробуйте ещё раз.');}
  finally{if(!closed&&ticket===starting)draw(playback.state);}
 }
 button.onclick=()=>{
  const state=playback.state;if(['playing','loading'].includes(state.status)){starting++;playback.pause();return;}
  const point=mushafAudioPosition(state),keys=pageKeys();
  if(point&&keys.includes(point.key)&&state.reciter===selected){follower.resume();playback.toggle();return;}
  const first=keys[0]?.split(':').map(Number);if(first)void startAt(first[0],first[1]);
 };
 select.value=selected;
 select.onchange=()=>{
  starting++;selected=select.value;if(!RECITERS.some(r=>r.id===selected))return;
  if(!write('quran-preferences',{...read('quran-preferences',{}),reciter:selected}))toast('Не удалось сохранить выбор чтеца');
  const state=playback.state,point=mushafAudioPosition(state);
  if(state.status==='playing'&&point&&pageKeys().includes(point.key)&&reciterHasSurah(selected,point.surah))void startAt(point.surah,point.ayah);
  else draw(state);
 };
 reader.onclick=()=>{host.querySelector('.mushaf-options').open=true;select.focus();};
 check.onchange=()=>{setFollow(check.checked);if(check.checked)follower.resume();else follower.suspend();draw(playback.state);};
 resume.onclick=()=>{setFollow(true);follower.resume();lastScrolled=null;const point=mushafAudioPosition(playback.state);if(point&&!pageKeys().includes(point.key)){const target=printedPageForPosition(point.surah,point.ayah,getEdition());if(target&&target!==page){arrival={page:target,edition:getEdition(),automatic:true,until:Date.now()+10000};navigate(target);return;}}draw(playback.state);if(point)scrollToAyah(point.key,true);};
 const unsubscribe=playback.subscribe(draw);
 return{
  updateTheme:drawTheme,
  refresh(){
   if(closed)return;const lines=getLines();loaded=!!lines;lastHighlighted=null;lastScrolled=null;
   if(edition!==getEdition()){edition=getEdition();follower=createMushafFollower({page,edition});}
   if(loaded){const keys=pageKeys(),first=keys[0]?.split(':').map(Number);for(const option of select.options)option.disabled=!!first&&!reciterHasSurah(option.value,first[0]);follower.loaded(keys,playback.state);}
   draw(playback.state);
  },
  manualNavigation(target){follower.suspend();arrival={page:target,edition:getEdition(),automatic:false,until:Date.now()+10000};},
  dispose(){closed=true;starting++;unsubscribe();panel.remove();}
 };
}
