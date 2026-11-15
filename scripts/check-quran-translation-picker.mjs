import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{mountQuranTranslationPicker}from '../dist/js/quran-translation-picker.js';
import{setInterfaceLanguage,translateUi,t}from '../dist/js/i18n.js';
import{UI_LANGUAGES,UI_LANGUAGE_CODES,languageInfo}from '../dist/js/interface-languages.js';
const win=new Window({url:'https://salah.invalid/salah/#quran?surah=1'}),doc=win.document;
Object.assign(globalThis,{window:win,document:doc});
doc.body.innerHTML='<button id="open">Open</button><input id="draft" value="Личный текст"><dialog id="modal"><div id="modal-content"></div></dialog>';
const dialog=doc.getElementById('modal');dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new win.Event('close'));};
const manifest=JSON.parse(await readFile(new URL('../dist/data/quran-translation-manifest.json',import.meta.url),'utf8'));
const rows=manifest.editions.map(({id,language,author,version,script,source})=>({id,language,author,version,script,source})),originalRows=JSON.stringify(rows),flags={ru:'🇷🇺',az:'🇦🇿',en:'🇬🇧',de:'🇩🇪',tg:'🇹🇯',uz:'🇺🇿',kk:'🇰🇿'};
const style=doc.createElement('style');style.textContent=await readFile(new URL('../dist/quran.css',import.meta.url),'utf8');doc.head.append(style);
let selected='ru.kuliev',selections=0,downloads=0,finish=null,fail=false,activeSignal=null;
const library={list:async()=>rows,saveAll:async(id,{onProgress,signal})=>{downloads++;activeSignal=signal;onProgress(3,114);await new Promise(resolve=>finish=resolve);if(fail)throw Error('offline');if(signal.aborted)throw new DOMException('Aborted','AbortError');onProgress(114,114);}};
const button=doc.getElementById('open'),draft=doc.getElementById('draft');
const dispose=mountQuranTranslationPicker(button,{library,getSelected:()=>selected,onSelect:async(id,{signal})=>{selections++;activeSignal=signal;if(fail)throw Error('unavailable');selected=id;return true;}});
const turns=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
setInterfaceLanguage('ru');button.click();await turns();
assert.equal(dialog.open,true);assert.equal(doc.querySelectorAll('[data-translation-select]').length,rows.length+1);
assert.equal(selections,0);assert.equal(downloads,0,'Opening the list does not select or download an edition');
const pane=doc.querySelector('.quran-translation-picker'),select=doc.querySelector('[data-translation-select="quranenc.azeri_musayev"]'),download=doc.querySelector('[data-translation-download="quranenc.uzbek_sadiq"]');
const assertRows=()=>{
 const allRows=[{id:'ru.kuliev',language:'ru',author:'Эльмир Кулиев',bundled:true},...rows];
 assert.equal(pane.querySelectorAll('.quran-translation-flag').length,allRows.length);assert.equal(pane.querySelectorAll('[data-translation-download]').length,rows.length);assert.equal(pane.querySelectorAll('.quran-translation-source').length,rows.length);
 for(const row of allRows){
  const control=pane.querySelector('[data-translation-select="'+row.id+'"]'),choice=control.closest('.quran-translation-choice'),flag=control.querySelector('.quran-translation-flag'),name=control.querySelector('strong'),nameOnly=name.cloneNode(true);nameOnly.querySelectorAll('[aria-hidden="true"]').forEach(node=>node.remove());
  assert.equal(flag.textContent,flags[row.language]);assert.equal(flag.getAttribute('aria-hidden'),'true');assert.equal(flag.getAttribute('dir'),'ltr');assert.equal(flag.querySelector('button,a,input'),null);assert.equal(flag.hasAttribute('tabindex'),false);assert.equal(win.getComputedStyle(flag).display,'inline-block');assert.match(win.getComputedStyle(flag).marginInlineEnd,/^0?\.45rem$/);
  assert.equal(nameOnly.textContent,UI_LANGUAGES.find(info=>info.code===row.language).name+(row.language==='uz'?' · '+t('quranTranslations.cyrillic'):''));assert.equal(name.getAttribute('lang'),row.language);assert.equal(name.getAttribute('dir'),'ltr');assert.equal(control.querySelector('small').textContent,row.author);assert.equal(control.getAttribute('aria-pressed'),String(selected===row.id));assert.equal(control.querySelector('.quran-translation-check').textContent,selected===row.id?'✓':'');
  if(!row.bundled){const source=choice.querySelector('.quran-translation-source'),download=choice.querySelector('[data-translation-download]');assert.equal(source.href,row.source);assert.equal(source.textContent,'QuranEnc.com · '+t('quranTranslations.version',{version:row.version}));assert.equal(download.dataset.translationDownload,row.id);assert.equal(download.getAttribute('aria-label'),t('quranTranslations.download'));assert.equal(win.getComputedStyle(download).minWidth,'44px');assert.equal(win.getComputedStyle(download).minHeight,'44px');}
 }
 assert.equal(win.getComputedStyle(pane).textAlign,'start');assert.equal(JSON.stringify(rows),originalRows,'Decoration cannot mutate source-edition metadata');
};
select.focus();
for(const language of UI_LANGUAGE_CODES){setInterfaceLanguage(language);doc.documentElement.dir=languageInfo(language).direction;translateUi(doc);assert.equal(doc.querySelector('.quran-translation-picker'),pane);assert.equal(doc.querySelector('[data-translation-select="quranenc.azeri_musayev"]'),select);assert.equal(doc.activeElement,select);assert.match(pane.textContent,/Əlixan Musayev/);assert.match(pane.textContent,/Муҳаммад Содиқ/);assert.equal(pane.querySelector('h2').textContent,t('quranTranslations.title'));assert.equal(draft.value,'Личный текст');assertRows();}
assert.equal(selections,0);assert.equal(downloads,0);
fail=true;await select.onclick();assert.equal(selected,'ru.kuliev');assert.equal(dialog.open,true);assert.equal(pane.querySelector('[data-translation-status]').textContent,t('quranTranslations.failed'));
fail=false;await select.onclick();assert.equal(selected,'quranenc.azeri_musayev');assert.equal(dialog.open,false);
button.click();await turns();const task=doc.querySelector('[data-translation-download="quranenc.uzbek_sadiq"]').onclick();await turns();
assert.equal(downloads,1);const busyPane=doc.querySelector('.quran-translation-picker'),progress=busyPane.querySelector('[data-translation-status]');assert.ok(busyPane.querySelector('[data-translation-select]').disabled);
setInterfaceLanguage('en');translateUi(doc);assert.equal(progress.textContent,'Downloading: 3 of 114');assert.equal(downloads,1,'A locale change does not restart a download');
dialog.close();assert.equal(activeSignal.aborted,true);finish();await task;assert.equal(dialog.open,false);assert.equal(selected,'quranenc.azeri_musayev','Downloading another edition never changes the chosen translation');
button.click();await turns();const newer=doc.createElement('article');newer.textContent='Other dialog';doc.getElementById('modal-content').replaceChildren(newer);dispose();assert.equal(dialog.open,true,'Disposing an old picker does not close a replacement dialog');
// Each opening owns its async work. A late list, progress, rejection or finally
// from A cannot render into, close, or re-enable a newly opened B.
const raceButton=doc.createElement('button');doc.body.append(raceButton);let firstList,lists=0;
const stopList=mountQuranTranslationPicker(raceButton,{getSelected:()=> 'ru.kuliev',onSelect:async()=>true,library:{list:()=>++lists===1?new Promise(resolve=>firstList=resolve):Promise.resolve(rows)}});
raceButton.click();await turns();dialog.close();raceButton.click();await turns();const listPane=doc.querySelector('.quran-translation-picker'),currentChoice=listPane.querySelector('[data-translation-select]');
firstList([{...rows[0],id:'quranenc.stale_source',author:'Stale author must stay invisible'}]);await turns();
assert.equal(doc.querySelector('.quran-translation-picker'),listPane);assert.equal(listPane.querySelector('[data-translation-select]'),currentChoice);assert.doesNotMatch(listPane.textContent,/Stale author/);stopList();
const downloadsPending=[];
const stopDownloads=mountQuranTranslationPicker(raceButton,{getSelected:()=> 'ru.kuliev',onSelect:async()=>true,library:{list:async()=>rows,saveAll:(id,{signal,onProgress})=>new Promise((resolve,reject)=>{downloadsPending.push({id,signal,onProgress,resolve,reject});onProgress(downloadsPending.length,114);})}});
raceButton.click();await turns();const oldDownload=doc.querySelector('[data-translation-download]'),oldDownloadTask=oldDownload.onclick();await turns();dialog.close();
raceButton.click();await turns();const newDownload=doc.querySelector('[data-translation-download]'),newDownloadTask=newDownload.onclick();await turns();const downloadPane=doc.querySelector('.quran-translation-picker'),downloadStatus=downloadPane.querySelector('[data-translation-status]'),newProgress=downloadStatus.textContent;
assert.equal(downloadsPending[0].signal.aborted,true);assert.equal(downloadsPending[1].signal.aborted,false);assert.equal(newDownload.disabled,true);
// Browsers queue dialog close events. A close event left over from A while B is
// already open must not abort B's current controller.
dialog.dispatchEvent(new win.Event('close'));assert.equal(downloadsPending[1].signal.aborted,false);
downloadsPending[0].onProgress(113,114);assert.equal(downloadStatus.textContent,newProgress);downloadsPending[0].reject(new DOMException('Aborted','AbortError'));await oldDownloadTask;
assert.equal(doc.querySelector('.quran-translation-picker'),downloadPane);assert.equal(dialog.open,true);assert.equal(newDownload.disabled,true,'The old finally cannot unlock current controls');assert.equal(downloadStatus.textContent,newProgress);await oldDownload.onclick();assert.equal(downloadsPending.length,2,'An inactive old control cannot start another download');
downloadsPending[1].onProgress(114,114);downloadsPending[1].resolve();await newDownloadTask;assert.equal(newDownload.disabled,false);assert.equal(downloadStatus.textContent,t('quranTranslations.saved'));stopDownloads();
let selectedAfterRace='ru.kuliev';const selectionsPending=[];
const stopSelections=mountQuranTranslationPicker(raceButton,{getSelected:()=>selectedAfterRace,library:{list:async()=>rows},onSelect:async(id,{signal})=>{await new Promise(resolve=>selectionsPending.push({id,signal,resolve}));if(!signal.aborted)selectedAfterRace=id;return true;}});
raceButton.click();await turns();const oldSelection=doc.querySelector('[data-translation-select="quranenc.azeri_musayev"]'),oldSelectionTask=oldSelection.onclick();await turns();dialog.close();raceButton.click();await turns();const newSelection=doc.querySelector('[data-translation-select="quranenc.uzbek_sadiq"]'),newSelectionTask=newSelection.onclick();await turns();const selectionPane=doc.querySelector('.quran-translation-picker');
selectionsPending[0].resolve();await oldSelectionTask;assert.equal(selectedAfterRace,'ru.kuliev');assert.equal(dialog.open,true,'An old successful selection promise cannot close the new picker');assert.equal(doc.querySelector('.quran-translation-picker'),selectionPane);assert.equal(newSelection.disabled,true);await oldSelection.onclick();assert.equal(selectionsPending.length,2);selectionsPending[1].resolve();await newSelectionTask;assert.equal(selectedAfterRace,'quranenc.uzbek_sadiq');assert.equal(dialog.open,false);stopSelections();
setInterfaceLanguage('ru');await win.happyDOM.close();
console.log('PASS: decorative language flags across all real editions, unchanged accessible names/authors/versions/sources/selection, RTL and 44px downloads, all-eight in-place labels, retained focus/draft, explicit-only downloads, retry, close-to-cancel and stale-dialog isolation.');
