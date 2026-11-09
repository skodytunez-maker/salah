import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{createSharedFrameStore}from './shared-listening-core.js';
export function createSharedListeningStream({getDay,onChange,environment=globalThis,fetcher=fetch}){
 const store=createSharedFrameStore();let day=getDay(),closed=false,client=null,channel=null,pending=null,generation=0,lastRead=0,lastAccepted=0;
 const visible=()=>environment.document?.hidden!==true&&environment.navigator?.onLine!==false;
 function accept(value){if(closed)return;if(store.accept(value,day))onChange(store.get());if(Number(value?.revision)===store.get()?.revision&&value?.day===day)lastAccepted=Date.now();}
 async function refresh(){
  if(closed||!visible()||pending)return;
  const controller=new AbortController(),version=generation;pending=controller;lastRead=Date.now();
  try{const response=await fetcher(OWNER_PROJECT_URL+'/functions/v1/reciter-competition?live=1&day='+day,{headers:{apikey:OWNER_PUBLIC_KEY},credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(5000)])});
   if(!response.ok)throw Error('shared_total_unavailable');
   const frame=await response.json();if(!frame)throw Error('shared_total_unavailable');if(version===generation)accept(frame);
  }catch{if(version===generation&&store.get()&&Date.now()-lastAccepted>10000){store.reset();onChange(null);}}finally{if(pending===controller)pending=null;}
 }
 function disconnect(){generation++;pending?.abort();pending=null;const old=client;client=null;channel=null;if(old){void old.removeAllChannels().catch(()=>{});old.realtime.disconnect();}}
 function connect(){
  if(closed||!visible())return;if(day!==getDay()){disconnect();store.reset();day=getDay();onChange(null);}if(channel)return;
  const sdk=environment.supabase;if(!sdk?.createClient){void refresh();return;}
  // A separate read-only client never reads, refreshes or overwrites the account session.
  client=sdk.createClient(OWNER_PROJECT_URL,OWNER_PUBLIC_KEY,{auth:{storageKey:'salah-public-shared-listening-v1',persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:5}}});
  const version=generation;
  channel=client.channel('shared-listening:'+day).on('postgres_changes',{event:'*',schema:'public',table:'salah_shared_listening',filter:'day=eq.'+day},event=>{if(version===generation&&visible())accept(event.new);}).subscribe(status=>{if(version===generation&&status==='SUBSCRIBED')void refresh();});
  void refresh();
 }
 const visibility=()=>{if(visible())connect();else disconnect();};
 environment.document.addEventListener('visibilitychange',visibility);environment.addEventListener('online',visibility);environment.addEventListener('offline',visibility);
 const timer=environment.setInterval(()=>{if(day!==getDay())connect();if(visible()&&Date.now()-lastRead>=5000&&(!store.get()||Date.now()-lastAccepted>=4000))void refresh();},1000);
 connect();
 return{frame:()=>store.get(),refresh,close(){closed=true;disconnect();environment.clearInterval(timer);environment.document.removeEventListener('visibilitychange',visibility);environment.removeEventListener('online',visibility);environment.removeEventListener('offline',visibility);store.reset();}};
}

