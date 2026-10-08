const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const seen=new Map();
export function supportNotice({actor,owner=false,pending,latest,documentRef=globalThis.document,windowRef=globalThis.window}={}){
 if(!actor||!Number.isSafeInteger(pending)||pending<1||!UUID.test(latest?.id||'')||!UUID.test(latest?.thread||''))return false;
 const key=actor+':'+owner;if(seen.get(key)===latest.id)return false;
 seen.set(key,latest.id);if(seen.size>20)seen.delete(seen.keys().next().value);
 if(!documentRef?.body)return true;
 documentRef.querySelector('[data-support-notice]')?.remove();
 const banner=documentRef.createElement('aside');banner.dataset.supportNotice='';banner.className='support-message-notice';banner.setAttribute('role','status');
 const link=documentRef.createElement('a');link.href='#support?thread='+latest.thread+(owner?'&owner=1':'');link.textContent=owner?'Новое сообщение пользователя':'Новый ответ поддержки';
 const close=documentRef.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Закрыть уведомление');close.onclick=()=>banner.remove();link.onclick=()=>banner.remove();
 banner.append(link,close);documentRef.body.append(banner);
 setTimeout(()=>banner.remove(),12000);return true;
}
