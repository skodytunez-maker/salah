import {uiLeaf} from './quran-ui.js';

const omar=['reciterAudience.omar','https://www.youtube.com/channel/UCtU4a32r3E1-RLHI72u_JbA','reciterAudience.youtube'];
const sources=[
 ['reciterAudience.maria','https://soundcloud.com/quran-30ajza-female/sets/maria-ulfah-recitation-complete-quran','reciterAudience.soundcloud'],
 ['reciterAudience.zaynab','https://www.youtube.com/@zaynabtalha4970','reciterAudience.youtube'],
 ['reciterAudience.maryam','https://www.maryamjazeem.com/','reciterAudience.officialSite'],
 ['reciterAudience.maryamMasud','https://www.youtube.com/channel/UCQOD0RBBTpas1ZXVsrR4wNA','reciterAudience.youtube'],
 ['reciterAudience.qariah','https://qariah.org/']
];
const sourceLink=([name,url,note])=>'<a class="list-button" href="'+url+'" target="_blank" rel="noopener noreferrer"><strong>'+
 uiLeaf(name)+'</strong>'+(note?'<small>'+uiLeaf(note)+'</small>':'')+'</a>';

export function mountReciterAudience(host){
 const searchField=host.querySelector('#reciter-search')?.closest('label');
 if(!searchField)return;
 const section=host.ownerDocument.createElement('section');
 section.className='reciter-audience';
 section.innerHTML='<details><summary>'+uiLeaf('reciterAudience.title')+'</summary>'+
  '<div class="reciter-audience-list">'+sources.map(sourceLink).join('')+'</div></details>'+
  '<div class="reciter-audience-list">'+sourceLink(omar)+'</div>';
 searchField.after(section);
}
