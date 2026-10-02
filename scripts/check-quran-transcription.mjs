import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import {hasOwnTranscription,readingTranscription,arabicReadingKey} from '../dist/js/quran-transcription.js';
const dir=new URL('../dist/',import.meta.url),load=async p=>JSON.parse(await fs.readFile(new URL(p,dir),'utf8'));
const index=await load('data/quran-index.json');
assert.equal(createHash('sha256').update(index.surahs.map(s=>s.number+':'+s.sha256).join('\n')).digest('hex'),'14c84bbd21b3694aa368e566dbbbd5e22daad65fc3488c95f6227dd27f211bb3','All existing Arabic, translations, tajweed and source transcriptions stay byte-for-byte intact');
let count=0,total=0;
for(const meta of index.surahs){
 const source=await load('data/quran/'+meta.number+'.json'),bytes=await fs.readFile(new URL('data/quran-reading/'+meta.number+'.json',dir)),data=JSON.parse(bytes);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.readingSha256);assert.equal(bytes.length,meta.readingBytes);total+=bytes.length;
 assert.equal(data.sourceSha256,meta.sha256);assert.equal(data.number,meta.number);assert.equal(data.verses.length,meta.ayahs);
 const surah={...source,salahReading:data};assert.equal(hasOwnTranscription(surah),true);
 for(const [i,row] of data.verses.entries()){
  const verse=source.verses[i];assert.equal(row.ayah,verse.ayah);assert.equal(row.arabicKey,arabicReadingKey(verse.arabic));
  assert.ok(row.text.trim());assert.ok(!/[A-Za-z\u0600-\u06ff<>вВ]/.test(row.text),'Only safe Cyrillic notation: '+meta.number+':'+row.ayah);
  assert.equal(readingTranscription(surah,verse,'source'),verse.transliteration);
  assert.equal(readingTranscription(surah,verse,'salah-preview'),row.text);count++;
 }
 const changed=structuredClone(surah);changed.verses[0].arabic+=' ا';assert.equal(hasOwnTranscription(changed),false);assert.equal(readingTranscription(changed,changed.verses[0],'salah-preview'),changed.verses[0].transliteration);
}
assert.equal(count,6236);assert.equal(total,index.transcriptionBytes);
const readings=await load('data/quran-reading/109.json');assert.match(readings.verses[0].text,/Қуль?/);assert.match(readings.verses[0].text,/каафируун/);assert.match(readings.verses[1].text,/та‘будуун$/);
const alaq=await load('data/quran-reading/96.json');assert.match(alaq.verses[0].text,/Иқра/);assert.match(alaq.verses[0].text,/халяқ$/);
const kahf=await load('data/quran-reading/18.json');assert.match(kahf.verses[2].text,/абадаа$/);
const baqara=await load('data/quran-reading/2.json');assert.match(baqara.verses[1].text,/муттақиин$/);
assert.equal((baqara.verses[236].text.match(/‘уқдатун-никаахи/g)||[]).length,1,'2:237 has one marriage-contract clause');
assert.equal((baqara.verses[257].text.match(/ибраахиим/g)||[]).length,3,'2:258 has three mentions of Ibrahim, without duplicated clauses');
assert.match(baqara.verses[254].text,/маа фис-самаауаати уамаа филь-’арди/,'2:255 word boundaries remain intact');
const mulk=await load('data/quran-reading/67.json');assert.match(mulk.verses[2].text,/фарджи‘иль-басара хал тараа мин футуур$/,'67:3 does not split phonemes inside words');
// Exercise actual integrity validation, storage and offline loading, not a duplicate loader.
const stored=new Map(),cache={async match(url){return stored.get(String(url))?.clone()},async put(url,response){stored.set(String(url),response.clone())}};
if(!globalThis.crypto)globalThis.crypto=webcrypto;globalThis.location={href:'https://example.github.io/salah/'};globalThis.window={caches:{}};globalThis.caches={async open(){return cache}};
let offline=false,corrupt=false;globalThis.fetch=async url=>{let p=new URL(url,location.href).pathname.replace('/salah/','');if(offline&&p!=='data/quran-index.json')throw Error('Offline');if(corrupt&&p==='data/quran-reading/2.json')return new Response('{"tampered":true}');try{return new Response(await fs.readFile(new URL(p,dir)))}catch{return new Response('',{status:404})}};
const online=await import('../dist/js/quran-data.js?reading-online');
await online.saveAllTexts(index,()=>{});assert.equal(await online.offlineTextCount(index),114);
offline=true;const saved=await import('../dist/js/quran-data.js?reading-offline');const savedSurah=await saved.loadSurah(2);assert.equal(hasOwnTranscription(savedSurah),true);assert.match(readingTranscription(savedSurah,savedSurah.verses[1],'salah-preview'),/муттақиин$/);
// A device with older saved source files can still read without the new layer.
for(const key of [...stored.keys()])if(key.includes('/quran-reading/'))stored.delete(key);
const legacy=await import('../dist/js/quran-data.js?reading-legacy-offline');const legacySurah=await legacy.loadSurah(2);assert.equal(legacySurah.verses.length,286);assert.equal(hasOwnTranscription(legacySurah),false);assert.equal(readingTranscription(legacySurah,legacySurah.verses[1],'salah-preview'),legacySurah.verses[1].transliteration);
offline=false;corrupt=true;const invalid=await import('../dist/js/quran-data.js?reading-corrupt');const safeSurah=await invalid.loadSurah(2);assert.equal(safeSurah.verses.length,286);assert.equal(hasOwnTranscription(safeSurah),false);assert.equal(stored.has(new URL('data/quran-reading/2.json',location.href).href),false,'Corrupt reading is never stored');
// A slow optional reading download must not keep the Arabic reader blocked.
const originalFetch=globalThis.fetch;corrupt=false;
globalThis.fetch=(url,options)=>String(url).includes('/quran-reading/2.json')?new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})}):originalFetch(url,options);
const slow=await import('../dist/js/quran-data.js?reading-timeout');const start=Date.now(),fallback=await slow.loadSurah(2);assert.equal(fallback.verses.length,286);assert.equal(hasOwnTranscription(fallback),false);assert.ok(Date.now()-start<4500,'Optional reading timeout preserves prompt source reading');
console.log('PASS: 114 surahs / 6236 readings, intact original corpus, qaf/kaf and pause fixtures, Arabic binding, exact SHA-256, source choice, full offline download, old offline compatibility and corrupted-layer rejection.');
