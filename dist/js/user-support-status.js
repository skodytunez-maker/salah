import{supportNotice}from './support-notice.js';
export function createUserSupportStatus({getUserId,getRpc,root=globalThis.document,windowRef=globalThis.window,documentRef=globalThis.document}){
 let snapshot=null,controller=null,revision=0,lastCheck=0,again=false;
 function paint(){
  const id=getUserId();
  for(const dot of root.querySelectorAll('[data-user-support-status]')){
   const known=Boolean(id&&snapshot?.user===id);dot.hidden=!known||snapshot.pending===0;
   if(known){const waiting=snapshot.pending>0;dot.setAttribute('data-state',waiting?'waiting':'clear');dot.setAttribute('role','img');dot.setAttribute('aria-label',waiting?'Есть новый ответ поддержки':'Нет новых ответов');dot.setAttribute('title',waiting?'Есть новый ответ поддержки':'Нет новых ответов')}
  }
 }
 async function refresh({force=false}={}){
  const user=getUserId();paint();
  if(!user){revision++;controller?.abort();controller=null;snapshot=null;lastCheck=0;again=false;paint();return}
  if(documentRef?.visibilityState==='hidden')return;
  if(controller){if(force)again=true;return}
  if(!force&&snapshot?.user===user&&Date.now()-lastCheck<5000)return;
  const id=++revision,request=new AbortController();controller=request;
  const timeout=setTimeout(()=>request.abort(),15000);
  try{
   const result=await getRpc()('support_user_status',{p_app:'salah'}).abortSignal(request.signal);
   if(request.signal.aborted||id!==revision||getUserId()!==user)return;
   if(result.error||!Number.isSafeInteger(result.data?.pending)||result.data.pending<0)throw Error('unavailable');
   snapshot={user,pending:result.data.pending};lastCheck=Date.now();paint();supportNotice({actor:user,owner:false,pending:result.data.pending,latest:result.data.latest,documentRef,windowRef});
  }catch{if(id===revision){snapshot=null;paint()}}
  finally{clearTimeout(timeout);if(controller===request){controller=null;if(again){again=false;void refresh({force:true})}}}
 }
 const changed=()=>void refresh({force:true}),visible=()=>{if(documentRef.visibilityState!=='hidden')changed()};
 windowRef?.addEventListener?.('salah:support-status-refresh',changed);
 windowRef?.addEventListener?.('salah:counter-status',changed);
 documentRef?.addEventListener?.('visibilitychange',visible);
 const timer=setInterval(()=>void refresh(),30000);
 return{refresh,stop(){revision++;again=false;controller?.abort();controller=null;clearInterval(timer);windowRef?.removeEventListener?.('salah:support-status-refresh',changed);windowRef?.removeEventListener?.('salah:counter-status',changed);documentRef?.removeEventListener?.('visibilitychange',visible);snapshot=null;paint()}};
}
