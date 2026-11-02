const messages={
 current:'Установлена последняя версия SALAH.',
 loading:'Обновление загружается. Когда загрузка завершится, нажмите «Обновить» ещё раз.',
 updating:'Устанавливаем обновление. SALAH перезапустится автоматически.',
 deferred:'Обновление готово. Установится после завершения воспроизведения или занятия.',
 restart:'Обновление загружено. Закройте SALAH и снова откройте тот же значок.',
 offline:'Для проверки обновления нужен интернет.',
 unavailable:'Проверка пока недоступна. Закройте SALAH и снова откройте тот же значок.',
 timeout:'Проверка занимает больше времени. Нажмите «Обновить» ещё раз.',
 error:'Не удалось проверить обновление. Попробуйте ещё раз.'
};
export function mountUpdateButton(root,{check,apply,timeoutMs=12000}={}){
 const button=root.querySelector('#check-update');if(!button)return;
 const label=button.querySelector('span')||button,doc=button.ownerDocument;
 let status=root.querySelector('#app-update-status');
 if(!status){status=doc.createElement('p');status.id='app-update-status';status.className='muted app-update-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');status.hidden=true;button.after(status);}
 button.setAttribute('aria-describedby',status.id);
 let busy=false;
 button.onclick=async()=>{
  if(busy)return;busy=true;button.disabled=true;button.setAttribute('aria-busy','true');label.textContent='Проверяем…';status.hidden=false;status.textContent='Проверяем наличие обновления…';
  let timer;
  try{
   const result=await Promise.race([Promise.resolve().then(check),new Promise(resolve=>{timer=setTimeout(()=>resolve('timeout'),timeoutMs);})]);
   clearTimeout(timer);
   if(!button.isConnected)return;
   if(result==='available'){label.textContent='Устанавливаем…';status.textContent='Обновление найдено. Подготавливаем установку…';}
   const next=result==='available'?await apply():result;
   if(button.isConnected)status.textContent=messages[next]||messages.error;
  }catch{if(button.isConnected)status.textContent=messages.error;}
  finally{clearTimeout(timer);busy=false;if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');label.textContent='Обновить';}}
 };
}
