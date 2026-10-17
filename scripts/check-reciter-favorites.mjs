import assert from 'node:assert/strict';
import {RECITERS,reciterOptions,groupedReciters,reciterHasSurah,adjacentReciterSurah} from '../dist/js/quran-reciters.js';
import {normalizeReciterFavorites,toggleReciterFavorite} from '../dist/js/quran-reciter-favorites.js';
import {readFile} from 'node:fs/promises';
const ids=RECITERS.map(r=>r.id);assert.equal(new Set(ids).size,ids.length);assert.equal(RECITERS.length,47);
const damaged=['ar.ahmedkaseb','unknown','ar.ahmedkaseb',null,{id:'ar.husary'}];assert.deepEqual(normalizeReciterFavorites(damaged,RECITERS),['ar.ahmedkaseb']);assert.deepEqual(normalizeReciterFavorites({},RECITERS),[]);assert.equal(toggleReciterFavorite([], 'unknown',RECITERS),null);
const saved=toggleReciterFavorite(damaged,'ar.siratulloraupov',RECITERS);assert.deepEqual(saved,['ar.ahmedkaseb','ar.siratulloraupov']);assert.deepEqual(damaged,['ar.ahmedkaseb','unknown','ar.ahmedkaseb',null,{id:'ar.husary'}]);assert.deepEqual(toggleReciterFavorite(saved,'ar.ahmedkaseb',RECITERS),['ar.siratulloraupov']);
const groups=groupedReciters(saved),ordered=groups.flatMap(g=>g.reciters.map(r=>r.id));assert.deepEqual(ordered.slice(0,2),saved);assert.equal(new Set(ordered).size,RECITERS.length);
const html=reciterOptions('ar.ahmedkaseb',saved);assert.equal((html.match(/value="ar.ahmedkaseb"/g)||[]).length,1);assert.equal((html.match(/selected/g)||[]).length,1);assert.ok(!reciterOptions('ar.alafasy',saved,{offline:true}).includes('value="ar.siratulloraupov"'));
assert.equal(reciterHasSurah('ar.abdulrahmanmossad',1),false);assert.equal(reciterHasSurah('ar.abdulrahmanmossad',10),true);assert.equal(adjacentReciterSurah('ar.abdulrahmanmossad',10,1),19);assert.equal(reciterHasSurah('ar.abdelazizsheim',2),false);
for(const r of RECITERS){assert.match(r.portrait,/^assets\/reciters\/[a-z0-9-]+\.(jpg|png|webp)$/);assert.ok((await readFile(new URL('../dist/'+r.portrait,import.meta.url))).length>1000);if(r.availableSurahs)assert.ok(r.availableSurahs.every(n=>Number.isInteger(n)&&n>=1&&n<=114));}
const library=await readFile(new URL('../dist/js/quran-reciter-library.js',import.meta.url),'utf8');assert.ok(library.includes('closed||token!==request'));assert.ok(library.includes('unsubscribe()'));assert.ok(library.includes('if(e.detail===0)'));
console.log('PASS: favorites tolerate damaged data, retain order without duplicates, remove safely, preserve caller data, partial recitations and offline availability are honest, every portrait exists.');

const {reciterRecording}=await import('../dist/js/quran-reciter-recording.js');const fixture={surahs:[{number:1,ayahs:7},{number:2,ayahs:286},{number:3,ayahs:200}]};const recording=reciterRecording(fixture,3);assert.equal(recording.verses[0].number,294);assert.equal(recording.verses.at(-1).number,493);assert.equal(recording.verses.at(-1).ayah,200);assert.throws(()=>reciterRecording(fixture,4));assert.throws(()=>reciterRecording({surahs:[{number:1,ayahs:9000}]},1));assert.ok(!library.includes('await loadSurah(number)'),'Listening starts without a text-network delay after the tap');console.log('PASS: listening uses exact ayah positions without fetching reading text or inventing text.');

const {COMPETITION_RECITERS,competitionSnapshot}=await import('../supabase/functions/reciter-competition/core.mjs');
const {timingUrl}=await import('../dist/js/quran-timing.js');
const extraIds=["ar.islamsobhi","ar.abdulrahmanalawsi","ar.saadalghamdi","ar.ahmadalajmi","ar.faresabbad"];
assert.equal(RECITERS.filter(r=>!r.variantOf).length,46);
for(const id of extraIds){const r=RECITERS.find(r=>r.id===id);assert.ok(r);assert.ok(COMPETITION_RECITERS.includes(id));const now=Date.parse('2026-10-17T12:00:00Z');assert.equal(competitionSnapshot({action:'snapshot',device:'11111111-1111-4111-8111-111111111111',totals:{[id]:60},days:{'2026-10-17':{[id]:60}},timeZone:'UTC'},now).totals[id],60);if(id!=='ar.islamsobhi')assert.match(timingUrl({number:2},id),/surah=2&read=\d+$/);}
assert.equal(timingUrl({number:2},'ar.islamsobhi'),null);
assert.equal(reciterHasSurah('ar.islamsobhi',37),false);assert.equal(reciterHasSurah('ar.islamsobhi',114),true);assert.equal(adjacentReciterSurah('ar.islamsobhi',36,1),38);assert.equal(adjacentReciterSurah('ar.islamsobhi',38,1),41);assert.equal(adjacentReciterSurah('ar.islamsobhi',64,1),66);
console.log('PASS: five new readers participate in rankings, exact timing sources are selected, unavailable Islam Sobhi recordings are skipped.');

const eightNewIds=["ar.ahmadalnufais","ar.khalidaljalil","ar.wadeealyamani","ar.abdullahkamel","ar.haniarrifai","ar.alijaber","ar.muhammadayyub","ar.salahbukhatir"];
for(const id of eightNewIds){const r=RECITERS.find(r=>r.id===id);assert.ok(r&&r.format==='surah');assert.ok(COMPETITION_RECITERS.includes(id));assert.equal(r.availableSurahs,undefined);const sample={action:'snapshot',device:'11111111-1111-4111-8111-111111111111',totals:{[id]:60},days:{'2026-10-17':{[id]:60}},timeZone:'UTC'};assert.equal(competitionSnapshot(sample,Date.parse('2026-10-17T12:00:00Z')).totals[id],60);if(id==='ar.abdullahkamel')assert.equal(timingUrl({number:2},id),null);else{assert.equal(r.timingServer,r.server);assert.ok(timingUrl({number:2},id));}}
assert.equal(RECITERS.find(r=>r.id==='ar.muhammadayyub').timingRead,109,'Use the exact Ayub recording with timings, not the untimed alternate album');
console.log('PASS: eight full Hafs reciters have portraits and rankings support; seven exact timing sources are selected and Kamel remains honestly untimed.');
