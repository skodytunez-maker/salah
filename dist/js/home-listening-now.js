import{showHomeActivity}from './home-activity-members.js';
import{homeActivityIcon}from './home-activity-icons.js';
import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY,ownerVerified,ownerNeedsMfa,onOwnerChange}from './owner-auth.js';
import{personalDataAllowed}from './audience.js';
import{listeningCountMarkup,updateListeningSummary}from './listening-summary.js';
export function createHomeListeningNow({doc=globalThis.document,fetcher=globalThis.fetch,allowed=personalDataAllowed,now=Date.now,interval=setInterval,cancelInterval=clearInterval,canOpen=()=>ownerVerified()||ownerNeedsMfa(),open=showHomeActivity,subscribeOwner=onOwnerChange}={}){
 let host=null,timer=null,request=null,generation=0,last=null,unsubscribeOwner=null;
 const hide=()=>{if(host){host.hidden=true;host.innerHTML='';}};
 const metrics=[['count','Сейчас слушают Коран'],['readers','Сейчас читают Коран'],['dhikr','Сейчас делают зикр']];
 const paint=values=>{if(!host?.isConnected)return;
  const before=new Map([...host.children].map(node=>[node.dataset.homeActivity,node.getBoundingClientRect().left]));
  host.hidden=!metrics.some(([key])=>values[key]>0);
  host.setAttribute('aria-label',metrics.filter(([key])=>values[key]>0).map(([key,label])=>label+': '+values[key]).join('. '));
  for(const[key,label]of metrics){
   let node=host.querySelector('[data-home-activity="'+key+'"]');const value=values[key]||0;
   if(!value){node?.remove();continue;}
   const interactive=canOpen();if(node&&node.tagName!==(interactive?'BUTTON':'SPAN')){node.remove();node=null;}if(!node){node=doc.createElement(interactive?'button':'span');if(interactive)node.type='button';node.className='home-activity-count';node.dataset.homeActivity=key;node.innerHTML=homeActivityIcon(key)+listeningCountMarkup(value);}
   else updateListeningSummary(node,value,{count:true});
   node.setAttribute('aria-label',label+': '+value);if(interactive)node.onclick=()=>open(key);host.append(node);
  }
  const reduced=doc.body?.classList.contains('reduce-motion')||doc.body?.classList.contains('no-transitions')||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(!reduced)for(const node of host.children){const old=before.get(node.dataset.homeActivity),delta=old===undefined?0:old-node.getBoundingClientRect().left;
   if(typeof node.animate==='function'&&(delta||old===undefined))node.animate(old===undefined?[{opacity:0},{opacity:1}]:[{transform:'translateX('+delta+'px)'},{transform:'translateX(0)'}],{duration:220,easing:'cubic-bezier(.22,.7,.25,1)'});
  }
 };
 async function refresh(){
  if(!host?.isConnected||doc.hidden||!allowed()){hide();return;}if(request)return request.task;
  const token=generation,controller=new AbortController(),entry={controller,task:null};request=entry;
  entry.task=(async()=>{const timeout=setTimeout(()=>controller.abort(),8000);try{
   const response=await fetcher(OWNER_PROJECT_URL+'/functions/v1/listening-now',{headers:{apikey:OWNER_PUBLIC_KEY},credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
   if(!response.ok)throw Error('unavailable');const data=await response.json();
   const values={count:data.count,readers:data.readers??0,dhikr:data.dhikr??0};if(Object.values(values).some(n=>!Number.isSafeInteger(n)||n<0))throw Error('invalid_count');
   if(token!==generation||request!==entry||doc.hidden||!allowed())return;
   last={values,at:now()};paint(values);
  }catch{if(token===generation){last=null;hide();}}finally{clearTimeout(timeout);if(request===entry)request=null;}})();return entry.task;
 }
 const visible=()=>{if(doc.hidden){generation++;request?.controller.abort();request=null;last=null;hide();}else void refresh();};
 const unmount=()=>{generation++;request?.controller.abort();request=null;if(timer!==null)cancelInterval(timer);timer=null;doc.removeEventListener('visibilitychange',visible);unsubscribeOwner?.();unsubscribeOwner=null;hide();host=null;};
 return {mount(container){if(container===host)return;unmount();host=container;if(!host)return;host.hidden=true;
  if(last&&now()-last.at<15000)paint(last.values);unsubscribeOwner=subscribeOwner(()=>{if(last)paint(last.values);});doc.addEventListener('visibilitychange',visible);timer=interval(()=>void refresh(),15000);void refresh();
 },refresh,dispose:unmount};
}
