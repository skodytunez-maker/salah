export const OFFLINE_AUTO_KEY='salah:offline-auto-texts-v1';
// This device's download choice is independent of accounts, location permissions
// and personal prayer/reading data. A user's pause or deletion always wins.
export function createOfflineAutoPolicy({getStorage=()=>globalThis.localStorage,events=globalThis.window}={}){
 let disabled=false,settling=Promise.resolve();const listeners=new Set();
 const enabled=()=>{if(disabled)return false;try{const value=getStorage()?.getItem(OFFLINE_AUTO_KEY);return value===null||value==='on';}catch{return false}};
 const notify=()=>{const value=enabled(),tasks=[];for(const listener of [...listeners])try{tasks.push(listener(value));}catch{}settling=Promise.allSettled(tasks);return settling;};
 const set=value=>{disabled=!value;let saved=false;try{getStorage().setItem(OFFLINE_AUTO_KEY,value?'on':'off');saved=true;}catch{}void notify();return saved;};
 const storage=event=>{if(event.key===null||event.key===OFFLINE_AUTO_KEY){disabled=false;void notify();}};
 events?.addEventListener?.('storage',storage);
 return{enabled,set,async disable(){set(false);await settling;},settled:()=>settling,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},dispose(){events?.removeEventListener?.('storage',storage);listeners.clear();}};
}
export const offlineAutoPolicy=createOfflineAutoPolicy();
