// Only playback state is shared; no audio, user identity or history is recorded.
const owners=new Set(),listeners=new Set();
export function foregroundAudioBusy(){return owners.size>0}
export function setForegroundAudio(owner,active){
 if(!owner)return;
 const before=owners.size>0;
 if(active)owners.add(owner);else owners.delete(owner);
 if(before!==(owners.size>0))for(const listener of listeners)try{listener(owners.size>0)}catch{}
}
export function subscribeForegroundAudio(listener){listeners.add(listener);listener(owners.size>0);return()=>listeners.delete(listener)}
