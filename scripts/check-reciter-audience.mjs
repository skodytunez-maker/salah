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
  return host.querySelector('#reciter-audience-gender');
 };
 setInterfaceLanguage('ru');
 let select=mount();
 const women=()=>host.querySelector('[aria-labelledby="women-reciter-title"]');
 assert.equal(select.value,'');
 assert.equal(women().hidden,true);
 assert.equal(women().querySelectorAll('a').length,0);
 assert.match(host.querySelector('.reciter-audience').textContent,/Омар ибн Дия ад-Дин/);
 select.value='female';select.onchange();
 assert.equal(women().hidden,false);
 assert.equal(women().querySelectorAll('a').length,4);
 assert.match(women().textContent,/Мария Ульфа/);
 assert.match(women().textContent,/Зайнаб Тальха/);
 assert.match(women().textContent,/Марьям Джазим/);
 assert.equal(host.querySelector('.reciter-card').hidden,false);
 for(const link of host.querySelectorAll('.reciter-audience a')){
  assert.equal(new URL(link.href).protocol,'https:');
  assert.equal(link.rel,'noopener noreferrer');
 }
 select=mount();assert.equal(select.value,'female');
 setInterfaceLanguage('en');translateQuranUi(host);
 assert.match(women().textContent,/Women reciters/);
 assert.equal(select.options[2].textContent,'Female');
 select.value='male';select.onchange();
 assert.equal(women().hidden,true);
 assert.equal(women().querySelectorAll('a').length,0);
 assert.equal(mount().value,'male');
}finally{delete globalThis.localStorage;await win.happyDOM.close();}
console.log('PASS: optional device-local preference, female access, persistent selection, localization and verified outbound source links.');
