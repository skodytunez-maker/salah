import{RADIO_VOICES,radioCandidateBatch,measureRadioTrack}from './radio-candidates.js';
import{teamPreviewVerified as ownerVerified,teamPreviewRadioHint,verifyTeamPreviewAccess as verifyOwner,onTeamPreviewChange as onOwnerChange}from './team-preview-access.js';
import{loadIndex,audioUrl}from './quran-data.js';
import{reciterInfo,reciterHasSurah}from './quran-reciters.js';
import{reciterRecording}from './quran-reciter-recording.js';
import{quranPlayback}from './quran-session.js';
import{reciterImageUrl}from './approved-catalog.js';
import{esc,setUiMessage,uiLeaf}from './ui.js';
import{subscribeLanguage,translateUi}from './i18n.js';
import{teamLeaf,teamAttr,teamMessage,teamMarkup}from './team-ui.js';
import{shuffleRadio,selectRadioProgram,measureRadioCandidates,probeRadioDuration}from './radio-program-core.js';
import{radioQuizQuestions,initialRadioQuiz,stepRadioQuiz}from './radio-quiz-core.js';
const VOICES=RADIO_VOICES;
const TABS=[['air',teamLeaf('air')],['program',teamLeaf('program')],['quiz',teamLeaf('quiz')]];
export const radioBeacon=()=>'<svg viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="14" cy="14" r="2.5" fill="currentColor" stroke="none"/><path d="M8.5 8.5a7.8 7.8 0 0 0 0 11m11-11a7.8 7.8 0 0 1 0 11M5 5a12.7 12.7 0 0 0 0 18M23 5a12.7 12.7 0 0 1 0 18"/></svg>';
export function mountHomeRadioEntry(host){
 if(!host)return()=>{};
 const draw=()=>{
  const verified=ownerVerified(),visible=verified||teamPreviewRadioHint();
  host.hidden=!visible;
  if(!visible){host.replaceChildren();return;}
  if(!host.firstElementChild)host.innerHTML='<a class="home-radio-beacon" '+teamAttr('radioTitle',{},'aria-label')+'>'+radioBeacon()+'<span>'+teamLeaf('radio')+'</span></a>';
  const entry=host.firstElementChild;
  if(verified){entry.href='#radio';entry.removeAttribute('aria-disabled');}
  else{entry.removeAttribute('href');entry.setAttribute('aria-disabled','true');}
 };
 draw();translateUi(host);const off=onOwnerChange(draw),stopLocale=subscribeLanguage(()=>translateUi(host)),timer=setInterval(draw,15000);
 return()=>{stopLocale();off();clearInterval(timer);host.innerHTML='';host.hidden=true;};
}
let activeDispose=null;
export function stopRadioPreview(){activeDispose?.();activeDispose=null;}
export async function showRadioPreview(host,{verify=()=>verifyOwner({verifySession:true}),isOwner=ownerVerified,subscribe=onOwnerChange,load=loadIndex,probe=probeRadioDuration,play=(catalog,track)=>quranPlayback.start(reciterRecording(catalog,track.surah),track.reciter)}={}){
 stopRadioPreview();
 let alive=true,guard=null,controller=null,tab='air',catalog=null,questions=[],quiz=initialRadioQuiz(),program=null,busy=false,measured=0,total=0,notice='',root=null,voiceQuery='';
 let off=null;
 const selected=new Set(VOICES),durations=new Map(),dirty=new Set(['air','program','quiz']);
 const current=()=>alive&&host.isConnected;
 const stopLocale=subscribeLanguage(()=>{if(current())translateUi(host);});
 const dispose=()=>{stopLocale();alive=false;clearInterval(guard);controller?.abort();off?.();root?.removeEventListener('click',onClick);root?.removeEventListener('change',onChange);root?.removeEventListener('keydown',onKey);root?.removeEventListener('input',onVoiceSearch);};
 activeDispose=dispose;
 const denied=message=>{controller?.abort();host.innerHTML='<section class="panel radio-private"><h1>'+teamLeaf('radioTitle')+'</h1><p>'+teamMarkup(message)+'</p><a href="#staff">'+teamLeaf('teamLogin')+'</a></section>';};
 host.innerHTML='<section class="panel radio-private"><p role="status">'+teamLeaf('opening')+'</p></section>';
 try{
  if(!await verify()||!isOwner()){if(current())denied(teamMessage('access'));return dispose;}
  if(!current())return dispose;
  off=subscribe(()=>{if(current()&&!isOwner()){dispose();denied(teamMessage('verifyAgain'));}});
  catalog=await load();if(!current()||!isOwner())return dispose;
  questions=radioQuizQuestions(catalog);
  guard=setInterval(()=>{if(current()&&!isOwner()){dispose();denied(teamMessage('verifyAgain'));}},5000);
 }catch{if(current())denied(teamMessage('openFailed'));return dispose;}
 const time=seconds=>{const s=Math.floor(seconds);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 const voiceName=id=>reciterInfo(id).name.replace(' · сура целиком','');
 const trackMarkup=(track,i)=>'<li><span class="radio-track-number">'+(i+1)+'</span><div><strong>'+esc(catalog.surahs[track.surah-1].name)+'</strong><small>'+esc(voiceName(track.reciter))+'</small></div><span dir="ltr">'+time(track.duration)+'</span><button type="button" class="radio-track-play" data-audition="'+i+'" '+teamAttr('listenSurah',{name:catalog.surahs[track.surah-1].name})+'>▷</button></li>';
 function airMarkup(){
  const cover=reciterInfo(program?.tracks[0]?.reciter||VOICES[0]);
  return '<article class="radio-air-card"><div class="radio-air-label">'+radioBeacon()+'<span>'+teamLeaf('readingProgram')+'</span></div><img class="radio-air-portrait" src="'+esc(reciterImageUrl(cover.portrait))+'" alt="'+esc(cover.name)+'"><h2>'+teamLeaf('quranRecitation')+'</h2><p>'+esc(voiceName(cover.id))+'</p><div class="radio-wave" aria-hidden="true">'+Array.from({length:17},(_,i)=>'<i style="--bar:'+((i*7)%11+5)+'"></i>').join('')+'</div><button type="button" class="button" data-open-program>'+teamLeaf('buildProgram')+'</button><small>'+teamLeaf('shortDifferent')+'</small></article><section class="panel radio-next"><span class="eyebrow">'+teamLeaf('quizBrand')+'</span><h2>'+teamLeaf('testKnowledge')+'</h2><p class="muted">'+teamLeaf('quizDescription')+'</p><button type="button" class="button secondary" data-open-quiz>'+teamLeaf('openQuiz')+'</button></section>';
 }
 const progressText=()=>busy?teamMessage('checking',{done:measured,total}):notice;
 function programMarkup(){
  return '<section class="panel radio-program"><div class="radio-program-heading"><span class="eyebrow">'+teamLeaf('yourProgram')+'</span><h2>'+teamLeaf('shortHour')+'</h2><p class="muted">'+teamLeaf('programDescription')+'</p></div><fieldset '+(busy?'disabled':'')+'><legend>'+teamLeaf('chooseReciters')+' · <span data-voice-count>'+teamLeaf('voiceCount',{count:selected.size,total:VOICES.length})+'</span></legend><div class="radio-voice-tools"><input type="search" data-voice-search '+teamAttr('searchRadio',{},'aria-label')+' '+teamAttr('findReciter',{},'placeholder')+' value="'+esc(voiceQuery)+'"><div><button type="button" data-voices="all">'+teamLeaf('selectAll')+'</button><button type="button" data-voices="none">'+teamLeaf('clearSelection')+'</button></div></div><div class="radio-voices">'+VOICES.map(id=>'<label class="radio-voice" '+(voiceQuery&&!voiceName(id).toLocaleLowerCase().includes(voiceQuery)?'hidden':'')+'><input type="checkbox" name="radio-voice" value="'+id+'" '+(selected.has(id)?'checked':'')+'><img src="'+esc(reciterImageUrl(reciterInfo(id).portrait))+'" alt="" width="42" height="42" loading="lazy" decoding="async"><span>'+esc(voiceName(id))+'</span></label>').join('')+'</div></fieldset><div class="radio-build-status" '+(!busy&&!notice?'hidden':'')+'><p role="status" aria-live="polite" class="radio-progress">'+teamMarkup(progressText())+'</p><progress data-radio-progress max="'+Math.max(1,total)+'" value="'+measured+'" '+teamAttr('checked',{},'aria-label')+' '+(busy?'':'hidden')+'></progress></div><div class="radio-program-actions"><button type="button" class="button radio-build-button" data-build aria-busy="'+busy+'" '+(busy?'disabled':'')+'>'+(busy?'<span class="radio-button-spinner" aria-hidden="true"></span>'+teamLeaf('building'):program?teamLeaf('reshuffle'):teamLeaf('buildHour'))+'</button>'+(busy?'<button type="button" class="button secondary" data-cancel>'+uiLeaf('common.cancel')+'</button>':'')+'</div>'+(program?'<div class="radio-program-summary"><strong dir="ltr">'+time(program.duration)+'</strong><span>'+teamLeaf('recordings',{count:program.tracks.length})+' · '+teamLeaf(program.complete?'aboutHour':'partialProgram')+'</span></div><ol class="radio-tracks">'+program.tracks.map(trackMarkup).join('')+'</ol><p class="radio-program-hint">'+teamLeaf('auditionHint')+'</p>':'')+'</section>';
 }
 function quizMarkup(){
  if(quiz.phase==='finished')return '<div class="radio-quiz-card"><span class="eyebrow">'+teamLeaf('quizResults')+'</span><h2>'+teamLeaf('thanks')+'</h2><p class="radio-quiz-result">'+quiz.scores[0]+' : '+quiz.scores[1]+'</p><button type="button" class="button secondary" data-quiz="reset">'+teamLeaf('restart')+'</button></div>';
  const q=questions[quiz.round],shown=quiz.phase!=='ready',review=['review','scored'].includes(quiz.phase);
  const description={ready:teamMessage('quizReady'),question:teamMessage('quizQuestion'),answers:teamMessage('quizAnswers'),locked:teamMessage('quizLocked',{number:quiz.first+1}),review:teamMessage('quizReview'),scored:teamMessage('quizScored')}[quiz.phase];
  return '<div class="radio-quiz-score"><span>'+teamLeaf('participant',{number:1})+' <b>'+quiz.scores[0]+'</b></span><span>'+teamLeaf('participant',{number:2})+' <b>'+quiz.scores[1]+'</b></span></div><div class="radio-quiz-card"><span class="eyebrow">'+teamLeaf('questionProgress',{number:quiz.round+1,total:5})+'</span><h2>'+(shown?'<span lang="ru" dir="ltr" translate="no">'+esc(q.text)+'</span>':teamLeaf('readyStart'))+'</h2><p class="muted">'+teamMarkup(description)+'</p>'+
  (quiz.phase==='ready'?'<button type="button" class="button" data-quiz="show">'+teamLeaf('showQuestion')+'</button>':'')+
  (quiz.phase==='question'?'<button type="button" class="button" data-quiz="open">'+teamLeaf('openAnswers')+'</button>':'')+
  (quiz.phase==='answers'?'<div class="radio-quiz-actions"><button type="button" class="button" data-buzz="0">'+teamLeaf('participant',{number:1})+'</button><button type="button" class="button secondary" data-buzz="1">'+teamLeaf('participant',{number:2})+'</button></div>':'')+
  (quiz.phase==='locked'?'<button type="button" class="button" data-quiz="reveal">'+teamLeaf('revealAnswer')+'</button>':'')+
  (review?'<div class="radio-quiz-answer" lang="ru" dir="ltr" translate="no"><strong>'+esc(q.answer)+'</strong><small>'+esc(q.source)+'</small></div>':'')+
  (quiz.phase==='review'?'<div class="radio-quiz-actions"><button type="button" class="button" data-judge="yes">'+teamLeaf('correct')+'</button><button type="button" class="button secondary" data-judge="no">'+teamLeaf('incorrect')+'</button></div>':'')+
  (quiz.phase==='scored'?'<button type="button" class="button" data-quiz="next">'+teamLeaf(quiz.round===4?'results':'nextQuestion')+'</button>':'')+'</div>';
 }
 function draw(){
  if(!current())return;
  if(!isOwner()){dispose();denied(teamMessage('verifyAgain'));return;}
  if(!root){
   host.innerHTML='<section class="radio-preview"><a class="radio-back" href="#home">'+teamLeaf('backHome')+'</a><header class="radio-header"><div class="radio-brand"><span class="radio-brand-mark" aria-hidden="true">'+radioBeacon()+'</span><h1>'+teamLeaf('radio')+' <span>SALAH</span></h1></div><p class="radio-subtitle">'+teamLeaf('radioSubtitle')+'</p></header><nav class="radio-tabs" role="tablist" '+teamAttr('radioSections',{},'aria-label')+'>'+TABS.map(([key,label])=>'<button type="button" role="tab" id="radio-tab-'+key+'" data-radio-tab="'+key+'" aria-controls="radio-pane-'+key+'" aria-selected="'+(tab===key)+'" aria-pressed="'+(tab===key)+'" tabindex="'+(tab===key?'0':'-1')+'">'+label+'</button>').join('')+'</nav><div class="radio-pages">'+TABS.map(([key])=>'<div id="radio-pane-'+key+'" role="tabpanel" aria-labelledby="radio-tab-'+key+'" '+(tab===key?'':'hidden')+'></div>').join('')+'</div></section>';
   root=host.querySelector('.radio-preview');root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('keydown',onKey);root.addEventListener('input',onVoiceSearch);
  }
  // Keep the header, tabs and visited panes mounted. No reveal animation or
  // re-parsing the whole page on a tab tap; form choices and focus survive.
  for(const[key]of TABS){const active=tab===key,button=root.querySelector('[data-radio-tab="'+key+'"]'),pane=root.querySelector('#radio-pane-'+key);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;pane.hidden=!active;if(active&&dirty.has(key)){pane.innerHTML=key==='air'?airMarkup():key==='program'?programMarkup():quizMarkup();dirty.delete(key);}}
  if(tab==='program'&&busy)updateProgress();translateUi(host);
 }
 function updateProgress(){
  if(!current()||!root)return;const status=root.querySelector('.radio-progress'),bar=root.querySelector('[data-radio-progress]');
  if(status)setUiMessage(status,progressText());if(bar){bar.max=Math.max(1,total);bar.value=measured;}
 }
 function switchTab(next){if(!TABS.some(([key])=>key===next)||tab===next)return;tab=next;draw();}
 function reflectVoices(){const count=root.querySelector('[data-voice-count]');if(count)setUiMessage(count,teamMessage('voiceCount',{count:selected.size,total:VOICES.length}));for(const input of root.querySelectorAll('[name="radio-voice"]'))input.checked=selected.has(input.value);}
 function onVoiceSearch(event){if(!event.target.matches('[data-voice-search]'))return;voiceQuery=event.target.value.trim().toLocaleLowerCase();for(const row of root.querySelectorAll('.radio-voice'))row.hidden=!!voiceQuery&&!row.textContent.toLocaleLowerCase().includes(voiceQuery);}
 function onChange(event){const input=event.target;if(!busy&&input?.matches('[name="radio-voice"]')&&VOICES.includes(input.value)){if(input.checked)selected.add(input.value);else selected.delete(input.value);reflectVoices();}}
 function onKey(event){const button=event.target.closest?.('[data-radio-tab]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=TABS.findIndex(([key])=>key===tab),next=event.key==='Home'?0:event.key==='End'?TABS.length-1:(index+(event.key==='ArrowRight'?1:-1)+TABS.length)%TABS.length;switchTab(TABS[next][0]);root.querySelector('[data-radio-tab="'+tab+'"]').focus({preventScroll:true});}
 function onClick(event){
  const button=event.target.closest?.('button');if(!button||button.disabled)return;
  if(button.hasAttribute('data-radio-tab')){switchTab(button.dataset.radioTab);return;}
  if(button.hasAttribute('data-open-program')){switchTab('program');return;}
  if(button.hasAttribute('data-open-quiz')){switchTab('quiz');return;}
  if(button.hasAttribute('data-voices')){if(busy)return;selected.clear();if(button.dataset.voices==='all')for(const id of VOICES)selected.add(id);reflectVoices();return;}
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
  button.disabled=true;try{await play(catalog,track);}catch{if(current()){notice=teamMessage('auditionFailed');dirty.add('program');draw();}}finally{if(button.isConnected)button.disabled=false;}
 }
 async function build(){
  if(busy)return;if(!isOwner()){draw();return;}
  if(selected.size<2){notice=teamMessage('twoReciters');dirty.add('program');draw();return;}
  busy=true;measured=0;notice='';controller=new AbortController();const signal=controller.signal;
  const candidates=radioCandidateBatch(catalog,selected);
  total=candidates.length;dirty.add('program');draw();
  try{
   const tracks=await measureRadioCandidates(candidates,{signal,minimumCandidates:selected.size,targetDuration:5400,measure:(track,abort)=>measureRadioTrack(track,{probe,signal:abort,cache:durations}),onProgress:done=>{measured=done;updateProgress();}});
   if(!current()||!isOwner())return;
   const result=selectRadioProgram(tracks);
   if(!result.tracks.length)notice=teamMessage('checkFailed');
   else if(new Set(result.tracks.map(x=>x.reciter)).size<2)notice=teamMessage('oneVoice');
   else{program=result;dirty.add('air');notice=result.complete?teamMessage('programReady'):teamMessage('programShort');}
  }catch(error){if(current())notice=error.name==='AbortError'?teamMessage('cancelled'):teamMessage('prepareFailed');}
  finally{busy=false;dirty.add('program');if(current())draw();}
 }
 draw();return dispose;
}
