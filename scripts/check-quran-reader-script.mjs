import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{readerWordsForSurah,readerHasBasmala,readerVerseMarkup,mountReaderScript,readerScriptGuide}from '../dist/js/quran-reader-script.js';

const layouts={tajweed:JSON.parse(await fs.readFile(new URL('../dist/data/mushaf-print/layout.json',import.meta.url),'utf8')).pages,madani:JSON.parse(await fs.readFile(new URL('../dist/data/mushaf-print/madani-layout.json',import.meta.url),'utf8')).pages};
const surahs=[];for(let s=1;s<=114;s++)surahs.push(JSON.parse(await fs.readFile(new URL('../dist/data/quran/'+s+'.json',import.meta.url),'utf8')));
const w=new Window(),saved={window:globalThis.window,IntersectionObserver:globalThis.IntersectionObserver};let observer;
globalThis.window=w;globalThis.IntersectionObserver=class{constructor(callback){this.callback=callback;observer=this;this.targets=[];}observe(p){this.targets.push(p);}disconnect(){this.disconnected=true;}emit(p,visible=true){this.callback([{target:p,isIntersecting:visible}]);}};
try{
 for(const edition of ['tajweed','madani']){
  let count=0,cells=0;const original=new Map();for(const [p,lines]of layouts[edition].entries())for(const line of lines)for(const [s,a,position,glyph]of line[3]){const key=s+':'+a;if(!original.has(key))original.set(key,[]);original.get(key).push({page:p+1,position,glyph});}
  for(const surah of surahs){
   const words=await readerWordsForSurah(surah.number,edition,async p=>layouts[edition][p-1]);assert.equal(words.size,surah.verses.length);
   for(const verse of surah.verses){
    const rows=words.get(verse.ayah),expected=original.get(surah.number+':'+verse.ayah);assert.deepEqual(rows,expected);count++;cells+=rows.length;
    if(verse.ayah===1||surah.number===37&&verse.ayah===130){const p=w.document.createElement('p');p.innerHTML=readerVerseMarkup(rows,surah.number,verse,edition);
    assert.equal(p.querySelector('.quran-medina-accessible').textContent,verse.arabic,'Accessible Arabic changed');
    assert.equal(p.querySelectorAll('.quran-medina-basmala').length,Number(readerHasBasmala(surah.number,verse)));
    assert.ok([...p.querySelectorAll('.quran-medina-word')].every(el=>el.getAttribute('aria-hidden')==='true'));}
   }
  }
  assert.equal(count,6236);assert.equal(cells,edition==='tajweed'?77432:78005);
 }
 assert.equal(readerHasBasmala(1,surahs[0].verses[0]),false);assert.equal(readerHasBasmala(2,surahs[1].verses[0]),true);assert.equal(readerHasBasmala(9,surahs[8].verses[0]),false);
 const surah={number:2,verses:[surahs[1].verses[0],surahs[1].verses[1]]},shell=w.document.createElement('section');w.document.body.append(shell);
 const setup=()=>{shell.innerHTML=surah.verses.map(v=>'<article id="quran-ayah-'+v.ayah+'"><p class="quran-arabic">'+v.arabic+'</p></article>').join('');return [...shell.querySelectorAll('.quran-arabic')];};
 let [p1,p2]=setup(),fail=true,loads=[],retained=[];
 const words=new Map([[1,[{page:2,position:1,glyph:'ﱁ ﱂ'}]],[2,[{page:2,position:1,glyph:'ﱃ'},{page:3,position:2,glyph:'ﱁ ﱂ'}]]]);
 const deps={loadWords:async()=>words,ensureFont:async(page,edition)=>{loads.push([page,edition]);if(fail)throw Error('network unavailable');},trimFonts:pages=>retained=pages};
 const tick=()=>new Promise(resolve=>setTimeout(resolve,0)),p={hints:true,arabic:true};
 const mounted=mountReaderScript(shell,surah,p,deps);assert.equal(loads.length,0,'No fonts before a verse approaches the viewport');
 observer.emit(p1);await tick();assert.equal(p1.dataset.medinaEdition,undefined);assert.equal(p1.textContent,surah.verses[0].arabic,'Font failure must preserve readable Arabic');assert.equal(p1.querySelector('.quran-medina-word'),null);
 fail=false;w.dispatchEvent(new w.Event('online'));await tick();assert.equal(p1.dataset.medinaEdition,'tajweed');assert.ok(loads.some(([page])=>page===1),'Basmala needs its own page-one font');assert.equal(p1.querySelector('.quran-medina-accessible').textContent,surah.verses[0].arabic);
 observer.emit(p2);await tick();assert.deepEqual([...p2.querySelectorAll('[data-font-page]')].map(el=>el.dataset.fontPage),['2','3']);assert.ok(retained.includes(3),'Keep all fonts for an ayah crossing two pages');
 mounted.update({hints:false,arabic:true});await tick();assert.equal(p1.dataset.medinaEdition,'madani');assert.ok(p1.querySelector('[data-font-page="2"]').style.fontFamily.endsWith('Madani'));
 observer.emit(p2,false);assert.equal(p2.dataset.medinaEdition,undefined);assert.equal(p2.textContent,surah.verses[1].arabic);assert.ok(!retained.includes(3),'Evicted cards release their page fonts');
 mounted.update({hints:false,arabic:false});await tick();assert.equal(p1.dataset.medinaEdition,undefined);mounted.update({hints:false,arabic:true});await tick();assert.equal(p1.dataset.medinaEdition,'madani');mounted.dispose();assert.ok(observer.disconnected);
 // A slow response from the previous color mode must not replace the current mode.
 [p1]=setup();let release;const gate=new Promise(resolve=>release=resolve);
 const slow=mountReaderScript(shell,surah,p,{...deps,ensureFont:async(page,edition)=>{if(edition==='tajweed')await gate;}});observer.emit(p1);await tick();slow.update({hints:false,arabic:true});await tick();assert.equal(p1.dataset.medinaEdition,'madani');release();await tick();assert.equal(p1.dataset.medinaEdition,'madani');slow.dispose();
 [p1]=setup();let finish;const lateGate=new Promise(resolve=>finish=resolve),late=mountReaderScript(shell,surah,p,{...deps,ensureFont:()=>lateGate});observer.emit(p1);await tick();late.dispose();finish();await tick();assert.equal(p1.querySelector('.quran-medina-word'),null,'No late DOM replacement after navigating away');
 assert.match(readerScriptGuide(),/Мединское начертание/);assert.match(readerScriptGuide(),/Al Quran Cloud/);
 const quran=await fs.readFile(new URL('../dist/js/quran.js',import.meta.url),'utf8'),sw=await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8');assert.match(quran,/readerScript\?\.dispose\(\)/);assert.match(quran,/readerScript\?\.update\(p\)/);assert.match(sw,/\.\/js\/quran-reader-script\.js/);
 console.log('PASS: both printed editions map all 6,236 ayat and every original word cell into reader cards; original accessible Arabic and basmalas preserved; lazy fonts, multi-page ayah, network fallback and retry, color toggling, stale responses, hide-Arabic, bounded font retention and navigation cleanup.');
}finally{Object.assign(globalThis,saved);await w.happyDOM.close();}
