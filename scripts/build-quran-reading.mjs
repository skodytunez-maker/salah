import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {arabicReadingKey,readingTranscription} from '../dist/js/quran-transcription.js';
const root=new URL('../',import.meta.url),file=p=>new URL(p,root),hash=b=>createHash('sha256').update(b).digest('hex');
const generated=JSON.parse(await fs.readFile(file('work/quran-reading-generated.json'),'utf8'));
assert.equal(generated.engine,'quran-transcript@0.6.4');assert.equal(generated.errors.length,0);assert.equal(generated.surahs.length,114);
const index=JSON.parse(await fs.readFile(file('dist/data/quran-index.json'),'utf8'));let total=0;
await fs.mkdir(file('dist/data/quran-reading'),{recursive:true});
for(const row of generated.surahs){
 const meta=index.surahs[row.number-1],bytes=await fs.readFile(file('dist/data/quran/'+row.number+'.json')),source=JSON.parse(bytes);
 assert.equal(hash(bytes),meta.sha256);assert.equal(row.verses.length,meta.ayahs);
 const reading={number:row.number,edition:'salah-reading-v2',reviewStatus:'editorial',engine:generated.engine,sourceSha256:meta.sha256,attribution:'Tanzil Arabic via AlQuranCloud; Quran Transcript phonetics; SALAH Cyrillic notation',license:'../quran-reading-LICENSE.txt',verses:row.verses.map((v,i)=>({ayah:v.ayah,arabicKey:arabicReadingKey(source.verses[i].arabic),text:[1,112,113,114].includes(row.number)?readingTranscription(source,source.verses[i],'salah-preview'):v.text}))};
 const output=Buffer.from(JSON.stringify(reading)+'\n');await fs.writeFile(file('dist/data/quran-reading/'+row.number+'.json'),output);meta.readingSha256=hash(output);meta.readingBytes=output.length;total+=output.length;
}
index.transcriptionBytes=total;index.reading={edition:'salah-reading-v2',format:'SALAH: уа, к/қ, аа/ии/уу, ayah pause endings',engine:generated.engine,engineSource:'https://github.com/obadx/quran-transcript',arabicSource:'https://tanzil.net',reviewStatus:'editorial',moshaf:generated.moshaf,preparedOn:new Date().toISOString().slice(0,10)};
await fs.writeFile(file('dist/data/quran-index.json'),JSON.stringify(index)+'\n');console.log('Prepared 114 reading files; run check-quran-transcription.mjs before publication.');
