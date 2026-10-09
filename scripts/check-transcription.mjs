// Release251 updates only reviewed source fields; original text/targets separately pinned by check-adhkar-sources.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {hasOwnTranscription,readingTranscription} from '../dist/js/quran-transcription.js';
const load=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const data=await load('../dist/data/adhkar.json');
const strip=x=>JSON.parse(JSON.stringify(x,(k,v)=>['title','transliteration','transliterationNote','transcription'].includes(k)?undefined:v));
assert.equal(createHash('sha256').update(JSON.stringify(strip(data))).digest('hex'),'fcfa14f59902d1648b88d374f436b12e261fd8e46e33655fee49f6fa51d85796','Arabic, translations, sources, IDs and repetition targets must remain unchanged');
for(const item of data.items){
 const arabic=item.arabic||item.verses.map(v=>v.arabic).join(' '),reading=item.transliteration||item.verses.map(v=>v.transliteration).join(' ');
 if(item.id!=='surah114')assert.equal(/[вВ]/.test(reading),false,item.id+': waw is read with у'); // 114:5 retains the requested source spelling Йувасвису, checked below.
 assert.equal((arabic.match(/ق/g)||[]).length,(reading.match(/[қҚ]/g)||[]).length,item.id+': qaf must stay distinct from kaf');
}
assert.match(data.items.find(x=>x.id==='sayyid').transliteration,/раббии, ля иляаха илляа ант\./);
assert.match(data.items.find(x=>x.id==='sayyid').transliteration,/илляа ант\.$/);
assert.match(data.items.find(x=>x.id==='tasbih').transliteration,/бихамдих\.$/);
assert.match(data.items.find(x=>x.id==='raditu').transliteration,/набиййаа\.$/);
for(const n of [112,113,114]){
 const surah=await load('../dist/data/quran/'+n+'.json'),item=data.items.find(x=>x.id==='surah'+n);
 assert.equal(hasOwnTranscription(surah),true);
 for(const verse of surah.verses){
  const adapted=readingTranscription(surah,verse,'salah-preview').replace(/^Бисмилляахир-рахмаанир-рахиим\.\s+/u,'');
  assert.equal(adapted.replace(/қ/g,'к').replace(/Қ/g,'К'),verse.transliteration.replace(/\.$/,''),'Source spelling must change only kaf/qaf notation');
  assert.equal((verse.arabic.match(/ق/g)||[]).length,(adapted.match(/[қҚ]/g)||[]).length,'Qaf count matches the original Arabic');
 }
 if(n===112)assert.match(item.verses[3].transliteration,/якулляху куфууан Ахад/);
 if(n===114){assert.equal(item.verses[1].transliteration,'Маликин-Наас.');assert.equal(item.verses[4].transliteration,'Аль-Лязи Йувасвису Фи Судурин-Наас.');}
 for(const verse of surah.verses)assert.equal(readingTranscription(surah,verse,'salah-preview')+'.',item.verses[verse.ayah-1].transliteration,'Same Arabic verse must have the same SALAH reading');
 assert.equal(readingTranscription(surah,surah.verses[0],'source'),surah.verses[0].transliteration,'Source selection remains available');
 const changed=structuredClone(surah);changed.verses[0].arabic+=' ا';
 assert.equal(hasOwnTranscription(changed),false,'Different Arabic text cannot receive a mismatched manual reading');
 assert.equal(readingTranscription(changed,changed.verses[0],'salah-preview'),changed.verses[0].transliteration);
}
const fatiha=await load('../dist/data/quran/1.json');
assert.equal(hasOwnTranscription(fatiha),true);assert.match(readingTranscription(fatiha,fatiha.verses[5],'salah-preview'),/мустақиим/);
const other=await load('../dist/data/quran/2.json');assert.equal(hasOwnTranscription(other),false);assert.equal(readingTranscription(other,other.verses[0],'salah-preview'),other.verses[0].transliteration);
console.log('PASS: adhkar readings, source-adapted short surahs, waw, kaf/qaf, pause endings, original text/counter integrity and safe Quran fallback.');
