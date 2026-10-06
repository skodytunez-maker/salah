export function createOwnerSupportStatus({getOwnerId,getRpc,root=globalThis.document,windowRef=globalThis.window,documentRef=globalThis.document}){
 let snapshot=null,controller=null,revision=0,lastCheck=0,again=false;
 function paint(){
  const id=getOwnerId();
  for(const dot of root.querySelectorAll('[data-owner-support-status]')){
   const known=Boolean(id&&snapshot?.owner===id);dot.hidden=!known;
   if(known){const waiting=snapshot.pending>0;dot.setAttribute('data-state',waiting?'waiting':'clear');dot.setAttribute('role','img');dot.setAttribute('aria-label',waiting?'Есть непрочитанные сообщения':'Все сообщения просмотрены');dot.setAttribute('title',waiting?'Есть непрочитанные сообщения':'Все сообщения просмотрены')}
  }
 }
 async function refresh({force=false}={}){
  const owner=getOwnerId();paint();
  if(!owner){revision++;controller?.abort();controller=null;snapshot=null;lastCheck=0;again=false;paint();return}
  if(documentRef?.visibilityState==='hidden')return;
  if(controller){if(force)again=true;return}
  if(!force&&snapshot?.owner===owner&&Date.now()-lastCheck<5000)return;
  const id=++revision,request=new AbortController();controller=request;
  const timeout=setTimeout(()=>request.abort(),15000);
  try{
   const result=await getRpc()('support_owner_status',{p_app:'salah'}).abortSignal(request.signal);
   if(request.signal.aborted||id!==revision||getOwnerId()!==owner)return;
   if(result.error||!Number.isSafeInteger(result.data?.pending)||result.data.pending<0)throw Error('unavailable');
   snapshot={owner,pending:result.data.pending};lastCheck=Date.now();paint();
  }catch{if(id===revision){snapshot=null;paint()}}
  finally{clearTimeout(timeout);if(controller===request){controller=null;if(again){again=false;void refresh({force:true})}}}
 }
 const changed=()=>void refresh({force:true}),visible=()=>{if(documentRef.visibilityState!=='hidden')changed()};
 windowRef?.addEventListener?.('salah:support-status-refresh',changed);
 documentRef?.addEventListener?.('visibilitychange',visible);
 const timer=setInterval(()=>void refresh(),30000);
 return{refresh,stop(){revision++;again=false;controller?.abort();controller=null;clearInterval(timer);windowRef?.removeEventListener?.('salah:support-status-refresh',changed);documentRef?.removeEventListener?.('visibilitychange',visible);snapshot=null;paint()}};
}
