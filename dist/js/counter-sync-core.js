const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function cleanCounters(value,signed=false){
 if(!record(value)||Object.keys(value).length>256)throw Error('invalid_counts');
 const result={};for(const [id,n]of Object.entries(value)){if(!/^[\w-]{1,80}$/.test(id)||(Object.hasOwn(Object.prototype,id)||id==='prototype')||!Number.isSafeInteger(n)||Math.abs(n)>1000000000000||!signed&&n<0)throw Error('invalid_counts');result[id]=n;}return result;
}
export function cleanComponent(value){
 if(!record(value)||Object.keys(value).some(k=>!['device','sequence','seed','delta'].includes(k))||!UUID.test(value.device)||!Number.isSafeInteger(value.sequence)||value.sequence<1)throw Error('invalid_component');
 return {device:value.device,sequence:value.sequence,seed:cleanCounters(value.seed),delta:cleanCounters(value.delta,true)};
}
export function aggregateCounters(components){
 const seed={},delta={};for(const row of components){const c=cleanComponent(row);for(const [id,n]of Object.entries(c.seed))seed[id]=(seed[id]||0)+n;for(const [id,n]of Object.entries(c.delta))delta[id]=(delta[id]||0)+n;}
 const totals={};for(const id of new Set([...Object.keys(seed),...Object.keys(delta)]))totals[id]=Math.max(0,Math.min(1000000000000,(seed[id]||0)+(delta[id]||0)));return totals;
}

const PROGRESS='salah:adhkar-progress-v2';
export function createCounterSync({storage,request,uuid,changed=()=>{},withLock=fn=>fn()}){
 let active=null,pending=null;
 const key=uid=>'salah:counter-sync:'+uid;
 const doc=()=>{const raw=storage.getItem(PROGRESS);if(!raw)return{version:2,totals:{},days:{}};const d=JSON.parse(raw);if(d?.version!==2||!record(d.days))throw Error('local_data_invalid');cleanCounters(d.totals);return d;};
 function state(uid,d){const raw=storage.getItem(key(uid));if(!raw)return{device:uuid(),sequence:1,seed:{...d.totals},delta:{},observed:{...d.totals}};const s=JSON.parse(raw);cleanComponent({device:s.device,sequence:s.sequence,seed:s.seed,delta:s.delta});return {...s,observed:cleanCounters(s.observed)};}
 function saveState(uid,s){storage.setItem(key(uid),JSON.stringify(s));}
 function collect(uid){if(storage.getItem('salah:counter-active-account')!==uid)throw Error('account_changed');const missing=storage.getItem(PROGRESS)===null,d=doc(),s=state(uid,d);if(missing){s.observed={};saveState(uid,s);return s;}let dirty=false;for(const id of new Set([...Object.keys(d.totals),...Object.keys(s.observed)])){const diff=(d.totals[id]||0)-(s.observed[id]||0);if(diff){s.delta[id]=(s.delta[id]||0)+diff;dirty=true;}}if(dirty){s.sequence++;s.observed={...d.totals};}saveState(uid,s);return s;}
 function transaction(writes){const old=writes.map(([k])=>[k,storage.getItem(k)]);try{for(const [k,v]of writes)storage.setItem(k,v);}catch(error){for(const [k,v]of old)try{if(v===null)storage.removeItem(k);else storage.setItem(k,v);}catch{}throw error;}}
 async function activate(uid){await withLock(()=>{
 const current=storage.getItem('salah:counter-active-account')||'guest';if(current===(uid||'guest')){active=uid;return;}
 const raw=storage.getItem(PROGRESS),next=storage.getItem('salah:counter-local:'+(uid||'guest'));
 const first=uid&&current==='guest'&&!storage.getItem(key(uid))&&!next;
 const writes=[['salah:counter-local:'+current,raw||JSON.stringify({version:2,totals:{},days:{}})],['salah:counter-active-account',uid||'guest'],[PROGRESS,next||(first?raw:null)||JSON.stringify({version:2,totals:{},days:{}})]];
 if(first)writes[0][1]=JSON.stringify({version:2,totals:{},days:{}});transaction(writes);active=uid;changed('account');
 });}
 async function sync(){if(!active)return{ok:false,reason:'signed_out'};if(pending)return pending;
 const uid=active;pending=(async()=>{try{
 const captured=await withLock(()=>collect(uid));const sent=cleanComponent({device:captured.device,sequence:captured.sequence,seed:captured.seed,delta:captured.delta});const response=await request(uid,sent);const totals=cleanCounters(response.totals);
 if(active!==uid)return{ok:false,reason:'account_changed'};
 await withLock(()=>{if(active!==uid)return;const current=collect(uid),d=doc();if(current.device!==captured.device)throw Error('device_changed');const merged={};for(const id of new Set([...Object.keys(totals),...Object.keys(current.delta),...Object.keys(captured.delta)]))merged[id]=Math.max(0,(totals[id]||0)+(current.delta[id]||0)-(captured.delta[id]||0));current.observed=merged;d.totals=merged;transaction([[key(uid),JSON.stringify(current)],[PROGRESS,JSON.stringify(d)]]);changed('saved');});return{ok:true};
 }catch(error){changed('pending');return{ok:false,reason:error.message};}})();try{return await pending;}finally{pending=null;}}
 return{activate,sync,active:()=>active};
}
