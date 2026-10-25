import{ownerVerified}from './owner-auth.js';
import{ownerLearningPreview}from './owner-learning-links.js';
import{UPCOMING_KNOWLEDGE}from './knowledge-upcoming.js';
import{showArabicAlphabet}from './arabic-alphabet.js';
import{showAllahNames}from './allah-names.js';
import{actionIcon,actionLabel}from './action-icons.js';
import{read}from './storage.js';
import{savedLesson,courseName,courseLength}from './learning-state.js';
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
  }
];

export function showKnowledge(container, { onStart,hash=globalThis.location?.hash||'',ownerAccess=ownerVerified() } = {}) {
  const view=new URLSearchParams(hash.split('?')[1]||'').get('view');
  if(view!=='names')delete container.dataset.namesHash;
  if(view==='names'){delete container.dataset.alphabetHash;if(container.dataset.namesHash!==hash||!container.querySelector('.names-page')){showAllahNames(container,{hash});container.dataset.namesHash=hash;}return;}
  if(view==='alphabet'){if(container.dataset.alphabetHash!==hash||!container.querySelector('.alphabet-page')){showArabicAlphabet(container,{hash});container.dataset.alphabetHash=hash;}return;}
  delete container.dataset.alphabetHash;
  const saved=savedLesson(read('learning-progress',null));
  container.innerHTML = `<section class="knowledge-page" aria-labelledby="knowledge-title">
    <div class="page-head knowledge-head">
      <div>
        <span class="knowledge-eyebrow">УЧИТЬСЯ И ПОВТОРЯТЬ</span>
        <h1 id="knowledge-title">Знания</h1>
        <p class="knowledge-intro">В своём темпе. По одному шагу.</p>
      </div>
    </div>
    ${saved?`<a class="knowledge-resume" href="#learning" data-learning-entry="resume"><span class="knowledge-eyebrow">ПРОДОЛЖИТЬ ОБУЧЕНИЕ</span><strong>${courseName(saved.kind)}</strong><span class="knowledge-resume-detail">Шаг ${saved.index+1} из ${courseLength(saved.kind)}</span><span class="knowledge-resume-track" aria-hidden="true"><span style="width:${(saved.index+1)/courseLength(saved.kind)*100}%"></span></span></a>`:''}
    <div class="knowledge-cards">
      ${entries.map(entry => `<a class="knowledge-card" href="${entry.href||'#learning'}" ${entry.href?'':'data-learning-entry="'+entry.kind+'"'}>
        <div class="knowledge-card-top">
          <span class="knowledge-icon" aria-hidden="true"><span class="knowledge-symbol knowledge-symbol-${entry.icon}"></span></span>
          <span class="knowledge-detail">${entry.detail}</span>
        </div>
        <h2>${entry.title}</h2>
        <p>${entry.description}</p>
        <span class="knowledge-action">${entry.action}${actionIcon('next')}</span>
      </a>`).join('')}
      <h2 class="knowledge-coming-title">Скоро в SALAH</h2>
      ${UPCOMING_KNOWLEDGE.map(entry => `<article class="knowledge-card knowledge-card-coming" data-upcoming="${entry.id}" aria-labelledby="upcoming-${entry.id}">
        <div class="knowledge-card-top"><span class="knowledge-icon" aria-hidden="true"><span class="knowledge-symbol knowledge-symbol-${entry.icon}"></span></span><span class="knowledge-detail">${ownerAccess?'Закрытая проверка':'Готовим для вас'}</span></div>
        <h2 id="upcoming-${entry.id}">${entry.title}</h2><p id="upcoming-${entry.id}-description">${entry.description}</p>
        ${ownerLearningPreview(entry.id,ownerAccess)?`<a class="button secondary knowledge-owner-preview" href="${ownerLearningPreview(entry.id,ownerAccess).href}" target="_blank" rel="noopener noreferrer">${ownerLearningPreview(entry.id,ownerAccess).label}</a>`:`<button class="button knowledge-coming-button" type="button" disabled aria-describedby="upcoming-${entry.id}-description">Скоро</button>`}
      </article>`).join('')}


    </div>
  </section>`;
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
