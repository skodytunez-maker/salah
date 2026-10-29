// One bit per account/day. No dhikr IDs, text, repetition counts or event times.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validActivityDay(day){return typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;}
export function recentActivityDay(day,now=Date.now()){
 if(!validActivityDay(day)||!Number.isFinite(now))return false;
 const difference=Math.floor(Date.parse(day+'T00:00:00Z')/86400000)-Math.floor(now/86400000);
 return difference>=-7&&difference<=1;
}
export function createAdhkarActivityQueue({storage,now=()=>Date.now()}={}){
 const key=uid=>'salah:adhkar-activity:'+uid;
 function read(uid){
  if(!UUID.test(uid||''))return null;
  try{const raw=storage.getItem(key(uid)),value=raw===null?{version:1,days:{}}:JSON.parse(raw);
   if(value?.version!==1||!value.days||typeof value.days!=='object'||Array.isArray(value.days))return {version:1,days:{}};
   return {version:1,days:Object.fromEntries(Object.entries(value.days).filter(([day,saved])=>recentActivityDay(day,now())&&typeof saved==='boolean'))};
  }catch{return null;}
 }
 function write(uid,value){try{storage.setItem(key(uid),JSON.stringify(value));return true;}catch{return false;}}
 return {
  mark(uid,day){const value=read(uid);if(!value||!recentActivityDay(day,now())||Object.hasOwn(value.days,day))return false;value.days[day]=false;return write(uid,value);},
  pending(uid){const value=read(uid);return value?Object.keys(value.days).filter(day=>value.days[day]===false).sort().slice(0,8):[];},
  acknowledge(uid,days){const value=read(uid);if(!value||!Array.isArray(days))return false;for(const day of days)if(Object.hasOwn(value.days,day))value.days[day]=true;return write(uid,value);}
 };
}
