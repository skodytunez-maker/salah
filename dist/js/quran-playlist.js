import {RECITERS,reciterHasSurah} from './quran-reciters.js';

// One complete chapter per entry; never invent missing reader recordings.
export function makeQuranPlaylist(index,{reciters=RECITERS,random=Math.random,currentSurah=null}={}){
 const readers=reciters.filter(r=>r&&!r.variantOf&&typeof r.id==='string'&&RECITERS.some(known=>known.id===r.id));
 const choose=length=>Math.min(length-1,Math.max(0,Math.floor((Number(random())||0)*length)));
 const numbers=[...new Set((index?.surahs||[]).map(s=>s.number).filter(n=>Number.isInteger(n)&&n>=1&&n<=114&&readers.some(r=>reciterHasSurah(r.id,n))))];
 for(let i=numbers.length-1;i>0;i--){const j=choose(i+1);[numbers[i],numbers[j]]=[numbers[j],numbers[i]];}
 if(numbers.length>1&&numbers[0]===currentSurah)[numbers[0],numbers[1]]=[numbers[1],numbers[0]];
 let previous=null;
 return numbers.map(surah=>{const available=readers.filter(r=>reciterHasSurah(r.id,surah)),different=available.filter(r=>r.name!==previous);const pool=different.length?different:available,reader=pool[choose(pool.length)];previous=reader.name;return Object.freeze({surah,reciter:reader.id,title:String(index.surahs.find(s=>s.number===surah)?.name||'Сура '+surah)});});
}
