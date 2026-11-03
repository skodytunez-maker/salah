// SALAH Premium is a visual preview only: no checkout, billing or trial.
const benefits=[
 ['▥','Расширенная статистика','Дополнительные отчёты о личном прогрессе'],
 ['✦','Темы оформления','Новые фоны и цветовые решения'],
 ['☷','Персонализация','Больше настроек интерфейса и уведомлений'],
 ['◎','Цели и привычки','Личные цели и напоминания'],
 ['↓','Дополнительный офлайн-доступ','Больше возможностей без подключения к сети']
];
let selectedPlan='year';
function intro(){
 return '<section class="premium-page">'+
 '<a class="premium-back" href="#more">‹ Меню</a>'+
 '<div class="premium-hero"><div class="premium-stars" aria-hidden="true">✧ · ✦ · ✧</div><div class="premium-crescent" aria-hidden="true">☾</div>'+
 '<div class="premium-wordmark">SALAH</div><div class="premium-crown" aria-hidden="true">♛</div>'+
 '<h1>SALAH <em>Premium</em></h1><p>Больше возможностей для удобного и осознанного использования приложения</p></div>'+
 '<p class="premium-kicker">ПЛАНИРУЕМЫЕ ВОЗМОЖНОСТИ</p><div class="premium-benefits">'+
 benefits.map(function(b){return '<div class="premium-benefit"><span aria-hidden="true" class="premium-benefit-icon">'+b[0]+'</span><div><strong>'+b[1]+'</strong><small>'+b[2]+'</small></div></div>';}).join('')+
 '</div><div class="premium-footnote"><strong>Основное — бесплатно</strong><p>Время намазов, Кибла и Коран останутся доступными без подписки.</p></div>'+
 '<div class="premium-actions"><a class="premium-primary" href="#premium?view=plans">Посмотреть тарифы</a><p>Это предварительный экран. Покупки пока недоступны.</p></div></section>';
}
function plans(){
 const selected=function(key){return selectedPlan===key;};
 function choice(key,title,detail,amount,period){
  const chosen=selected(key);
  return '<button class="premium-plan'+(chosen?' selected':'')+'" type="button" data-premium-plan="'+key+'" aria-pressed="'+chosen+'"><span><strong>'+title+'</strong><small>'+detail+'</small></span><span class="premium-plan-price">'+amount+'<small>'+period+'</small></span><span class="premium-plan-check" aria-hidden="true">'+(chosen?'●':'○')+'</span></button>';
 }
 return '<section class="premium-page premium-plans">'+
 '<a class="premium-back" href="#premium">‹ Преимущества</a>'+
 '<div class="premium-plan-hero"><div class="premium-crown" aria-hidden="true">♛</div><span>SALAH</span><h1>Выбери <em>Premium</em></h1><p>Тарифы представлены для обсуждения. Оформление ещё не работает.</p></div>'+
 '<p class="premium-kicker">ПРЕДВАРИТЕЛЬНЫЕ ЦЕНЫ</p><div class="premium-plan-choices" role="group" aria-label="Период подписки">'+
 choice('year','Годовая подписка','≈ 124 ₽ в месяц · экономия около 38%','1 490 ₽','/ год')+
 choice('month','Месячная подписка','Гибкий выбор на каждый месяц','199 ₽','/ мес.')+'</div>'+
 '<div class="premium-included"><p>В будущем в Premium могут войти:</p><ul><li>Расширенные отчёты</li><li>Дополнительные темы</li><li>Настройки и персонализация</li></ul></div>'+
 '<div class="premium-trial">✧ Пробный период на 7 дней рассматривается, но пока не действует.</div>'+
 '<div class="premium-actions"><button class="premium-primary" type="button" disabled aria-disabled="true">Оформление скоро появится</button><p>Оплата и автоматическое продление не подключены. Денежные средства не списываются.</p></div></section>';
}
export function showPremium(app,{hash=window.location.hash}={}){
 const isPlans=new URLSearchParams(hash.split('?')[1]||'').get('view')==='plans';
 app.innerHTML=isPlans?plans():intro();
 if(isPlans)app.querySelectorAll('[data-premium-plan]').forEach(function(button){
  button.addEventListener('click',function(){selectedPlan=button.dataset.premiumPlan;showPremium(app,{hash:'#premium?view=plans'});});
 });
}
