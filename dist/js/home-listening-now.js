import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{personalDataAllowed}from './audience.js';
import{listeningCountMarkup,updateListeningSummary}from './listening-summary.js';
export function createHomeListeningNow({doc=globalThis.document,fetcher=globalThis.fetch,allowed=personalDataAllowed,now=Date.now,interval=setInterval,cancelInterval=clearInterval}={}){
 let host=null,timer=null,request=null,generation=0,last=null;
 const hide=()=>{if(host){host.hidden=true;host.innerHTML='';}};
 const paint=count=>{if(!host?.isConnected)return;if(!count){hide();return;}
  host.hidden=false;host.setAttribute('aria-label','Сейчас слушают Коран: '+count);
  if(!host.querySelector('[data-listening-total]'))host.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 1-2Zm16 0h-3v8h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-1-2Z"/></svg>'+listeningCountMarkup(count);
  else updateListeningSummary(host,count,{count:true});
 };
 async function refresh(){
  if(!host?.isConnected||doc.hidden||!allowed()){hide();return;}if(request)return request.task;
  const token=generation,controller=new AbortController(),entry={controller,task:null};request=entry;
  entry.task=(async()=>{const timeout=setTimeout(()=>controller.abort(),8000);try{
   const response=await fetcher(OWNER_PROJECT_URL+'/functions/v1/listening-now',{headers:{apikey:OWNER_PUBLIC_KEY},credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
   if(!response.ok)throw Error('unavailable');const data=await response.json();
   if(!Number.isSafeInteger(data.count)||data.count<0)throw Error('invalid_count');
   if(token!==generation||request!==entry||doc.hidden||!allowed())return;
   last={count:data.count,at:now()};paint(data.count);
  }catch{if(token===generation){last=null;hide();}}finally{clearTimeout(timeout);if(request===entry)request=null;}})();return entry.task;
 }
 const visible=()=>{if(doc.hidden){generation++;request?.controller.abort();request=null;last=null;hide();}else void refresh();};
 const unmount=()=>{generation++;request?.controller.abort();request=null;if(timer!==null)cancelInterval(timer);timer=null;doc.removeEventListener('visibilitychange',visible);hide();host=null;};
 return {mount(container){if(container===host)return;unmount();host=container;if(!host)return;host.hidden=true;
  if(last&&now()-last.at<15000)paint(last.count);doc.addEventListener('visibilitychange',visible);timer=interval(()=>void refresh(),15000);void refresh();
 },refresh,dispose:unmount};
}
