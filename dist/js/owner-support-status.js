import{ownerMessage,ownerLeaf,ownerText,ownerMarkup,ownerError,ownerHeading,ownerDate,ownerDateLeaf,ownerPaint,watchOwnerUi,stopOwnerUi,uiMessage,uiLeaf,uiSet,uiRaw,uiAttrs,uiAttribute,uiAttributeAttrs,t,getLocale}from './owner-i18n.js';
import{supportNotice,clearSupportNotice}from './support-notice.js';
export function createOwnerSupportStatus({getOwnerId,getRpc,root=globalThis.document,windowRef=globalThis.window,documentRef=globalThis.document}){
 const stopLanguage=watchOwnerUi(root);
 let snapshot=null,controller=null,revision=0,lastCheck=0,again=false;
 function paint(){
  const id=getOwnerId();
  for(const dot of root.querySelectorAll('[data-owner-support-status]')){
   const known=Boolean(id&&snapshot?.owner===id);dot.hidden=!known;
   if(known){const waiting=snapshot.pending>0,key=snapshot.answerState?(waiting?'supportConversationUi.pending':'supportConversationUi.noPending'):(waiting?'ownerUi.unreadMessages':'ownerUi.allMessagesRead'),fallback=snapshot.answerState?(waiting?'Есть обращения без ответа':'Нет обращений без ответа'):(waiting?'Есть непрочитанные сообщения':'Все сообщения просмотрены');dot.setAttribute('data-state',waiting?'waiting':'clear');dot.setAttribute('role','img');uiAttribute(dot,'aria-label',key,fallback);uiAttribute(dot,'title',key,fallback)}
  }
 }
 async function refresh({force=false}={}){
  const owner=getOwnerId();paint();
  if(!owner){clearSupportNotice({owner:true,documentRef});revision++;controller?.abort();controller=null;snapshot=null;lastCheck=0;again=false;paint();return}
  if(documentRef?.visibilityState==='hidden')return;
  if(controller){if(force)again=true;return}
  if(!force&&snapshot?.owner===owner&&Date.now()-lastCheck<5000)return;
  const id=++revision,request=new AbortController();controller=request;
  const timeout=setTimeout(()=>request.abort(),15000);
  try{
   const result=await getRpc()('support_owner_status',{p_app:'salah'}).abortSignal(request.signal);
   if(request.signal.aborted||id!==revision||getOwnerId()!==owner)return;
   if(result.error||!Number.isSafeInteger(result.data?.pending)||result.data.pending<0)throw Error('unavailable');
   snapshot={owner,pending:result.data.pending,answerState:Number.isSafeInteger(result.data.unread)&&result.data.unread>=0};lastCheck=Date.now();paint();supportNotice({actor:owner,owner:true,pending:result.data.pending,latest:result.data.latest,documentRef,windowRef});
  }catch{if(id===revision){snapshot=null;paint()}}
  finally{clearTimeout(timeout);if(controller===request){controller=null;if(again){again=false;void refresh({force:true})}}}
 }
 const changed=()=>void refresh({force:true}),visible=()=>{if(documentRef.visibilityState!=='hidden')changed()};
 windowRef?.addEventListener?.('salah:support-status-refresh',changed);
 documentRef?.addEventListener?.('visibilitychange',visible);
 const timer=setInterval(()=>void refresh(),30000);
 return{refresh,stop(){stopLanguage();revision++;again=false;controller?.abort();controller=null;clearInterval(timer);windowRef?.removeEventListener?.('salah:support-status-refresh',changed);documentRef?.removeEventListener?.('visibilitychange',visible);snapshot=null;paint()}};
}

