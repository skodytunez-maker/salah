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
 const key='reciter-catalog-gender';
 for(const saved of [null,'male','female','legacy']){
  if(saved===null)win.localStorage.removeItem(key);
  else win.localStorage.setItem(key,saved);
  const section=mount(),women=section.querySelector('details');
  assert.equal(section.querySelector('select'),null);
  assert.equal(women.open,false);
  assert.match(women.querySelector('summary').textContent,/Женщины-чтецы/);
  women.open=true;
  assert.equal(women.querySelectorAll('a').length,5);
  for(const name of ['Мария Ульфа','Зайнаб Тальха','Марьям Джазим','Марьям Масуд','Qariah']){
   assert.ok(women.textContent.includes(name),name);
  }
  assert.match(section.querySelector(':scope > div').textContent,/Омар ибн Дия ад-Дин/);
  assert.equal(host.querySelector('.reciter-card').hidden,false);
  for(const link of section.querySelectorAll('a')){
   assert.equal(new URL(link.href).protocol,'https:');
   assert.equal(link.rel,'noopener noreferrer');
  }
  assert.equal(win.localStorage.getItem(key),saved);
 }
 setInterfaceLanguage('en');translateQuranUi(host);
 assert.match(host.querySelector('.reciter-audience summary').textContent,/Women reciters/);
 assert.match(host.querySelector('.reciter-audience details').textContent,/Maryam Masud/);
}finally{delete globalThis.localStorage;await win.happyDOM.close();}
console.log('PASS: the women reciter collection opens for all legacy preference states, with localized names and secure outbound links.');
