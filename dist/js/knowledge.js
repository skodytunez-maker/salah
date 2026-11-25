import{uiAttrs,uiLeaf,watchPracticeUi}from './practice-i18n.js';
import{mountLearningCabinetLink}from './learning-cabinet-link.js';
import{mountOwnerLearningPreview,stopOwnerLearningPreview,canContinueOwnerPreview,preloadOwnerLearning}from './owner-learning-frame.js';
import{teamPreviewActor,teamPreviewVerified as ownerVerified}from './team-preview-access.js';
import{ownerLearningPreview}from './owner-learning-links.js';
import{UPCOMING_KNOWLEDGE}from './knowledge-upcoming.js';
import{showArabicAlphabet}from './arabic-alphabet.js';
import{showAllahNames}from './allah-names.js';
import{actionIcon,actionLabel}from './action-icons.js';
import{read}from './storage.js';
import{savedLesson,courseName,courseLength}from './learning-state.js';
let stopKnowledgeLanguage=()=>{};
const cardKey=(id,field)=>'knowledgeUi.cards.'+id.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())+'.'+field;
const resumeTitleKey=kind=>['basic','wudu'].includes(kind)?cardKey(kind,'title'):'home.'+kind;
const entries = [
  {kind:'names',icon:'knowledge-names',title:'Имена Аллаха',description:'Арабское написание, краткие значения и тест для повторения.',detail:'99 имён',action:'Изучать имена',href:'#knowledge?view=names'},
  {kind:'alphabet',icon:'knowledge-alphabet',title:'Арабский алфавит',description:'28 букв и их формы в начале, середине и конце слова.',detail:'28 букв',action:'Изучить буквы',href:'#knowledge?view=alphabet'},
  {kind:'umrah',icon:'knowledge-umrah',title:'Умра',description:'История, порядок обрядов и памятка паломника.',detail:'10 шагов',action:'Изучить Умру',href:'#umrah'},
  {
    kind: 'basic',
    icon: 'knowledge-prayer',
    title: 'Основы намаза',
    description: 'Порядок, движения и тексты.',
    detail: '17 шагов',
    action: 'Начать обучение'
  },
  {
    kind: 'wudu',
    icon: 'knowledge-wudu',
    title: 'Омовение',
    description: 'Последовательность действий перед намазом.',
    detail: '10 шагов',
    action: 'Изучить порядок'
  },
  {
    kind: 'guide',
    icon: 'knowledge-prayer-steps',
    title: 'Намаз шаг за шагом',
    description: 'Выберите одну из пяти обязательных молитв.',
    detail: '5 молитв',
    action: 'Выбрать молитву'
  },
  {kind:'sahaba',icon:'knowledge-sahaba',title:'SAHABA',description:'Истории сподвижников Пророка ﷺ.',detail:'Истории',action:'Читать истории',href:'https://sahaba-learning.skodytunez.chatgpt.site',external:true}
];

export function showKnowledge(container, { onStart,hash=globalThis.location?.hash||'',ownerAccess=ownerVerified(),learningUserId=null,mountCabinetLink=mountLearningCabinetLink } = {}) {
  const routeParams=new URLSearchParams(hash.split('?')[1]||'');
  const featureView=routeParams.get('view');
  const preview=routeParams.get('preview')||(['online-lessons','muallim','live-stream','teacher-preview'].includes(featureView)?featureView:null);
  if(preview&&(ownerAccess||canContinueOwnerPreview())&&mountOwnerLearningPreview(container,preview))return;
  stopOwnerLearningPreview();
  if(ownerAccess)preloadOwnerLearning();
  const view=new URLSearchParams(hash.split('?')[1]||'').get('view');
  if(view!=='names')delete container.dataset.namesHash;
  if(view==='names'){stopKnowledgeLanguage();stopKnowledgeLanguage=()=>{};delete container.dataset.alphabetHash;if(container.dataset.namesHash!==hash||!container.querySelector('.names-page')){showAllahNames(container,{hash});container.dataset.namesHash=hash;}return;}
  if(view==='alphabet'){stopKnowledgeLanguage();stopKnowledgeLanguage=()=>{};if(container.dataset.alphabetHash!==hash||!container.querySelector('.alphabet-page')){showArabicAlphabet(container,{hash});container.dataset.alphabetHash=hash;}return;}
  delete container.dataset.alphabetHash;
  const saved=savedLesson(read('learning-progress',null));
  // Temporary iPhone reproduction test for the verified owner.
  const hideSahabaForTrial=globalThis.navigator?.standalone===true&&teamPreviewActor()?.owner===true;
  const catalogKey=JSON.stringify([learningUserId,ownerAccess,saved,hideSahabaForTrial]);
  // Status/owner refreshes must not replace the current catalog with a loader.
  if(container.querySelector('.knowledge-page')?.dataset.catalogKey===catalogKey)return;
  container.innerHTML = `<section class="knowledge-page" aria-labelledby="knowledge-title"${learningUserId?' aria-busy="true"':''}>
    <div class="page-head knowledge-head">
      <div>
        <span class="knowledge-eyebrow" data-i18n="knowledgeUi.eyebrow">УЧИТЬСЯ И ПОВТОРЯТЬ</span>
        <h1 id="knowledge-title" data-i18n="nav.knowledge">Знания</h1>
        <p class="knowledge-intro" data-i18n="knowledgeUi.intro">В своём темпе. По одному шагу.</p>
      </div>
    </div>
    ${learningUserId?'<p class="muted knowledge-access-status" role="status" data-learning-access-status data-i18n="knowledgeUi.loading">Открываем знания…</p>':''}
    <div data-knowledge-content${learningUserId?' hidden':''}>
    ${saved?`<a class="knowledge-resume" href="#learning" data-learning-entry="resume"><span class="knowledge-eyebrow" data-i18n="knowledgeUi.resume">ПРОДОЛЖИТЬ ОБУЧЕНИЕ</span><strong${uiAttrs(resumeTitleKey(saved.kind))}>${courseName(saved.kind)}</strong><span class="knowledge-resume-detail"${uiAttrs('knowledgeUi.stepOf',{step:saved.index+1,total:courseLength(saved.kind)})}>Шаг ${saved.index+1} из ${courseLength(saved.kind)}</span><span class="knowledge-resume-track" aria-hidden="true"><span style="width:${(saved.index+1)/courseLength(saved.kind)*100}%"></span></span></a>`:''}
    <div class="knowledge-cards">
      ${entries.filter(entry=>!hideSahabaForTrial||entry.kind!=='sahaba').map(entry => `<a class="knowledge-card" href="${entry.href||'#learning'}" ${entry.href?'':'data-learning-entry="'+entry.kind+'"'} ${entry.external?'target="_blank" rel="noopener noreferrer"':''}>
        <div class="knowledge-card-top">
          <span class="knowledge-icon" aria-hidden="true"><span class="knowledge-symbol knowledge-symbol-${entry.icon}"></span></span>
          <span class="knowledge-detail"${uiAttrs(cardKey(entry.kind,'detail'))}>${entry.detail}</span>
        </div>
        <h2${uiAttrs(cardKey(entry.kind,'title'))}>${entry.title}</h2>
        <p${uiAttrs(cardKey(entry.kind||entry.id,'description'))}>${entry.description}</p>
        <span class="knowledge-action">${uiLeaf(cardKey(entry.kind,'action'),entry.action)}${actionIcon('next')}</span>
      </a>`).join('')}
      ${ownerAccess?'<a class="knowledge-card knowledge-owner-preview" href="#knowledge?view=teacher-preview"><div class="knowledge-card-top"><span class="knowledge-icon" aria-hidden="true"><span class="knowledge-symbol knowledge-symbol-knowledge-online"></span></span><span class="knowledge-detail" data-i18n="knowledgeUi.previewDetail">Учебный пример</span></div><h2 data-i18n="knowledgeUi.teacherTitle">Кабинет преподавателя</h2><p data-i18n="knowledgeUi.teacherDescription">Расписание, учебная группа, задания и пример обратной связи.</p><span class="knowledge-action">'+uiLeaf('knowledgeUi.teacherAction','Познакомиться с кабинетом')+''+actionIcon('next')+'</span></a>':'<h2 class="knowledge-coming-title" data-i18n="knowledgeUi.comingTitle">Скоро в SALAH</h2>'}
      ${UPCOMING_KNOWLEDGE.map(entry => {const route=ownerLearningPreview(entry.id,ownerAccess);return route?`<a class="knowledge-card knowledge-owner-preview" data-upcoming="${entry.id}" href="${route.href}" aria-labelledby="upcoming-${entry.id}">
        <div class="knowledge-card-top"><span class="knowledge-icon" aria-hidden="true"><span class="knowledge-symbol knowledge-symbol-${entry.icon}"></span></span><span class="knowledge-detail"${uiAttrs(cardKey(entry.id,'previewDetail'))}>${route.detail}</span></div>
        <h2 id="upcoming-${entry.id}"${uiAttrs(cardKey(entry.id,'title'))}>${entry.title}</h2><p${uiAttrs(cardKey(entry.kind||entry.id,'description'))}>${entry.description}</p>
        <span class="knowledge-action">${uiLeaf(cardKey(entry.id,'previewAction'),route.label)}${actionIcon('next')}</span>
      </a>`:`<article class="knowledge-card knowledge-card-coming" data-upcoming="${entry.id}" aria-labelledby="upcoming-${entry.id}">
        <div class="knowledge-card-top"><span class="knowledge-icon" aria-hidden="true"><span class="knowledge-symbol knowledge-symbol-${entry.icon}"></span></span><span class="knowledge-detail" data-i18n="knowledgeUi.preparing">Готовим для вас</span></div>
        <h2 id="upcoming-${entry.id}"${uiAttrs(cardKey(entry.id,'title'))}>${entry.title}</h2><p id="upcoming-${entry.id}-description"${uiAttrs(cardKey(entry.id,'description'))}>${entry.description}</p>
        <button class="button knowledge-coming-button" type="button" disabled aria-describedby="upcoming-${entry.id}-description" data-i18n="knowledgeUi.soon">Скоро</button>
      </article>`;}).join('')}


    </div>
    </div>
  </section>`;
  const page=container.querySelector('.knowledge-page');
  stopKnowledgeLanguage();stopKnowledgeLanguage=watchPracticeUi(page);
  page.dataset.learningUser=learningUserId||'';
  page.dataset.catalogKey=catalogKey;
  if(learningUserId)void mountCabinetLink(page,{userId:learningUserId,isActive:()=>page.isConnected&&container.querySelector('.knowledge-page')===page});
  if (typeof onStart === 'function') {
    container.querySelectorAll('[data-learning-entry]').forEach(link => {
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onStart(link.dataset.learningEntry);
      });
    });
  }
}
