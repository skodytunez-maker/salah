import{modal,toast}from './ui.js';
import{actionIcon}from './action-icons.js';
let choosing=false;
export function showTvOutput({requestAudio,nav=globalThis.navigator,notify=toast,show=modal}={}){
 if(choosing)return Promise.resolve({status:'pending'});choosing=true;
 // Open the native picker in the click itself, preserving the user gesture.
 let request;try{request=requestAudio?.()||{status:'no-media'};}catch{request={status:'unavailable'};}
 return Promise.resolve(request).catch(()=>({status:'unavailable'})).then(result=>{
  if(result.status==='no-media')notify('Сначала запустите Коран или рукъю.');
  else if(result.status==='connected')notify('Устройство подключено.');
  else if(!['picker','cancelled'].includes(result.status)){
   const apple=/iPhone|iPad|iPod/i.test(nav?.userAgent||'');
   const message=result.status==='local-media'?'Скачанная запись доступна только на телефоне. Для передачи откройте обычную запись с интернетом.':result.status==='denied'?'Телефон не разрешил передачу звука.':'Прямая передача звука в этом режиме недоступна.';
   show('<div class="modal-heading"><h2>'+actionIcon('tv')+' Подключение устройства</h2><button type="button" class="text-button" data-close>Закрыть</button></div><p>'+message+'</p><p class="muted">'+(apple?'На iPhone нужен телевизор или колонка с AirPlay. Подключите оба устройства к одной сети Wi-Fi и включите AirPlay на телевизоре. Для показа всего приложения выберите «Повтор экрана» в Пункте управления.':'Для показа всего приложения используйте системную трансляцию экрана на совместимый телевизор.')+'</p>');
  }
  return result;
 }).finally(()=>{choosing=false;});
}
