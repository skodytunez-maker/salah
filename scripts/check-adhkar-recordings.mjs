import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{adhkarRecordings,adhkarRecording,adhkarPresentation,normalizeAdhkarArabic as normal}from '../dist/js/adhkar-recordings.js';
const data=JSON.parse(await readFile(new URL('../dist/data/adhkar.json',import.meta.url),'utf8')),before=JSON.stringify(data);
assert.equal(adhkarRecordings.length,data.items.length);
let available=0;
for(const item of data.items){
 const shown=adhkarPresentation(item),recording=adhkarRecording(item),arabic=item.arabic||item.verses.map(v=>v.arabic).join(' ');
 assert.equal(shown.arabic,item.arabic);assert.equal(shown.translation,item.translation);assert.equal(shown.id,item.id);assert.equal(shown.target,item.target);assert.equal(shown.source,item.source);assert.equal(shown.sourceNote,item.sourceNote);
 if(item.verses)for(let i=0;i<item.verses.length;i++){assert.equal(shown.verses[i].arabic,item.verses[i].arabic);assert.equal(shown.verses[i].translation,item.verses[i].translation);}
 const changed={...item,arabic:arabic+' ز'};assert.equal(adhkarRecording(changed),null);assert.equal(adhkarPresentation(changed),changed,'Unknown formula cannot inherit a manual transcription');
 if(recording){available++;assert.equal(normal(recording.sourceArabic),normal(arabic),'Provider formula matches '+item.id);assert.match(recording.url,/^https:\/\/azkar\.ru\/storage\/audio\/[A-Z0-9]+\.mp3$/);assert.match(recording.source,/^https:\/\/azkar\.ru\/category\/(morning|evening)#azkar-\d+$/);}
}
assert.equal(available,13);
for(const id of ['sayyid','raditu','bikaEvening'])assert.equal(adhkarRecording(data.items.find(i=>i.id===id)),null,'Do not substitute a different provider formula');
for(const item of data.items){
 const shown=adhkarPresentation(item);
 if(item.id!=='surah112')assert.equal(shown.title,item.title,'Keep our own dhikr titles');
 const reading=shown.transliteration||shown.verses.map(v=>v.transliteration.replace(/^Бисмилляахир-рахмаанир-рахиим\.\s+/u,'')).join(' ');
 assert.doesNotMatch(reading,/(^|[^\p{L}])[Вв][Аа](?=$|[^\p{L}])/u,'Use ua for the conjunction without altering letters inside words');
 if(!['sayyid','tahlil','surah112'].includes(item.id))assert.equal(shown,item,'Every other original reading is preserved');
}
const shown=id=>adhkarPresentation(data.items.find(item=>item.id===id)).transliteration;
assert.equal(shown('tahlil'),"Ля иляха илля-Ллаху уахда-ху ля шарикя лях. Ля-ху-ль-мульку уа ля-ху-ль-хамд, уа хува 'аля кулли шайин кадир.",'Keep the user-reviewed spelling, word breaks and pause endings');
assert.match(shown('sayyid'),/‘аляйй, уа абу’у ля-кя би-занби\./,'Retain the repeated la-ka that is absent from the provider variant');
assert.match(shown('sayyid'),/Уа ана ‘аля ‘ахди-кя уа уа‘ди-кя ма-стата‘т\. А‘узу/,'User spelling with corrected ala and a clear stop');
assert.match(shown('sayyid'),/илля Ант\.$/,'The final Ant retains the requested pause ending');
const ikhlas=adhkarPresentation(data.items.find(item=>item.id==='surah112'));
assert.match(ikhlas.verses[0].transliteration,/Куль хува-Ллаху ахад\.$/);assert.equal(ikhlas.verses[1].transliteration,'Аллаху-ссамад.');
assert.equal(ikhlas.verses[2].transliteration,'Лям ялид уа лям юляд.');assert.equal(ikhlas.verses[3].transliteration,'Уа лям якулляху куфуван ахад.');
assert.equal(JSON.stringify(data),before);
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),worker=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
assert.match(html,/media-src https:\/\/azkar.ru /);for(const path of ['./js/adhkar-recordings.js','./css/adhkar-audio.css','./assets/updates/adhkar-audio-380.svg'])assert.ok(worker.includes(JSON.stringify(path)));
console.log('PASS: 16 original formulas/counters preserved, 13 provider-text matches, three different recordings excluded; readable display preserves our pause endings and original catalogue.');
