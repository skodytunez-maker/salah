import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{createHash}from 'node:crypto';
import{createQuranTranslationLibrary,TRANSLATION_MANIFEST_SHA256,QURAN_TRANSLATION_CACHE}from '../dist/js/quran-translations.js';
const manifest=await readFile(new URL('../dist/data/quran-translation-manifest.json',import.meta.url)),source=await readFile(new URL('./fixtures/quran-translations/azeri_musayev-1.json',import.meta.url));
assert.equal(createHash('sha256').update(manifest).digest('hex'),TRANSLATION_MANIFEST_SHA256);
const data=JSON.parse(manifest),az=data.editions.find(row=>row.providerKey==='azeri_musayev');
assert.equal(createHash('sha256').update(source).digest('hex'),az.surahSha256[0]);
const index=JSON.parse(await readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
assert.deepEqual(data.surahAyahs,index.surahs.map(row=>row.ayahs));assert.equal(data.editions.length,7);
assert.equal(new Set(data.editions.map(row=>row.id)).size,7);
for(const row of data.editions){assert.equal(row.surahSha256.length,114);assert.equal(row.publisher,'QuranEnc.com');assert.equal(row.format,'publisher-api-v1');assert.match(row.source,/^https:\/\/quranenc\.com\/en\/browse\/[a-z_]+$/);assert.equal(row.terms,'https://quranenc.com/en/home');}
assert.ok(data.editions.filter(row=>row.language==='uz').every(row=>row.script==='Cyrl'),'Source Uzbek script is not silently transliterated to match the UI');
assert.ok(data.editions.every(row=>row.language!=='ar'&&!/mokhtasar|tafsir/i.test(row.id)),'This catalogue does not restore public Tafsir');
const stored=new Map(),calls=[];let offline=false,corrupt=false,putFails=false;
const cache={match:async key=>stored.get(key)?.clone(),put:async(key,response)=>{if(putFails)throw Error('full');stored.set(key,response.clone());},delete:async key=>stored.delete(key)};
const cacheStorage={open:async name=>{assert.equal(name,QURAN_TRANSLATION_CACHE);return cache;}};
const fetcher=async(url,options)=>{
 calls.push({url,options});assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
 if(offline)throw Error('offline');
 if(url.endsWith('/data/quran-translation-manifest.json'))return new Response(manifest);
 assert.equal(url,'https://quranenc.com/api/v1/translation/sura/azeri_musayev/1');
 return new Response(corrupt?Buffer.from(source.toString().replace('Allaha','<script>')):source);
};
const library=createQuranTranslationLibrary({fetcher,cacheStorage,baseURL:'https://salah.invalid/salah/'});
const list=await library.list();assert.equal(list.length,7);assert.equal('surahSha256'in list[0],false);
const result=await library.loadSurah(az.id,1,{requireStored:true});assert.equal(result.verses.length,7);assert.equal(result.language,'az');
const original=JSON.parse(source).result;
for(let i=0;i<7;i++){assert.equal(result.verses[i].translation,original[i].translation);assert.equal(result.verses[i].footnotes,original[i].footnotes);assert.equal(result.verses[i].sourceArabic,original[i].arabic_text);assert.equal(result.verses[i].number,i+1);}
assert.ok(Object.isFrozen(result.verses[0]));assert.equal(await library.savedCount(az.id),1);
offline=true;const before=calls.length;assert.deepEqual(await library.loadSurah(az.id,1),result);assert.equal(calls.length,before,'A verified offline copy never needs the network');
// A fresh library has no warm manifest promise. Model the same-origin manifest
// supplied by the installed app/SW and forbid every publisher request entirely.
let coldManifestReads=0;
const cold=createQuranTranslationLibrary({cacheStorage,baseURL:'https://salah.invalid/salah/',fetcher:async(url,options)=>{assert.equal(url,'https://salah.invalid/salah/data/quran-translation-manifest.json');assert.equal(options.credentials,'omit');coldManifestReads++;return new Response(manifest);}});
assert.deepEqual(await cold.loadSurah(az.id,1),result,'A new app session revalidates cached publisher bytes using the locally supplied pinned manifest');assert.equal(coldManifestReads,1);assert.equal((await cold.list()).length,7);assert.equal(coldManifestReads,1);
const workerSource=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');assert.ok(JSON.parse(workerSource.match(/const ASSETS=(\[[^\n]*\]);/)[1]).includes('./data/quran-translation-manifest.json'),'The installed shell includes the pinned manifest needed on a cold offline start');
offline=false;const key=[...stored.keys()][0];stored.set(key,new Response('{"result":[]}'));
assert.deepEqual(await library.loadSurah(az.id,1),result,'A corrupt cached file is discarded and replaced by verified publisher bytes');
for(const value of [0,115,1.5,'1'])await assert.rejects(library.loadSurah(az.id,value),error=>error.code==='translation_surah_invalid');
await assert.rejects(library.loadSurah('https://untrusted.invalid/x',1),error=>error.code==='translation_unknown');
stored.clear();corrupt=true;
// Alter a known byte without re-pinning its manifest hash.
const badLibrary=createQuranTranslationLibrary({fetcher:async(url,options)=>url.endsWith('/data/quran-translation-manifest.json')?new Response(manifest):new Response(Buffer.concat([source,Buffer.from(' ')])),cacheStorage,baseURL:'https://salah.invalid/salah/'});
await assert.rejects(badLibrary.loadSurah(az.id,1),error=>error.code==='translation_integrity_failed');assert.equal(stored.size,0);
corrupt=false;putFails=true;await assert.rejects(library.loadSurah(az.id,1,{requireStored:true}),error=>error.code==='translation_store_failed');putFails=false;
const unavailable=createQuranTranslationLibrary({fetcher,cacheStorage:null,baseURL:'https://salah.invalid/salah/'});
await assert.rejects(unavailable.saveAll(az.id),error=>error.code==='translation_storage_unavailable');
const invalidManifest=createQuranTranslationLibrary({fetcher:async()=>new Response(Buffer.concat([manifest,Buffer.from(' ')])),cacheStorage:null});await assert.rejects(invalidManifest.list(),error=>error.code==='translation_integrity_failed');
const controller=new AbortController();controller.abort();await assert.rejects(library.loadSurah(az.id,1,{signal:controller.signal}),error=>error.name==='AbortError');
let sourceAborted=false;
const stalled=createQuranTranslationLibrary({timeoutMs:20,cacheStorage:null,fetcher:async(url,options)=>{
 if(url.endsWith('/data/quran-translation-manifest.json'))return new Response(manifest);
 return new Response(new ReadableStream({start(stream){options.signal.addEventListener('abort',()=>{sourceAborted=true;stream.error(new DOMException('Aborted','AbortError'));},{once:true});}}));
}});
await assert.rejects(stalled.loadSurah(az.id,1),error=>error.name==='AbortError');assert.equal(sourceAborted,true,'Timeout covers a stalled body, not just response headers');
for(const name of ['index.html','owner.html','share.html']){
 const html=await readFile(new URL('../dist/'+name,import.meta.url),'utf8'),policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 assert.ok(policy.split(';').find(row=>row.trim().startsWith('connect-src ')).trim().split(/\s+/).includes('https://quranenc.com'));
}
console.log('PASS: seven author/version/script-labelled editions, 798 pinned surah hashes and exact Quran mapping; verified publisher text/notes, offline reuse, corrupt-cache recovery, denied writes, tampering, cancellation, whole-response timeout and bounded source origin.');
