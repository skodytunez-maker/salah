import assert from 'node:assert/strict';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';

import {mountReciterAudience} from '../dist/js/quran-reciter-audience.js';
import {setInterfaceLanguage} from '../dist/js/i18n.js';
import {translateQuranUi} from '../dist/js/quran-ui.js';

const win=new Window({url:'https://fixture.invalid'});
globalThis.localStorage=win.localStorage;
try{
 const host=win.document.body;
 const mount=()=>{
 host.innerHTML='<label><input id="reciter-search"></label><div class="reciter-card">Existing reciter</div>';
  mountReciterAudience(host);
  return host.querySelector('.reciter-audience');
 };
 setInterfaceLanguage('ru');
 const key='salah:reciter-catalog-gender';
 const womenList=section=>section.querySelector('[aria-labelledby="women-reciter-title"]');
 for(const oldValue of [null,'"male"','"female"','"legacy"','invalid JSON']){
  if(oldValue===null)win.localStorage.removeItem(key);
  else win.localStorage.setItem(key,oldValue);
  const section=mount(),women=womenList(section);
  const female=oldValue==='"female"';
  assert.equal(section.querySelector('select').value,female?'female':oldValue==='"male"'?'male':'');
  assert.equal(women.hidden,!female);
  assert.equal(women.querySelectorAll('a').length,female?5:0);
  assert.doesNotMatch(section.textContent,/Омар ибн Дия ад-Дин/);
  assert.equal(host.querySelector('.reciter-card').hidden,false);
  assert.equal(win.localStorage.getItem(key),oldValue);
 }
 let section=mount();
 let field=section.querySelector('select');
 field.value='female';field.onchange();
 assert.equal(win.localStorage.getItem(key),'"female"');
 section=mount();
 const women=womenList(section);
 assert.equal(women.hidden,false);
 for(const name of ['Мария Ульфа','Зайнаб Тальха','Марьям Джазим','Марьям Масуд','Qariah']){
  assert.ok(women.textContent.includes(name),name);
 }
 for(const link of section.querySelectorAll('a')){
  assert.equal(new URL(link.href).protocol,'https:');
  assert.equal(link.rel,'noopener noreferrer');
 }
 setInterfaceLanguage('en');translateQuranUi(host);
 assert.match(women.textContent,/Women reciters/);
 assert.match(women.textContent,/Maryam Masud/);
 field=section.querySelector('select');
 field.value='male';field.onchange();
 assert.equal(women.hidden,true);
 assert.equal(women.querySelectorAll('a').length,0);
 assert.equal(womenList(mount()).hidden,true);
}finally{delete globalThis.localStorage;await win.happyDOM.close();}
console.log('PASS: only the explicit female preference renders women reciter links; switching away removes them immediately.');
