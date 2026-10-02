// The current round is device-local; lifetime repetitions use the same private
// account sync as catalogue adhkar. Resetting a round never resets the lifetime.
export const FREE_TOTAL='free-dhikr';
const KEY='salah:adhkar-progress-v2',FREE='salah:dhikr-free',MAX=1000000000000;
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function freeRound(raw){
 if(raw===null)return {count:0,target:33};
 const p=JSON.parse(raw);
 if(!record(p)||!Number.isSafeInteger(p.count)||p.count<0||p.count>MAX||!Number.isInteger(p.target)||p.target<0||p.target>100000)throw Error('invalid_free_counter');
 return {count:p.count,target:p.target};
}
export function counterTransaction(storage,writes){
 const previous=writes.map(([key])=>[key,storage.getItem(key)]);
 try{for(const [key,value]of writes)storage.setItem(key,value)}
 catch(error){for(const [key,value]of previous)try{if(value===null)storage.removeItem(key);else storage.setItem(key,value)}catch{}throw error}
}
function legacyProgress(storage){
 const doc={version:2,totals:{},days:{}};
 // Creating the shared document for a free counter must also preserve the old
 // catalogue format if this is the first launch after upgrading an old release.
 for(let index=0;index<(storage.length||0);index++){
  const match=/^salah:adhkar:(\d{4}-\d{2}-\d{2}):(morning|evening|all|favorites)$/.exec(storage.key(index)||'');if(!match)continue;
  let value;try{value=JSON.parse(storage.getItem(storage.key(index)))}catch{continue}if(!record(value?.counts))continue;
  const counts={};for(const [id,n]of Object.entries(value.counts))if(/^[\w-]{1,80}$/.test(id)&&!Object.hasOwn(Object.prototype,id)&&id!=='prototype'&&Number.isSafeInteger(n)&&n>=0&&n<=MAX){counts[id]=n;doc.totals[id]=Math.min(MAX,(doc.totals[id]||0)+n)}
  const cursor=Number.isSafeInteger(value.cursor)&&value.cursor>=0?value.cursor:0;
  if(!doc.days[match[1]])doc.days[match[1]]={};doc.days[match[1]][match[2]]={cursor,counts};
 }
 return doc;
}
export function prepareFreeCounter(storage){
 const raw=storage.getItem(KEY),active=storage.getItem('salah:counter-active-account');
 if(raw===null&&active&&active!=='guest'&&storage.getItem('salah:counter-sync:'+active))throw Error('awaiting_cloud_restore');
 const doc=raw===null?legacyProgress(storage):JSON.parse(raw);
 if(doc?.version!==2||!record(doc.totals)||!record(doc.days))throw Error('invalid_progress');
 const round=freeRound(storage.getItem(FREE));
 if(!Object.hasOwn(doc.totals,FREE_TOTAL)){
  doc.totals[FREE_TOTAL]=round.count;
  counterTransaction(storage,[[KEY,JSON.stringify(doc)]]);
 }
 if(!Number.isSafeInteger(doc.totals[FREE_TOTAL])||doc.totals[FREE_TOTAL]<0||doc.totals[FREE_TOTAL]>MAX)throw Error('invalid_free_total');
 return {doc,round,account:storage.getItem('salah:counter-active-account')||'guest'};
}
export function createFreeCounterStore({storage,locks=()=>null,changed=()=>{}}){
 function snapshot(){try{const {round,doc,account}=prepareFreeCounter(storage());return {ok:true,...round,total:doc.totals[FREE_TOTAL],account}}catch{return {ok:false}}}
 function mutate(action,value,account){
  try{
   const backend=storage();if((backend.getItem('salah:counter-active-account')||'guest')!==account)return {ok:false,reason:'account_changed'};
   const {doc,round}=prepareFreeCounter(backend);let total=doc.totals[FREE_TOTAL];
   if(action==='increment'){if(round.count>=MAX||total>=MAX)return {ok:false};round.count++;total++}
   else if(action==='undo'){if(round.count){round.count--;total=Math.max(0,total-1)}}
   else if(action==='reset')round.count=0;
   else if(action==='target'){if(!Number.isInteger(value)||value<0||value>100000)return {ok:false};round.target=value}
   else return {ok:false};
   doc.totals[FREE_TOTAL]=total;
   counterTransaction(backend,[[KEY,JSON.stringify(doc)],[FREE,JSON.stringify(round)]]);
   changed();return {ok:true,...round,total,account};
  }catch{return {ok:false}}
 }
 async function change(action,value,account){
  try{const manager=locks();return manager?.request?await manager.request(KEY,()=>mutate(action,value,account)):mutate(action,value,account)}catch{return {ok:false}}
 }
 return {snapshot,change};
}
