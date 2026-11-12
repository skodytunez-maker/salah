import{dateKey}from './prayers.js';
// Called only after a successful explicit increment, never while opening a page.
export function emitAdhkarActivity(account){
 if(typeof account!=='string'||account==='guest')return;
 try{if(localStorage.getItem('salah:counter-active-account')!==account)return;
  window.dispatchEvent(new CustomEvent('salah:adhkar-counted',{detail:{account,day:dateKey()}}));
 }catch{}
}

export function emitTransientDhikrPresence(account){
 if(typeof account!=='string')return false;
 try{if(localStorage.getItem('salah:counter-active-account')!==account)return false;window.dispatchEvent(new CustomEvent('salah:dhikr-presence-counted',{detail:{account}}));return true;}catch{return false;}
}
