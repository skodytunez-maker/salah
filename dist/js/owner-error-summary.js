import{uiNumberLeaf,ownerLeaf,ownerText,ownerDateLeaf,ownerPaint,uiLeaf}from './owner-i18n.js';
import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
const ROUTES={home:'Главная',knowledge:'Знания',quran:'Коран',adhkar:'Азкары',more:'Меню',account:'Аккаунт',settings:'Настройки',calendar:'Календарь',qibla:'Кибла',umrah:'Умра',support:'Поддержка',learning:'Уроки',other:'Другой раздел'};
const KINDS={script:'Ошибка страницы',promise:'Сбой действия',resource:'Загрузка файла',slow:'Долгая обработка'};
const SCREENS={phone:'Телефон',tablet:'Планшет',desktop:'Компьютер'};
export function errorSummaryRows(rows){return rows.map(r=>{
 const label=r.module==='quran-navigation'&&r.kind==='promise'?uiLeaf('extraUi.diagnosticNavigation',"Не открылся плеер после возврата из списка сур"):ownerLeaf(KINDS[r.kind]||'Сбой');
 return '<article class="owner-error-row"><div><strong>'+ownerLeaf(ROUTES[r.route]||'Другой раздел')+'</strong><small>'+label+' · '+ownerLeaf(SCREENS[r.screen]||'Устройство')+'</small><small>'+uiLeaf('ownerUi.versionNumber','Версия {version}',{version:String(r.version)})+'</small></div><b>'+uiNumberLeaf(r.count)+'</b></article>';
}).join('');}
const validTimestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const validTest=value=>value&&/^[0-9a-f-]{36}$/i.test(value.id)&&Number.isSafeInteger(value.version)&&value.version>0&&validTimestamp(value.at);
export function validErrorSummary(value){return !!value&&[1,7,30].includes(value.days)&&Number.isSafeInteger(value.total)&&value.total>=0&&typeof value.more==='boolean'&&Array.isArray(value.rows)&&value.rows.length<=100&&(value.lastReportAt==null||validTimestamp(value.lastReportAt))&&(value.lastTest==null||validTest(value.lastTest))&&value.rows.every(r=>r&&Object.hasOwn(ROUTES,r.route)&&Object.hasOwn(KINDS,r.kind)&&Object.hasOwn(SCREENS,r.screen)&&typeof r.module==='string'&&/^[a-z-]{1,40}$/.test(r.module)&&Number.isSafeInteger(r.version)&&r.version>0&&Number.isSafeInteger(r.count)&&r.count>0);}
async function fetchSummary(days){
 const {data,error}=await accountAuthClient().auth.getSession();if(error||!data?.session)throw Error('Войдите снова.');
 const r=await fetch(OWNER_PROJECT_URL+'/functions/v1/error-summary?days='+days,{headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Не удалось загрузить сводку.');return r.json();
}
export function mountOwnerErrorSummary(container,{isActive=()=>true,request=fetchSummary,reporter}={}){
 const panel=document.createElement('details');
 panel.className='settings-extra owner-error-summary';
 ownerPaint(panel,'<summary data-i18n="ownerUi.errorSummary">Сводка ошибок</summary><div class="owner-error-body"><div class="owner-error-periods">'+[[1,'Сутки'],[7,'Неделя'],[30,'Месяц']].map(([n,label])=>'<button type="button" class="text-button" data-errors-period="'+n+'" aria-pressed="'+(n===7)+'">'+ownerLeaf(label)+'</button>').join('')+'</div><p role="status"></p><div class="owner-error-list"></div><p class="muted" data-error-report-date></p><p class="muted" data-error-test-date></p><button class="button secondary" type="button" data-errors-refresh data-i18n="ownerUi.refresh">Обновить</button>'+(reporter?'<button class="button secondary" type="button" data-error-test>'+uiLeaf('extraUi.diagnosticTest','Проверить доставку')+'</button><p role="status" class="muted" data-error-test-status></p>':'')+'</div>');
 container.append(panel);
 let period=7,revision=0,loaded=false,testId=null,seenTest=null;
 const status=panel.querySelector('[role=status]'),list=panel.querySelector('.owner-error-list');
 const reportDate=panel.querySelector('[data-error-report-date]'),testDate=panel.querySelector('[data-error-test-date]');
 const testButton=panel.querySelector('[data-error-test]'),testStatus=panel.querySelector('[data-error-test-status]');
 const live=id=>panel.isConnected&&isActive()&&id===revision;
 const date=(key,at)=>uiLeaf(key,'')+' · '+ownerDateLeaf(at);
 const load=async()=>{
  const id=++revision;
  ownerText(status,'Загружаем…');
  try{
   const result=await request(period);
   if(!live(id))return;
   if(!validErrorSummary(result))throw Error();
   loaded=true;
   if(result.total)ownerPaint(status,uiLeaf('ownerUi.eventsReceived','Получено событий: {count}',{count:result.total})+(result.more?' · '+ownerLeaf('показаны первые 100 групп'):''));
   else ownerPaint(status,uiLeaf(result.lastTest||result.lastReportAt?'extraUi.diagnosticNoFaults':'extraUi.diagnosticNoData',''));
   ownerPaint(list,errorSummaryRows(result.rows));
   ownerPaint(reportDate,result.lastReportAt?date('extraUi.diagnosticLastReport',result.lastReportAt):'');
   ownerPaint(testDate,result.lastTest?date('extraUi.diagnosticLastTest',result.lastTest.at):uiLeaf('extraUi.diagnosticNoTest',''));
  }catch{
   if(!live(id))return;
   loaded=false;
   ownerPaint(status,uiLeaf('extraUi.diagnosticUnavailable',''));
   for(const node of [list,reportDate,testDate])ownerPaint(node,'');
  }
 };
 const testMessage=key=>ownerPaint(testStatus,key?uiLeaf('extraUi.'+key,''):'');
 function repaintTest(state){
  if(!panel.isConnected||!isActive()){stop?.();return;}
  testButton.disabled=state.testPending;
  if(state.testPending){
   testMessage(state.state==='offline'?'diagnosticOffline':state.state==='retrying'?'diagnosticRetry':state.state==='sending'?'diagnosticSending':'diagnosticWaiting');
  }else if(state.lastTest&&state.lastTest.id!==seenTest){
   seenTest=state.lastTest.id;
   testId=null;
   testMessage(state.lastTest.state==='sent'?'diagnosticSent':'diagnosticRejected');
   if(state.lastTest.state==='sent')void load();
  }else if(state.state==='disabled'){
   testId=null;
   testMessage('diagnosticTestOptIn');
  }else if(testId){
   testId=null;
   testMessage('diagnosticRejected');
  }
 }
 const stop=reporter?.subscribe(repaintTest);
 if(testButton)testButton.onclick=()=>{
  if(!isActive())return;
  if(reporter.status().state==='disabled'){testMessage('diagnosticTestOptIn');return;}
  testId=reporter.queueTest();
  if(!testId&&!reporter.status().testPending)testMessage('diagnosticFull');
 };
 panel.ontoggle=()=>{
  if(!panel.open)return;
  if(!loaded)void load();
  if(reporter)repaintTest(reporter.status());
 };
 panel.querySelector('[data-errors-refresh]').onclick=load;
 panel.querySelectorAll('[data-errors-period]').forEach(button=>button.onclick=()=>{
  const nextPeriod=Number(button.dataset.errorsPeriod);
  if(nextPeriod!==period)ownerPaint(list,'');
  period=nextPeriod;
  panel.querySelectorAll('[data-errors-period]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.errorsPeriod)===period)));
  void load();
 });
 return panel;
}
