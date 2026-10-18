import{read,write}from './storage.js';
import{validPosition}from './quran-data.js';
export const READING_POSITIONS_KEY='quran-reading-positions';
export function readingPositions(index,storage={read}){
 const stored=storage.read(READING_POSITIONS_KEY,{}),positions={};
 if(stored&&typeof stored==='object'&&!Array.isArray(stored))for(const [key,ayah]of Object.entries(stored))if(/^[1-9]\d{0,2}$/.test(key)&&validPosition(index,{surah:Number(key),ayah}))positions[key]=ayah;
 return positions;
}
export function readReadingPosition(index,surah=null,storage={read}){
 const last=storage.read('quran-last-position',null),validLast=validPosition(index,last)?{surah:last.surah,ayah:last.ayah}:null;
 if(surah===null)return validLast;
 if(!Number.isInteger(surah)||surah<1||surah>114)return null;
 const ayah=readingPositions(index,storage)[surah];return ayah?{surah,ayah}:validLast?.surah===surah?validLast:null;
}
export function saveReadingPosition(index,position,storage={read,write}){
 if(!validPosition(index,position))return false;
 const next={surah:position.surah,ayah:position.ayah},positions=readingPositions(index,storage),legacy=readReadingPosition(index,null,storage);
 if(legacy&&!positions[legacy.surah])positions[legacy.surah]=legacy.ayah;
 positions[next.surah]=next.ayah;
 const savedLast=storage.write('quran-last-position',next),savedSurahs=storage.write(READING_POSITIONS_KEY,positions);return savedLast&&savedSurahs;
}
// Observe the verse at the reading line, including long ayat and fast scrolling.
// Restore the requested anchor through font reflow until the reader interacts.
export function mountReadingProgress(shell,{initialAyah,onPosition,onFlush,canTrack=()=>true,win=window,doc=document}){
 const verses=[...shell.querySelectorAll('.quran-verse')],byAyah=new Map(verses.map(e=>[Number(e.dataset.ayah),e]));
 let disposed=false,restoring=true,navigating=false,anchor=initialAyah,last=initialAyah,frame=null;
 const report=ayah=>{if(ayah!==last){last=ayah;onPosition(ayah);}};
 function capture(){
  if(disposed||navigating||!shell.isConnected||!canTrack())return;
  if(restoring){report(anchor);return;}
  const header=shell.querySelector('.quran-reader-top'),line=Math.min(win.innerHeight*.45,Math.max(96,(header?.getBoundingClientRect().bottom||0)+20)),bottom=win.innerHeight-80;
  let below=null,final=null;
  for(const verse of verses){const rect=verse.getBoundingClientRect();if(rect.height<=0)continue;final=verse;if(rect.top<=line&&rect.bottom>line){report(Number(verse.dataset.ayah));return;}if(!below&&rect.top>line&&rect.top<bottom)below=verse;}
  if(below)report(Number(below.dataset.ayah));else if(final&&final.getBoundingClientRect().bottom<=line)report(Number(final.dataset.ayah));
 }
 function schedule(){if(disposed||frame!==null)return;frame=win.requestAnimationFrame(()=>{frame=null;capture();});}
 function restore(){if(!disposed&&restoring&&canTrack()&&shell.isConnected&&anchor>1)byAyah.get(anchor)?.scrollIntoView({block:'start',behavior:'instant'});}
 function layout(){if(restoring)restore();else schedule();}
 function interact(event){if(!shell.contains(event.target)&&!(event.type==='keydown'&&(event.target===doc.body||event.target===doc.documentElement)))return;if(event.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;if(event.type==='keydown'&&event.target?.closest?.('a,button,input,select,textarea,[contenteditable]'))return;navigating=false;restoring=false;schedule();}
 function flush(){if(frame!==null){win.cancelAnimationFrame(frame);frame=null;}capture();onFlush();}
 function navigate(event){if(event.type==='keydown'&&event.key!=='Enter')return;const link=event.target?.closest?.('a[href]');if(!link?.getAttribute('href')?.startsWith('#'))return;if(event.type==='pointerdown')flush();else onFlush();navigating=true;}
 function visibility(){if(doc.hidden)flush();else layout();}
 win.addEventListener('scroll',schedule,{passive:true});win.addEventListener('resize',layout);win.addEventListener('pagehide',flush);
 doc.addEventListener('pointerdown',navigate,{capture:true,passive:true});doc.addEventListener('keydown',navigate,true);
 for(const name of ['wheel','touchmove','keydown'])doc.addEventListener(name,interact,{capture:true,passive:true});doc.addEventListener('visibilitychange',visibility);
 const Resize=win.ResizeObserver,resize=Resize?new Resize(layout):null;resize?.observe(shell.querySelector('.quran-verses')||shell);
 restore();
 return{follow(ayah){if(byAyah.has(ayah)){anchor=ayah;last=ayah;}},dispose(){if(disposed)return;flush();disposed=true;if(frame!==null)win.cancelAnimationFrame(frame);resize?.disconnect();win.removeEventListener('scroll',schedule);win.removeEventListener('resize',layout);win.removeEventListener('pagehide',flush);for(const name of ['wheel','touchmove','keydown'])doc.removeEventListener(name,interact,true);doc.removeEventListener('pointerdown',navigate,true);doc.removeEventListener('keydown',navigate,true);doc.removeEventListener('visibilitychange',visibility);}};
}
