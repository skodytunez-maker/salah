import{analyticsSite}from './analytics.js';
import{esc,title}from './ui.js';

// Authentication and the dashboard stay on GoatCounter's server.
// SALAH never reads the frame, handles passwords, or stores an access token.
export function showAdmin(app){
 const site=analyticsSite();
 if(!site){app.innerHTML=title('Кабинет владельца')+'<section class="panel section"><p>Статистика ещё не подключена.</p></section>';return}
 app.innerHTML=title('Кабинет владельца','Статистика посещений SALAH')+
 '<section class="panel section admin-intro"><p>Войдите своим аккаунтом GoatCounter, чтобы посмотреть посещения и динамику за выбранный период.</p><div class="admin-actions"><button class="button" id="admin-open">Открыть статистику</button><a class="button secondary" href="'+esc(site)+'" target="_blank" rel="noopener noreferrer">Открыть в отдельной вкладке</a></div><p class="muted admin-note">Вход и доступ к данным проверяет GoatCounter. SALAH не сохраняет ваш пароль.</p></section><section id="admin-dashboard" hidden aria-label="Панель статистики"></section>'+ 
 '<details class="panel section admin-help"><summary>Не открывается статистика?</summary><p>Откройте кабинет в отдельной вкладке и войдите. В настройках GoatCounter разрешите показ панели на https://skodytunez-maker.github.io в поле «Sites that can embed GoatCounter». Доступ к Dashboard оставьте только для вошедших пользователей.</p><p class="muted">Если браузер телефона не сохраняет вход внутри панели, используйте отдельную вкладку.</p></details>';
 app.querySelector('#admin-open').onclick=()=>{
  const area=app.querySelector('#admin-dashboard');
  const frame=document.createElement('iframe');
  frame.title='Приватная статистика SALAH — GoatCounter';
  frame.src=site+'/';
  frame.referrerPolicy='no-referrer';
  frame.className='admin-frame';
  area.replaceChildren(frame);area.hidden=false;
  app.querySelector('#admin-open').textContent='Обновить панель';
 };
}
