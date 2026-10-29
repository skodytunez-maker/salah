import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
import{RECITERS,reciterInfo,reciterHasSurah,adjacentReciterSurah,reciterOptions}from '../dist/js/quran-reciters.js';
import{RECITER_ADDED_AT,orderReciterCatalog,recentReciters}from '../dist/js/quran-reciter-discovery.js';
import{toggleReciterFavorite}from '../dist/js/quran-reciter-favorites.js';
import{COMPETITION_RECITERS,competitionSnapshot}from '../supabase/functions/reciter-competition/core.mjs';
import{createQuranPlayer}from '../dist/js/quran-audio.js';import{audioUrl,loadIndex}from '../dist/js/quran-data.js';import{reciterRecording}from '../dist/js/quran-reciter-recording.js';import{timingUrl}from '../dist/js/quran-timing.js';
const report=JSON.parse(await fs.readFile(new URL('../docs/reciter-expansion-20261029.json',import.meta.url))),index=JSON.parse(await fs.readFile(new URL('../dist/data/quran-index.json',import.meta.url))),ids=report.reciters.map(r=>r.id),now=Date.parse('2026-10-29T12:00:00Z');
assert.equal(ids.length,8);assert.equal(RECITERS.length,57);assert.equal(RECITERS.filter(r=>!r.variantOf).length,54);assert.equal(new Set(RECITERS.map(r=>r.id)).size,57);
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>index});try{await loadIndex();}finally{globalThis.fetch=originalFetch;}
const popularity=await fs.readFile(new URL('../supabase/functions/reciter-popularity/index.ts',import.meta.url),'utf8'),sql=await fs.readFile(new URL('../supabase/reciter-expansion-418.sql',import.meta.url),'utf8');
for(const r of report.reciters){
 assert.deepEqual(reciterInfo(r.id),r);assert.ok(COMPETITION_RECITERS.includes(r.id));assert.ok(popularity.includes(JSON.stringify(r.id)));assert.ok(sql.includes(r.id));
 const snapshot=competitionSnapshot({action:'snapshot',device:'11111111-1111-4111-8111-111111111111',totals:{[r.id]:60},days:{'2026-10-29':{[r.id]:60}},timeZone:'UTC'},now);assert.equal(snapshot.totals[r.id],60);
 assert.match(r.sourceApi,/reciter=\d+$/);assert.match(RECITER_ADDED_AT[r.id],/^2026-10-29/);assert.ok((await fs.readFile(new URL('../dist/'+r.portrait,import.meta.url))).length>1000);
 assert.equal(timingUrl({number:1},r.id),null,'Do not invent verse synchronization for new recordings');assert.equal(audioUrl(1,r.id,1),r.server+'001.mp3');
 const audio=[];class FixtureAudio{constructor(url){this.src=url;this.paused=true;audio.push(this);}pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}}
 const states=[],player=createQuranPlayer({surah:reciterRecording(index,112),reciter:r.id,onState:s=>states.push(s),onVerse(){},onError(){throw Error('Unexpected player error '+r.id);},createAudio:url=>new FixtureAudio(url),getAudio:async()=>null,setTimer:()=>null,clearTimer(){},loadTimings:async()=>null});
 await player.play();assert.equal(audio[0].src,r.server+'112.mp3');assert.equal(states.at(-1).status,'playing');player.pause();assert.equal(audio[0].paused,true);player.destroy();
 assert.ok(reciterOptions(r.id,[r.id]).includes('value="'+r.id+'" selected'));assert.deepEqual(toggleReciterFavorite([],r.id,RECITERS),[r.id]);
}
assert.equal(reciterInfo('ar.fahadalkandari').availableSurahs.length,77);assert.equal(reciterHasSurah('ar.fahadalkandari',3),false);assert.equal(adjacentReciterSurah('ar.fahadalkandari',2,1),6);assert.equal(reciterHasSurah('ar.fahadalkandari',114),true);
assert.equal(reciterInfo('ar.noreensiddiq').riwaya,'ад-Дури от Абу Амра');assert.ok(!reciterInfo('ar.peshawaalkurdi').variantOf);assert.ok(reciterInfo('ar.raadalkurdi'),'Existing Kurdi identity and listening history preserved');
assert.deepEqual(orderReciterCatalog(RECITERS,[],now).slice(0,8).map(r=>r.id),ids);assert.ok(ids.every(id=>recentReciters(RECITERS,now).some(r=>r.id===id)));
const catalogSource=await fs.readFile(new URL('../dist/js/quran-reciter-library.js',import.meta.url),'utf8');assert.ok(catalogSource.includes('r.riwaya'));assert.ok(catalogSource.includes('reciterHasSurah(r.id,s.number)'));
console.log('PASS: eight new identities, 54 public readers, exact audio URLs and player start/pause, partial chapters, riwaya label, favorites, discovery, ranking allowlists and no invented timings.');
