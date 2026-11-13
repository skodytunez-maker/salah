import{RECITERS,reciterInfo,reciterHasSurah}from './quran-reciters.js';
import{reciterRecording}from './quran-reciter-recording.js';
import{audioUrl}from './quran-data.js';
import{shuffleRadio}from './radio-program-core.js';
export const RADIO_VOICES=Object.freeze(RECITERS.filter(reciter=>!reciter.variantOf).map(reciter=>reciter.id));
export function radioCandidateBatch(catalog,selected,{random=Math.random,perVoice=null}={}){
 const voices=shuffleRadio([...new Set(selected)].filter(id=>RADIO_VOICES.includes(id)),random);
 const choices=new Map(voices.map(id=>{const available=catalog.surahs.filter(s=>s.number>=78&&reciterHasSurah(id,s.number));return[id,[...shuffleRadio(available.filter(s=>s.number>=93),random),...shuffleRadio(available.filter(s=>s.number<93),random)]];}));
 const candidates=[],seen=new Set(),rounds=perVoice??Math.max(3,Math.ceil(120/Math.max(1,voices.length)));
 for(let round=0;round<Math.max(1,Math.min(37,rounds));round++)for(const id of voices){
  const surah=choices.get(id)[round];if(!surah)continue;const info=reciterInfo(id),reciter=info.continuousReciter||id,actual=reciterInfo(reciter),key=reciter+':'+surah.number;if(seen.has(key)||!reciterHasSurah(reciter,surah.number))continue;seen.add(key);
  const recording=reciterRecording(catalog,surah.number),urls=actual.format==='verse'?recording.verses.map(v=>audioUrl(v.number,reciter,surah.number)):[audioUrl(recording.verses[0].number,reciter,surah.number)];
  candidates.push({surah:surah.number,reciter,url:urls[0],...(urls.length>1?{urls}:{})});
 }
 return candidates;
}
export async function measureRadioTrack(track,{probe,signal,cache=new Map()}={}){
 let total=0;
 for(const url of track.urls||[track.url]){if(signal?.aborted)return null;let duration=cache.get(url);if(!Number.isFinite(duration)||duration<=0){duration=await probe(url,signal);if(signal?.aborted)return null;if(Number.isFinite(duration)&&duration>0)cache.set(url,duration);}
  if(!Number.isFinite(duration)||duration<=0)return null;total+=duration;if(total>240)return null;
 }
 return total;
}
