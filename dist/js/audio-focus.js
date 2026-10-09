// Only playback state is shared; no audio, user identity or history is recorded.
const owners=new Set(),listeners=new Set(),ownerListeners=new Set();
export function foregroundAudioBusy(){return owners.size>0}
export function foregroundAudioBusyExcept(owner){return [...owners].some(value=>value!==owner)}
export function setForegroundAudio(owner,active){
 if(!owner)return;
 const before=owners.size>0,had=owners.has(owner);
 if(active)owners.add(owner);else owners.delete(owner);
 if(before!==(owners.size>0))for(const listener of listeners)try{listener(owners.size>0)}catch{}
 if(had!==owners.has(owner))for(const listener of ownerListeners)try{listener()}catch{}
}
export function subscribeForegroundAudio(listener){listeners.add(listener);listener(owners.size>0);return()=>listeners.delete(listener)}
export function subscribeAudioOwners(listener){ownerListeners.add(listener);listener();return()=>ownerListeners.delete(listener)}
