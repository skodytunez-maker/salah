import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const source=await fs.readFile(new URL('dist/js/quran-ayah-card.js',root),'utf8');
const index=JSON.parse(await fs.readFile(new URL('dist/data/quran-index.json',root),'utf8'));
const surah=JSON.parse(await fs.readFile(new URL('dist/data/quran/2.json',root),'utf8'));
const draws=[];
const document={fonts:{ready:Promise.resolve()},createElement:()=>({setAttribute(){},getContext(){return {font:'',measureText(text){return {width:[...text].length*Number(this.font.match(/(\d+)px/)[1])*.55};},createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};},beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},stroke(){},fillRect(){},strokeRect(){},drawImage(){},fillText(text,x,y){draws.push({text,x,y,font:this.font,direction:this.direction});}};}})};
const context=vm.createContext({document,Date,Image:class {complete=false;async decode(){}},console});
vm.runInContext(source.replace(/^import .*;\n/gm,'').replace(/export /g,''),context);
for(let day=0;day<6236;day++){
 const position=vm.runInContext('dailyPosition',context)(index,new Date(2026,0,1+day));
 assert.ok(position.surah>=1&&position.surah<=114&&position.ayah>=1&&position.ayah<=index.surahs[position.surah-1].ayahs);
}
const longVerse=surah.verses[281];
for(const format of ['square','story'])for(const arabic of [true,false])for(const translation of [true,false]){
 if(!arabic&&!translation)continue;
 draws.length=0;
 const pages=await vm.runInContext('renderCards',context)(surah,longVerse,index.surahs[1],{format,theme:'night',arabic,translation});
 assert.ok(pages.length>0);
 const normalized=text=>text.replace(/\s+/g,' ').trim();
 const printedArabic=normalized(draws.filter(row=>row.direction==='rtl').map(row=>row.text).join(' '));
 const printedTranslation=normalized(draws.filter(row=>['600 42px sans-serif','600 54px sans-serif'].includes(row.font)).map(row=>row.text).join(' '));
 if(arabic)assert.ok(printedArabic.includes(normalized(longVerse.arabic)),'Arabic text must be complete across pages');
 if(translation)assert.ok(printedTranslation.includes(normalized(longVerse.translation)),'Translation must be complete across pages');
 assert.ok(draws.every(row=>row.x>=0&&row.x<=1080&&row.y>0&&row.y<(format==='story'?1920:1080)));
 if(format==='square')assert.ok(pages.length>1,'Longest verse must paginate');
}
const quran=await fs.readFile(new URL('dist/js/quran.js',root),'utf8');
assert.ok(quran.includes('mountDailyAyah(host'));
assert.ok(quran.includes('showAyahCard(surah,surah.verses'));
assert.ok(source.includes('navigator.canShare?.({files:images})'));
console.log('PASS: daily dates, full long-verse Arabic/translation pagination, bounds and reader integration.');
