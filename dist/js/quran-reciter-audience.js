import {uiLeaf,uiTextAttributes} from './quran-ui.js';
import {read,write} from './storage.js';
import {t} from './i18n.js';
import {esc} from './ui.js';

const key='reciter-catalog-gender';
const genders=new Set(['','male','female']);
const maria='https://soundcloud.com/quran-30ajza-female/sets/maria-ulfah-recitation-complete-quran';
const sources=[
 ['reciterAudience.maria',maria,'reciterAudience.soundcloud'],
 ['reciterAudience.zaynab','https://www.youtube.com/@zaynabtalha4970','reciterAudience.youtube'],
 ['reciterAudience.maryam','https://www.maryamjazeem.com/','reciterAudience.officialSite'],
 ['reciterAudience.qariah','https://qariah.org/']
];
const sourceLink=([name,url,note])=>'<a class="list-button" href="'+url+'" target="_blank" rel="noopener noreferrer"><strong>'+
 uiLeaf(name)+'</strong>'+(note?'<small>'+uiLeaf(note)+'</small>':'')+'</a>';

export function mountReciterAudience(host){
 const search=host.querySelector('#reciter-search');
 if(!search)return;
 const section=host.ownerDocument.createElement('section');
 section.className='reciter-audience';
 section.innerHTML='<details><summary>'+uiLeaf('reciterAudience.options')+'</summary>'+
  '<label class="field" for="reciter-audience-gender">'+uiLeaf('reciterAudience.gender')+
  '<select id="reciter-audience-gender">'+[['','unspecified'],['male','male'],['female','female']].map(([value,name])=>{
   const label='reciterAudience.'+name;
   return '<option value="'+value+'" '+uiTextAttributes(label)+'>'+esc(t(label))+'</option>';
  }).join('')+'</select></label></details>'+
  '<div class="reciter-audience-list" hidden aria-labelledby="women-reciter-title"></div>'+
  '<div class="reciter-audience-list">'+sourceLink(['reciterAudience.omar','https://www.youtube.com/channel/UCtU4a32r3E1-RLHI72u_JbA','reciterAudience.youtube'])+'</div>';
 const field=section.querySelector('select'),list=section.querySelector('.reciter-audience-list');
 const saved=read(key,'');
 field.value=genders.has(saved)?saved:'';
 const draw=()=>{
  list.hidden=field.value!=='female';
  list.innerHTML=list.hidden?'':'<h2 id="women-reciter-title">'+uiLeaf('reciterAudience.title')+'</h2>'+sources.map(sourceLink).join('');
 };
 field.onchange=()=>{
  if(!genders.has(field.value))field.value='';
  if(!write(key,field.value)){const stored=read(key,'');field.value=genders.has(stored)?stored:'';}
  draw();
 };
 draw();
 search.closest('label').after(section);
}
