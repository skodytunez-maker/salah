import{safeAwardState}from './quran-awards-core.js';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const awardPresentationKey=id=>'salah:award-presented:v1:'+id;
// Only presentation IDs are retained; this store cannot grant or restore an award.
export function createAwardPresentations({storage,getAccount,getAwards,canShow,show,now=()=>Date.now()}){
 let scope=null,seen=null,busy=false,generation=0,retryAt=0;const sessions=new Map();
 const persist=()=>{if(!scope||!seen)return;sessions.set(scope,new Set(seen));try{storage.setItem(awardPresentationKey(scope),JSON.stringify({version:1,ids:[...seen].slice(-512)}));}catch{}};
 const read=id=>{if(sessions.has(id))return new Set(sessions.get(id));try{const value=JSON.parse(storage.getItem(awardPresentationKey(id)));if(value?.version===1&&Array.isArray(value.ids)&&value.ids.length<=512&&value.ids.every(x=>UUID.test(x)))return new Set(value.ids);}catch{}return null;};
 const reset=()=>{scope=null;seen=null;busy=false;retryAt=0;generation++;};
 async function observe(){
  const account=getAccount(),id=account?.signedIn&&UUID.test(account.userId||'')?account.userId:null;
  if(id!==scope){reset();scope=id;if(id)seen=read(id);}if(!id)return false;
  let state;try{state=safeAwardState(getAwards());}catch{return false;}
  // On first use, old rewards remain replayable in the collection without a barrage of popups.
  if(!seen){seen=new Set(state.items.map(x=>x.id));persist();return false;}
  if(busy||now()<retryAt||!canShow())return false;
  const row=state.items.filter(x=>x.kind!=='founder'&&!seen.has(x.id)).sort((a,b)=>a.end.localeCompare(b.end)||a.id.localeCompare(b.id))[0];
  if(!row)return false;const version=generation;busy=true;
  try{
   const shown=await show(row,{isActive:()=>generation===version&&getAccount()?.signedIn&&getAccount()?.userId===id});
   if(generation!==version||getAccount()?.userId!==id)return false;
   if(shown){seen.add(row.id);persist();return true;}retryAt=now()+10000;return false;
  }catch{if(generation===version)retryAt=now()+10000;return false;}
  finally{if(generation===version)busy=false;}
 }
 return{observe,reset};
}
