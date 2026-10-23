import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{ALLAH_NAMES,NAMES_COUNT,NAMES_PROGRESS_KEY,nameById,findNames,normalizeNamesProgress,validNamesProgress,reviewName,createNamesQuiz,comparableNames}from '../dist/js/allah-names-core.js';
let checks=0;
const yes=(condition,label)=>{assert.ok(condition,label);checks++;};
yes(NAMES_COUNT===99&&new Set(ALLAH_NAMES.map(n=>n.id)).size===99,'99 stable unique IDs');
yes(new Set(ALLAH_NAMES.map(n=>n.arabic)).size===99,'99 distinct Arabic names');
yes(ALLAH_NAMES.every(n=>/[\u0621-\u064a]/.test(n.arabic)&&n.name&&n.meaning&&new URL(n.source.url).protocol==='https:'),'Every name has Arabic, transcription, meaning and a source');
yes(ALLAH_NAMES.filter(n=>n.source.label.startsWith('Коран')).length===82,'80 individual plus two compound Quranic names; 17 Sunnah entries');
yes(ALLAH_NAMES.filter(n=>n.source.url.endsWith('/p-20')).length===17,'Sunnah entries cite their actual primary book page');
yes(!nameById('constructor')&&!nameById({id:'rahman'}),'Lookup never trusts prototype or supplied objects');
yes(findNames('رَحْمَٰن').some(n=>n.id==='rahman'),'Arabic vowel marks ignored in search');
yes(findNames('РАХМАН').some(n=>n.id==='rahman'),'Russian name search');
yes(findNames('Всеслышащий').some(n=>n.id==='sami'),'Meaning search');
yes(findNames('<script>').length===0,'Unknown search text cannot become markup');
yes(validNamesProgress({version:1,last:'rahman',reviewed:['rahman']}),'Valid progress');
for(const v of [null,[],{version:2,last:null,reviewed:[]},{version:1,last:'wrong',reviewed:[]},{version:1,last:null,reviewed:['rahman','rahman']},{version:1,last:null,reviewed:['unknown']},{version:1,last:null,reviewed:[],extra:true}])yes(!validNamesProgress(v),'Corrupt or unknown progress rejected');
assert.deepEqual(normalizeNamesProgress({last:'unknown',reviewed:['rahman',{},'rahman','rahim','oops']}),{version:1,last:null,reviewed:['rahman','rahim']});
yes(reviewName(reviewName(null,'rahman'),'rahman').reviewed.length===0,'Review can be undone');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const positions=new Set();
for(const n of ALLAH_NAMES){
 const qs=createNamesQuiz(null,{start:n.id,random:rng(n.index+1)});
 yes(qs.length===5&&qs[0].target===n&&new Set(qs.map(q=>q.target.id)).size===5,'Five different questions, including chosen name');
 for(const q of qs){
  yes(q.choices.length===4&&new Set(q.choices.map(c=>c.id)).size===4&&q.choices.filter(c=>c===q.target).length===1,'Exactly one correct choice');
  yes(q.choices.every(c=>c===q.target||!comparableNames(q.target.id,c.id)),'No closely related meaning used as a distractor');
  positions.add(q.choices.indexOf(q.target));
 }
}
yes(positions.size===4,'Correct answers occur at every position');
const reviewed=ALLAH_NAMES.slice(0,7).map(n=>n.id),p={version:1,last:reviewed[0],reviewed};
yes(createNamesQuiz(p,{random:rng(70)}).every(q=>reviewed.includes(q.target.id)),'General practice uses studied names when at least five are available');
yes(createNamesQuiz({reviewed:['rahman']},{random:rng(42)}).length===5,'Fewer studied names still provide five questions');
yes(createNamesQuiz(null,{random:rng(1)}).map(q=>q.target.id).join()!==createNamesQuiz(null,{random:rng(2)}).map(q=>q.target.id).join(),'New rounds vary with randomness');
const w=new Window({url:'https://fixture.invalid/#knowledge?view=names'});
w.document.body.innerHTML='<main id="app"></main><div id="toast" hidden></div>';
Object.assign(globalThis,{window:w,document:w.document,location:w.location,localStorage:w.localStorage});
const prayer=JSON.stringify({kind:'basic',index:3,complete:false}),alphabet=JSON.stringify({version:1,last:'ba',reviewed:['ba']}),adhkar=JSON.stringify({version:2,totals:{tasbih:120},days:{}});
w.localStorage.setItem('salah:learning-progress',prayer);w.localStorage.setItem('salah:arabic-alphabet-progress',alphabet);w.localStorage.setItem('salah:adhkar-progress-v2',adhkar);
const{showKnowledge}=await import('../dist/js/knowledge.js');
const{showAllahNames}=await import('../dist/js/allah-names.js');
const host=w.document.getElementById('app');
const render=hash=>{w.location.hash=hash;showKnowledge(host,{hash});};
render('#knowledge');yes(host.querySelector('a[href="#knowledge?view=names"]'),'Hub entry reaches names');yes(host.textContent.includes('Шаг 4 из 17'),'Prayer resume retained');
render('#knowledge?view=names');yes(host.querySelectorAll('.names-tile').length===99,'All 99 cards rendered');
const input=host.querySelector('[data-names-search]');input.value='Рахман';input.dispatchEvent(new w.Event('input'));yes(host.querySelectorAll('.names-tile').length===1,'Search filters actual UI');input.value='<svg onload=alert(1)>';input.dispatchEvent(new w.Event('input'));yes(host.querySelector('.names-empty')&&!host.querySelector('svg'),'No results handles unsafe query safely');
render('#knowledge?view=names&name=rahman');
yes(host.querySelector('.names-arabic').lang==='ar'&&host.querySelector('.names-arabic').dir==='rtl','Arabic declares language and direction');
yes(host.querySelector('.names-source').href==='https://quran.com/1/3','Study card source matches its verse');
host.querySelector('[data-names-review]').click();yes(JSON.parse(w.localStorage.getItem('salah:'+NAMES_PROGRESS_KEY)).reviewed.join()==='rahman','Only requested mark saved');
host.querySelector('[data-names-review]').click();yes(JSON.parse(w.localStorage.getItem('salah:'+NAMES_PROGRESS_KEY)).reviewed.length===0,'Unmark persisted');host.querySelector('[data-names-review]').click();
host.querySelector('[data-names-next]').click();yes(w.location.hash==='#knowledge?view=names&name=rahim','Next moves through canonical cards');
render('#knowledge?view=names&name=allah');yes(host.querySelector('[data-names-prev]').disabled,'First boundary');
render('#knowledge?view=names&name=dhul-jalal');yes(host.querySelector('[data-names-next]').disabled,'Last boundary');
render('#knowledge?view=names&name=qabid');yes(host.querySelector('.names-pair a').href.endsWith('&name=basit'),'Paired name linked');
render('#knowledge?view=names&name=rahman');w.scrollTo(0,500);host.querySelector('[data-names-quiz]').click();
yes(w.scrollY===0&&w.document.activeElement===host.querySelector('[data-names-heading]'),'Test opens at focused heading');
for(let i=0;i<5;i++){
 const target=ALLAH_NAMES.find(n=>n.arabic===host.querySelector('.names-arabic').textContent);
 if(i===0){
  yes(target.id==='rahman','Card practice includes this name first');
  yes(host.querySelector('[data-names-question-next]').hidden,'Cannot skip unanswered question');
  host.querySelector('[data-names-question-next]').click();yes(host.querySelector('.names-arabic').textContent===target.arabic,'Programmatic next also gated');
  host.querySelector('[data-names-answer]:not([data-names-answer="'+target.id+'"])').click();
  yes(host.querySelector('.names-feedback').textContent.includes(target.meaning),'Wrong answer explains actual meaning');
  host.querySelector('[data-names-answer="'+target.id+'"]').click();
 }else host.querySelector('[data-names-answer="'+target.id+'"]').click();
 yes([...host.querySelectorAll('[data-names-answer]')].every(b=>b.disabled),'Answers locked after first choice');
 host.querySelector('[data-names-question-next]').click();
}
yes(host.querySelector('.names-result h1').textContent==='Верно 4 из 5','Double answer cannot inflate score');
yes(host.querySelector('.names-result li a').href.endsWith('name=rahman'),'Missed name available for review');
yes(JSON.parse(w.localStorage.getItem('salah:'+NAMES_PROGRESS_KEY)).reviewed.join()==='rahman','Quiz never marks names automatically');
host.querySelector('[data-names-again]').click();yes(host.querySelectorAll('[data-names-answer]').length===4,'Repeat starts fresh round');
render('#knowledge?view=names');host.querySelector('[data-names-quiz]').click();const current=host.querySelector('.names-quiz');showKnowledge(host,{hash:w.location.hash});yes(current===host.querySelector('.names-quiz'),'Same-hash background render preserves active quiz');
host.querySelector('[data-names-home]').click();yes(host.querySelectorAll('.names-tile').length===99,'Same-hash back returns to grid');
yes(host.querySelector('.names-resume').href.endsWith('name=rahman'),'Last opened name resumes');
render('#knowledge?view=alphabet');yes(host.querySelectorAll('.alphabet-tile').length===28,'Alphabet still works after names');
render('#knowledge?view=names');yes(host.querySelector('.names-page')&&!host.querySelector('.alphabet-page'),'Return from alphabet enters correct independent view');
showAllahNames(host,{hash:'#knowledge?view=names&name=unknown'});yes(host.querySelectorAll('.names-tile').length===99,'Unknown deep link falls back safely');
for(const[key,value]of [['learning-progress',prayer],['arabic-alphabet-progress',alphabet],['adhkar-progress-v2',adhkar]])yes(w.localStorage.getItem('salah:'+key)===value,'Other progress untouched: '+key);
const{createBackup,validateBackup}=await import('../dist/js/backup.js'),{defaults}=await import('../dist/js/storage.js');
const backup=createBackup({storage:w.localStorage,settings:defaults,history:{}});
yes(backup.personal[NAMES_PROGRESS_KEY].reviewed[0]==='rahman','Names included in backup');
yes(validateBackup(backup).backup.personal['arabic-alphabet-progress'].last==='ba','Combined backup preserves alphabet');
for(const wrong of [{version:1,last:null,reviewed:['evil']},{version:1,last:null,reviewed:['rahman','rahman']}]){
 const bad=structuredClone(backup);bad.personal[NAMES_PROGRESS_KEY]=wrong;assert.throws(()=>validateBackup(bad));checks++;
}
const sw=await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),html=await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8');
for(const file of ['js/allah-names.js','js/allah-names-core.js','css/allah-names.css','assets/updates/allah-names-391.svg'])yes(sw.includes('"./'+file+'"'),'Offline shell includes '+file);
yes(html.includes('./css/allah-names.css'),'Stylesheet linked');
await w.happyDOM.abort();for(const k of ['window','document','location','localStorage'])delete globalThis[k];
console.log('PASS: '+checks+' names checks: 99 sourced entries,495 questions,similar-meaning exclusion,real UI navigation/search/scoring,independent progress,backup and offline assets.');
