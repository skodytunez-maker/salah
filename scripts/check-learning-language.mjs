import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import*as language from '../dist/js/i18n.js';
import{UI_LANGUAGE_CODES}from '../dist/js/interface-languages.js';
import{esc,uiLeaf,uiAttribute,uiMessage}from '../dist/js/ui.js';
import{actionIcon,actionLabel}from '../dist/js/action-icons.js';
import{learningIllustration}from '../dist/js/learning-illustrations.js';
import{prayerCourses as prayers,savedLesson,validPosition}from '../dist/js/learning-state.js';
const content=JSON.parse(await readFile(new URL('../dist/data/learning-content.json',import.meta.url),'utf8')),quran=JSON.parse(await readFile(new URL('../dist/data/learning-quran.json',import.meta.url),'utf8'));
const win=new Window({url:'https://salah.invalid/#learn?view=resume'}),doc=win.document;let scrolls=0;
win.scrollTo=()=>{scrolls++;};doc.body.innerHTML='<main></main>';const host=doc.querySelector('main');
let audioCreates=0,plays=0,pauses=0,fetches=0,writes=0,recordingLookups=0;
class FakeAudio{constructor(url){this.src=url;this.paused=true;audioCreates++;}play(){this.paused=false;plays++;return Promise.resolve();}pause(){this.paused=true;pauses++;}}
const formulaStep=content.steps.findIndex(step=>step.formula);assert.ok(formulaStep>=0);
const store=new Map([['learning-progress',{kind:'basic',index:formulaStep,complete:false}]]);
const context=vm.createContext({console,window:win,document:doc,location:win.location,Audio:FakeAudio,Promise,setTimeout,clearTimeout,URL,URLSearchParams,...language,esc,uiLeaf,uiAttribute,uiMessage,toast:()=>{},actionIcon,actionLabel,learningIllustration,prayers,savedLesson,validPosition,
 read:(key,fallback)=>store.has(key)?store.get(key):fallback,write:(key,value)=>{writes++;store.set(key,structuredClone(value));return true;},
 recordingFor:()=>{recordingLookups++;return{url:'https://www.hisnmuslim.com/audio/ar/1.mp3'};},allowedLessonAudio:()=>true,
 fetch:async url=>{fetches++;assert.ok(['./data/learning-content.json','./data/learning-quran.json'].includes(url));return{ok:true,json:async()=>url.includes('learning-content')?structuredClone(content):structuredClone(quran)};}
});
const source=await readFile(new URL('../dist/js/learning.js',import.meta.url),'utf8');vm.runInContext(source.replace(/^import[^\n]*\n/gm,'').replace(/export /g,''),context,{filename:'learning.js'});
language.setInterfaceLanguage('ru');await context.showLearning(host,'resume');
const shell=host.querySelector('.lesson-shell'),size=host.querySelector('#reading-size'),previous=host.querySelector('#lesson-prev'),next=host.querySelector('#lesson-next'),play=host.querySelector('#lesson-play'),passage=host.querySelector('.lesson-passage');
assert.ok(play&&!play.disabled);play.click();await Promise.resolve();
const audio=vm.runInContext('audio',context),ended=audio.onended;assert.equal(audioCreates,1);assert.equal(plays,1);
size.value='28';size.focus();passage.open=false;
const instruction=host.querySelector('.lesson-instruction'),arabic=host.querySelector('.arabic'),translation=host.querySelector('.lesson-translation'),instructionText=instruction.textContent,arabicText=arabic.textContent,translationText=translation.textContent;
const snapshot={fetches,writes,recordingLookups,plays,pauses,scrolls,storage:JSON.stringify([...store])};
for(const code of UI_LANGUAGE_CODES){
 language.setInterfaceLanguage(code);
 assert.equal(host.querySelector('.lesson-shell'),shell);assert.equal(host.querySelector('#reading-size'),size);assert.equal(doc.activeElement,size);assert.equal(size.value,'28');assert.equal(passage.open,false);
 assert.equal(instruction.textContent,instructionText);assert.equal(instruction.lang,'ru');assert.equal(instruction.dir,'ltr');assert.equal(instruction.getAttribute('translate'),'no');assert.equal(arabic.textContent,arabicText);assert.equal(arabic.lang,'ar');assert.equal(translation.textContent,translationText);assert.equal(translation.lang,'ru');
 assert.equal(previous.getAttribute('aria-label'),language.t('learningUi.previousStep'));assert.equal(next.getAttribute('aria-label'),language.t('learningUi.nextStep'));
 assert.equal(play.textContent,language.t('player.pause'));assert.equal(vm.runInContext('audio',context),audio);assert.equal(audio.onended,ended);
 assert.deepEqual({fetches,writes,recordingLookups,plays,pauses,scrolls,storage:JSON.stringify([...store])},snapshot,'A locale change must not navigate, refetch, resave or restart lesson/audio');
}
context.stopLearning();assert.equal(audio.paused,true);assert.equal(audio.src,'');const oldLabel=previous.getAttribute('aria-label');language.setInterfaceLanguage('en');assert.equal(previous.getAttribute('aria-label'),oldLabel,'A disposed lesson has no live language listener');
language.setInterfaceLanguage('ru');await win.happyDOM.close();
console.log('PASS: learning labels and navigation ARIA update across eight locales in the same lesson/audio/DOM, keeping source scripture/instructions, drafts/focus/expanded state, progress, fetches, playback callbacks and scroll unchanged.');
