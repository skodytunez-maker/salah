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
export function mountSupportPanel(root,{auth,app,version,owner=false,signInHref='#account'}={}){
 let disposed=false,revision=0,accountId=null,rows=[],filter=app,before=null,more=false,thread=null,draft={subject:'',body:'',id:null},reply={body:'',id:null},locked=false;
 const requests=new Set(),fieldPrefix='support-'+app+'-'+(owner?'owner':'user');
 const live=id=>!disposed&&root.isConnected&&id===revision;
 async function rpc(name,args){
  const controller=new AbortController();requests.add(controller);const timeout=setTimeout(()=>controller.abort(),15000);
  try{const result=await auth.rpc(name,args).abortSignal(controller.signal);if(result.error)throw result.error;return result.data}
  finally{clearTimeout(timeout);requests.delete(controller)}
 }
 function notice(message,alert=false){const element=root.querySelector('[data-support-status]');if(element){element.textContent=message;element.setAttribute('role',alert?'alert':'status')}}
 function shell(content){root.innerHTML='<div class="support-panel"><div class="support-heading"><h2>'+ (owner?'Обращения':'Поддержка')+'</h2>'+'</div><p data-support-status role="status" aria-live="polite"></p>'+content+'</div>';const select=root.querySelector('#support-app');if(select){select.value=filter;select.onchange=()=>{filter=select.value;void loadList()}}}
 function listView(){
  thread=null;reply={body:'',id:null};shell('<div class="support-actions">'+(!owner?'<button type="button" class="button" data-support-new>Написать в поддержку</button>':'')+'<button type="button" class="button secondary" data-support-refresh>Обновить</button></div>'+(rows.length?'<div class="support-list">'+rows.map(row=>'<button type="button" class="support-thread" data-support-thread="'+esc(row.id)+'"><strong>'+esc(row.subject)+'</strong><span>'+esc(statuses[row.status]||'')+'</span><small>'+(owner?esc(row.app.toUpperCase()+' · '+(row.nickname||'Без ника'))+' · ':'')+esc(date(row.updated_at))+'</small></button>').join('')+'</div>':'<p class="muted support-empty">'+(owner?'Обращений пока нет.':'Ваши обращения появятся здесь.')+'</p>')+(more?'<button type="button" class="text-button" data-support-more>Показать ранние обращения</button>':''));
 }
 async function loadList(append=false){
  const id=++revision;if(!append){rows=[];before=null}shell('<p class="muted">Загружаем обращения…</p>');
  try{const data=await rpc('support_list',{p_app:filter,p_owner:owner,p_before:append?before:null});if(!live(id))return;if(!Array.isArray(data))throw Error();more=data.length===50;rows=append?[...rows,...data]:data;before=data.at(-1)?.updated_at||null;listView()}
  catch(error){if(live(id)){listView();notice(supportError(error),true)}}
 }
 function newView(){
  thread=null;shell('<button type="button" class="text-button" data-support-back>Мои обращения</button><form data-support-create><label for="'+fieldPrefix+'-subject">Тема</label><input id="'+fieldPrefix+'-subject" name="subject" maxlength="120" required value="'+esc(draft.subject)+'"><label for="'+fieldPrefix+'-body">Сообщение</label><textarea id="'+fieldPrefix+'-body" name="body" maxlength="3000" rows="6" required>'+esc(draft.body)+'</textarea><p class="muted support-note">Не присылайте пароли и коды входа.</p><button type="submit" class="button">Отправить</button></form>');
 }
 function threadView(data){
  thread=data.thread;reply={body:'',id:null};shell('<div class="support-actions"><button type="button" class="text-button" data-support-back>Все обращения</button><button type="button" class="text-button" data-support-reload>Обновить</button></div><h3>'+esc(thread.subject)+'</h3><p class="muted support-note">'+esc(statuses[thread.status]||'')+' · '+esc(thread.app.toUpperCase())+' '+esc(thread.version)+(owner?' · '+esc(thread.nickname||'Без ника'):'')+'</p><div class="support-messages">'+data.messages.map(message=>'<article class="support-message'+(message.owner_reply?' is-answer':'')+'"><div><strong>'+(message.owner_reply?'Поддержка':owner?esc(thread.nickname||'Пользователь'):'Вы')+'</strong><time>'+esc(date(message.created_at))+'</time></div><p>'+esc(message.body)+'</p></article>').join('')+'</div>'+(thread.status==='closed'?'<p class="muted">Обращение закрыто.</p>':'<form data-support-reply><label for="'+fieldPrefix+'-reply">'+(owner?'Ответ пользователю':'Дополнить обращение')+'</label><textarea id="'+fieldPrefix+'-reply" name="body" maxlength="3000" rows="4" required></textarea><button type="submit" class="button">'+(owner?'Ответить':'Отправить')+'</button></form>'+(owner?'<button type="button" class="text-button support-close" data-support-close>Закрыть обращение</button>':'')));
 }
 async function readThread(threadId){const id=++revision;shell('<p class="muted">Загружаем переписку…</p>');try{const data=await rpc('support_read',{p_id:threadId,p_app:app,p_owner:owner});if(live(id))threadView(data)}catch(error){if(live(id)){listView();notice(supportError(error),true)}}}
 async function run(task){if(locked)return;locked=true;const id=revision;root.querySelectorAll('button,input,textarea,select').forEach(c=>c.disabled=true);notice('Отправляем…');try{await task()}catch(error){if(live(id))notice(supportError(error),true)}finally{locked=false;if(!disposed)root.querySelectorAll('button,input,textarea,select').forEach(c=>c.disabled=false)}}
 async function account(){
  const id=++revision;for(const request of requests)request.abort();rows=[];thread=null;draft={subject:'',body:'',id:null};reply={body:'',id:null};shell('<p class="muted">Проверяем вход…</p>');
  try{const {data,error}=await auth.auth.getSession();if(!live(id))return;if(error)throw error;accountId=data.session?.user?.id||null;
   if(!accountId){shell('<p class="muted">Войдите в аккаунт, чтобы написать в поддержку и получать ответы здесь.</p><a class="button" href="'+esc(signInHref)+'">Войти или зарегистрироваться</a>');return}await loadList();
  }catch(error){if(live(id))notice(supportError(error),true)}
 }
 root.onclick=event=>{
  if(locked||disposed)return;const button=event.target.closest('button');if(!button||!root.contains(button))return;
  if(button.hasAttribute('data-support-new'))newView();
  else if(button.hasAttribute('data-support-back')||button.hasAttribute('data-support-refresh'))void loadList();
  else if(button.hasAttribute('data-support-more'))void loadList(true);
  else if(button.dataset.supportThread)void readThread(button.dataset.supportThread);
  else if(button.hasAttribute('data-support-reload')&&thread)void readThread(thread.id);
  else if(button.hasAttribute('data-support-close')&&owner&&thread)void run(async()=>{const current=thread.id;await rpc('support_close',{p_id:current,p_app:app});if(!disposed)await readThread(current)});
 };
 root.oninput=event=>{const form=event.target.closest('form');if(form?.hasAttribute('data-support-create')){draft.subject=form.elements.subject.value;draft.body=form.elements.body.value;draft.id=null}else if(form?.hasAttribute('data-support-reply')){reply.body=form.elements.body.value;reply.id=null}};
 root.onsubmit=event=>{
  event.preventDefault();const form=event.target;if(locked||disposed||!form.checkValidity())return;
  if(form.hasAttribute('data-support-create')){draft.subject=form.elements.subject.value.trim();draft.body=form.elements.body.value.trim();if(!draft.subject||!draft.body){notice('Введите тему и сообщение.',true);return}draft.id??=crypto.randomUUID();void run(async()=>{const current=draft.id;await rpc('support_create',{p_id:current,p_app:app,p_subject:draft.subject,p_body:draft.body,p_version:String(version)});if(disposed)return;draft={subject:'',body:'',id:null};await readThread(current);notice('Обращение отправлено.');})}
  else if(form.hasAttribute('data-support-reply')&&thread){reply.body=form.elements.body.value.trim();if(!reply.body){notice('Введите сообщение.',true);return}reply.id??=crypto.randomUUID();void run(async()=>{const current=thread.id;await rpc('support_reply',{p_thread:current,p_app:app,p_id:reply.id,p_body:reply.body,p_owner:owner});if(!disposed){await readThread(current);notice(owner?'Ответ отправлен.':'Сообщение отправлено.')}})}
 };
 const {data:{subscription}}=auth.auth.onAuthStateChange((_event,session)=>{if(disposed||session?.user?.id===accountId)return;setTimeout(()=>{if(!disposed)void account()},0)});void account();
 return()=>{disposed=true;revision++;for(const request of requests)request.abort();subscription.unsubscribe();root.onclick=root.oninput=root.onsubmit=null;root.replaceChildren();rows=[];draft={subject:'',body:'',id:null};reply={body:'',id:null}};
}
