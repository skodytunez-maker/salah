import{analyticsSite}from './analytics.js';
import{esc,title}from './ui.js';
import{ownerVerified,verifyOwner,signInOwner,signOutOwner,ownerStatistics,ownerUsers,ownerNeedsMfa,ownerMfaFactors,enrollOwnerMfa,verifyOwnerMfa}from './owner-auth.js';
let screen=0,period=7;
function installation(){return '<div class="owner-install"><h2>Кабинет на iPhone</h2>'+ (location.pathname.endsWith('/owner.html')?'<p class="muted">В Safari нажмите «Поделиться» → «На экран Домой». Этот значок будет открывать вход в кабинет.</p>':'<p class="muted">Откройте личный вход в Safari и добавьте его на экран «Домой».</p><a class="button secondary" href="./owner.html#admin">Открыть вход для значка</a>')+'</div>';}

async function showMfa(app,active){
 app.innerHTML=title('Защищённый вход')+'<section class="panel section owner-login"><h2>Google Authenticator</h2><div id="owner-mfa-step"><p class="muted" role="status">Проверяем второй этап входа…</p></div><button class="text-button" id="owner-mfa-logout">Выйти из аккаунта</button></section>';
 app.querySelector('#owner-mfa-logout').onclick=async()=>{await signOutOwner();if(active())showAdmin(app);};
 const area=app.querySelector('#owner-mfa-step');
 let factors;
 try{factors=await ownerMfaFactors();}catch(error){if(active())area.textContent=error.message;return;}
 if(!active())return;
 const codeForm=factorId=>{
  const form=app.querySelector('#owner-mfa-code');
  form.onsubmit=async event=>{
   event.preventDefault();const button=form.querySelector('button'),input=form.querySelector('input'),status=form.querySelector('[role="status"]');button.disabled=true;status.textContent='Проверяем код…';
   try{await verifyOwnerMfa(factorId,input.value.trim());if(active())showAdmin(app);}
   catch(error){if(active())status.textContent=error.message;}
   finally{input.value='';button.disabled=false;}
  };
 };
 const formHtml='<form id="owner-mfa-code"><div class="field"><label for="owner-totp">Код из Google Authenticator</label><input id="owner-totp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required placeholder="000000"></div><button class="button" type="submit">Подтвердить вход</button><p class="muted" role="status" aria-live="polite"></p></form>';
 if(factors.length){
  area.innerHTML='<p class="muted">Введите одноразовый код для SALAH.</p>'+ (factors.length>1?'<div class="field"><label for="owner-factor">Аутентификатор</label><select id="owner-factor">'+factors.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.friendly_name||'SALAH')+'</option>').join('')+'</select></div>':'')+formHtml;
  codeForm(factors[0].id);
  if(factors.length>1)app.querySelector('#owner-factor').onchange=event=>codeForm(event.target.value);
  return;
 }
 area.innerHTML='<p class="muted">Привяжите Google Authenticator к кабинету SALAH. Статистика откроется после подтверждения шестизначным кодом.</p><button class="button" id="owner-mfa-enroll">Настроить Google Authenticator</button><p class="muted" role="status" aria-live="polite"></p>';
 app.querySelector('#owner-mfa-enroll').onclick=async event=>{
  event.target.disabled=true;
  try{
   const enrollment=await enrollOwnerMfa();if(!active())return;
   area.innerHTML='<p class="muted">В Google Authenticator нажмите «+» и отсканируйте QR-код. Сохраните ключ в надёжном месте: он позволит восстановить коды при потере телефона.</p><img class="owner-mfa-qr" alt="QR-код для привязки Google Authenticator"><details class="owner-mfa-key"><summary>Ключ для ручного ввода и резервной копии</summary><p class="muted">Название: SALAH. Тип ключа: по времени. Не отправляйте этот ключ другим людям.</p><code></code></details>'+formHtml;
   const qr=enrollment.totp.qr_code;
   app.querySelector('.owner-mfa-qr').src=qr.startsWith('data:image/')?qr:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr);
   app.querySelector('.owner-mfa-key code').textContent=enrollment.totp.secret;
   codeForm(enrollment.id);
  }catch(error){if(active()){area.querySelector('[role="status"]').textContent=error.message;event.target.disabled=false;}}
 };
}

export async function showAdmin(app){
 const id=++screen;app.dataset.ownerScreen=String(id);
 const active=()=>app.dataset.ownerScreen===String(id)&&location.hash.split('?')[0]==='#admin';
 app.innerHTML=title('Кабинет владельца')+'<section class="panel section"><p role="status">Проверяем доступ…</p></section>';
 let allowed=ownerVerified();
 if(!allowed)try{allowed=await verifyOwner();}catch{}
 if(!active())return;
 if(!allowed&&ownerNeedsMfa()){await showMfa(app,active);return;}
 if(!allowed){
  app.innerHTML=title('Вход владельца')+'<section class="panel section owner-login"><p class="muted">Войдите в личный аккаунт SALAH. Доступ к кабинету проверяется на сервере.</p><form id="owner-login"><div class="field"><label for="owner-email">Электронная почта</label><input id="owner-email" type="email" autocomplete="username" required maxlength="254"></div><div class="field"><label for="owner-password">Пароль</label><input id="owner-password" type="password" autocomplete="current-password" required maxlength="256"></div><button class="button" type="submit">Войти</button><p class="owner-status muted" role="status" aria-live="polite"></p></form><a class="text-button" href="#more">Вернуться в «Ещё»</a></section>';
  app.querySelector('.owner-login').insertAdjacentHTML('beforeend',installation());
  const form=app.querySelector('#owner-login');
  form.onsubmit=async event=>{
   event.preventDefault();const button=form.querySelector('button');const password=form.querySelector('#owner-password');const status=form.querySelector('.owner-status');button.disabled=true;status.textContent='Проверяем вход…';
   try{await signInOwner(form.querySelector('#owner-email').value,password.value);if(active())showAdmin(app);}
   catch(error){if(active())status.textContent=error.message;}
   finally{password.value='';button.disabled=false;}
  };
  return;
 }
 const site=analyticsSite();
 app.innerHTML=title('Кабинет владельца','Посещения SALAH')+'<section class="panel section admin-intro"><div class="owner-topline"><span class="owner-private"><span aria-hidden="true">●</span> Личный кабинет</span><button class="text-button" id="owner-sign-out">Выйти</button></div><div class="owner-periods" role="group" aria-label="Период статистики">'+[[1,'Сутки'],[7,'Неделя'],[30,'Месяц']].map(([days,label])=>'<button type="button" data-period="'+days+'" aria-pressed="'+(period===days)+'">'+label+'</button>').join('')+'</div><div id="owner-statistics" aria-live="polite"><p class="muted">Загружаем статистику…</p></div>'+(site?'<details class="owner-fallback"><summary>Подробные отчёты</summary><p class="muted">Страны, устройства и другие отчёты доступны в вашем аккаунте GoatCounter.</p><a class="button secondary" href="'+esc(site)+'" target="_blank" rel="noopener noreferrer">Открыть GoatCounter</a></details>':'')+'</section>';
 app.querySelector('.admin-intro').insertAdjacentHTML('beforeend','<details class="owner-users settings-extra"><summary><span>Пользователи<span id="owner-users-count" aria-live="polite"> — …</span></span></summary><div id="owner-users-list"></div></details>'+installation());
 let usersPage=1,usersLoad=0;
 const readUsers=async()=>{const version=++usersLoad,area=app.querySelector('#owner-users-list'),count=app.querySelector('#owner-users-count');area.innerHTML='<p class="muted" role="status">Загружаем пользователей…</p>';try{const result=await ownerUsers(usersPage);if(!active()||version!==usersLoad)return;if(!Number.isSafeInteger(result.total)||result.total<0||!Array.isArray(result.users))throw Error('Список пользователей временно недоступен.');count.textContent=' — '+result.total.toLocaleString('ru-RU');const date=value=>value?new Date(value).toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Ещё не входил';area.innerHTML='<p class="muted">Зарегистрировано: '+result.total+'</p><p class="muted owner-note">Последний вход в аккаунт. Посетители без регистрации учитываются в общей статистике.</p><div class="owner-user-rows">'+(result.users.length?result.users.map(user=>'<div class="owner-user-row"><strong>'+esc(user.nickname)+'</strong><span>Последний вход</span><time>'+esc(date(user.lastSignInAt))+'</time></div>').join(''):'<p class="muted">Пока нет зарегистрированных пользователей.</p>')+'</div><div class="button-row"><button class="text-button" id="users-prev" '+(usersPage===1?'disabled':'')+'>Назад</button><span>'+usersPage+'</span><button class="text-button" id="users-next" '+(usersPage*50>=result.total?'disabled':'')+'>Далее</button><button class="text-button" id="users-refresh">Обновить</button></div>';area.querySelector('#users-prev').onclick=()=>{usersPage--;readUsers();};area.querySelector('#users-next').onclick=()=>{usersPage++;readUsers();};area.querySelector('#users-refresh').onclick=readUsers;}catch(error){if(active()&&version===usersLoad){count.textContent=' — недоступно';area.innerHTML='<p class="muted" role="status">'+esc(error.message)+'</p>';}}};
 app.querySelector('.owner-users').ontoggle=e=>{if(e.currentTarget.open)readUsers();};
 let load=0;
 const readStats=async()=>{
  const version=++load,area=app.querySelector('#owner-statistics');area.innerHTML='<p class="muted" role="status">Загружаем статистику…</p>';
  try{
   const stats=await ownerStatistics(period);if(!active()||version!==load)return;
   if(!Number.isSafeInteger(stats.total)||stats.total<0||!Array.isArray(stats.stats))throw Error('Статистика временно недоступна.');
   const rows=stats.stats.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.day)&&Number.isSafeInteger(row.visitors)&&row.visitors>=0).sort((a,b)=>a.day.localeCompare(b.day)),max=Math.max(1,...rows.map(row=>row.visitors)),peak=rows.reduce((best,row)=>row.visitors>(best?.visitors||0)?row:best,null),sum=rows.reduce((n,row)=>n+row.visitors,0);
   const dayLabel=day=>day.slice(5).split('-').reverse().join('.');
   const updated=new Date(stats.updatedAt),time=Number.isFinite(updated.getTime())?updated.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'';
   area.innerHTML='<div class="owner-total"><span>Посетители за '+({1:'сутки',7:'неделю',30:'месяц'}[period])+'</span><strong>'+stats.total.toLocaleString('ru-RU')+'</strong><span class="muted">По оценке GoatCounter</span></div><div class="owner-metrics"><div><span>В среднем за день</span><strong>'+Math.round(sum/period).toLocaleString('ru-RU')+'</strong></div><div><span>Самый активный день</span><strong>'+(peak?esc(dayLabel(peak.day)):'—')+'</strong><small>'+(peak?peak.visitors.toLocaleString('ru-RU')+' посетителей':'Пока нет посещений')+'</small></div></div><div class="owner-chart-heading"><h2>Активность по дням</h2><button type="button" class="text-button" id="owner-refresh">Обновить</button></div><div class="owner-chart" aria-label="Посетители по дням">'+(rows.length?rows.map(row=>'<div class="owner-chart-row"><time datetime="'+esc(row.day)+'">'+esc(dayLabel(row.day))+'</time><span class="owner-chart-track"><span style="width:'+Math.round(row.visitors/max*100)+'%"></span></span><strong>'+row.visitors.toLocaleString('ru-RU')+'</strong></div>').join(''):'<p class="muted">Посещения появятся здесь после сбора статистики.</p>')+'</div><div class="owner-chart-footer">'+(time?'Обновлено в '+esc(time):'')+'</div><p class="muted owner-note">Данные помогают оценить активность. Это не точное число людей или установок приложения.</p>';
   area.querySelector('#owner-refresh').onclick=readStats;
  }catch(error){if(active()&&version===load){area.innerHTML='<p class="muted" role="status">'+esc(error.message)+'</p><button class="button secondary" id="owner-retry">Повторить</button>';area.querySelector('#owner-retry')?.addEventListener('click',readStats);}}
 };
 app.querySelectorAll('[data-period]').forEach(button=>button.onclick=()=>{period=Number(button.dataset.period);app.querySelectorAll('[data-period]').forEach(item=>item.setAttribute('aria-pressed',String(Number(item.dataset.period)===period)));readStats();});
 app.querySelector('#owner-sign-out').onclick=async()=>{try{await signOutOwner();if(active())showAdmin(app);}catch(error){if(active())app.querySelector('#owner-statistics').textContent=error.message;}};
 readUsers();readStats();
}
