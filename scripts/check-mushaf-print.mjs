import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{PRINT_LAYOUT_SHA256,PRINT_VERSE_PAGES,MADANI_LAYOUT_SHA256,MADANI_VERSE_PAGES}from '../dist/js/quran-mushaf-print-index.js';
import{printedVerseKeys,printedPageForPosition,printedNeedsBasmala,printedPageMarkup,printedFitSize}from '../dist/js/quran-mushaf-print.js';
const bytes=await fs.readFile(new URL('../dist/data/mushaf-print/layout.json',import.meta.url)),data=JSON.parse(bytes);
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),PRINT_LAYOUT_SHA256);assert.equal(data.pages.length,604);
const index=JSON.parse(await fs.readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8')),surahs=new Map();
for(const s of index.surahs)surahs.set(s.number,JSON.parse(await fs.readFile(new URL('../dist/data/quran/'+s.number+'.json',import.meta.url),'utf8')));
const offsets=[];let n=0;for(const s of index.surahs){offsets[s.number]=n;n+=s.ayahs;}
const ends=new Set(),first={},wordIds=new Set();let previous=0,headers=0,basmalas=0,words=0;
for(const [p,lines]of data.pages.entries()){
 assert.ok(lines.length===15||p<2);let previousLine=0;
 for(const [line,type,s,rows]of lines){
  assert.ok(line>previousLine&&line<=15);previousLine=line;assert.ok(['text','surah-header','basmala'].includes(type));
  if(type==='surah-header'){headers++;assert.ok(s>=1&&s<=114);continue;}if(type==='basmala'){basmalas++;continue;}
  assert.ok(rows.length);
  for(const [surah,ayah,position,glyph]of rows){
   assert.ok(surah>=1&&surah<=114&&ayah>=1&&ayah<=index.surahs[surah-1].ayahs);assert.ok(Number.isInteger(position)&&position>=1);
   const current=offsets[surah]+ayah;assert.ok(current>=previous,'Verse order changed');previous=current;
   const key=surah+':'+ayah,id=key+':'+position;assert.ok(!wordIds.has(id),'Repeated word '+id);wordIds.add(id);words++;first[key]??=p+1;
   assert.ok(/^[\uE000-\uF8FF\uFB50-\uFDFF\uFE70-\uFEFF ]+$/.test(glyph));if(glyph.includes(' '))ends.add(key);
  }
 }
}
assert.equal(headers,114);assert.equal(basmalas,112);assert.equal(Object.keys(first).length,6236);assert.equal(ends.size,6236);assert.equal(words,77432);assert.deepEqual(first,PRINT_VERSE_PAGES);
assert.equal(printedPageForPosition(2,255),42);assert.equal(printedPageForPosition(5,96),124);assert.equal(printedPageForPosition(115,1),null);
assert.equal(printedNeedsBasmala(data.pages[1]),true);assert.equal(printedNeedsBasmala(data.pages[123]),false);const special=data.pages.flatMap(p=>p.flatMap(l=>l[3])).filter(w=>w[0]===37&&w[1]===130);assert.equal(special.length,3);assert.equal([...special[2][3].split(' ')[0]].length,2);assert.equal([...special[2][3].split(' ')[1]].length,1);
const w=new Window(),host=w.document.createElement('div');w.document.body.append(host);const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
host.innerHTML=printedPageMarkup(data.pages[123],124,index,surahs,esc,'ﱁ ﱂ ﱃ ﱄ');assert.equal(host.querySelectorAll('.mushaf-print-line').length,15);assert.equal(host.querySelectorAll('.mushaf-print-word').length,data.pages[123].reduce((n,l)=>n+l[3].length,0));
assert.ok([...host.querySelectorAll('.mushaf-print-word')].every(e=>e.style.fontFamily==='SALAHMushaf124'&&e.getAttribute('aria-hidden')==='true'));assert.ok(!host.querySelector('.quran-translation,.quran-transliteration'));
const keys=printedVerseKeys(data.pages[123]);assert.deepEqual(keys,['5:96','5:97','5:98','5:99','5:100','5:101','5:102','5:103']);assert.deepEqual([...host.querySelectorAll('.mushaf-ayah-text')].map(e=>e.textContent),keys.map(k=>{const [s,a]=k.split(':').map(Number);return surahs.get(s).verses[a-1].arabic;}));
for(const width of [280,320,360,600]){const size=printedFitSize(width,600);assert.ok(size>=15&&size<=48);assert.ok(size*600/40<=width+.01);}assert.equal(printedFitSize(0,0),24);

const madaniBytes=await fs.readFile(new URL('../dist/data/mushaf-print/madani-layout.json',import.meta.url)),madani=JSON.parse(madaniBytes);
assert.equal(crypto.createHash('sha256').update(madaniBytes).digest('hex'),MADANI_LAYOUT_SHA256);assert.equal(madani.pages.length,604);
const madaniFirst={},madaniEnds=new Set(),madaniIds=new Set();let madaniPrevious=0,madaniWords=0;
for(const [p,rows]of madani.pages.entries()){assert.ok(rows.length===15||p<2);for(const [n,type,s,words]of rows){for(const [ss,aa,ww,gg]of words){const id=ss+':'+aa+':'+ww,key=ss+':'+aa;assert.ok(!madaniIds.has(id));madaniIds.add(id);madaniWords++;assert.ok(offsets[ss]+aa>=madaniPrevious);madaniPrevious=offsets[ss]+aa;madaniFirst[key]??=p+1;if(gg.includes(' '))madaniEnds.add(key);}}}
assert.equal(madaniWords,78005);assert.equal(madaniEnds.size,6236);assert.deepEqual(madaniFirst,MADANI_VERSE_PAGES);assert.equal(printedPageForPosition(4,1,'madani'),77);
host.innerHTML=printedPageMarkup(madani.pages[123],124,index,surahs,esc,'ﱁ ﱂ ﱃ ﱄ','madani');assert.ok([...host.querySelectorAll('.mushaf-print-word')].every(e=>e.style.fontFamily==='SALAHMushaf124Madani'));
host.innerHTML=printedPageMarkup(madani.pages[0],1,index,surahs,esc,'','madani');assert.equal(host.querySelectorAll('[data-print-type=text]:not(.mushaf-print-centered)').length,0);
const original={fetch:globalThis.fetch,document:globalThis.document,FontFace:globalThis.FontFace};let fetches=0,loads=0,fail=false;const added=new Set();
globalThis.fetch=async url=>{fetches++;return new Response(String(url).includes('madani-layout')?madaniBytes:bytes);};globalThis.document={getElementById:id=>w.document.getElementById(id),createElement:(...a)=>w.document.createElement(...a),head:w.document.head,fonts:{add:f=>added.add(f),delete:f=>added.delete(f)}};
globalThis.FontFace=class{constructor(family,source){this.family=family;this.source=source;}async load(){loads++;assert.match(this.source,/^url\("https:\/\/verses\.quran\.foundation\/fonts\/quran\/hafs\/(?:v4\/colrv1|v2)\/woff2\/p\d+\.woff2"\)$/);if(fail)throw Error('offline font');return this;}};
try{
 const module=await import('../dist/js/quran-mushaf-print.js?loader-check');await Promise.all([module.loadPrintedPage(1),module.loadPrintedPage(124)]);assert.equal(fetches,1);
 assert.deepEqual(await module.loadPrintedPage(124),data.pages[123]);await assert.rejects(()=>module.loadPrintedPage(605));
 const families=await Promise.all([module.ensurePrintedFont(124),module.ensurePrintedFont(124)]);assert.deepEqual(families,['SALAHMushaf124','SALAHMushaf124']);assert.equal(loads,1);assert.deepEqual(await module.loadPrintedPage(124,'madani'),madani.pages[123]);assert.equal(await module.ensurePrintedFont(124,'madani'),'SALAHMushaf124Madani');assert.match(w.document.getElementById('mushaf-palette-124').textContent,/base-palette:1/);
 fail=true;await assert.rejects(()=>module.ensurePrintedFont(2));fail=false;assert.equal(await module.ensurePrintedFont(2),'SALAHMushaf2');
 for(let p=1;p<=12;p++)await module.ensurePrintedFont(p);module.trimPrintedFonts([12,1]);assert.equal(added.size,8);assert.ok([...added].some(f=>f.family==='SALAHMushaf12'));
 globalThis.fetch=async()=>new Response('corrupt');const broken=await import('../dist/js/quran-mushaf-print.js?bad-hash-check');await assert.rejects(()=>broken.loadPrintedPage(1));globalThis.fetch=async()=>new Response(bytes);assert.deepEqual(await broken.loadPrintedPage(1),data.pages[0]);
}finally{Object.assign(globalThis,original);await w.happyDOM.close();}
const html=await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8'),css=await fs.readFile(new URL('../dist/quran.css',import.meta.url),'utf8');assert.match(html,/font-src 'self' https:\/\/verses\.quran\.foundation;/);assert.match(css,/mushaf-print-line/);assert.match(css,/white-space:nowrap/);assert.match(css,/mushaf-print-scroll/);
console.log('PASS: 604 printed pages, 15-line layout, 114 headings, 112 basmalas, all 6,236 ayat and markers, 77,432 unique word cells, exact verse/page mapping, reference 5:96–103, page-font pairing, unchanged accessible Arabic, no translations, fit sizing, verified metadata, coalesced font loading, dark/light palettes, retry, LRU and narrow CSP.');
