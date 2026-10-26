import{staffRequest}from './staff-transport.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE='salah:staff-message-cursor';
export const staffMessageRoom=hash=>{const room=new URLSearchParams(String(hash||'').split('?')[1]||'').get('room');return UUID.test(room||'')?room.toLowerCase():null;};
export function normalizeStaffMessageStatus(value){
 if(!Number.isSafeInteger(value?.pending)||value.pending<0||!Array.isArray(value.rooms)||value.rooms.length>1000)throw Error('invalid_status');
 const rooms=value.rooms.map(r=>{if(!UUID.test(r?.id||'')||!Number.isSafeInteger(r.unread)||r.unread<1)throw Error('invalid_status');return{id:r.id,unread:r.unread};});
 if(new Set(rooms.map(r=>r.id)).size!==rooms.length||rooms.reduce((sum,r)=>sum+r.unread,0)!==value.pending)throw Error('invalid_status');
 if(!value.pending){if(value.latest!==null)throw Error('invalid_status');return{pending:0,rooms,latest:null};}
 const latest=value.latest;if(!UUID.test(latest?.id||'')||!UUID.test(latest?.room||'')||!rooms.some(r=>r.id===latest.room)||typeof latest.created_at!=='string'||!Number.isFinite(Date.parse(latest.created_at)))throw Error('invalid_status');
 const fraction=latest.created_at.match(/\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/)?.[1]||'';
 const order=Date.parse(latest.created_at)*1000+Number(fraction.padEnd(6,'0'))%1000;
 return{pending:value.pending,rooms,latest:{id:latest.id,room:latest.room,order}};
}
export function createStaffMessageStatus({getUserId,request=staffRequest,documentRef=globalThis.document,windowRef=globalThis.window,storageRef,clock=Date.now,interval=setInterval,clear=clearInterval}={}){
 let actor=null,snapshot=null,controller=null,generation=0,lastCheck=0,blockedUntil=0,again=false,cursor=null,stopped=false,noticeTimer=null;
 try{storageRef??=globalThis.sessionStorage;}catch{}
 const removeNotice=()=>{clearTimeout(noticeTimer);noticeTimer=null;documentRef?.querySelector('[data-staff-message-notice]')?.remove();};
 function paint(){for(const badge of documentRef?.querySelectorAll('[data-staff-message-count]')||[]){const count=actor&&getUserId()===actor?snapshot?.pending||0:0;badge.hidden=!count;badge.textContent=count>99?'99+':String(count);badge.setAttribute('aria-label','Непрочитанные сообщения команды: '+count);}}
 function reset(user){generation++;controller?.abort();controller=null;again=false;actor=user;snapshot=null;lastCheck=0;blockedUntil=0;cursor=null;removeNotice();try{const saved=JSON.parse(storageRef?.getItem(STORAGE)||'null');if(saved?.actor===user&&UUID.test(saved.id||'')&&Number.isSafeInteger(saved.order))cursor=saved;}catch{}paint();}
 function announce(latest){
  if(!latest||cursor&&(latest.order<cursor.order||latest.order===cursor.order&&latest.id<=cursor.id))return;
  cursor={actor,id:latest.id,order:latest.order};try{storageRef?.setItem(STORAGE,JSON.stringify(cursor));}catch{}
  const open=documentRef?.querySelector('[data-staff-open-room="'+latest.room+'"]');if(open?.querySelector('[data-message="'+latest.id+'"]'))return;
  removeNotice();if(!documentRef?.body)return;
  const banner=documentRef.createElement('aside');banner.dataset.staffMessageNotice='';banner.className='support-message-notice staff-message-notice';banner.setAttribute('role','status');
  const link=documentRef.createElement('a');link.href=(documentRef?.querySelector('.owner-workspace')?'#admin?view=team&room=':'#staff?room=')+latest.room;link.textContent='Новое сообщение команды';link.onclick=e=>{banner.remove();if(['#staff','#admin'].includes(windowRef?.location?.hash?.split('?')[0])){e.preventDefault();windowRef.dispatchEvent(new CustomEvent('salah:staff-message-open',{detail:{room:latest.room}}));}};
  const close=documentRef.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Закрыть уведомление о сообщении команды');close.onclick=()=>banner.remove();banner.append(link,close);documentRef.body.append(banner);
  noticeTimer=setTimeout(()=>{banner.remove();noticeTimer=null;},12000);
 }
 async function refresh({force=false}={}){
  if(stopped)return;const user=getUserId();if(user!==actor)reset(user);paint();if(!user||documentRef?.visibilityState==='hidden')return;
  if(controller){if(force)again=true;return;}if(!force&&(clock()<blockedUntil||snapshot&&clock()-lastCheck<10000))return;
  const version=++generation,scope=actor,pending=new AbortController();controller=pending;const timeout=setTimeout(()=>pending.abort(),10000);
  try{const result=normalizeStaffMessageStatus(await request('chat.status',{},pending.signal));if(pending.signal.aborted||stopped||generation!==version||getUserId()!==scope)return;snapshot=result;lastCheck=clock();blockedUntil=0;paint();windowRef?.dispatchEvent(new CustomEvent('salah:staff-messages-ready',{detail:{actor:scope}}));if(!result.pending)removeNotice();else announce(result.latest);}
  catch(error){if(stopped||generation!==version||getUserId()!==scope)return;if(error.name!=='AbortError'){if(['staff_only','forbidden','invalid_session','sign_in_required','mfa_required'].includes(error.code))windowRef?.dispatchEvent(new CustomEvent('salah:staff-messages-ready',{detail:{actor:null}}));snapshot=null;removeNotice();paint();blockedUntil=clock()+60000;}}
  finally{clearTimeout(timeout);if(controller===pending){controller=null;if(again){again=false;void refresh({force:true});}}}
 }
 const changed=()=>void refresh(),force=()=>void refresh({force:true}),visible=()=>{if(documentRef?.visibilityState!=='hidden')force();};
 windowRef?.addEventListener('salah:counter-status',changed);windowRef?.addEventListener('salah:staff-messages-refresh',force);windowRef?.addEventListener('salah:staff-messages-paint',paint);documentRef?.addEventListener('visibilitychange',visible);windowRef?.addEventListener('online',force);
 const timer=interval(changed,10000);
 return{refresh,paint,stop(){stopped=true;generation++;controller?.abort();clear(timer);windowRef?.removeEventListener('salah:counter-status',changed);windowRef?.removeEventListener('salah:staff-messages-refresh',force);windowRef?.removeEventListener('salah:staff-messages-paint',paint);documentRef?.removeEventListener('visibilitychange',visible);windowRef?.removeEventListener('online',force);snapshot=null;removeNotice();paint();}};
}
