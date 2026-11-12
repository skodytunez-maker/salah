import{ownerVerified,verifyOwner,onOwnerChange}from './owner-auth.js';
import{loadIndex,audioUrl}from './quran-data.js';
import{reciterInfo,reciterHasSurah}from './quran-reciters.js';
import{reciterRecording}from './quran-reciter-recording.js';
import{quranPlayback}from './quran-session.js';
import{reciterImageUrl}from './approved-catalog.js';
import{esc}from './ui.js';
import{shuffleRadio,selectRadioProgram,measureRadioCandidates,probeRadioDuration}from './radio-program-core.js';
import{radioQuizQuestions,initialRadioQuiz,stepRadioQuiz}from './radio-quiz-core.js';
const VOICES=['ar.yasseraldossaricontinuous','ar.idrisabkar','ar.alafasycontinuous','ar.mahermuaiqlycontinuous'];
const TABS=[['air','Эфир'],['program','Программа'],['quiz','Викторина']];
export const radioBeacon=()=>'<svg viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="14" cy="14" r="2.5" fill="currentColor" stroke="none"/><path d="M8.5 8.5a7.8 7.8 0 0 0 0 11m11-11a7.8 7.8 0 0 1 0 11M5 5a12.7 12.7 0 0 0 0 18M23 5a12.7 12.7 0 0 1 0 18"/></svg>';
export function mountHomeRadioEntry(host){
 if(!host)return()=>{};
 const draw=()=>{const visible=ownerVerified();host.hidden=!visible;if(visible&&!host.firstElementChild)host.innerHTML='<a href="#radio" class="home-radio-beacon" aria-label="Радио SALAH">'+radioBeacon()+'<span>Радио</span></a>';else if(!visible)host.innerHTML='';};
 draw();const off=onOwnerChange(draw),timer=setInterval(draw,15000);
 return()=>{off();clearInterval(timer);host.innerHTML='';host.hidden=true;};
}
let activeDispose=null;
export function stopRadioPreview(){activeDispose?.();activeDispose=null;}
export async function showRadioPreview(host,{verify=()=>verifyOwner({verifySession:true}),isOwner=ownerVerified,subscribe=onOwnerChange,load=loadIndex,probe=probeRadioDuration,play=(catalog,track)=>quranPlayback.start(reciterRecording(catalog,track.surah),track.reciter)}={}){
 stopRadioPreview();
 let alive=true,guard=null,controller=null,tab='air',catalog=null,questions=[],quiz=initialRadioQuiz(),program=null,busy=false,measured=0,total=0,notice='',root=null;
 let off=null;
 const selected=new Set(VOICES),durations=new Map(),dirty=new Set(['air','program','quiz']);
 const current=()=>alive&&host.isConnected;
 const dispose=()=>{alive=false;clearInterval(guard);controller?.abort();off?.();root?.removeEventListener('click',onClick);root?.removeEventListener('change',onChange);root?.removeEventListener('keydown',onKey);};
 activeDispose=dispose;
 const denied=message=>{controller?.abort();host.innerHTML='<section class="panel radio-private"><h1>Радио SALAH</h1><p>'+esc(message)+'</p><a href="#admin">Вход владельца</a></section>';};
 host.innerHTML='<section class="panel radio-private"><p role="status">Открываем радио…</p></section>';
 try{
  if(!await verify()||!isOwner()){if(current())denied('Радио доступно владельцу после защищённого входа.');return dispose;}
  if(!current())return dispose;
  off=subscribe(()=>{if(current()&&!isOwner()){dispose();denied('Подтвердите вход владельца снова.');}});
  catalog=await load();if(!current()||!isOwner())return dispose;
  questions=radioQuizQuestions(catalog);
  guard=setInterval(()=>{if(current()&&!isOwner()){dispose();denied('Подтвердите вход владельца снова.');}},5000);
 }catch{if(current())denied('Не удалось открыть радио. Проверьте соединение и повторите вход.');return dispose;}
 const time=seconds=>{const s=Math.floor(seconds);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 const voiceName=id=>reciterInfo(id).name.replace(' · сура целиком','');
 const trackMarkup=(track,i)=>'<li><span class="radio-track-number">'+(i+1)+'</span><div><strong>'+esc(catalog.surahs[track.surah-1].name)+'</strong><small>'+esc(voiceName(track.reciter))+'</small></div><span>'+time(track.duration)+'</span><button type="button" class="radio-track-play" data-audition="'+i+'" aria-label="Прослушать '+esc(catalog.surahs[track.surah-1].name)+'">▷</button></li>';
 function airMarkup(){
  const cover=reciterInfo(program?.tracks[0]?.reciter||VOICES[0]);
  return '<article class="radio-air-card"><div class="radio-air-label">'+radioBeacon()+'<span>ПРОГРАММА ЧТЕНИЯ</span></div><img class="radio-air-portrait" src="'+esc(reciterImageUrl(cover.portrait))+'" alt="'+esc(cover.name)+'"><h2>Чтение Корана</h2><p>'+esc(voiceName(cover.id))+'</p><div class="radio-wave" aria-hidden="true">'+Array.from({length:17},(_,i)=>'<i style="--bar:'+((i*7)%11+5)+'"></i>').join('')+'</div><button type="button" class="button" data-open-program>Собрать программу</button><small>Короткие суры · разные голоса</small></article><section class="panel radio-next"><span class="eyebrow">ВИКТОРИНА SALAH</span><h2>Проверьте свои знания</h2><p class="muted">Два участника · пять вопросов о Коране</p><button type="button" class="button secondary" data-open-quiz>Открыть викторину</button></section>';
 }
 const progressText=()=>busy?'Проверяем записи: '+measured+' из '+total:notice;
 function programMarkup(){
  return '<section class="panel radio-program"><div class="radio-program-heading"><span class="eyebrow">ВАША ПРОГРАММА</span><h2>Час коротких сур</h2><p class="muted">Целые суры до четырёх минут. Чередуем выбранные голоса без повторов записей.</p></div><fieldset '+(busy?'disabled':'')+'><legend>Выберите чтецов</legend><div class="radio-voices">'+VOICES.map(id=>'<label class="radio-voice"><input type="checkbox" name="radio-voice" value="'+id+'" '+(selected.has(id)?'checked':'')+'><img src="'+esc(reciterImageUrl(reciterInfo(id).portrait))+'" alt="" width="42" height="42"><span>'+esc(voiceName(id))+'</span></label>').join('')+'</div></fieldset><div class="radio-build-status" '+(!busy&&!notice?'hidden':'')+'><p role="status" aria-live="polite" class="radio-progress">'+esc(progressText())+'</p><progress data-radio-progress max="'+Math.max(1,total)+'" value="'+measured+'" aria-label="Проверено записей" '+(busy?'':'hidden')+'></progress></div><div class="radio-program-actions"><button type="button" class="button radio-build-button" data-build aria-busy="'+busy+'" '+(busy?'disabled':'')+'>'+(busy?'<span class="radio-button-spinner" aria-hidden="true"></span>Подбираем…':program?'Перемешать заново':'Подобрать на час')+'</button>'+(busy?'<button type="button" class="button secondary" data-cancel>Отменить</button>':'')+'</div>'+(program?'<div class="radio-program-summary"><strong>'+time(program.duration)+'</strong><span>'+program.tracks.length+' записей · '+(program.complete?'около часа':'неполная программа')+'</span></div><ol class="radio-tracks">'+program.tracks.map(trackMarkup).join('')+'</ol><p class="radio-program-hint">Нажмите ▷ рядом с сурой, чтобы прослушать её.</p>':'')+'</section>';
 }
 function quizMarkup(){
  if(quiz.phase==='finished')return '<div class="radio-quiz-card"><span class="eyebrow">ИТОГИ ВИКТОРИНЫ</span><h2>Спасибо за участие</h2><p class="radio-quiz-result">'+quiz.scores[0]+' : '+quiz.scores[1]+'</p><button type="button" class="button secondary" data-quiz="reset">Начать заново</button></div>';
  const q=questions[quiz.round],shown=quiz.phase!=='ready',review=['review','scored'].includes(quiz.phase);
  const description={ready:'Пять вопросов о Коране. Начнём?',question:'Прочитайте вопрос, затем откройте ответы.',answers:'Выберите участника, который первым готов ответить.',locked:'Первым отвечает участник '+(quiz.first+1)+'.',review:'Сверьте ответ с источником.',scored:'Результат отмечен. Можно продолжить.'}[quiz.phase];
  return '<div class="radio-quiz-score"><span>Участник 1 <b>'+quiz.scores[0]+'</b></span><span>Участник 2 <b>'+quiz.scores[1]+'</b></span></div><div class="radio-quiz-card"><span class="eyebrow">ВОПРОС '+(quiz.round+1)+' ИЗ 5</span><h2>'+(shown?esc(q.text):'Готовы начать?')+'</h2><p class="muted">'+esc(description)+'</p>'+
  (quiz.phase==='ready'?'<button type="button" class="button" data-quiz="show">Показать вопрос</button>':'')+
  (quiz.phase==='question'?'<button type="button" class="button" data-quiz="open">Вопрос прочитан — открыть ответы</button>':'')+
  (quiz.phase==='answers'?'<div class="radio-quiz-actions"><button type="button" class="button" data-buzz="0">Участник 1</button><button type="button" class="button secondary" data-buzz="1">Участник 2</button></div>':'')+
  (quiz.phase==='locked'?'<button type="button" class="button" data-quiz="reveal">Показать правильный ответ</button>':'')+
  (review?'<div class="radio-quiz-answer"><strong>'+esc(q.answer)+'</strong><small>'+esc(q.source)+'</small></div>':'')+
  (quiz.phase==='review'?'<div class="radio-quiz-actions"><button type="button" class="button" data-judge="yes">Верно</button><button type="button" class="button secondary" data-judge="no">Неверно</button></div>':'')+
  (quiz.phase==='scored'?'<button type="button" class="button" data-quiz="next">'+(quiz.round===4?'Итоги':'Следующий вопрос')+'</button>':'')+'</div>';
 }
 function draw(){
  if(!current())return;
  if(!isOwner()){dispose();denied('Подтвердите вход владельца снова.');return;}
  if(!root){
   host.innerHTML='<section class="radio-preview"><a class="radio-back" href="#home">‹ На главную</a><header class="radio-header"><div class="radio-brand"><span class="radio-brand-mark" aria-hidden="true">'+radioBeacon()+'</span><h1>Радио <span>SALAH</span></h1></div><p class="radio-subtitle">Соберите свою программу чтения.</p></header><nav class="radio-tabs" role="tablist" aria-label="Разделы радио">'+TABS.map(([key,label])=>'<button type="button" role="tab" id="radio-tab-'+key+'" data-radio-tab="'+key+'" aria-controls="radio-pane-'+key+'" aria-selected="'+(tab===key)+'" aria-pressed="'+(tab===key)+'" tabindex="'+(tab===key?'0':'-1')+'">'+label+'</button>').join('')+'</nav><div class="radio-pages">'+TABS.map(([key])=>'<div id="radio-pane-'+key+'" role="tabpanel" aria-labelledby="radio-tab-'+key+'" '+(tab===key?'':'hidden')+'></div>').join('')+'</div></section>';
   root=host.querySelector('.radio-preview');root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('keydown',onKey);
  }
  // Keep the header, tabs and visited panes mounted. No reveal animation or
  // re-parsing the whole page on a tab tap; form choices and focus survive.
  for(const[key]of TABS){const active=tab===key,button=root.querySelector('[data-radio-tab="'+key+'"]'),pane=root.querySelector('#radio-pane-'+key);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;pane.hidden=!active;if(active&&dirty.has(key)){pane.innerHTML=key==='air'?airMarkup():key==='program'?programMarkup():quizMarkup();dirty.delete(key);}}
  if(tab==='program'&&busy)updateProgress();
 }
 function updateProgress(){
  if(!current()||!root)return;const status=root.querySelector('.radio-progress'),bar=root.querySelector('[data-radio-progress]');
  if(status)status.textContent=progressText();if(bar){bar.max=Math.max(1,total);bar.value=measured;}
 }
 function switchTab(next){if(!TABS.some(([key])=>key===next)||tab===next)return;tab=next;draw();}
 function onChange(event){const input=event.target;if(input?.matches('[name="radio-voice"]')){if(input.checked)selected.add(input.value);else selected.delete(input.value);}}
 function onKey(event){const button=event.target.closest?.('[data-radio-tab]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=TABS.findIndex(([key])=>key===tab),next=event.key==='Home'?0:event.key==='End'?TABS.length-1:(index+(event.key==='ArrowRight'?1:-1)+TABS.length)%TABS.length;switchTab(TABS[next][0]);root.querySelector('[data-radio-tab="'+tab+'"]').focus({preventScroll:true});}
 function onClick(event){
  const button=event.target.closest?.('button');if(!button||button.disabled)return;
  if(button.hasAttribute('data-radio-tab')){switchTab(button.dataset.radioTab);return;}
  if(button.hasAttribute('data-open-program')){switchTab('program');return;}
  if(button.hasAttribute('data-open-quiz')){switchTab('quiz');return;}
  if(button.hasAttribute('data-build')){void build();return;}
  if(button.hasAttribute('data-cancel')){controller?.abort();return;}
  let action=null;
  if(button.hasAttribute('data-quiz'))action={type:button.dataset.quiz};
  if(button.hasAttribute('data-buzz'))action={type:'buzz',player:Number(button.dataset.buzz)};
  if(button.hasAttribute('data-judge'))action={type:'judge',correct:button.dataset.judge==='yes'};
  if(action){quiz=stepRadioQuiz(quiz,action);dirty.add('quiz');draw();return;}
  if(button.hasAttribute('data-audition'))void audition(button);
 }
 async function audition(button){
  if(!isOwner()){draw();return;}const track=program?.tracks[Number(button.dataset.audition)];if(!track)return;
  button.disabled=true;try{await play(catalog,track);}catch{if(current()){notice='Не удалось включить запись. Попробуйте другую.';dirty.add('program');draw();}}finally{if(button.isConnected)button.disabled=false;}
 }
 async function build(){
  if(busy)return;if(!isOwner()){draw();return;}
  if(selected.size<2){notice='Выберите хотя бы двух чтецов.';dirty.add('program');draw();return;}
  busy=true;measured=0;notice='';controller=new AbortController();const signal=controller.signal;
  const candidates=[];
  for(const surah of shuffleRadio(catalog.surahs.filter(s=>s.number>=78)))for(const reciter of shuffleRadio([...selected]))if(reciterHasSurah(reciter,surah.number)){
   const recording=reciterRecording(catalog,surah.number);candidates.push({surah:surah.number,reciter,url:audioUrl(recording.verses[0].number,reciter,surah.number)});
  }
  total=candidates.length;dirty.add('program');draw();
  try{
   const tracks=await measureRadioCandidates(candidates,{signal,probe:async(url,abort)=>{if(durations.has(url))return durations.get(url);const duration=await probe(url,abort);if(Number.isFinite(duration)&&duration>0)durations.set(url,duration);return duration;},onProgress:done=>{measured=done;updateProgress();}});
   if(!current()||!isOwner())return;
   const result=selectRadioProgram(tracks);
   if(!result.tracks.length)notice='Не удалось проверить записи. Проверьте интернет и повторите.';
   else if(new Set(result.tracks.map(x=>x.reciter)).size<2)notice='Доступен только один голос. Повторите подбор с другими чтецами.';
   else{program=result;dirty.add('air');notice=result.complete?'Программа готова. Приятного прослушивания.':'Не хватило доступных коротких записей на час. Показана фактическая длительность.';}
  }catch(error){if(current())notice=error.name==='AbortError'?'Подбор отменён.':'Не удалось подготовить программу.';}
  finally{busy=false;dirty.add('program');if(current())draw();}
 }
 draw();return dispose;
}
