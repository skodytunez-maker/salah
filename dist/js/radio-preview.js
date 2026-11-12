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
export const radioBeacon=()=>'<svg viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="14" cy="14" r="2.5" fill="currentColor" stroke="none"/><path d="M8.5 8.5a7.8 7.8 0 0 0 0 11m11-11a7.8 7.8 0 0 1 0 11M5 5a12.7 12.7 0 0 0 0 18M23 5a12.7 12.7 0 0 1 0 18"/></svg>';
export function mountHomeRadioEntry(host){
 if(!host)return()=>{};
 const draw=()=>{host.hidden=!ownerVerified();host.innerHTML=host.hidden?'':'<a href="#radio" class="home-radio-beacon" aria-label="Радио SALAH — закрытый макет">'+radioBeacon()+'<span>Радио<small>Макет</small></span></a>';};
 draw();const off=onOwnerChange(draw),timer=setInterval(draw,15000);
 return()=>{off();clearInterval(timer);host.innerHTML='';host.hidden=true;};
}
let activeDispose=null;
export function stopRadioPreview(){activeDispose?.();activeDispose=null;}
export async function showRadioPreview(host,{verify=()=>verifyOwner({verifySession:true}),isOwner=ownerVerified,subscribe=onOwnerChange,load=loadIndex,probe=probeRadioDuration,play=(catalog,track)=>quranPlayback.start(reciterRecording(catalog,track.surah),track.reciter)}={}){
 stopRadioPreview();
 let alive=true,guard=null,controller=null,tab='air',catalog=null,questions=[],quiz=initialRadioQuiz(),program=null,busy=false,measured=0,total=0,notice='';
 const dispose=()=>{alive=false;clearInterval(guard);controller?.abort();off?.();};
 let off=null;activeDispose=dispose;
 const current=()=>alive&&host.isConnected;
 const denied=message=>{controller?.abort();host.innerHTML='<section class="panel radio-private"><h1>Радио SALAH</h1><p>'+esc(message)+'</p><a href="#admin">Вход владельца</a></section>';};
 host.innerHTML='<section class="panel radio-private"><p role="status">Проверяем доступ к закрытому макету…</p></section>';
 try{
  if(!await verify()||!isOwner()){if(current())denied('Макет доступен только владельцу после защищённого входа.');return dispose;}
  if(!current())return dispose;
  off=subscribe(()=>{if(current()&&!isOwner()){dispose();denied('Подтвердите вход владельца снова.');}});
  catalog=await load();if(!current()||!isOwner())return dispose;
  questions=radioQuizQuestions(catalog);
  guard=setInterval(()=>{if(current()&&!isOwner()){dispose();denied('Подтвердите вход владельца снова.');}},5000);
 }catch{if(current())denied('Не удалось проверить доступ или загрузить библиотеку. Проверьте соединение и повторите вход.');return dispose;}
 const time=seconds=>{const s=Math.floor(seconds);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 const trackMarkup=(track,i)=>{const r=reciterInfo(track.reciter),surah=catalog.surahs[track.surah-1];return '<li><span class="radio-track-number">'+(i+1)+'</span><div><strong>'+esc(surah.name)+'</strong><small>'+esc(r.name.replace(' · сура целиком',''))+'</small></div><span>'+time(track.duration)+'</span><button type="button" class="radio-track-play" data-audition="'+i+'" aria-label="Прослушать '+esc(surah.name)+'">▷</button></li>';};
 const drawQuiz=()=>{
  if(quiz.phase==='finished')return '<div class="radio-quiz-card"><span class="eyebrow">ДЕМО ЗАВЕРШЕНО</span><h2>Спасибо за участие</h2><p>Итог: '+quiz.scores[0]+' : '+quiz.scores[1]+'</p><p class="muted">Здесь будет итог эфира и информация о сувенире SALAH.</p><button class="button secondary" data-quiz="reset">Повторить макет</button></div>';
  const q=questions[quiz.round],shown=quiz.phase!=='ready',review=['review','scored'].includes(quiz.phase);
  return '<div class="radio-quiz-score"><span>Участник 1 <b>'+quiz.scores[0]+'</b></span><span>Участник 2 <b>'+quiz.scores[1]+'</b></span></div><div class="radio-quiz-card"><span class="eyebrow">ВОПРОС '+(quiz.round+1)+' ИЗ 5</span><h2>'+(shown?esc(q.text):'Готовы начать?')+'</h2><p class="muted">'+(quiz.phase==='ready'?'Вопрос появится текстом. В настоящем эфире тот же текст прочитает ИИ-ведущий.':quiz.phase==='question'?'Макет: ведущий читает вопрос. Откройте ответы после завершения.':quiz.phase==='answers'?'Ответы открыты. Выберите, кто первым нажал кнопку.':quiz.phase==='locked'?'Первым отвечает участник '+(quiz.first+1)+'.':quiz.phase==='review'?'Ведущий проверяет ответ.':'Ответ засчитан. Можно продолжить.')+'</p>'+
  (quiz.phase==='ready'?'<button class="button" data-quiz="show">Показать вопрос</button>':'')+
  (quiz.phase==='question'?'<button class="button" data-quiz="open">Вопрос прочитан — открыть ответы</button>':'')+
  (quiz.phase==='answers'?'<div class="radio-quiz-actions"><button class="button" data-buzz="0">Участник 1</button><button class="button secondary" data-buzz="1">Участник 2</button></div>':'')+
  (quiz.phase==='locked'?'<button class="button" data-quiz="reveal">Показать правильный ответ</button>':'')+
  (review?'<div class="radio-quiz-answer"><strong>'+esc(q.answer)+'</strong><small>'+esc(q.source)+'</small></div>':'')+
  (quiz.phase==='review'?'<div class="radio-quiz-actions"><button class="button" data-judge="yes">Верно</button><button class="button secondary" data-judge="no">Неверно</button></div>':'')+
  (quiz.phase==='scored'?'<button class="button" data-quiz="next">'+(quiz.round===4?'Итоги':'Следующий вопрос')+'</button>':'')+'</div><p class="radio-demo-note">Участники и очки демонстрационные. Голос ИИ и приём реальных ответов ещё не подключены.</p>';
 };
 const draw=()=>{
  if(!current())return;
  if(!isOwner()){dispose();denied('Подтвердите вход владельца снова.');return;}
  const cover=reciterInfo(program?.tracks[0]?.reciter||VOICES[0]);
  host.innerHTML='<section class="radio-preview"><a class="radio-back" href="#home">‹ На главную</a><header><span class="eyebrow">ЗАКРЫТЫЙ ПРОСМОТР</span><h1>Радио SALAH</h1><p class="muted">Макет для владельца. Публичный эфир не запущен.</p></header><nav class="radio-tabs" aria-label="Макет радио">'+[['air','Эфир'],['program','Программа'],['quiz','Викторина']].map(([key,label])=>'<button type="button" data-radio-tab="'+key+'" aria-pressed="'+(tab===key)+'">'+label+'</button>').join('')+'</nav>'+
  (tab==='air'?'<article class="radio-air-card"><div class="radio-air-label">'+radioBeacon()+'<span>ПРЕДПРОСМОТР ЭФИРА</span></div><img class="radio-air-portrait" src="'+esc(reciterImageUrl(cover.portrait))+'" alt="'+esc(cover.name)+'"><h2>Чтение Корана</h2><p>'+esc(cover.name.replace(' · сура целиком',''))+'</p><div class="radio-wave" aria-hidden="true">'+Array.from({length:17},(_,i)=>'<i style="--bar:'+((i*7)%11+5)+'"></i>').join('')+'</div><button class="button" data-open-program>Подготовить программу</button><small>Голос ведущего — между записями.</small></article><section class="panel radio-next"><span class="eyebrow">СЛЕДОМ В ЭФИРЕ</span><h2>Викторина SALAH</h2><p class="muted">Два участника · пять вопросов · сувенир SALAH</p><button class="button secondary" data-open-quiz>Посмотреть макет</button></section>':'')+
  (tab==='program'?'<section class="panel radio-program"><h2>Час коротких сур</h2><p class="muted">Разные чтецы, суры 78–114 длительностью до четырёх минут. Только целые записи. Повтор одной записи исключён.</p><fieldset '+(busy?'disabled':'')+'><legend>Голоса программы</legend>'+VOICES.map(id=>'<label><input type="checkbox" name="radio-voice" value="'+id+'" '+(selected.has(id)?'checked':'')+'>'+esc(reciterInfo(id).name.replace(' · сура целиком',''))+'</label>').join('')+'</fieldset><div class="radio-program-actions"><button class="button" data-build '+(busy?'disabled':'')+'>'+(program?'Перемешать заново':'Подобрать на час')+'</button>'+(busy?'<button class="button secondary" data-cancel>Отменить</button>':'')+'</div><p role="status" class="muted radio-progress">'+(busy?'Проверяем длительность: '+measured+' из '+total+'. Это может занять несколько минут.':esc(notice))+'</p>'+(program?'<div class="radio-program-summary"><strong>'+time(program.duration)+'</strong><span>'+program.tracks.length+' записей · '+(program.complete?'около часа':'неполная программа')+'</span></div><ol class="radio-tracks">'+program.tracks.map(trackMarkup).join('')+'</ol>':'')+'<p class="radio-demo-note">Подбор проверяет длительность аудио. Ничего не включается автоматически. Кнопка ▷ открывает выбранную суру в обычном плеере; это ещё не общий эфир.</p></section>':'')+
  (tab==='quiz'?drawQuiz():'')+'</section>';
  host.querySelectorAll('[data-radio-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.radioTab;draw();});
  host.querySelector('[data-open-program]')?.addEventListener('click',()=>{tab='program';draw();});
  host.querySelector('[data-open-quiz]')?.addEventListener('click',()=>{tab='quiz';draw();});
  host.querySelectorAll('[name="radio-voice"]').forEach(input=>input.onchange=()=>{if(input.checked)selected.add(input.value);else selected.delete(input.value);});
  host.querySelector('[data-build]')?.addEventListener('click',()=>void build());
  host.querySelector('[data-cancel]')?.addEventListener('click',()=>controller?.abort());
  host.querySelectorAll('[data-quiz]').forEach(button=>button.onclick=()=>{quiz=stepRadioQuiz(quiz,{type:button.dataset.quiz});draw();});
  host.querySelectorAll('[data-buzz]').forEach(button=>button.onclick=()=>{quiz=stepRadioQuiz(quiz,{type:'buzz',player:Number(button.dataset.buzz)});draw();});
  host.querySelectorAll('[data-judge]').forEach(button=>button.onclick=()=>{quiz=stepRadioQuiz(quiz,{type:'judge',correct:button.dataset.judge==='yes'});draw();});
  host.querySelectorAll('[data-audition]').forEach(button=>button.onclick=async()=>{if(!isOwner())return;button.disabled=true;try{await play(catalog,program.tracks[Number(button.dataset.audition)]);}catch{if(current()){notice='Не удалось включить запись. Попробуйте другую.';draw();}}finally{if(button.isConnected)button.disabled=false;}});
 };
 const selected=new Set(VOICES),durations=new Map();
 async function build(){
  if(busy||!isOwner())return;
  if(selected.size<2){notice='Выберите хотя бы двух чтецов.';draw();return;}
  busy=true;measured=0;controller=new AbortController();const signal=controller.signal;
  const candidates=[];
  // Interleave voices so a partial metadata failure cannot silently pick one voice.
  for(const surah of shuffleRadio(catalog.surahs.filter(s=>s.number>=78))){
   for(const reciter of shuffleRadio([...selected]))if(reciterHasSurah(reciter,surah.number)){
    const recording=reciterRecording(catalog,surah.number);
    candidates.push({surah:surah.number,reciter,url:audioUrl(recording.verses[0].number,reciter,surah.number)});
   }
  }
  total=candidates.length;draw();
  try{
   const tracks=await measureRadioCandidates(candidates,{signal,probe:async(url,abort)=>{if(durations.has(url))return durations.get(url);const duration=await probe(url,abort);if(Number.isFinite(duration)&&duration>0)durations.set(url,duration);return duration;},onProgress:done=>{measured=done;if(current()&&tab==='program'){const status=host.querySelector('.radio-progress');if(status)status.textContent='Проверяем длительность: '+done+' из '+total+'.';}}});
   if(!current()||!isOwner())return;
   const result=selectRadioProgram(tracks);
   if(!result.tracks.length){notice='Не удалось прочитать длительность записей. Проверьте интернет и повторите.';}
   else if(new Set(result.tracks.map(x=>x.reciter)).size<2){notice='Доступен только один голос. Повторите подбор с другими чтецами.';}
   else{program=result;notice=result.complete?'Программа готова к просмотру. Длительность получена из аудиозаписей.':'Не хватило доступных коротких записей на час. Показана фактическая длительность.';}
  }catch(error){if(current())notice=error.name==='AbortError'?'Подбор отменён.':'Не удалось подготовить программу.';}
  finally{busy=false;if(current())draw();}
 }
 draw();return dispose;
}
