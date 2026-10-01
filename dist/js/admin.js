import{analyticsSite}from './analytics.js';
import{esc,title}from './ui.js';
import{ownerVerified,verifyOwner,signInOwner,signOutOwner,ownerStatistics}from './owner-auth.js';
let screen=0;
export async function showAdmin(app){
 const id=++screen;app.dataset.ownerScreen=String(id);
 const active=()=>app.dataset.ownerScreen===String(id)&&location.hash.split('?')[0]==='#admin';
 app.innerHTML=title('Кабинет владельца')+'<section class="panel section"><p role="status">Проверяем доступ…</p></section>';
 let allowed=ownerVerified();
 if(!allowed)try{allowed=await verifyOwner();}catch{}
 if(!active())return;
 if(!allowed){
  app.innerHTML=title('Вход владельца')+'<section class="panel section owner-login"><p class="muted">Войдите в личный аккаунт SALAH. Доступ к кабинету проверяется на сервере.</p><form id="owner-login"><div class="field"><label for="owner-email">Электронная почта</label><input id="owner-email" type="email" autocomplete="username" required maxlength="254"></div><div class="field"><label for="owner-password">Пароль</label><input id="owner-password" type="password" autocomplete="current-password" required maxlength="256"></div><button class="button" type="submit">Войти</button><p class="owner-status muted" role="status" aria-live="polite"></p></form><a class="text-button" href="#more">Вернуться в «Ещё»</a></section>';
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
 app.innerHTML=title('Кабинет владельца','Посещения SALAH')+'<section class="panel section admin-intro"><div class="owner-toolbar"><label for="owner-period">Период</label><select id="owner-period"><option value="1">Сутки</option><option value="7" selected>7 дней</option><option value="30">30 дней</option></select><button class="text-button" id="owner-sign-out">Выйти</button></div><div id="owner-statistics" aria-live="polite"><p class="muted">Загружаем статистику…</p></div>'+(site?'<details class="owner-fallback"><summary>Открыть подробную статистику</summary><p class="muted">Расширенные отчёты доступны в вашем аккаунте GoatCounter.</p><a class="button secondary" href="'+esc(site)+'" target="_blank" rel="noopener noreferrer">Открыть GoatCounter</a></details>':'')+'</section>';
 let load=0;
 const readStats=async()=>{
  const version=++load,area=app.querySelector('#owner-statistics');area.innerHTML='<p class="muted" role="status">Загружаем статистику…</p>';
  try{
   const stats=await ownerStatistics(Number(app.querySelector('#owner-period').value));if(!active()||version!==load)return;
   if(!Number.isSafeInteger(stats.total)||stats.total<0||!Array.isArray(stats.stats))throw Error('Статистика временно недоступна.');
   const rows=stats.stats.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.day)&&Number.isSafeInteger(row.visitors)&&row.visitors>=0),max=Math.max(1,...rows.map(row=>row.visitors));
   area.innerHTML='<div class="owner-total"><strong>'+stats.total.toLocaleString('ru-RU')+'</strong><span>Посетители за период</span></div><p class="muted owner-note">Это оценка сервиса статистики: она не определяет точное число людей или установок.</p><div class="owner-chart" aria-label="Посетители по дням">'+rows.map(row=>'<div class="owner-chart-row"><time>'+esc(row.day.slice(5).split('-').reverse().join('.'))+'</time><span class="owner-chart-track"><span style="width:'+Math.round(row.visitors/max*100)+'%"></span></span><strong>'+row.visitors+'</strong></div>').join('')+'</div>';
  }catch(error){if(active()&&version===load){area.innerHTML='<p class="muted" role="status">'+esc(error.message)+'</p><button class="button secondary" id="owner-retry">Повторить</button>';area.querySelector('#owner-retry')?.addEventListener('click',readStats);}}
 };
 app.querySelector('#owner-period').onchange=readStats;
 app.querySelector('#owner-sign-out').onclick=async()=>{try{await signOutOwner();if(active())showAdmin(app);}catch(error){if(active())app.querySelector('#owner-statistics').textContent=error.message;}};
 readStats();
}
