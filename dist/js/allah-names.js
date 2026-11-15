import{uiMessage,uiLeaf,uiSet,uiRaw,uiSourceLeaf,uiHtml,uiNumberLeaf,watchPracticeUi}from './practice-i18n.js';
const NAMES_UI_KEYS=Object.freeze({"Об именах и источниках":"namesUi.aboutSources","Все имена":"namesUi.allNames","ИЗУЧАТЬ И ПОНИМАТЬ":"namesUi.eyebrow","Прекрасные имена Аллаха":"namesUi.title","Арабское написание, звучание в транскрипции и краткое значение.":"namesUi.intro","Тест · 5 вопросов":"namesUi.quizFive","Найти имя или значение":"namesUi.search","Например: Ар-Рахман":"namesUi.searchPlaceholder","Отметки повторения сохраняются на этом устройстве и входят в резервную копию.":"namesUi.deviceNote","повторено":"namesUi.reviewedSuffix","Ничего не найдено. Попробуйте другое имя или значение.":"namesUi.noResults","Изучайте вместе:":"namesUi.studyTogether","Предыдущее":"namesUi.previous","Следующее":"namesUi.next","КОРОТКАЯ ПРАКТИКА":"namesUi.shortPractice","Новый тест":"namesUi.newQuiz","Тест не меняет отметки повторения.":"namesUi.quizNote","ЗНАЧЕНИЕ ИМЕНИ":"namesUi.meaningEyebrow","Какое значение у этого имени?":"namesUi.question","Прогресс не удалось сохранить на этом устройстве.":"namesUi.saveFailed","Повторено ✓":"namesUi.reviewed","Повторил":"namesUi.review","Эти имена можно повторить:":"namesUi.missed","Все ответы верны. Можно пройти новый тест.":"namesUi.perfect","Результат":"namesUi.result","Продолжить":"namesUi.continue","Далее":"namesUi.nextQuestion","Верно.":"namesUi.correct","Верный ответ:":"namesUi.correctAnswer","Повторённые имена":"namesUi.reviewedLabel","Карточки имён":"namesUi.cards","Знания":"nav.knowledge"});
import{esc,toast}from './ui.js';
import{read,write}from './storage.js';
import{ALLAH_NAMES,NAMES_COUNT,NAMES_PROGRESS_KEY,nameById,normalizeNamesProgress,reviewName,findNames,createNamesQuiz}from './allah-names-core.js';
const overviewHash='#knowledge?view=names';
const glyph=s=>"<span class=\"names-arabic\" translate=\"no\" lang=\"ar\" dir=\"rtl\">"+esc(s)+"</span>";
const source=n=>"<a class=\"names-source\" lang=\"ru\" translate=\"no\" target=\"_blank\" rel=\"noopener\" href=\""+esc(n.source.url)+"\">"+esc(n.source.label)+"</a>";
const back=(href,label)=>"<a class=\"names-back\" href=\""+href+"\"><img src=\"./assets/arrow-left.svg\" alt=\"\">"+uiSourceLeaf(label,NAMES_UI_KEYS)+"</a>";
const studyHash=id=>overviewHash+'&name='+id;
const note="<details class=\"names-notes\"><summary data-i18n=\"namesUi.aboutSources\">Об именах и источниках</summary><p lang=\"ru\" translate=\"no\">Это учебная подборка 99 имён из Корана и Сунны. Имена Аллаха не ограничиваются этим перечнем. Достоверный хадис о 99 именах не перечисляет их по отдельности; у учёных есть разные подборки.</p><p lang=\"ru\" translate=\"no\">Арабские имена сверены с Кораном и перечнем в книге Ибн Усаймина «Аль-Каваид аль-мусля». Для двух имён, по которым автор оговорил сомнение, взяты составные имена из Корана: Малик аль-Мульк (3:26) и Зу-ль-Джаляли уа-ль-Икрам (55:27).</p><p lang=\"ru\" translate=\"no\">Краткие значения помогают учиться, но не исчерпывают смысл имён. Транскрипция передаёт звучание приблизительно. «Аль-Кабид» и «Аль-Басыт», «Аль-Мукаддим» и «Аль-Му’аххир» изучаются как пары.</p><a class=\"names-source\" lang=\"ru\" translate=\"no\" href=\"https://sunnah.com/bukhari:7392\" target=\"_blank\" rel=\"noopener\">Аль-Бухари · 7392</a><a class=\"names-source\" lang=\"ru\" translate=\"no\" href=\"https://www.islamarchive.cc/ketab_content/6215/p-19\" target=\"_blank\" rel=\"noopener\">«Аль-Каваид аль-мусля» · перечень и пояснения</a></details>";
const pairs={qabid:'basit',basit:'qabid',muqaddim:'muakhkhir',muakhkhir:'muqaddim'};
export function showAllahNames(host,{hash=globalThis.location?.hash||overviewHash}={}){
 let stopLanguage=()=>{};function paint(html){stopLanguage();host.innerHTML=uiHtml(html);stopLanguage=watchPracticeUi(host.firstElementChild);}
 let progress=normalizeNamesProgress(read(NAMES_PROGRESS_KEY,null)),quiz=null;
 const requested=nameById(new URLSearchParams(hash.split('?')[1]||'').get('name'));
 function save(value){progress=value;if(!write(NAMES_PROGRESS_KEY,value))toast(uiMessage('namesUi.saveFailed','Прогресс не удалось сохранить на этом устройстве.'));}
 function top(){window.scrollTo({top:0,behavior:'instant'});}
 function focusHeading(){top();host.querySelector('[data-names-heading]')?.focus({preventScroll:true});}
 function bindBack(){
  const link=host.querySelector('[data-names-home]');
  if(link)link.onclick=e=>{
   if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
   if(location.hash===overviewHash){e.preventDefault();quiz=null;overview();focusHeading();}
  };
 }
 function homeBack(){return back(overviewHash,'Все имена').replace("<a ","<a data-names-home ");}
 function overview(){
  paint("<section class=\"names-page\" aria-labelledby=\"names-title\">"+back('#knowledge','Знания')+"<div class=\"names-heading\"><span class=\"names-eyebrow\" data-i18n=\"namesUi.eyebrow\">ИЗУЧАТЬ И ПОНИМАТЬ</span><h1 id=\"names-title\" tabindex=\"-1\" data-names-heading data-i18n=\"namesUi.title\">Прекрасные имена Аллаха</h1><p data-i18n=\"namesUi.intro\">Арабское написание, звучание в транскрипции и краткое значение.</p></div><div class=\"names-overview-actions\"><span class=\"names-count\">"+uiLeaf('namesUi.reviewProgress','Повторено {done} из {total}',{done:progress.reviewed.length,total:NAMES_COUNT})+"</span><button class=\"button\" type=\"button\" data-names-quiz data-i18n=\"namesUi.quizFive\">Тест · 5 вопросов</button></div><progress class=\"names-progress\" max=\""+NAMES_COUNT+'" value="'+progress.reviewed.length+"\" aria-label=\"Повторённые имена\"></progress>"+(progress.last?"<a class=\"names-resume\" href=\""+studyHash(progress.last)+"\">"+uiLeaf('namesUi.continue','Продолжить')+" · <span lang=\"ru\" translate=\"no\">"+esc(nameById(progress.last).name)+"</span>"+"<span aria-hidden=\"true\"> →</span></a>":'')+"<label class=\"names-search\"><span data-i18n=\"namesUi.search\">Найти имя или значение</span><input type=\"search\" dir=\"auto\" data-names-search placeholder=\"Например: Ар-Рахман\" data-i18n-placeholder=\"namesUi.searchPlaceholder\" autocomplete=\"off\" maxlength=\"120\" aria-controls=\"names-list\"></label><p class=\"names-search-status\" role=\"status\" aria-live=\"polite\"></p><div id=\"names-list\" class=\"names-grid\"></div>"+note+"<p class=\"names-device-note\" data-i18n=\"namesUi.deviceNote\">Отметки повторения сохраняются на этом устройстве и входят в резервную копию.</p></section>");
  const input=host.querySelector('[data-names-search]'),list=host.querySelector('#names-list'),status=host.querySelector('.names-search-status');
  function drawList(){
   const names=findNames(input.value);
   list.innerHTML=uiHtml(names.length?names.map(n=>"<a class=\"names-tile "+(progress.reviewed.includes(n.id)?'is-reviewed':'')+'" href="'+studyHash(n.id)+"\"><span class=\"names-tile-number\">"+(n.index+1)+(progress.reviewed.includes(n.id)?"<span class=\"names-reviewed-label\"> · "+uiLeaf('namesUi.reviewedSuffix','повторено')+"</span>":'')+"</span>"+glyph(n.arabic)+"<strong lang=\"ru\" translate=\"no\">"+esc(n.name)+"</strong><small lang=\"ru\" translate=\"no\">"+esc(n.meaning)+"</small></a>").join(''):"<p class=\"names-empty\" data-i18n=\"namesUi.noResults\">Ничего не найдено. Попробуйте другое имя или значение.</p>");
   input.value?uiSet(status,'namesUi.found','Найдено: {count}',{count:names.length}):uiRaw(status,'');
  }
  input.oninput=drawList;drawList();
  host.querySelector('[data-names-quiz]').onclick=()=>startQuiz();top();
 }
 function study(n){
  if(progress.last!==n.id)save({...progress,last:n.id});
  const reviewed=progress.reviewed.includes(n.id),pair=nameById(pairs[n.id]);
  paint("<section class=\"names-page\" aria-labelledby=\"names-study-title\">"+homeBack()+"<div class=\"names-study\"><span class=\"names-eyebrow\">"+uiLeaf('namesUi.namePosition','ИМЯ {index} ИЗ {total}',{index:n.index+1,total:NAMES_COUNT})+"</span>"+glyph(n.arabic)+"<h1 id=\"names-study-title\" tabindex=\"-1\" data-names-heading lang=\"ru\" translate=\"no\">"+esc(n.name)+"</h1><p class=\"names-meaning\" lang=\"ru\" translate=\"no\">"+esc(n.meaning)+"</p>"+source(n)+(pair?"<p class=\"names-pair\"><span data-i18n=\"namesUi.studyTogether\">Изучайте вместе:</span> <a href=\""+studyHash(pair.id)+"\">"+'<span lang="ru" translate="no">'+esc(pair.name)+' — '+esc(pair.meaning.toLowerCase())+'</span>'+"</a>.</p>":'')+"<div class=\"names-study-actions\"><button class=\"button secondary\" type=\"button\" data-names-review aria-pressed=\""+reviewed+"\">"+uiSourceLeaf(reviewed?'Повторено ✓':'Повторил',NAMES_UI_KEYS)+"</button><button class=\"button\" type=\"button\" data-names-quiz data-i18n=\"namesUi.quizFive\">Тест · 5 вопросов</button></div></div><nav class=\"names-navigation\" aria-label=\"Карточки имён\" data-i18n-aria-label=\"namesUi.cards\"><button type=\"button\" data-names-prev "+(n.index===0?'disabled':'')+"><span data-i18n=\"namesUi.previous\">Предыдущее</span></button><span>"+(n.index+1)+' / '+NAMES_COUNT+"</span><button type=\"button\" data-names-next "+(n.index===NAMES_COUNT-1?'disabled':'')+"><span data-i18n=\"namesUi.next\">Следующее</span></button></nav>"+note+"</section>");
  host.querySelector('[data-names-review]').onclick=()=>{save(reviewName(progress,n.id));study(n);host.querySelector('[data-names-review]').focus({preventScroll:true});};
  for(const[selector,offset]of[['[data-names-prev]',-1],['[data-names-next]',1]]){
   host.querySelector(selector).onclick=()=>{const next=ALLAH_NAMES[n.index+offset];if(next)location.hash=studyHash(next.id);};
  }
  host.querySelector('[data-names-quiz]').onclick=()=>startQuiz(n.id);bindBack();
 }
 function startQuiz(start=null){
  quiz={questions:createNamesQuiz(progress,{start}),index:0,score:0,answered:false,missed:[],start};drawQuiz();
 }
 function drawQuiz(){
  const q=quiz.questions[quiz.index];
  if(!q){
   paint("<section class=\"names-page\">"+homeBack()+"<div class=\"names-result\"><span class=\"names-eyebrow\" data-i18n=\"namesUi.shortPractice\">КОРОТКАЯ ПРАКТИКА</span><h1 tabindex=\"-1\" data-names-heading>"+uiLeaf('namesUi.score','Верно {score} из {total}',{score:quiz.score,total:quiz.questions.length})+"</h1><p>"+uiSourceLeaf(quiz.missed.length?'Эти имена можно повторить:':'Все ответы верны. Можно пройти новый тест.',NAMES_UI_KEYS)+"</p>"+(quiz.missed.length?"<ul>"+quiz.missed.map(n=>"<li><a href=\""+studyHash(n.id)+"\">"+esc(n.name)+"</a><span lang=\"ru\" translate=\"no\">"+esc(n.meaning)+"</span></li>").join('')+"</ul>":'')+"<button class=\"button\" type=\"button\" data-names-again data-i18n=\"namesUi.newQuiz\">Новый тест</button><p class=\"names-device-note\" data-i18n=\"namesUi.quizNote\">Тест не меняет отметки повторения.</p></div></section>");
   host.querySelector('[data-names-again]').onclick=()=>startQuiz(quiz.start);bindBack();focusHeading();return;
  }
  quiz.answered=false;
  paint("<section class=\"names-page\">"+homeBack()+"<div class=\"names-quiz\"><div class=\"names-quiz-top\"><span class=\"names-eyebrow\" data-i18n=\"namesUi.meaningEyebrow\">ЗНАЧЕНИЕ ИМЕНИ</span><span class=\"names-count\">"+(quiz.index+1)+' / '+quiz.questions.length+"</span></div><h1 tabindex=\"-1\" data-names-heading data-i18n=\"namesUi.question\">Какое значение у этого имени?</h1>"+glyph(q.target.arabic)+"<p class=\"names-question-name\" lang=\"ru\" translate=\"no\">"+esc(q.target.name)+"</p><div class=\"names-choices\">"+q.choices.map(c=>"<button type=\"button\" data-names-answer=\""+c.id+"\" lang=\"ru\" translate=\"no\">"+esc(c.meaning)+"</button>").join('')+"</div><div class=\"names-feedback\" role=\"status\" aria-live=\"polite\" aria-atomic=\"true\"></div><button class=\"button\" type=\"button\" data-names-question-next hidden>"+uiSourceLeaf(quiz.index===quiz.questions.length-1?'Результат':'Далее',NAMES_UI_KEYS)+"</button></div></section>");
  host.querySelectorAll('[data-names-answer]').forEach(button=>button.onclick=()=>{
   if(quiz.answered)return;quiz.answered=true;
   const correct=button.dataset.namesAnswer===q.target.id;if(correct)quiz.score++;else quiz.missed.push(q.target);
   button.classList.add(correct?'is-correct':'is-wrong');
   host.querySelector('[data-names-answer="'+q.target.id+'"]').classList.add('is-correct');
   host.querySelectorAll('[data-names-answer]').forEach(b=>b.disabled=true);
   host.querySelector('.names-feedback').innerHTML=uiHtml("<p>"+uiSourceLeaf(correct?'Верно.':'Верный ответ:',NAMES_UI_KEYS)+" <span lang=\"ru\" translate=\"no\">"+esc(q.target.name)+' — '+esc(q.target.meaning)+".</span></p>"+source(q.target));
   host.querySelector('[data-names-question-next]').hidden=false;
  });
  host.querySelector('[data-names-question-next]').onclick=()=>{if(!quiz.answered)return;quiz.index++;drawQuiz();};
  bindBack();focusHeading();
 }
 if(requested)study(requested);else overview();
}
