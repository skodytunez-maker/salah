import{localTimestamp,shiftDay}from './reminder-events.js';
export const NIGHT_CREDIT_LIMIT=60*60*1000;
const tokenPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const stamp=value=>Number.isSafeInteger(value)&&value>=0&&value<4102444800000;
function localParts(at,zone){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(at),values=Object.fromEntries(parts.map(p=>[p.type,p.value]));return{day:values.year+'-'+values.month+'-'+values.day,hour:Number(values.hour)};}
// The quiet-night assumption is 23:00–07:00 in the selected prayer city's zone.
export function listeningCreditNight(at,zone){
 try{const{day,hour}=localParts(at,zone);if(hour>=7&&hour<23)return null;const first=hour<7?shiftDay(day,-1):day,last=shiftDay(first,1),start=localTimestamp(first,'23:00',zone),end=localTimestamp(last,'07:00',zone);return Number.isFinite(start)&&Number.isFinite(end)?{start,end}:null;}catch{return null;}
}
export function createListeningCreditPolicy({now=Date.now,timeZone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',source=()=>null,readState=()=>null,writeState=()=>{},changed=()=>{}}={}){
 const initial=now();let saved;try{saved=readState();}catch{}
 const observedAt=stamp(saved?.observedAt)?Math.min(saved.observedAt,initial):initial;
 let lastAction=stamp(saved?.lastAction)?Math.min(saved.lastAction,initial):observedAt,revision=0;
 const holds=new Map();if(saved?.version===1&&saved.holds&&typeof saved.holds==='object')for(const[key,row]of Object.entries(saved.holds).slice(0,40))if(tokenPattern.test(row?.token||'')&&stamp(row.at))holds.set(key,{token:row.token,at:Math.min(row.at,initial),seen:revision,ready:row.ready===true});
 const save=()=>{try{writeState({version:1,observedAt,lastAction,holds:Object.fromEntries([...holds].map(([key,row])=>[key,{token:row.token,at:row.at,ready:row.ready}]))});}catch{}};
 save();
 const cutoff=night=>Math.max(night.start,observedAt,lastAction)+NIGHT_CREDIT_LIMIT;
 const status=(at=now(),key=source())=>{const hold=holds.get(key),night=listeningCreditNight(at,timeZone()),nightPaused=!!night&&at>=cutoff(night);return{paused:!!hold||nightPaused,manual:!!hold,night:nightPaused,pending:hold?.ready===true};};
 return{
  status,paused:(key=source(),at=now())=>status(at,key).paused,
  // Only the bridge supplies trusted, visible pointer/key actions. Playback never calls this.
  action(at=now()){if(!stamp(at))return false;lastAction=at;revision++;const hold=holds.get(source());if(hold&&revision>hold.seen)hold.ready=true;save();changed();return true;},
  resumeToken(key=source()){const hold=holds.get(key);return hold?.ready?hold.token:null;},
  receive(key,result,{resumeCredit,confirmed=false}={}){if(typeof key!=='string'||!result||typeof result.creditPaused!=='boolean')return false;
   if(result.creditPaused){if(!tokenPattern.test(result.creditPauseToken||''))return false;const old=holds.get(key);if(old?.token===result.creditPauseToken)return false;holds.set(key,{token:result.creditPauseToken,at:old?.at??now(),seen:revision,ready:false});}
   else{const old=holds.get(key);if(!old||!confirmed&&resumeCredit!==old.token)return false;holds.delete(key);}
   save();changed();return true;
  },
  // Return only newly eligible portions of measured audio advancement. Splitting prevents
  // a suspended background callback or the next interaction from backfilling a held span.
  segments(seconds,end=now(),key=source()){
   if(!Number.isFinite(seconds)||seconds<=0||seconds>43200||!stamp(end))return[];
   const start=end-seconds*1000,hold=holds.get(key),finish=Math.min(end,hold?.at??end);if(finish<=start)return[];
   const points=new Set([start,finish]);let day;try{day=shiftDay(localParts(start,timeZone()).day,-1);}catch{return[{seconds:(finish-start)/1000,at:finish}];}
   for(let i=0;i<5&&day;i++,day=shiftDay(day,1)){const nightStart=localTimestamp(day,'23:00',timeZone()),nightEnd=localTimestamp(shiftDay(day,1),'07:00',timeZone());if(!Number.isFinite(nightStart)||!Number.isFinite(nightEnd))continue;for(const point of [nightStart,nightEnd,cutoff({start:nightStart})])if(point>start&&point<finish)points.add(point);}
   const sorted=[...points].sort((a,b)=>a-b),rows=[];for(let i=1;i<sorted.length;i++){const first=sorted[i-1],last=sorted[i],night=listeningCreditNight((first+last)/2,timeZone());if(!night||(first+last)/2<cutoff(night))rows.push({seconds:(last-first)/1000,at:last});}return rows;
  }
 };
}
export function createCreditMinuteMeter({onMinute=()=>{}}={}){const carry=new Map();return{reset(){carry.clear();},progress(id,seconds,at){if(!Number.isFinite(seconds)||seconds<=0)return 0;const n=(carry.get(id)||0)+seconds,count=Math.min(120,Math.floor(n/60));carry.set(id,n-count*60);for(let i=0;i<count;i++)onMinute(id,at-(n-(i+1)*60)*1000);return count;}};}
