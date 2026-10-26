import{accountAuthClient,checkAccountSession,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{createOwnerFrameViewport}from './owner-frame-viewport.js';
import{claimPlayback}from './media-playback-focus.js';
const origin='https://desktop-jecm5lt.taila4556d.ts.net',pattern=/^[\w-]{32}$/;
let active=null;
export const studentLessonBusy=()=>Boolean(active?.busy&&active.frame?.isConnected);
export function stopStudentLesson(){if(!active)return;const old=active;active=null;old.disposed=true;clearInterval(old.timer);clearTimeout(old.timeout);old.viewport?.dispose();if(old.listen)window.removeEventListener('message',old.listen);try{old.frame?.contentWindow?.postMessage({type:'salah:owner-preview-leave',nonce:old.nonce},origin);}catch{}old.frame?.remove();}
export const lessonAccountReturn=hash=>{const p=new URLSearchParams(hash.split('?')[1]||''),code=p.get('lesson'),id=p.get('lessonClass');return pattern.test(code||'')?'#lesson?invite='+code:pattern.test(id||'')?'#lesson?class='+id:null;};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function showLessonInvitation(host,{hash=location.hash}={}){
 const params=new URLSearchParams(hash.split('?')[1]||''),code=params.get('invite'),id=params.get('class'),key=code||id;
 if(active?.host===host&&active.key===key&&!active.disposed)return;
 stopStudentLesson();const state={host,key,disposed:false,busy:false};active=state;
 const live=()=>active===state&&!state.disposed&&host.isConnected;
 function panel(content){if(live())host.innerHTML='<section class="alphabet-page lesson-account-entry"><a class="alphabet-back" href="#knowledge">← Знания</a><span class="knowledge-eyebrow">ОНЛАЙН-ЗАНЯТИЯ · SALAH</span>'+content+'</section>';}
 if(!pattern.test(key||'')||Boolean(code)===Boolean(id)){panel('<h1>Приглашение недоступно</h1><p>Откройте общую ссылку преподавателя.</p>');return;}
 panel('<h1>Приглашение на занятие</h1><p role="status">Проверяем вход в SALAH…</p>');
 let userId=null,checkedToken=null;
 async function token(){const checked=await checkAccountSession({force:true});if(['unavailable','changed'].includes(checked.state))throw Object.assign(Error('Не удалось проверить вход. Попробуйте ещё раз.'),{status:503});if(checked.state!=='valid'||!checked.session?.user?.email_confirmed_at||checked.session.user.is_anonymous)throw Object.assign(Error('Войдите в аккаунт SALAH.'),{status:401});if(userId&&userId!==checked.session.user.id)throw Object.assign(Error('Аккаунт изменился. Откройте приглашение заново.'),{status:401});userId=checked.session.user.id;return checked.session.access_token;}
 async function call(action,extra={}){const access=await token();const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/classroom-schedule',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({action,...(code?{code}:{id}),...extra}),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error||'Не удалось открыть занятие.'),{status:response.status});return value;}
 function signedOut(message){const returnKey=code?'lesson='+code:'lessonClass='+id;panel('<h1>Войдите в SALAH</h1><p>'+esc(message||'Для записи и входа на занятие нужен ваш аккаунт SALAH.')+'</p><a class="button" href="#account?'+returnKey+'">Вход и регистрация</a><button class="button secondary" type="button" data-retry>Проверить вход</button>');host.querySelector('[data-retry]')?.addEventListener('click',()=>{stopStudentLesson();showLessonInvitation(host,{hash});});}
 async function draw(){
  const data=await call(code?'preview':'detail');if(!live())return;
  const l=data.lesson,date=new Intl.DateTimeFormat('ru-RU',{timeZone:l.timeZone,weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(l.startsAt);
  panel('<h1>'+esc(l.title)+'</h1><section class="native-resume"><span class="knowledge-eyebrow">'+esc(data.owner?'ПРЕПОДАВАТЕЛЬ':data.enrolled?'ВЫ ЗАПИСАНЫ':'ПРИГЛАШЕНИЕ')+'</span><h2>'+esc(date)+'</h2><p>'+esc(l.timeZone)+' · '+l.minutes+' минут</p><p>Преподаватель: '+esc(l.teacherName)+'</p><p>Вы: '+esc(data.account.nickname)+'</p></section><p class="muted">'+(l.state==='live'?'Преподаватель начал занятие.':'Видеокомнату откроет преподаватель перед началом.')+'</p>'+(data.owner?'<a class="button" href="#knowledge?preview=online-lessons">Кабинет преподавателя</a>':'<form data-enroll><label class="lesson-reminder-choice"><input type="checkbox" name="reminder"'+(data.remindersEnabled?' checked':'')+'>Напомнить в '+esc(l.reminderTime)+' в день урока</label><p class="muted">Напоминание придёт при подключённых уведомлениях SALAH. Настроить их можно в меню.</p><button class="button" type="submit">'+(data.enrolled?'Сохранить напоминание':'Записаться на занятие')+'</button></form>'+(data.enrolled?'<button class="button" type="button" data-join'+(l.state==='live'?'':' disabled')+'>Войти в урок</button><button class="text-button" type="button" data-leave>Отменить запись</button>':''))+'<p role="status" data-status></p><button class="text-button" type="button" data-refresh>Обновить состояние</button>');
  host.querySelector('[data-refresh]').onclick=()=>void run();
  host.querySelector('[data-enroll]')?.addEventListener('submit',async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await call(code?'enroll':'preferences',{id:l.id,remindersEnabled:e.target.querySelector('input').checked});await draw();}catch(error){if(live()){host.querySelector('[data-status]').textContent=error.message;b.disabled=false;}}});
  host.querySelector('[data-leave]')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;try{await call('leave',{id:l.id});if(live()){if(code)await draw();else panel('<h1>Запись отменена</h1><p>Напоминание об этом уроке отключено.</p>');}}catch(error){if(live())host.querySelector('[data-status]').textContent=error.message;}});
  host.querySelector('[data-join]')?.addEventListener('click',()=>void join(l.id).catch(error=>{if(live())host.querySelector('[data-status]').textContent=error.message;}));
 }
 async function join(lessonId){
  const access=await token();if(!live())return;state.nonce=crypto.randomUUID();const frame=document.createElement('iframe');state.frame=frame;frame.className='owner-learning-frame';frame.title='Онлайн-занятие SALAH';frame.referrerPolicy='no-referrer';frame.setAttribute('allow','camera; microphone; display-capture; autoplay; fullscreen; clipboard-write');frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-presentation');frame.src=origin+'/student-embed#nonce='+state.nonce+'&lesson='+lessonId;
  panel('<a class="text-button" href="'+esc(hash)+'" data-back>← К приглашению</a><p data-room-status role="status">Подключаем занятие…</p>');host.querySelector('[data-back]').onclick=e=>{e.preventDefault();stopStudentLesson();showLessonInvitation(host,{hash});};host.querySelector('.lesson-account-entry').append(frame);
  const send=async()=>{if(!live()||!state.frame?.isConnected||document.hidden)return;try{const current=await token();if(live())frame.contentWindow.postMessage({type:'salah:owner-preview-token',nonce:state.nonce,token:current},origin);}catch(error){if(live()){if(error.status===401){stopStudentLesson();showLessonInvitation(host,{hash});}else{const el=host.querySelector('[data-room-status]');if(el){el.hidden=false;el.textContent='Временно не удаётся проверить вход. Соединение урока сохраняется.';}}}}};
  state.viewport=createOwnerFrameViewport({notify:()=>{if(live())frame.contentWindow?.postMessage({type:'salah:owner-preview-viewport-ready',nonce:state.nonce},origin);}});
  state.listen=event=>{if(!live()||event.origin!==origin||event.source!==frame.contentWindow||event.data?.nonce!==state.nonce)return;const d=event.data;
   if(d.type==='salah:owner-preview-ready')void send();
   else if(d.type==='salah:owner-preview-loaded'){const el=host.querySelector('[data-room-status]');if(el)el.hidden=true;clearTimeout(state.timeout);}
   else if(d.type==='salah:owner-preview-busy'&&typeof d.busy==='boolean'){state.busy=d.busy;if(d.busy)claimPlayback('student-lesson');}
   else if(d.type==='salah:owner-preview-focus'&&typeof d.focused==='boolean')state.viewport.focus(d.focused);
   else if(d.type==='salah:owner-preview-navigate'){stopStudentLesson();showLessonInvitation(host,{hash});}
   else if(d.type==='salah:owner-preview-error'){const el=host.querySelector('[data-room-status]');if(el){el.hidden=false;el.textContent='Не удалось открыть комнату. Проверьте вход и состояние урока.';}}
  };
  window.addEventListener('message',state.listen);state.timer=setInterval(()=>void send(),20000);state.timeout=setTimeout(()=>{const el=host.querySelector('[data-room-status]');if(live()&&el&&!el.hidden)el.textContent='Подключение задерживается. Вернитесь к приглашению и повторите.';},15000);
 }
 async function run(){try{await draw();}catch(error){if(!live())return;if(error.status===401)signedOut();else{panel('<h1>Занятие недоступно</h1><p role="alert">'+esc(error.message)+'</p><button class="button secondary" type="button" data-retry>Повторить</button>');host.querySelector('[data-retry]').onclick=()=>void run();}}}
 void run();
}
