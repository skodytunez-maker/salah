// Deliberately independent of the module graph: a failed import must not leave
// the application empty. This guard never repairs, updates or reloads itself.
(() => {
 const host=document.getElementById('app'),panel=document.getElementById('app-bootstrap');
 if(!host||!panel||panel.parentNode!==host){document.body?.removeAttribute('data-app-starting');return;}
 const entry=document.querySelector('script[type="module"][src="./js/app.js"],script[type="module"][src="./js/native-entry.js"]'),status=panel.querySelector('[data-bootstrap-status]'),actions=panel.querySelector('[data-bootstrap-actions]'),retry=panel.querySelector('[data-bootstrap-retry]'),recover=panel.querySelector('[data-bootstrap-recover]');
 if(!status||!actions||!retry||!recover){document.body?.removeAttribute('data-app-starting');return;}
 const languages={
  ru:{script:'Cyrl',loading:'Загружаем SALAH…',delayed:'Загрузка занимает больше времени. Проверьте соединение и повторите попытку.',failed:'Не удалось открыть SALAH. Проверьте соединение и повторите попытку.',retry:'Повторить',recover:'Восстановить запуск'},
  en:{script:'Latn',loading:'Loading SALAH…',delayed:'Loading is taking longer. Check your connection and try again.',failed:'SALAH could not open. Check your connection and try again.',retry:'Try again',recover:'Restore startup'},
  az:{script:'Latn',loading:'SALAH yüklənir…',delayed:'Yükləmə daha çox vaxt aparır. İnternet bağlantınızı yoxlayın və yenidən cəhd edin.',failed:'SALAH açıla bilmədi. İnternet bağlantınızı yoxlayın və yenidən cəhd edin.',retry:'Yenidən cəhd et',recover:'Açılışı bərpa et'},
  tg:{script:'Cyrl',loading:'SALAH бор мешавад…',delayed:'Боркунӣ вақти бештар мегирад. Пайвасти интернетро санҷед ва дубора кӯшиш кунед.',failed:'SALAH кушода нашуд. Пайвасти интернетро санҷед ва дубора кӯшиш кунед.',retry:'Дубора кӯшиш кардан',recover:'Барқарор кардани оғоз'},
  uz:{script:'Latn',loading:'SALAH yuklanmoqda…',delayed:'Yuklash ko‘proq vaqt olyapti. Internet aloqasini tekshiring va qayta urinib ko‘ring.',failed:'SALAH ochilmadi. Internet aloqasini tekshiring va qayta urinib ko‘ring.',retry:'Qayta urinish',recover:'Ishga tushishni tiklash'},
  kk:{script:'Cyrl',loading:'SALAH жүктелуде…',delayed:'Жүктеу ұзаққа созылды. Интернет байланысын тексеріп, қайталап көріңіз.',failed:'SALAH ашылмады. Интернет байланысын тексеріп, қайталап көріңіз.',retry:'Қайталап көру',recover:'Іске қосуды қалпына келтіру'},
  de:{script:'Latn',loading:'SALAH wird geladen…',delayed:'Das Laden dauert länger. Prüfe deine Verbindung und versuche es erneut.',failed:'SALAH konnte nicht geöffnet werden. Prüfe deine Verbindung und versuche es erneut.',retry:'Erneut versuchen',recover:'Start wiederherstellen'},
  ar:{script:'Arab',loading:'جارٍ تحميل SALAH…',delayed:'يستغرق التحميل وقتًا أطول. تحقّق من اتصالك وحاول مجددًا.',failed:'تعذّر فتح SALAH. تحقّق من اتصالك وحاول مجددًا.',retry:'المحاولة مجددًا',recover:'استعادة بدء التشغيل'}
 };
 // Match the normal interface preference without importing storage or changing
 // any saved setting. With no valid manual choice, follow the phone language.
 let preference='auto',language='ru';
 try{const saved=JSON.parse(localStorage.getItem('salah:settings'));if(saved&&typeof saved==='object'&&!Array.isArray(saved)&&typeof saved.uiLanguage==='string'&&(saved.uiLanguage==='auto'||Object.hasOwn(languages,saved.uiLanguage)))preference=saved.uiLanguage;}catch{}
 if(Object.hasOwn(languages,preference))language=preference;
 else if(preference==='auto')for(const candidate of navigator.languages||[navigator.language]){
  if(typeof candidate!=='string'||candidate.length>80)continue;
  try{const locale=new Intl.Locale(candidate),info=languages[locale.language];if(info&&(!locale.script||locale.script===info.script)){language=locale.language;break;}}catch{}
 }
 const copy=languages[language];panel.lang=language;panel.dir=language==='ar'?'rtl':'ltr';status.textContent=copy.loading;retry.textContent=copy.retry;recover.textContent=copy.recover;
 let disposed=false,timer=null;
 const owns=()=>panel.isConnected&&panel.parentNode===host&&host.isConnected;
 const dispose=()=>{if(disposed)return;disposed=true;document.body?.removeAttribute('data-app-starting');clearTimeout(timer);observer.disconnect();entry?.removeEventListener('error',failed);window.removeEventListener('error',failed,true);retry.removeEventListener('click',repeat);};
 const reveal=reason=>{if(disposed)return;if(!owns()){dispose();return;}clearTimeout(timer);timer=null;status.textContent=copy[reason];panel.setAttribute('aria-busy','false');actions.hidden=false;};
 const failed=event=>{
  // Resource errors belong to the entry element. Evaluation errors are emitted
  // on window with the failed module filename; unrelated assets are ignored.
  if(event.target===entry){reveal('failed');return;}
  if(event.target!==window||typeof event.filename!=='string'||!event.filename)return;
  try{const file=new URL(event.filename,document.baseURI),modules=new URL('./js/',document.baseURI);if(file.origin===modules.origin&&file.pathname.startsWith(modules.pathname))reveal('failed');}catch{}
 };
 const repeat=()=>{if(!disposed&&owns())location.reload();};
 const observer=new MutationObserver(()=>{if(!owns())dispose();});
 observer.observe(host,{childList:true});if(host.parentNode)observer.observe(host.parentNode,{childList:true});
 entry?.addEventListener('error',failed);window.addEventListener('error',failed,true);retry.addEventListener('click',repeat);
 timer=setTimeout(()=>reveal('delayed'),12000);
})();
