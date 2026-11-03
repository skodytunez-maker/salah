import {RETURN_DEFAULT_TEXT,RETURN_UUID} from './owner-return-core.js';
import {accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY} from './owner-auth.js';
import {esc,modal} from './ui.js';
let lastCampaign=null;
const CAMPAIGN_KEY='salah:owner-return:last-v1';
function savedCampaign(){try{const id=localStorage.getItem(CAMPAIGN_KEY);return RETURN_UUID.test(id||'')?id:null;}catch{return null;}}
function rememberCampaign(result){try{if(result.state==='queued')localStorage.setItem(CAMPAIGN_KEY,result.id);else if(result.state!=='draft'&&savedCampaign()===result.id)localStorage.removeItem(CAMPAIGN_KEY);}catch{}}
export async function ownerReturnRequest(input){
 const{data,error}=await accountAuthClient().auth.getSession();
 if(error||!data?.session?.access_token)throw Error('Войдите снова в кабинет владельца.');
 const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/owner-reminders',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(input),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});
 const result=await response.json().catch(()=>null);
 if(!response.ok)throw Error(response.status===409?'Предпросмотр устарел. Проверьте получателей ещё раз.':[401,403].includes(response.status)?'Подтвердите вход владельца через Google Authenticator.':response.status===429?'Слишком много запросов. Повторите чуть позже.':'Не удалось подключить отправку. Попробуйте ещё раз.');
 if(!RETURN_UUID.test(result?.id||'')||!['draft','queued','complete','cancelled','expired'].includes(result.state)||!Number.isSafeInteger(result.reachable)||result.reachable<0)throw Error('Не удалось проверить отправку.');
 return result;
}
export function mountOwnerReturnCampaign(host,{isActive=()=>true,call=ownerReturnRequest,show=modal,uuid=()=>crypto.randomUUID(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(!host)return()=>{};let disposed=false,closeCurrent=()=>{};
 const entry=document.createElement('div');entry.className='owner-return-entry';
 entry.innerHTML='<button type="button" class="text-button owner-return-open">Напомнить неактивным</button>';host.prepend(entry);
 entry.querySelector('button').onclick=()=>{
  if(disposed||!isActive())return;closeCurrent();
  show('<div class="modal-head"><h2>Напоминание SALAH</h2><button class="icon-button" data-close aria-label="Закрыть">×</button></div><div class="owner-return-form"><div class="field"><label for="owner-return-days">Не заходили</label><select id="owner-return-days"><option value="7">Больше недели</option><option value="14">Больше двух недель</option><option value="30">Больше месяца</option></select></div><div class="field"><label for="owner-return-text">Текст уведомления</label><textarea id="owner-return-text" rows="3" maxlength="180">'+esc(RETURN_DEFAULT_TEXT)+'</textarea></div><p class="muted">Только подключённые уведомления. Не чаще одного напоминания в неделю. Ночью отправка подождёт утра.</p><button type="button" class="button secondary" id="owner-return-preview">Проверить получателей</button><div class="owner-return-review" hidden></div><p class="muted" role="status" aria-live="polite"></p><button type="button" class="button" id="owner-return-send" hidden>Отправить</button><button type="button" class="text-button" id="owner-return-cancel" hidden>Остановить ожидающие</button></div>');
  const dialog=document.getElementById('modal'),form=dialog.querySelector('.owner-return-form'),text=form.querySelector('textarea'),days=form.querySelector('select'),preview=form.querySelector('#owner-return-preview'),review=form.querySelector('.owner-return-review'),send=form.querySelector('#owner-return-send'),cancel=form.querySelector('#owner-return-cancel'),status=form.querySelector('[role=status]');
  let alive=true,busy=false,draft=null,timer=null;
  const active=()=>alive&&!disposed&&isActive()&&form.isConnected&&dialog.querySelector('.owner-return-form')===form;
  const stop=()=>{alive=false;clearTimer(timer);dialog.removeEventListener('close',stop);};
  closeCurrent=()=>{if(dialog.querySelector('.owner-return-form')===form){if(dialog.open)dialog.close();form.remove();}stop();};dialog.addEventListener('close',stop,{once:true});
  const draw=result=>{
   if(!active())return;draft=result;lastCampaign=result.id;rememberCampaign(result);text.value=result.body;days.value=String(result.days);
   review.hidden=false;review.innerHTML='<dl><dt>Не заходили</dt><dd>'+Number(result.inactive||0)+'</dd><dt>Могут получить</dt><dd>'+result.reachable+'</dd></dl>';
   const queued=result.state==='queued';text.disabled=days.disabled=queued;preview.hidden=queued;
   send.hidden=result.state!=='draft'||result.reachable===0;send.textContent='Отправить · '+result.reachable;
   cancel.hidden=!queued;
   status.textContent=result.state==='draft'?(result.reachable?'Проверьте текст. Рассылка ещё не запущена.':'Нет доступных получателей с подключёнными уведомлениями.'):result.state==='queued'?'В очереди: '+Number(result.queued||0)+'. Передано в доставку: '+Number(result.sent||0)+'.':result.state==='complete'?'Передано в доставку: '+Number(result.sent||0)+'. Исключено: '+Number(result.skipped||0)+'. Недоступно: '+Number(result.failed||0)+'.':result.state==='cancelled'?'Ожидающие отправки остановлены.':'Срок отправки истёк.';
   if(queued){clearTimer(timer);timer=setTimer(()=>void refresh(),5000);}
  };
  const refresh=async()=>{if(!active()||!draft||busy)return;working(true);try{draw(await call({action:'status',id:draft.id}));}catch(error){if(active()){status.textContent=error.message;if(draft?.state==='queued')timer=setTimer(()=>void refresh(),10000);}}finally{if(active())working(false);}};
  const working=value=>{busy=value;preview.disabled=send.disabled=cancel.disabled=value;text.disabled=days.disabled=value||draft?.state==='queued';};
  const invalidate=()=>{if(busy)return;draft=null;lastCampaign=null;clearTimer(timer);review.hidden=true;send.hidden=true;status.textContent='Проверьте получателей для этого текста.';};text.addEventListener('input',invalidate);days.addEventListener('change',invalidate);
  preview.onclick=async()=>{if(!active()||busy)return;const body=text.value.trim();if(body.length<5||body.length>180){status.textContent='Введите текст: от 5 до 180 символов.';text.focus();return;}working(true);status.textContent='Проверяем доступные подключения…';try{draw(await call({action:'preview',id:uuid(),body,days:Number(days.value)}));}catch(error){if(active())status.textContent=error.message;}finally{if(active())working(false);}};
  send.onclick=async()=>{if(!active()||busy||draft?.state!=='draft'||!draft.reachable)return;working(true);rememberCampaign({id:draft.id,state:'queued'});status.textContent='Ставим напоминание в очередь…';try{draw(await call({action:'queue',id:draft.id}));}catch(error){if(active())status.textContent=error.message;}finally{if(active())working(false);}};
  cancel.onclick=async()=>{if(!active()||busy||draft?.state!=='queued')return;working(true);try{draw(await call({action:'cancel',id:draft.id}));}catch(error){if(active())status.textContent=error.message;}finally{if(active())working(false);}};
  const restored=lastCampaign||savedCampaign();if(restored){draft={id:restored};void refresh();}
 };
 return()=>{disposed=true;closeCurrent();entry.remove();};
}
