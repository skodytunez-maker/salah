import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const source=await fs.readFile(new URL('dist/js/quran-ayah-card.js',root),'utf8');
const index=JSON.parse(await fs.readFile(new URL('dist/data/quran-index.json',root),'utf8'));
const surah=JSON.parse(await fs.readFile(new URL('dist/data/quran/2.json',root),'utf8'));
const draws=[];let canvasId=0;
const document={fonts:{ready:Promise.resolve()},createElement:()=>({id:canvasId++,dataset:{},attributes:{},setAttribute(name,value){this.attributes[name]=value;},getContext(){const id=this.id;return {scale(){},font:'',measureText(text){return {width:[...text].length*Number(this.font.match(/(\d+)px/)[1])*.55};},createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};},beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},stroke(){},fillRect(){},strokeRect(){},drawImage(){},fillText(text,x,y){draws.push({id,text,x,y,font:this.font,direction:this.direction});}};}})};
const context=vm.createContext({document,Date,Image:class {complete=false;async decode(){}},console});
vm.runInContext(source.replace(/^import .*;\n/gm,'').replace(/export /g,''),context);
for(let day=0;day<6236;day++){
 const position=vm.runInContext('dailyPosition',context)(index,new Date(2026,0,1+day));
 assert.ok(position.surah>=1&&position.surah<=114&&position.ayah>=1&&position.ayah<=index.surahs[position.surah-1].ayahs);
}
const longVerse=surah.verses[281];
const normalized=text=>text.replace(/\s+/g,' ').trim();
const isTranslation=row=>/^600 \d+px sans-serif$/.test(row.font);
for(const format of ['square','story','full'])for(const arabic of [true,false])for(const translation of [true,false]){
 if(!arabic&&!translation)continue;
 draws.length=0;
 const pages=await vm.runInContext('renderCards',context)(surah,longVerse,index.surahs[1],{format,theme:'night',arabic,translation});
 assert.ok(pages.length>0);
 assert.equal(pages[0].width,2160);assert.equal(pages[0].height,format==='full'?4680:format==='story'?3840:2160);
 const printedArabic=normalized(draws.filter(row=>row.direction==='rtl').map(row=>row.text).join(' '));
 const printedTranslation=normalized(draws.filter(row=>isTranslation(row)).map(row=>row.text).join(' '));
 if(arabic)assert.ok(printedArabic===normalized(longVerse.arabic),'Arabic text must be complete across pages');
 if(translation)assert.ok(printedTranslation===normalized(longVerse.translation),'Translation must be complete across pages');
 assert.ok(draws.every(row=>row.x>=0&&row.x<=1080&&row.y>0&&row.y<(format==='full'?2340:format==='story'?1920:1080)));
 if(format!=='square')assert.ok(draws.every(row=>row.y>=300+(format==='full'?210:0)&&row.y<=1520+(format==='full'?210:0)),'Story text and credits must remain within reserved viewer-safe bounds');
 if(format==='square')assert.ok(pages.length>1,'Longest verse must paginate');
 let reachedTranslation=false;
 for(const page of pages){
  const content=draws.filter(row=>row.id===page.id);
  const hasArabic=content.some(row=>row.direction==='rtl'),hasTranslation=content.some(isTranslation);
  assert.ok(!(hasArabic&&hasTranslation),'Long-ayah cards must never mix languages');
  if(hasTranslation)reachedTranslation=true;
  if(hasArabic)assert.equal(reachedTranslation,false,'Arabic cards must precede translation cards');
  assert.equal(content.some(row=>row.text==='Перевод Эльмира Кулиева'),hasTranslation,'Translation attribution belongs only on Russian cards');
  assert.equal(page.dataset.language,hasArabic?'ar':'ru');
  assert.ok(content.filter(row=>row.direction==='rtl'||isTranslation(row)).every(row=>Number(row.font.match(/(\d+)px/)[1])>=(row.direction==='rtl'?44:36)),'Keep export text readable');
 }

}

const shortSurah=JSON.parse(await fs.readFile(new URL('dist/data/quran/112.json',root),'utf8'));
for(const format of ['story','full']){
 const shortPages=await vm.runInContext('renderCards',context)(shortSurah,shortSurah.verses[0],index.surahs[111],{format,theme:'night',arabic:true,translation:true});
 assert.equal(shortPages.length,1,'Short ayahs keep one combined card');assert.equal(shortPages[0].dataset.language,'both');
}
draws.length=0;
const kursiPages=await vm.runInContext('renderCards',context)(surah,surah.verses[254],index.surahs[1],{format:'full',theme:'night',arabic:true,translation:true});
assert.ok(kursiPages.length>=2,'Ayat al-Kursi uses language-specific cards');
assert.equal(kursiPages[0].dataset.language,'ar');assert.equal(kursiPages.at(-1).dataset.language,'ru');
assert.ok(kursiPages.every(page=>page.dataset.language!=='both'));

assert.equal(normalized(draws.filter(row=>row.direction==='rtl').map(row=>row.text).join(' ')),normalized(surah.verses[254].arabic));
assert.equal(normalized(draws.filter(isTranslation).map(row=>row.text).join(' ')),normalized(surah.verses[254].translation));

const compactVerse={...surah.verses[254],arabic:surah.verses[254].arabic.slice(0,140),translation:surah.verses[254].translation.slice(0,230)};
const compactPages=await vm.runInContext('renderCards',context)(surah,compactVerse,index.surahs[1],{format:'square',theme:'night',arabic:true,translation:true});
assert.equal(compactPages.length,2,'When each language fits individually, emit exactly two cards');
assert.deepEqual(Array.from(compactPages,page=>page.dataset.language),['ar','ru']);
const quran=await fs.readFile(new URL('dist/js/quran.js',root),'utf8');
assert.ok(quran.includes('mountDailyAyah(host'));
assert.ok(quran.includes('showAyahCard(surah,surah.verses'));
assert.ok(source.includes('navigator.canShare?.({files:images})'));
console.log('PASS: daily dates, full long-verse Arabic/translation pagination, bounds and reader integration.');

const backgrounds=vm.runInContext("AYAH_PHOTO_BACKGROUNDS",context);assert.equal(backgrounds.length,12);assert.equal(new Set(backgrounds.map(x=>x.id)).size,12);for(const bg of backgrounds){const data=await fs.readFile(new URL("dist/"+bg.path.slice(2),root));assert.equal(data.subarray(0,4).toString(),"RIFF");assert.equal(data.subarray(8,12).toString(),"WEBP");assert.ok(source.includes('value="'+bg.id+'"'));}console.log("PASS: all 12 selectable photographic assets exist and are WebP.");

const automatic=vm.runInContext("automaticBackground",context);assert.equal(new Set(Array.from({length:12},(_,i)=>automatic(16,128,new Date(2026,9,10+i)))).size,12);assert.equal(automatic(16,128,new Date(2026,9,10,0)),automatic(16,128,new Date(2026,9,10,23)));console.log("PASS: automatic backgrounds rotate daily and stay stable within the day.");
