import{supportPhotoUrl}from './support-photo.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses={open:'Ждёт ответа',answered:'Есть ответ',closed:'Закрыто'};
const date=value=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('ru',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'';
export function supportError(error){
 const text=error?.message||'';
 if(text.includes('support_rate_limit'))return 'Вы отправили несколько сообщений подряд. Подождите минуту и попробуйте снова.';
 if(text.includes('conversation_closed'))return 'Обращение уже закрыто. Создайте новое.';
 if(text.includes('conversation_full'))return 'В переписке уже много сообщений. Создайте новое обращение.';
 if(error?.code==='42501')return 'Обращение недоступно. Проверьте вход в аккаунт.';
 if(error?.code==='22023')return 'Проверьте тему и текст сообщения.';
 return 'Не удалось выполнить запрос. Проверьте интернет и повторите попытку.';
}
export function mountSupportPanel(root,{auth,app,version,owner=false,signInHref='#account',createDiagnostics,preparePhoto}={}){
 let disposed=false,revision=0,accountId=null,rows=[],filter=app,before=null,more=false,thread=null,threadData=null,draft={subject:'',body:'',id:null,diagnostics:'',photo:null},reply={body:'',id:null},locked=false,diagnostics=null,photoBusy=false,photoRevision=0;
 const requests=new Set(),replyDrafts=new Map(),fieldPrefix='support-'+app+'-'+(owner?'owner':'user');
 const live=id=>!disposed&&root.isConnected&&id===revision;
 function clearPrivateState(){revision++;photoRevision++;photoBusy=false;for(const request of requests)request.abort();rows=[];before=null;more=false;thread=threadData=null;draft={subject:'',body:'',id:null,diagnostics:'',photo:null};diagnostics?.dispose?.();diagnostics=null;reply={body:'',id:null};replyDrafts.clear();locked=false}
 async function rpc(name,args){
  const controller=new AbortController();requests.add(controller);const timeout=setTimeout(()=>controller.abort(),name==='support_create_photo'?45000:15000);
  try{const result=await auth.rpc(name,args).abortSignal(controller.signal);if(controller.signal.aborted)throw new Error('support_cancelled');if(result.error)throw result.error;return result.data}
  finally{clearTimeout(timeout);requests.delete(controller)}
 }
 function notice(message,alert=false){const element=root.querySelector('[data-support-status]');if(element){element.textContent=message;element.setAttribute('role',alert?'alert':'status')}}
 function shell(content){root.innerHTML='<div class="support-panel"><div class="support-heading"><h2>'+ (owner?'Обращения':'Поддержка')+'</h2>'+'</div><p data-support-status role="status" aria-live="polite"></p>'+content+'</div>';const select=root.querySelector('#support-app');if(select){select.value=filter;select.onchange=()=>{filter=select.value;void loadList()}}}
 function listView(){
  thread=threadData=null;reply={body:'',id:null};shell('<div class="support-actions">'+(!owner?'<button type="button" class="button" data-support-new>Написать в поддержку</button>':'')+'<button type="button" class="button secondary" data-support-refresh>Обновить</button></div>'+(rows.length?'<div class="support-list">'+rows.map(row=>'<button type="button" class="support-thread" data-support-thread="'+esc(row.id)+'"><strong>'+esc(row.subject)+'</strong><span>'+esc(statuses[row.status]||'')+'</span>'+(owner&&row.owner_unread?'<span class="support-new-badge">Новое</span>':'')+'<small>'+(owner?esc(row.app.toUpperCase()+' · '+(row.nickname||'Без ника'))+' · ':'')+esc(date(row.updated_at))+'</small></button>').join('')+'</div>':'<p class="muted support-empty">'+(owner?'Обращений пока нет.':'Ваши обращения появятся здесь.')+'</p>')+(more?'<button type="button" class="text-button" data-support-more>Показать ранние обращения</button>':''));
 }
 async function loadList(append=false,{silent=false}={}){
  const id=++revision,previousRows=JSON.stringify(rows),previousUnread=new Set(rows.filter(row=>row.owner_unread).map(row=>row.id));
  if(!silent)shell('<p class="muted">Загружаем обращения…</p>');
  try{const data=await rpc('support_list',{p_app:filter,p_owner:owner,p_before:append?before:null});if(!live(id))return;if(!Array.isArray(data))throw Error();more=data.length===50;rows=append?[...rows,...data]:data;before=data.at(-1)?.updated_at||null;const fresh=owner&&!append?rows.filter(row=>row.owner_unread&&!previousUnread.has(row.id)):[];if(!silent||JSON.stringify(rows)!==previousRows)listView();if(fresh.length)notice('Новое обращение: '+fresh[0].subject)}
  catch(error){if(live(id)){if(!silent)listView();notice(supportError(error),true)}}
 }
 function newView(){
  thread=threadData=null;shell('<button type="button" class="text-button" data-support-back>Мои обращения</button><form data-support-create><label for="'+fieldPrefix+'-subject">Тема</label><input id="'+fieldPrefix+'-subject" name="subject" maxlength="120" required value="'+esc(draft.subject)+'"><label for="'+fieldPrefix+'-body">Сообщение</label><textarea id="'+fieldPrefix+'-body" name="body" maxlength="3000" rows="6" required>'+esc(draft.body)+'</textarea><p class="muted support-note">Не присылайте пароли и коды входа.</p><button type="button" class="support-diagnostics" data-support-diagnostics aria-pressed="'+Boolean(draft.diagnostics)+'">Прикрепить данные о сбое</button><p class="muted support-note">По желанию: версия, раздел и число ошибок. Текст ошибок и личные данные не добавляются.</p><pre class="support-diagnostic-preview" data-support-diagnostic-preview'+(draft.diagnostics?'':' hidden')+'>'+esc(draft.diagnostics)+'</pre><input type="file" accept="image/*" id="'+fieldPrefix+'-photo" data-support-photo-input hidden><button type="button" class="button secondary" data-support-photo-pick>Прикрепить фото</button>'+(draft.photo?'<div class="support-photo-preview"><img src="'+esc(draft.photo.preview)+'" alt="Прикреплённое фото"><button type="button" class="text-button" data-support-photo-remove>Убрать фото</button></div>':'')+'<button type="submit" class="button">Отправить</button></form>');
 }
 function photoMarkup(data,messageId){
  const photo=Array.isArray(data.photos)?data.photos.find(item=>item.message_id===messageId):null;
  if(photo?.unavailable)return '<p class="muted support-note">Фото временно недоступно. Обновите переписку.</p>';
  const url=supportPhotoUrl(photo?.url);return url?'<a class="support-photo" href="'+esc(url)+'" target="_blank" rel="noreferrer"><img src="'+esc(url)+'" referrerpolicy="no-referrer" alt="Фото к обращению"></a>':'';
 }
 function threadView(data){
  thread=data.thread;threadData=data;reply=replyDrafts.get(thread.id)||{body:'',id:null};replyDrafts.set(thread.id,reply);shell('<div class="support-actions"><button type="button" class="text-button" data-support-back>Все обращения</button><button type="button" class="text-button" data-support-reload>Обновить</button></div><h3>'+esc(thread.subject)+'</h3><p class="muted support-note">'+esc(statuses[thread.status]||'')+' · '+esc(thread.app.toUpperCase())+' '+esc(thread.version)+(owner?' · '+esc(thread.nickname||'Без ника'):'')+'</p><div class="support-messages">'+data.messages.map(message=>'<article class="support-message'+(message.owner_reply?' is-answer':'')+'"><div><strong>'+(message.owner_reply?'Поддержка':owner?esc(thread.nickname||'Пользователь'):'Вы')+'</strong><time>'+esc(date(message.created_at))+'</time></div><p>'+esc(message.body)+'</p>'+photoMarkup(data,message.id)+'</article>').join('')+'</div>'+(thread.status==='closed'?'<p class="muted">Обращение закрыто.</p>':'<form data-support-reply><label for="'+fieldPrefix+'-reply">'+(owner?'Ответ пользователю':'Дополнить обращение')+'</label><textarea id="'+fieldPrefix+'-reply" name="body" maxlength="3000" rows="4" required>'+esc(reply.body)+'</textarea><button type="submit" class="button">'+(owner?'Ответить':'Отправить')+'</button></form>'+(owner?'<button type="button" class="text-button support-close" data-support-close>Закрыть обращение</button>':'')));
 }
 async function readThread(threadId){const previous=threadData?.thread.id===threadId?threadData:null,id=++revision;shell('<p class="muted">Загружаем переписку…</p>');try{const data=await rpc('support_read',{p_id:threadId,p_app:app,p_owner:owner});if(live(id)){threadView(data);return true}}catch(error){if(live(id)){if(previous)threadView(previous);else listView();notice(supportError(error),true)}}return false}
 async function run(task){if(locked)return;const lock={};locked=lock;const id=revision;root.querySelectorAll('button,input,textarea,select').forEach(c=>c.disabled=true);notice('Отправляем…');try{await task(()=>live(id))}catch(error){if(live(id))notice(supportError(error),true)}finally{if(locked===lock){locked=false;if(!disposed)root.querySelectorAll('button,input,textarea,select').forEach(c=>c.disabled=false)}}}
 async function account(){
  clearPrivateState();accountId=null;const id=revision;shell('<p class="muted">Проверяем вход…</p>');
  try{const {data,error}=await auth.auth.getSession();if(!live(id))return;if(error)throw error;accountId=data.session?.user?.id||null;
   if(!accountId){shell('<p class="muted">Войдите в аккаунт, чтобы написать в поддержку и получать ответы здесь.</p><a class="button" href="'+esc(signInHref)+'">Войти или зарегистрироваться</a>');return}await loadList();
  }catch(error){if(live(id))notice(supportError(error),true)}
 }
 root.onclick=event=>{
  if(locked||disposed)return;const button=event.target.closest('button');if(!button||!root.contains(button))return;
  if(button.hasAttribute('data-support-diagnostics')){
   if(draft.diagnostics){draft.diagnostics='';diagnostics?.dispose?.();diagnostics=null;button.setAttribute('aria-pressed','false');const preview=root.querySelector('[data-support-diagnostic-preview]');if(preview){preview.textContent='';preview.hidden=true}}
   else{diagnostics=createDiagnostics?.()||null;draft.diagnostics=diagnostics?.snapshot?.()||'Версия SALAH: '+String(version||'неизвестна').slice(0,12);button.setAttribute('aria-pressed','true');const preview=root.querySelector('[data-support-diagnostic-preview]');if(preview){preview.textContent=draft.diagnostics;preview.hidden=false}}
  }
  else if(button.hasAttribute('data-support-photo-pick'))root.querySelector('[data-support-photo-input]')?.click();
  else if(button.hasAttribute('data-support-photo-remove')){photoRevision++;photoBusy=false;draft.photo=null;draft.id=null;newView()}
  else if(button.hasAttribute('data-support-new'))newView();
  else if(button.hasAttribute('data-support-back')||button.hasAttribute('data-support-refresh'))void loadList();
  else if(button.hasAttribute('data-support-more'))void loadList(true);
  else if(button.dataset.supportThread)void readThread(button.dataset.supportThread);
  else if(button.hasAttribute('data-support-reload')&&thread)void readThread(thread.id);
  else if(button.hasAttribute('data-support-close')&&owner&&thread)void run(async valid=>{const current=thread.id;await rpc('support_close',{p_id:current,p_app:app});if(valid())await readThread(current)});
 };
 root.onchange=async event=>{
  const input=event.target;if(!input.hasAttribute?.('data-support-photo-input')||locked||disposed||!preparePhoto)return;
  const file=input.files?.[0];if(!file)return;
  const id=revision,task=++photoRevision;photoBusy=true;const submit=root.querySelector('button[type="submit"]');if(submit)submit.disabled=true;notice('Готовим фото…');
  try{const photo=await preparePhoto(file);if(live(id)&&task===photoRevision){draft.photo=photo;draft.id=null;newView();notice('Фото прикреплено.')}}
  catch(error){if(live(id)&&task===photoRevision)notice(error.message||'Не удалось прикрепить фото.',true)}
  finally{input.value='';if(task===photoRevision){photoBusy=false;const button=root.querySelector('button[type="submit"]');if(button&&!locked)button.disabled=false}}
 };
 root.oninput=event=>{if(locked||disposed)return;const form=event.target.closest('form');if(form?.hasAttribute('data-support-create')){draft.subject=form.elements.subject.value;draft.body=form.elements.body.value;draft.id=null}else if(form?.hasAttribute('data-support-reply')){reply.body=form.elements.body.value;reply.id=null}};
 root.onsubmit=event=>{
  event.preventDefault();const form=event.target;if(locked||disposed||!form.checkValidity())return;if(photoBusy){notice('Подождите, фото готовится.');return}
  if(form.hasAttribute('data-support-create')){draft.subject=form.elements.subject.value.trim();draft.body=form.elements.body.value.trim();if(!draft.subject||!draft.body){notice('Введите тему и сообщение.',true);return}if(diagnostics)draft.diagnostics=diagnostics.snapshot();const body=draft.diagnostics?draft.body+'\n\nТехнические данные SALAH\n'+draft.diagnostics:draft.body;if(body.length>3000){notice('Сократите сообщение, чтобы приложить данные.',true);return}draft.id??=crypto.randomUUID();void run(async valid=>{const current=draft.id;await rpc(draft.photo?'support_create_photo':'support_create',{p_id:current,p_app:app,p_subject:draft.subject,p_body:body,p_version:String(version),...(draft.photo?{p_photo:draft.photo.data}:{})});if(!valid())return;diagnostics?.dispose?.();diagnostics=null;draft={subject:'',body:'',id:null,diagnostics:'',photo:null};if(await readThread(current))notice('Обращение отправлено.');})}
  else if(form.hasAttribute('data-support-reply')&&thread){reply.body=form.elements.body.value.trim();if(!reply.body){notice('Введите сообщение.',true);return}reply.id??=crypto.randomUUID();void run(async valid=>{const current=thread.id;await rpc('support_reply',{p_thread:current,p_app:app,p_id:reply.id,p_body:reply.body,p_owner:owner});if(valid()){replyDrafts.delete(current);if(await readThread(current))notice(owner?'Ответ отправлен.':'Сообщение отправлено.')}})}
 };
 const ownerPoll=owner?setInterval(()=>{if(!disposed&&root.isConnected&&!thread&&globalThis.document?.visibilityState!=='hidden')void loadList(false,{silent:true})},30000):null;
 const {data:{subscription}}=auth.auth.onAuthStateChange((_event,session)=>{const nextId=session?.user?.id||null;if(disposed||nextId===accountId)return;clearPrivateState();accountId=nextId;const id=revision;shell('<p class="muted">Проверяем вход…</p>');setTimeout(()=>{if(live(id))void account()},0)});void account();
 return()=>{disposed=true;if(ownerPoll)clearInterval(ownerPoll);clearPrivateState();subscription.unsubscribe();root.onclick=root.oninput=root.onchange=root.onsubmit=null;root.replaceChildren();accountId=null};
}
