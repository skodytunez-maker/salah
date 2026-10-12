const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d);
export const isQuranCelebrationRoute=hash=>typeof hash==='string'&&hash.split('?')[0]==='#quran';
export function seriesColor(days){return days>=365?'#e1e5eb':days>=200?'#e7d4a8':days>=100?'#d8be88':days>=30?'#c2cbd8':days>=7?'#bf926c':'#d8be88';}
export function createSeriesCelebration({storage,getUser,getOwn,getLocalDay,isVisible,show,now=()=>Date.now()}){
 let scope=null,last=null,pending=null;const shown=new Set();
 const person=()=>{const u=getUser();return u?.signedIn&&u.userId?u.userId:null;};
 const scopeNow=()=>{const id=person();if(id!==scope){scope=id;last=null;pending=null;}return id;};
 const marked=(key)=>{try{return storage.getItem(key)==='1';}catch{return false;}};
 function observe(){
  const id=scopeNow(),a=getOwn();if(!id||!a||!validDay(a.day)||!Number.isSafeInteger(a.streak?.current)||a.streak.current<0)return;
  const state={id,day:a.day,current:a.streak.current,today:a.streak.today===true};
  if(!last){last=state;return;}
  if(pending&&(pending.id!==id||state.day>pending.day||now()-pending.at>3600000))pending=null;
  if(pending&&state.day===pending.day&&state.today&&state.current>0){pending.to=state.current;pending.ready=true;}
  last=state;if(!pending?.ready||!isVisible())return;
  const key='salah:series-celebrated:'+id+':'+pending.day;if(shown.has(key)||marked(key)){pending=null;return;}
  const event={from:pending.to<=pending.from?Math.max(0,pending.to-1):pending.from,to:pending.to,day:pending.day,color:seriesColor(pending.to)};shown.add(key);try{storage.setItem(key,'1');}catch{}pending=null;show(event);
 }
 function progress(){
  const id=scopeNow();if(!id||!last||last.id!==id)return;
  const local=getLocalDay();if(!validDay(local?.day)||local.day<last.day||!(local.seconds>=60))return;
  if(last.today&&local.day===last.day)return;
  const created=!pending;if(created)pending={id,day:local.day,from:last.current,at:now(),ready:false};observe();return created;
 }
 return{observe,progress,cancelPending(){pending=null;},reset(){scope=null;last=null;pending=null;}};
}
