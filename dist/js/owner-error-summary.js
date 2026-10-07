import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{esc}from './ui.js';
const ROUTES={home:'Главная',knowledge:'Знания',quran:'Коран',adhkar:'Азкары',more:'Меню',account:'Аккаунт',settings:'Настройки',calendar:'Календарь',qibla:'Кибла',umrah:'Умра',support:'Поддержка',learning:'Уроки',other:'Другой раздел'};
const KINDS={script:'Ошибка страницы',promise:'Сбой действия',resource:'Загрузка файла',slow:'Долгая обработка'};
const SCREENS={phone:'Телефон',tablet:'Планшет',desktop:'Компьютер'};
export function errorSummaryRows(rows){return rows.map(r=>'<article class="owner-error-row"><div><strong>'+esc(ROUTES[r.route]||'Другой раздел')+'</strong><small>'+esc(KINDS[r.kind]||'Сбой')+' · '+esc(SCREENS[r.screen]||'Устройство')+'</small><small>Версия '+esc(r.version)+'</small></div><b>'+esc(r.count)+'</b></article>').join('');}
export function validErrorSummary(value){return !!value&&[1,7,30].includes(value.days)&&Number.isSafeInteger(value.total)&&value.total>=0&&typeof value.more==='boolean'&&Array.isArray(value.rows)&&value.rows.length<=100&&value.rows.every(r=>Object.hasOwn(ROUTES,r.route)&&Object.hasOwn(KINDS,r.kind)&&Object.hasOwn(SCREENS,r.screen)&&typeof r.module==='string'&&/^[a-z-]{1,40}$/.test(r.module)&&Number.isSafeInteger(r.version)&&r.version>0&&Number.isSafeInteger(r.count)&&r.count>0);}
async function fetchSummary(days){
 const {data,error}=await accountAuthClient().auth.getSession();if(error||!data?.session)throw Error('Войдите снова.');
 const r=await fetch(OWNER_PROJECT_URL+'/functions/v1/error-summary?days='+days,{headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Не удалось загрузить сводку.');return r.json();
}
export function mountOwnerErrorSummary(container,{isActive=()=>true,request=fetchSummary}={}){
 const panel=document.createElement('details');panel.className='settings-extra owner-error-summary';panel.innerHTML='<summary>Сводка ошибок</summary><div class="owner-error-body"><div class="owner-error-periods">'+[[1,'Сутки'],[7,'Неделя'],[30,'Месяц']].map(([n,label])=>'<button type="button" class="text-button" data-errors-period="'+n+'" aria-pressed="'+(n===7)+'">'+label+'</button>').join('')+'</div><p class="muted">По устройствам с включённой диагностикой.</p><p role="status"></p><div class="owner-error-list"></div><button class="button secondary" type="button" data-errors-refresh>Обновить</button></div>';container.append(panel);
 let period=7,revision=0,loaded=false;
 const status=panel.querySelector('[role=status]'),list=panel.querySelector('.owner-error-list');
 const live=id=>panel.isConnected&&isActive()&&id===revision;
 const load=async()=>{const id=++revision;status.textContent='Загружаем…';try{const result=await request(period);if(!live(id))return;if(!validErrorSummary(result))throw Error();loaded=true;status.textContent=result.total?'Получено событий: '+result.total+(result.more?' · показаны первые 100 групп':''):'Пока нет отчётов.';list.innerHTML=errorSummaryRows(result.rows);}catch{if(live(id))status.textContent='Не удалось загрузить сводку. Повторите.';}};
 panel.ontoggle=()=>{if(panel.open&&!loaded)void load();};panel.querySelector('[data-errors-refresh]').onclick=load;
 panel.querySelectorAll('[data-errors-period]').forEach(button=>button.onclick=()=>{period=Number(button.dataset.errorsPeriod);panel.querySelectorAll('[data-errors-period]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.errorsPeriod)===period)));void load();});
 return panel;
}
