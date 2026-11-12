import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {selectRadioProgram,shuffleRadio,measureRadioCandidates,probeRadioDuration} from '../dist/js/radio-program-core.js';
import {radioQuizQuestions,initialRadioQuiz,stepRadioQuiz} from '../dist/js/radio-quiz-core.js';
import {RECITERS,reciterInfo,reciterHasSurah} from '../dist/js/quran-reciters.js';
import {audioUrl} from '../dist/js/quran-data.js';
import {reciterRecording} from '../dist/js/quran-reciter-recording.js';
const index=JSON.parse(await fs.readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
const ids=['ar.yasseraldossaricontinuous','ar.idrisabkar','ar.alafasycontinuous','ar.mahermuaiqlycontinuous'];
for(const id of ids){assert.equal(reciterInfo(id).format,'surah');for(const s of index.surahs.slice(77))if(reciterHasSurah(id,s.number))assert.ok(audioUrl(reciterRecording(index,s.number).verses[0].number,id,s.number).startsWith('https:'));}
let seed=42;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
const fixtures=Array.from({length:140},(_,i)=>({reciter:ids[i%4],surah:78+Math.floor(i/4),duration:31+i%220,url:'https://example.test/'+i}));
for(let i=0;i<12;i++){const plan=selectRadioProgram(fixtures.concat(fixtures.slice(0,8)),{random});assert.ok(plan.complete);assert.ok(plan.duration<=3600);assert.ok(plan.duration>=3510);assert.equal(new Set(plan.tracks.map(t=>t.reciter+':'+t.surah)).size,plan.tracks.length);assert.ok(new Set(plan.tracks.map(t=>t.reciter)).size>1);assert.equal(plan.duration,plan.tracks.reduce((sum,t)=>sum+t.duration,0));}
assert.notDeepEqual(selectRadioProgram(fixtures,{random}).tracks,selectRadioProgram(fixtures,{random}).tracks);
assert.equal(selectRadioProgram([{reciter:'a',surah:114,duration:40},{reciter:'a',surah:114,duration:40},{reciter:'a',surah:2,duration:50},{reciter:'a',surah:113,duration:Infinity}]).duration,40);
assert.equal(selectRadioProgram([]).complete,false);assert.equal(fixtures.length,140);
const copy=fixtures.slice();shuffleRadio(fixtures,random);assert.deepEqual(fixtures,copy);
let concurrent=0,peak=0,done=0;const measured=await measureRadioCandidates(fixtures.slice(0,9),{probe:async()=>{peak=Math.max(peak,++concurrent);await new Promise(resolve=>setTimeout(resolve,1));concurrent--;return ++done===2?null:60;},onProgress:(n,total)=>{assert.ok(n<=total);}});assert.equal(peak,3);assert.equal(measured.length,8);
const abort=new AbortController();await assert.rejects(measureRadioCandidates(fixtures,{signal:abort.signal,probe:async()=>{abort.abort();return 60;}}),{name:'AbortError'});
let audio,plays=0,released=0;
const probe=probeRadioDuration('https://example.test/file',{aborted:false,addEventListener(){},removeEventListener(){}},{createAudio:()=>audio={duration:73.5,play(){plays++},pause(){},removeAttribute(){released++},load(){if(this.src)queueMicrotask(()=>this.onloadedmetadata?.());}}});
assert.equal(await probe,73.5);assert.equal(plays,0);assert.equal(released,1);
assert.equal(await probeRadioDuration('x',null,{createAudio:()=>({pause(){},removeAttribute(){},load(){}}),timeout:1}),null);
const qs=radioQuizQuestions(index);assert.equal(qs.length,5);assert.equal(qs[0].answer,'114');assert.equal(qs[4].answer,'3');
assert.throws(()=>radioQuizQuestions({surahs:[]}));
let state=initialRadioQuiz();
assert.equal(stepRadioQuiz(state,{type:'buzz',player:0}),state);
for(let i=0;i<5;i++){state=stepRadioQuiz(state,{type:'show'});state=stepRadioQuiz(state,{type:'open'});state=stepRadioQuiz(state,{type:'buzz',player:i%2});const locked=state;assert.equal(stepRadioQuiz(state,{type:'buzz',player:1-i%2}),locked);state=stepRadioQuiz(state,{type:'reveal'});state=stepRadioQuiz(state,{type:'judge',correct:true});const scored=state;assert.equal(stepRadioQuiz(state,{type:'judge',correct:true}),scored);state=stepRadioQuiz(state,{type:'next'});}
assert.equal(state.phase,'finished');assert.deepEqual(state.scores,[3,2]);
const source=await fs.readFile(new URL('../dist/js/radio-preview.js',import.meta.url),'utf8');
const win=new Window(),host=win.document.createElement('main');win.document.body.append(host);
let owner=false,listener=null,loads=0,played=0;const timers=new Set();
const context=vm.createContext({console,URLSearchParams,AbortController,Set,Map,Math,Number,String,Array,Promise,
 ownerVerified:()=>owner,verifyOwner:async()=>owner,onOwnerChange:fn=>{listener=fn;return()=>{if(listener===fn)listener=null;}},
 loadIndex:async()=>{loads++;return index;},audioUrl,reciterInfo,reciterHasSurah,reciterRecording,
 quranPlayback:{start:async()=>{played++;}},reciterImageUrl:p=>'./'+p,
 esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 shuffleRadio,selectRadioProgram,measureRadioCandidates,probeRadioDuration,radioQuizQuestions,initialRadioQuiz,stepRadioQuiz,
 setInterval:fn=>{timers.add(fn);return fn;},clearInterval:fn=>timers.delete(fn)});
vm.runInContext(source.replace(/^import[^\n]*\n/gm,'').replace(/export /g,''),context);
await context.showRadioPreview(host);assert.ok(host.textContent.includes('только владельцу'));assert.equal(loads,0);assert.equal(host.querySelector('.radio-preview'),null);
owner=true;await context.showRadioPreview(host);assert.ok(host.querySelector('.radio-preview'));assert.equal(played,0);assert.ok(host.textContent.includes('Публичный эфир не запущен'));
host.querySelector('[data-open-quiz]').click();host.querySelector('[data-quiz="show"]').click();assert.ok(host.textContent.includes('Сколько сур'));assert.equal(host.querySelector('[data-buzz]'),null);host.querySelector('[data-quiz="open"]').click();host.querySelector('[data-buzz="0"]').click();assert.equal(host.querySelector('[data-buzz]'),null);host.querySelector('[data-quiz="reveal"]').click();assert.ok(host.textContent.includes('114'));host.querySelector('[data-judge="yes"]').click();assert.ok(host.querySelector('[data-quiz="next"]'));
owner=false;listener();assert.equal(host.querySelector('.radio-preview'),null);assert.equal(timers.size,0);
owner=true;let resolveLoad;const opening=context.showRadioPreview(host,{verify:async()=>true,isOwner:()=>owner,subscribe:()=>()=>{},load:()=>new Promise(resolve=>{resolveLoad=resolve;})});await new Promise(resolve=>setTimeout(resolve,0));context.stopRadioPreview();host.innerHTML='<p>Главная</p>';resolveLoad(index);await opening;assert.equal(host.textContent,'Главная');
owner=true;await context.showRadioPreview(host,{probe:async()=>60});host.querySelector('[data-radio-tab="program"]').click();host.querySelector('[data-build]').click();await new Promise(resolve=>setTimeout(resolve,50));assert.ok(host.querySelector('.radio-program-summary'));assert.ok(host.textContent.includes('60:00'));assert.equal(played,0);host.querySelector('[data-audition]').click();await Promise.resolve();assert.equal(played,1);
context.stopRadioPreview();assert.equal(timers.size,0);
await context.showRadioPreview(host,{verify:async()=>{throw Error('offline');}});assert.equal(host.querySelector('.radio-preview'),null);
context.stopRadioPreview();win.happyDOM.abort();
const app=await fs.readFile(new URL('../dist/js/app.js',import.meta.url),'utf8'),auth=await fs.readFile(new URL('../dist/js/owner-auth.js',import.meta.url),'utf8');
assert.ok(app.includes("else if(currentRoute==='radio')"));assert.ok(auth.includes("'#radio'"));assert.ok(app.includes("if(currentRoute!=='radio')stopRadioPreview()"));
console.log('PASS: closed radio denies unverified/direct access and revokes stale sessions; measured hour selection, cancellation, silent metadata probes, audition and five-round quiz work without duplicate scoring.');
