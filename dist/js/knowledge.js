import{uiAttrs,uiLeaf,uiSet,watchPracticeUi}from './practice-i18n.js';
import{mountLearningCabinetLink}from './learning-cabinet-link.js';
import{mountOwnerLearningPreview,stopOwnerLearningPreview,canContinueOwnerPreview,preloadOwnerLearning}from './owner-learning-frame.js';
import{teamPreviewVerified as ownerVerified,teamPreviewKnowledgeHint,verifyTeamPreviewAccess}from './team-preview-access.js';
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
  {kind:'faith',icon:'knowledge-faith',title:'Основы веры',description:'Короткие объяснения пяти столпов ислама и шести столпов имана.',detail:'Ислам и иман',action:'Изучить',href:'#knowledge?view=faith'},
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

const faithGroups=[
  ['islam',['shahada','salah','zakat','fasting','hajj']],
  ['iman',['allah','angels','scriptures','messengers','lastDay','decree']]
];

function showFaithFoundations(container) {
  if(container.querySelector('.faith-page'))return;
  stopKnowledgeLanguage();
  container.innerHTML=`<section class="faith-page" aria-labelledby="faith-title">
    <a class="faith-back" href="#knowledge">${uiLeaf('nav.knowledge','Знания')}</a>
    <div class="page-head faith-heading">
      <h1 id="faith-title" tabindex="-1">${uiLeaf('knowledgeUi.cards.faith.title','Основы веры')}</h1>
    </div>
    ${faithGroups.map(([group,pillars])=>`<section class="faith-group" aria-labelledby="faith-${group}">
      <h2 id="faith-${group}">${uiLeaf('faithUi.'+group,'')}</h2>
      <ol>
        ${pillars.map(pillar=>`<li>
          <h3>${uiLeaf('faithUi.'+pillar+'.title','')}</h3>
          <p>${uiLeaf('faithUi.'+pillar+'.description','')}</p>
        </li>`).join('')}
      </ol>
    </section>`).join('')}
    <a class="faith-source" href="https://sunnah.com/muslim:8a" target="_blank" rel="noopener noreferrer">${uiLeaf('faithUi.source','Хадис Джибриля · Сахих Муслим 8a')}</a>
  </section>`;
  const page=container.querySelector('.faith-page');
  stopKnowledgeLanguage=watchPracticeUi(page);
  page.querySelector('h1').focus({preventScroll:true});
}

function showKnowledgeAccessStatus(container,preview) {
  if(container.querySelector('[data-knowledge-access-preview]')?.dataset.knowledgeAccessPreview===preview)return;
  stopKnowledgeLanguage();
  const titleKey=preview==='teacher-preview'?'knowledgeUi.teacherTitle':cardKey(preview,'title');
  container.innerHTML=`<section class="owner-learning-shell" data-knowledge-access-preview="${preview}">
    <a class="alphabet-back" href="#knowledge">${uiLeaf('classroomUi.backKnowledge','← Знания')}</a>
    <h1>${uiLeaf(titleKey,'Знания')}</h1>
    <p class="owner-learning-status" role="status">${uiLeaf('classroomUi.accessFailed','Не удалось подтвердить доступ. Повторите подключение.')}</p>
    <button class="button secondary" type="button">${uiLeaf('classroomUi.retryConnection','Повторить подключение')}</button>
  </section>`;
  const page=container.querySelector('[data-knowledge-access-preview]');
  stopKnowledgeLanguage=watchPracticeUi(page);
  const retry=page.querySelector('button');
  const status=page.querySelector('[role="status"] span');
  retry.onclick=async()=>{
    retry.disabled=true;
    uiSet(status,'classroomUi.openingSection','Открываем раздел…');
    try{await verifyTeamPreviewAccess({force:true});}catch{}
    if(!page.isConnected)return;
    uiSet(status,'classroomUi.accessFailed','Не удалось подтвердить доступ. Повторите подключение.');
    retry.disabled=false;
  };
}

export function showKnowledge(container, { onStart,hash=globalThis.location?.hash||'',ownerAccess=ownerVerified(),learningUserId=null,mountCabinetLink=mountLearningCabinetLink } = {}) {
  const routeParams=new URLSearchParams(hash.split('?')[1]||'');
  const view=routeParams.get('view');
  const requestedPreview=routeParams.get('preview')||view;
  const preview=['online-lessons','muallim','live-stream','teacher-preview'].includes(requestedPreview)?requestedPreview:null;
  const canNavigatePreview=ownerAccess||teamPreviewKnowledgeHint(learningUserId);
  if(preview&&(ownerAccess||canContinueOwnerPreview())&&mountOwnerLearningPreview(container,preview))return;
  stopOwnerLearningPreview();
  if(preview&&!ownerAccess&&canNavigatePreview){
    showKnowledgeAccessStatus(container,preview);
    return;
  }
  if(view==='faith'){
    delete container.dataset.namesHash;
    delete container.dataset.alphabetHash;
    showFaithFoundations(container);
    return;
  }
  if(ownerAccess)preloadOwnerLearning();
  if(view!=='names')delete container.dataset.namesHash;
  if(view==='names'){stopKnowledgeLanguage();stopKnowledgeLanguage=()=>{};delete container.dataset.alphabetHash;if(container.dataset.namesHash!==hash||!container.querySelector('.names-page')){showAllahNames(container,{hash});container.dataset.namesHash=hash;}return;}
  if(view==='alphabet'){stopKnowledgeLanguage();stopKnowledgeLanguage=()=>{};if(container.dataset.alphabetHash!==hash||!container.querySelector('.alphabet-page')){showArabicAlphabet(container,{hash});container.dataset.alphabetHash=hash;}return;}
  delete container.dataset.alphabetHash;
  const saved=savedLesson(read('learning-progress',null));
  const catalogKey=JSON.stringify([learningUserId,canNavigatePreview,saved]);
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
      ${entries.map(entry => `<a class="knowledge-card" href="${entry.href||'#learning'}" ${entry.href?'':'data-learning-entry="'+entry.kind+'"'} ${entry.external?'target="_blank" rel="noopener noreferrer"':''}>
        <div class="knowledge-card-top">
          <span class="knowledge-icon" aria-hidden="true"><span class="knowledge-symbol knowledge-symbol-${entry.icon}"></span></span>
          <span class="knowledge-detail"${uiAttrs(cardKey(entry.kind,'detail'))}>${entry.detail}</span>
        </div>
        <h2${uiAttrs(cardKey(entry.kind,'title'))}>${entry.title}</h2>
        <p${uiAttrs(cardKey(entry.kind||entry.id,'description'))}>${entry.description}</p>
        <span class="knowledge-action">${uiLeaf(cardKey(entry.kind,'action'),entry.action)}${actionIcon('next')}</span>
      </a>`).join('')}
      ${canNavigatePreview?'<a class="knowledge-card knowledge-owner-preview" href="#knowledge?view=teacher-preview"><div class="knowledge-card-top"><span class="knowledge-icon" aria-hidden="true"><span class="knowledge-symbol knowledge-symbol-knowledge-online"></span></span><span class="knowledge-detail" data-i18n="knowledgeUi.previewDetail">Учебный пример</span></div><h2 data-i18n="knowledgeUi.teacherTitle">Кабинет преподавателя</h2><p data-i18n="knowledgeUi.teacherDescription">Расписание, учебная группа, задания и пример обратной связи.</p><span class="knowledge-action">'+uiLeaf('knowledgeUi.teacherAction','Познакомиться с кабинетом')+''+actionIcon('next')+'</span></a>':'<h2 class="knowledge-coming-title" data-i18n="knowledgeUi.comingTitle">Скоро в SALAH</h2>'}
      ${UPCOMING_KNOWLEDGE.map(entry => {const route=ownerLearningPreview(entry.id,canNavigatePreview);return route?`<a class="knowledge-card knowledge-owner-preview" data-upcoming="${entry.id}" href="${route.href}" aria-labelledby="upcoming-${entry.id}">
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
