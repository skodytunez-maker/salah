// A transient signal only: no text, verse, repetition count or reading history.
export function createActivityReporter({getIdentity,getView,eligible,send,now=Date.now,randomId=()=>crypto.randomUUID(),Controller=AbortController,schedule=setTimeout,cancel=clearTimeout}){
 let identity=null,scope=null,tab=null,sequence=0,lastDhikr=-Infinity,disposed=false;
 const states=new Map();
 function reset(next){if(identity)for(const[kind,s]of states)if(s.ever&&s.active!==false){const previousIdentity=identity,packet={action:'activity',kind,tab,sequence:++sequence,active:false};void Promise.resolve().then(()=>send(packet,{identity:previousIdentity,keepalive:true})).catch(()=>{});}for(const s of states.values()){s.controller?.abort();if(s.timer)cancel(s.timer);}states.clear();identity=next;scope=next?.scope||null;tab=next?randomId():null;sequence=0;lastDhikr=-Infinity;}
 function post(kind,active){
  const previous=states.get(kind);if(!active&&!previous?.ever)return;
  if(previous?.inflight&&previous.active===active||previous?.active===active&&(!active||now()-previous.at<15000))return;
  if(previous&&now()<previous.retryAt&&active)return;
  previous?.controller?.abort();if(previous?.timer)cancel(previous.timer);
  const controller=new Controller(),entry={active,at:now(),ever:true,inflight:true,controller,timer:null,retryAt:0},current=identity,scopeAt=scope;
  entry.timer=schedule(()=>controller.abort(),5000);states.set(kind,entry);
  const packet={action:'activity',kind,tab,sequence:++sequence,active};
  void Promise.resolve().then(()=>send(packet,{identity:current,signal:controller.signal,keepalive:!active})).catch(()=>{if(scope===scopeAt&&states.get(kind)===entry){entry.active=null;entry.retryAt=now()+5000;}}).finally(()=>{cancel(entry.timer);if(states.get(kind)===entry)entry.inflight=false;});
 }
 function sample(){if(disposed)return;const next=getIdentity();if(next?.scope!==scope)reset(next||null);else identity=next;
  if(!identity)return;const view=getView();if(!view.visible||!view.dhikr)lastDhikr=-Infinity;
  const allowed=eligible();post('reading',!!(allowed&&view.visible&&view.reading));post('dhikr',!!(allowed&&view.visible&&view.dhikr&&now()>=lastDhikr&&now()-lastDhikr<45000));
 }
 return{sample,stop(){lastDhikr=-Infinity;for(const kind of ['reading','dhikr'])post(kind,false);},counted(account){sample();if(account!==identity?.id)return;lastDhikr=now();sample();},dispose(){if(disposed)return;for(const kind of ['reading','dhikr'])post(kind,false);disposed=true;}};
}
export function activityView(doc,location){
 const visible=!doc.hidden,route=location.hash.split('?')[0];
 return{visible,reading:visible&&route==='#quran'&&!!doc.querySelector('.quran-reader .quran-verse,.mushaf-print-page'),
 dhikr:visible&&route==='#adhkar'&&!!doc.querySelector('.adhkar-shell')};
}

export function guestActivityId(state,storage,randomUUID=()=>crypto.randomUUID()){
 if(state.identityKnown!==true||state.signedIn||state.userId||state.reason==='auth_unavailable')return null;
 const valid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'');
 try{let id=storage.getItem('salah:guest-device-v1');if(!valid(id)){id=randomUUID();if(!valid(id))return null;storage.setItem('salah:guest-device-v1',id);id=storage.getItem('salah:guest-device-v1');}return valid(id)?id:null;}catch{return null;}
}
