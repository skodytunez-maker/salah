import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{esc}from './ui.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function callDevices(action,data={},expectedUserId=null){
 const {data:auth,error}=await accountAuthClient().auth.getSession();if(error||!auth?.session||expectedUserId&&auth.session.user?.id!==expectedUserId)throw {code:'invalid_session'};
 const r=await fetch(OWNER_PROJECT_URL+'/functions/v1/account-devices',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+auth.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,...data}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
 const value=await r.json();if(!r.ok)throw {code:value.error};return value;
}
export function deviceRows(devices){return devices.map(d=>'<article class="account-device"><div><strong>'+esc(d.label)+'</strong>'+(d.current?'<span class="account-device-current">Это устройство</span>':'')+'<small>Вход: '+esc(new Date(d.signedInAt).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))+'</small></div>'+(!d.current?'<button class="text-button" type="button" data-device-revoke="'+esc(d.id)+'">Завершить вход</button><div class="device-confirm" data-device-confirm="'+esc(d.id)+'" hidden><p>Завершить этот вход?</p><button class="button" type="button" data-device-yes="'+esc(d.id)+'">Завершить</button><button class="button secondary" type="button" data-device-no="'+esc(d.id)+'">Отмена</button></div>':'')+'</article>').join('');}
export function mountAccountDevices(area,{isActive=()=>true,userId=null,request=(action,data)=>callDevices(action,data,userId)}={} ){
 const panel=document.createElement('details');panel.className='settings-extra account-devices';panel.innerHTML='<summary>Мои устройства</summary><div class="account-device-body"><p role="status"></p><div class="account-device-list"></div><button class="button secondary" type="button" data-devices-refresh>Обновить</button><button class="button secondary" type="button" data-devices-more hidden>Показать ещё</button></div>';const out=area.querySelector('#counter-account-out');if(out)area.insertBefore(panel,out);else area.append(panel);
 let generation=0,loaded=false,busy=false,rows=[],cursor=null;
 const live=()=>panel.isConnected&&isActive();const status=panel.querySelector('[role=status]'),list=panel.querySelector('.account-device-list'),refresh=panel.querySelector('[data-devices-refresh]'),more=panel.querySelector('[data-devices-more]');
 const valid=v=>v&&UUID.test(v.id||'')&&typeof v.label==='string'&&v.label.length<=80&&typeof v.current==='boolean'&&Number.isFinite(Date.parse(v.signedInAt));
 const message=e=>e?.code==='list_changed'?'Список изменился. Нажмите «Обновить».':e?.code==='mfa_required'?'Подтвердите защищённый вход в кабинете.':e?.code==='invalid_session'?'Войдите снова.':'Не удалось загрузить устройства. Повторите.';
 const render=()=>{list.innerHTML=deviceRows(rows);more.hidden=!cursor;refresh.disabled=more.disabled=busy;};
 const load=async append=>{
  if(!live()||busy)return;const id=++generation;busy=true;refresh.disabled=more.disabled=true;status.textContent='Загружаем…';
  try{const result=await request('list',append&&cursor?{cursor}:{});if(!live()||id!==generation)return;if(!Array.isArray(result.devices)||result.devices.length>50||result.devices.some(d=>!valid(d))||result.nextCursor!==null&&!UUID.test(result.nextCursor||''))throw Error();const merged=append?[...rows,...result.devices]:result.devices;rows=[...new Map(merged.map(d=>[d.id,d])).values()];cursor=result.nextCursor;loaded=true;status.textContent=rows.length?'':'Других входов нет.';render();}
  catch(e){if(live()&&id===generation)status.textContent=message(e);}
  finally{busy=false;if(live()){refresh.disabled=more.disabled=false;}}
 };
 panel.ontoggle=()=>{if(panel.open&&!loaded)void load(false);};refresh.onclick=()=>load(false);more.onclick=()=>load(true);
 list.onclick=async e=>{
  const button=e.target.closest('button');if(!button||busy||!live())return;
  const id=button.dataset.deviceRevoke||button.dataset.deviceYes||button.dataset.deviceNo,row=rows.find(d=>d.id===id);if(!row||row.current)return;
  const confirmation=[...list.querySelectorAll('[data-device-confirm]')].find(el=>el.dataset.deviceConfirm===id);
  if(button.dataset.deviceRevoke){confirmation.hidden=false;return;}if(button.dataset.deviceNo){confirmation.hidden=true;return;}
  if(!button.dataset.deviceYes)return;busy=true;refresh.disabled=more.disabled=true;button.disabled=true;status.textContent='Завершаем вход…';
  try{const result=await request('revoke',{id});if(!live())return;if(result.ok!==true)throw Error();rows=rows.filter(d=>d.id!==id);status.textContent='Вход завершён.';render();}
  catch(e){if(live()){status.textContent=message(e);button.disabled=false;}}
  finally{busy=false;if(live())refresh.disabled=more.disabled=false;}
 };
 return panel;
}
