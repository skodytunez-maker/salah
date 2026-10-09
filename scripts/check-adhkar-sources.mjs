import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{createHash}from 'node:crypto';
const root=new URL('../',import.meta.url),data=JSON.parse(await fs.readFile(new URL('dist/data/adhkar.json',root),'utf8')),proof=JSON.parse(await fs.readFile(new URL('docs/dua-primary-sources-251.json',root),'utf8'));
const preserved=JSON.stringify(data.items.map(item=>Object.fromEntries(proof.unchangedFields.map(key=>[key,item[key]]))));assert.equal(createHash('sha256').update(preserved).digest('hex'),proof.unchangedContentSha256,'Texts, IDs and counter targets must remain unchanged');
for(const f of ['dist/data/adhkar.json','dist/js/adhkar.js','dist/js/learning.js','dist/data/learning-adhkar-audio-sources.json']){const text=await fs.readFile(new URL(f,root),'utf8');assert.ok(!/Крепост[ьи] мусульманина/.test(text),'No secondary book title in '+f);}
for(const item of data.items){assert.ok(!item.source?.includes('/hisn:'),'Primary references only');if(item.additionalSource)assert.notEqual(item.additionalSource,item.source);}
assert.match(data.items.find(i=>i.id==='hasbi').sourceNote,/вымышленную/);assert.match(data.items.find(i=>i.id==='raditu').sourceNote,/не установлено/);
console.log('PASS: original dua text/IDs/targets preserved; primary source links, transmission caveats and no removed book title in rendered inputs.');
