import{analyticsSite}from './analytics.js';
import{esc,title}from './ui.js';
import{ownerVerified,verifyOwner,signInOwner,signOutOwner,ownerStatistics}from './owner-auth.js';
let screen=0,period=7;
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
 app.innerHTML=title('Кабинет владельца','Посещения SALAH')+'<section class="panel section admin-intro"><div class="owner-topline"><span class="owner-private"><span aria-hidden="true">●</span> Личный кабинет</span><button class="text-button" id="owner-sign-out">Выйти</button></div><div class="owner-periods" role="group" aria-label="Период статистики">'+[[1,'Сутки'],[7,'Неделя'],[30,'Месяц']].map(([days,label])=>'<button type="button" data-period="'+days+'" aria-pressed="'+(period===days)+'">'+label+'</button>').join('')+'</div><div id="owner-statistics" aria-live="polite"><p class="muted">Загружаем статистику…</p></div>'+(site?'<details class="owner-fallback"><summary>Подробные отчёты</summary><p class="muted">Страны, устройства и другие отчёты доступны в вашем аккаунте GoatCounter.</p><a class="button secondary" href="'+esc(site)+'" target="_blank" rel="noopener noreferrer">Открыть GoatCounter</a></details>':'')+'</section>';
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
 readStats();
}
