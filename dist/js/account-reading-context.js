import{canonicalAccountLocation}from './account-location.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readingContext(value,now=Date.now()){
 if(!value||!Number.isInteger(value.page)||value.page<1||value.page>604||!['madani','tajweed'].includes(value.edition)||typeof value.observedAt!=='string')return null;
 const time=Date.parse(value.observedAt);if(!Number.isFinite(time)||time<0||time>now+300000)return null;
 return{page:value.page,edition:value.edition,observedAt:new Date(time).toISOString()};
}
// A checkpoint belongs to the account viewing a successfully rendered page.
// Never backfill another account's or an anonymous device's local bookmark.
export function createReadingContext({storage,now=()=>Date.now()}={}){
 let account=null,memory=new Map();const key=id=>'salah:reading-context-v1:'+id;
 const load=id=>{if(!UUID.test(id||''))return null;if(memory.has(id))return memory.get(id);try{return readingContext(JSON.parse(storage.getItem(key(id))),now());}catch{return null;}};
 return{
  activate(id){account=UUID.test(id||'')?id:null;},
  record(value){if(!account)return false;const next=readingContext({...value,observedAt:new Date(now()).toISOString()},now());if(!next)return false;memory.set(account,next);try{storage.setItem(key(account),JSON.stringify(next));}catch{}return true;},
  snapshot(city,id=account,country=null){const name=typeof city==='string'?city.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,160):'';const nation=name&&typeof country==='string'?country.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,160):'';const resolved=canonicalAccountLocation(name,nation);return{city:resolved.city,reading:load(id),...(resolved.country?{country:resolved.country}:{})};}
 };
}
