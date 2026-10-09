import{RECITERS,reciterHasSurah}from './quran-reciters.js';
export const QURAN_SHARE_BASE='https://skodytunez-maker.github.io/salah/';
export function validListeningPosition(value){return !!value&&Number.isInteger(value.surah)&&value.surah>=1&&value.surah<=114&&Number.isInteger(value.ayah)&&value.ayah>=1&&value.ayah<=6236&&RECITERS.some(r=>r.id===value.reciter)&&reciterHasSurah(value.reciter,value.surah)&&Number.isFinite(value.seconds)&&value.seconds>=0&&value.seconds<=86400;}
export function listeningShareUrl(position){if(!validListeningPosition(position))throw Error('Нет места прослушивания');const query=new URLSearchParams({listen:'1',surah:String(position.surah),reciter:position.reciter,ayah:String(position.ayah),t:String(Math.floor(position.seconds*10)/10)});return QURAN_SHARE_BASE+'#quran?'+query;}
export function parseListeningShare(hash){
 if(typeof hash!=='string'||hash.length>2048||!hash.startsWith('#quran?'))return null;
 const p=new URLSearchParams(hash.slice(7)),keys=['listen','surah','reciter','ayah','t'];
 if([...p.keys()].length!==5||keys.some(k=>p.getAll(k).length!==1)||p.get('listen')!=='1'||!/^\d{1,3}$/.test(p.get('surah')||'')||!/^\d{1,4}$/.test(p.get('ayah')||'')||!/^\d{1,5}(?:\.\d{1,3})?$/.test(p.get('t')||''))return null;
 const position={surah:Number(p.get('surah')),reciter:p.get('reciter'),ayah:Number(p.get('ayah')),seconds:Number(p.get('t'))};return validListeningPosition(position)?position:null;
}
export function listeningTime(seconds){const n=Math.floor(Math.max(0,seconds)),h=Math.floor(n/3600),m=Math.floor(n/60)%60,s=n%60;return(h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(s).padStart(2,'0');}
