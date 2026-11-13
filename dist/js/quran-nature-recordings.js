// Selected CC0 nature recordings; file/processing evidence is in data/nature-sources-493.json.
const entries=[['rain','Дождь'],['wind','Ветер'],['fire','Камин'],['forest','Лес'],['ocean','Океан']];
export const NATURE_SOUNDS=Object.freeze(entries.map(([id,name])=>Object.freeze({id,name,audio:'../assets/player-nature-493/'+id+'.mp3',wallpaper:'./assets/player-nature-493/'+id+'.jpg',loopStart:2,loopEnd:34})));
export const natureRecording=kind=>NATURE_SOUNDS.find(entry=>entry.id===kind)||null;
export async function loadNatureRecording(kind,context,{fetcher=globalThis.fetch,signal}={}){
 const entry=natureRecording(kind);if(!entry||typeof fetcher!=='function')throw Error('Nature recording unavailable');
 const response=await fetcher(new URL(entry.audio,import.meta.url),{signal,cache:'force-cache',credentials:'same-origin'});
 if(!response.ok)throw Error('Nature recording download failed');
 const buffer=await context.decodeAudioData(await response.arrayBuffer());
 if(buffer.numberOfChannels!==2||!Number.isFinite(buffer.duration)||buffer.duration<entry.loopEnd-.02)throw Error('Invalid nature recording');
 return buffer;
}
