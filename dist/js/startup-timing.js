const ageMs=value=>Number.isFinite(value)&&value>=0?Math.round(value):null;
const between=(end,start)=>Number.isFinite(end)&&Number.isFinite(start)&&end>=start&&start>=0?ageMs(end-start):null;

export function collectStartupTiming({performance,base,phase,at}){
 const firstScreen=phase==='ready'||phase==='delayed'||phase==='failed'?phase:'failed';
 const parts={phase:firstScreen,screenMs:ageMs(at),documentFirstByteMs:null,htmlMs:null,firstPaintMs:null,
  staticCount:0,staticTransferredBytes:0,lastStaticMs:null,unmeasuredAfterStaticMs:null,
  workerIntercepted:null,navigationKind:null};
 const limit=parts.screenMs;
 if(limit===null||!performance?.getEntriesByType)return parts;
 const [nav]=performance.getEntriesByType('navigation');
 if(nav){
  if(nav.responseStart>0){
   parts.documentFirstByteMs=between(nav.responseStart,nav.requestStart);
   if(nav.responseEnd<=at)parts.htmlMs=between(nav.responseEnd,nav.responseStart);
  }
  if(['navigate','reload','back_forward','prerender'].includes(nav.type))parts.navigationKind=nav.type;
  if(Number.isFinite(nav.workerStart))parts.workerIntercepted=nav.workerStart>0;
 }
 const paint=performance.getEntriesByType('paint').find(entry=>entry.name==='first-contentful-paint'&&entry.startTime<=at);
 if(paint)parts.firstPaintMs=ageMs(paint.startTime);
 const origin=new URL(base).origin;
 for(const entry of performance.getEntriesByType('resource')){
  if(!Number.isFinite(entry.responseEnd)||entry.responseEnd<=0||entry.responseEnd>at)continue;
  let url;
  try{url=new URL(entry.name,base);}catch{continue;}
  if(url.origin!==origin||!(/\.(?:js|mjs|css)$/i.test(url.pathname)))continue;
  parts.staticCount++;
  parts.staticTransferredBytes+=ageMs(entry.transferSize)??0;
  const completed=ageMs(entry.responseEnd);
  parts.lastStaticMs=Math.max(parts.lastStaticMs??0,completed);
 }
 if(firstScreen==='ready'&&parts.lastStaticMs!==null)parts.unmeasuredAfterStaticMs=between(limit,parts.lastStaticMs);
 return parts;
}

const words={
 ru:{title:'Замер запуска SALAH',close:'Скрыть замер',ready:'Экран приложения готов: ',delayed:'Приложение ещё загружается: ',failed:'Сбой загрузки: ',
  firstByte:'Ответ HTML: ',html:'Передача HTML: ',paint:'Первая отрисовка (включая заставку): ',staticEnd:'Последний загруженный JS или CSS: ',
  after:'От последних JS/CSS до готовности: ',count:'JS и CSS в журнале браузера: ',worker:'Service worker: ',yes:'участвовал',no:'без перехвата',
  navigate:'переход',reload:'перезагрузка',back_forward:'назад/вперёд',prerender:'предзагрузка',mode:'Открытие: ',ms:' мс',kb:' КБ'},
 en:{title:'SALAH startup timing',close:'Hide timing',ready:'App content ready: ',delayed:'Still loading: ',failed:'Startup failed: ',
  firstByte:'HTML response: ',html:'HTML download: ',paint:'First contentful paint: ',staticEnd:'Last completed JS or CSS: ',
  after:'After the last JS/CSS response: ',count:'JS and CSS recorded by the browser: ',worker:'Service worker: ',yes:'intercepted',no:'no interception',
  navigate:'navigation',reload:'reload',back_forward:'back/forward',prerender:'prerender',mode:'Open mode: ',ms:' ms',kb:' KB'}
};
let card=null,body=null,dismissed=false;

export function showStartupTiming({doc,performance,base,phase,at}){
 if(dismissed||!doc.body)return;
 const values=collectStartupTiming({performance,base,phase,at});
 const copy=words[doc.documentElement.lang==='ru'?'ru':'en'];
 if(!card){
  card=doc.createElement('aside');
  card.setAttribute('aria-label',copy.title);
  card.dataset.startupTiming='';
  card.style.cssText='position:fixed;z-index:10000;inset:auto 12px max(86px,calc(env(safe-area-inset-bottom) + 74px));max-width:420px;margin-inline:auto;max-height:45dvh;overflow:auto;padding:12px;border-radius:14px;background:#152033;color:#f6f1e6;border:1px solid #d5be8a;font:14px/1.5 system-ui,sans-serif;text-align:start';
  const header=doc.createElement('div');
  header.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:10px';
  const title=doc.createElement('strong');
  title.textContent=copy.title;
  const close=doc.createElement('button');
  close.type='button';
  close.textContent='×';
  close.setAttribute('aria-label',copy.close);
  close.style.cssText='min-width:44px;min-height:44px;font-size:20px;background:#25334c;color:inherit;border:1px solid #d5be8a;border-radius:8px';
  close.addEventListener('click',()=>{dismissed=true;card.remove();});
  header.append(title,close);
  body=doc.createElement('pre');
  body.style.cssText='margin:0;white-space:pre-wrap;font:inherit;overflow-wrap:anywhere';
  card.append(header,body);
  doc.body.append(card);
 }
 const time=value=>value===null?'—':value+copy.ms;
 const lines=[
  copy[values.phase]+time(values.screenMs),
  copy.firstByte+time(values.documentFirstByteMs),
  copy.html+time(values.htmlMs),
  copy.paint+time(values.firstPaintMs),
  copy.staticEnd+time(values.lastStaticMs),
  copy.after+time(values.unmeasuredAfterStaticMs),
  copy.count+values.staticCount+' · '+Math.round(values.staticTransferredBytes/1000)+copy.kb,
  copy.worker+(values.workerIntercepted===null?'—':values.workerIntercepted?copy.yes:copy.no),
  copy.mode+(copy[values.navigationKind]||'—')
 ];
 body.textContent=lines.join('\n');
}
