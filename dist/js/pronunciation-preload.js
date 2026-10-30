import{foregroundAudioBusy}from './audio-focus.js';

// Prepare only the open card's recording. This never plays or claims audio focus.
export function preloadPronunciation(audio,{nav=globalThis.navigator,doc=globalThis.document,busy=foregroundAudioBusy}={}){
 if(!audio)return false;
 audio.preload='none';
 if(doc?.hidden===true||nav?.onLine===false||nav?.connection?.saveData===true||busy())return false;
 try{audio.preload='auto';audio.load?.();return true;}catch{audio.preload='none';return false;}
}
