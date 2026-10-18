import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{mountReaderDownload,audioDownloadError}from '../dist/js/quran-reader-download.js';
const w=new Window(),surah=JSON.parse(await fs.readFile(new URL('../dist/data/quran/1.json',import.meta.url),'utf8'));
const shell=w.document.createElement('section');w.document.body.append(shell);shell.innerHTML='<button id="quran-download-audio">Скачать аудио</button><p id="quran-audio-download-status" role="status"></p>';
const button=shell.querySelector('button'),status=shell.querySelector('p'),tick=()=>new Promise(resolve=>setTimeout(resolve,0));let release,progress,signal,calls=0,reciter='ar.yasseraldossaricontinuous';
const mounted=mountReaderDownload(shell,surah,()=>reciter,{save:(s,id,onProgress,abortSignal)=>{calls++;progress=onProgress;signal=abortSignal;return new Promise(resolve=>release=resolve);}});
button.click();assert.match(status.textContent,/Подключаемся/,'Immediate feedback before any response');assert.equal(button.disabled,false,'Cancel remains usable');assert.equal(button.type,'button');assert.equal(button.getAttribute('aria-busy'),'true');assert.equal(shell.dataset.audioDownload,'active');
progress(0,1048576,{phase:'downloading'});assert.match(status.textContent,/1,0 МБ/);release(1048576);await tick();assert.match(status.textContent,/Сохранено в SALAH/);assert.match(status.textContent,/без интернета/);assert.equal(button.textContent,'Аудио сохранено');assert.equal(button.hasAttribute('aria-busy'),false);
button.click();const oldRelease=release;button.click();assert.ok(signal.aborted);assert.match(status.textContent,/остановлено/);button.click();assert.equal(calls,3);oldRelease(10);await tick();assert.match(status.textContent,/Подключаемся/,'A cancelled response cannot overwrite the new download');
reciter='ar.alafasy';mounted.reset();assert.ok(signal.aborted);assert.match(button.textContent,/Скачать аудио/);assert.equal(status.textContent,'');button.click();const late=release;mounted.dispose();late(10);await tick();assert.doesNotMatch(status.textContent,/Сохранено/,'No completion after leaving the reader');
for(const name of ['TimeoutError','QuotaExceededError','TypeError']){
 const failed=mountReaderDownload(shell,surah,()=>reciter,{save:async()=>{const e=Error(name);e.name=name;throw e;}});button.click();await tick();assert.equal(status.textContent,audioDownloadError({name}));assert.equal(button.textContent,'Повторить скачивание');assert.equal(button.disabled,false);failed.dispose();
}
const data=await fs.readFile(new URL('../dist/js/quran-data.js',import.meta.url),'utf8');assert.match(data,/https:\/\/cdn\.mp3quran\.net\/audio\/yasser-dosari\/r1\//);
const source=await fs.readFile(new URL('../dist/js/quran.js',import.meta.url),'utf8');assert.match(source,/readerDownload\?\.dispose\(\)/);assert.match(source,/readerDownload\?\.reset\(\)/);
console.log('PASS: immediate reader download feedback, streamed byte count, cancellation/restart, persistent timeout/storage/network errors, original reciter identity, offline completion and no stale UI after navigation.');await w.happyDOM.close();
