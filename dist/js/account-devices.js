import{t,getLocale,subscribeLanguage}from './i18n.js';
import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{esc,uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute}from './ui.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function callDevices(action,data={},expectedUserId=null){
 const {data:auth,error}=await accountAuthClient().auth.getSession();if(error||!auth?.session||expectedUserId&&auth.session.user?.id!==expectedUserId)throw {code:'invalid_session'};
 const r=await fetch(OWNER_PROJECT_URL+'/functions/v1/account-devices',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+auth.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,...data}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
 const value=await r.json();if(!r.ok)throw {code:value.error};return value;
}
export function deviceRows(devices){return devices.map(d=>'<article class="account-device"><div><strong>'+esc(d.label)+'</strong>'+(d.current?'<span class="account-device-current">'+uiLeaf('deviceUi.current')+'</span>':'')+'<small>'+uiLeaf('deviceUi.signedIn')+' <time data-device-date datetime="'+esc(d.signedInAt)+'">'+esc(new Date(d.signedInAt).toLocaleString(getLocale(),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))+'</time></small></div>'+(!d.current?'<button class="text-button" type="button" data-device-revoke="'+esc(d.id)+'">'+uiLeaf('deviceUi.revoke')+'</button><div class="device-confirm" data-device-confirm="'+esc(d.id)+'" hidden><p>'+uiLeaf('deviceUi.revokeTitle')+'</p><button class="button" type="button" data-device-yes="'+esc(d.id)+'">'+uiLeaf('deviceUi.confirm')+'</button><button class="button secondary" type="button" data-device-no="'+esc(d.id)+'">'+uiLeaf('common.cancel')+'</button></div>':'')+'</article>').join('');}
let detachDeviceLanguage=null;
export function mountAccountDevices(area,{isActive=()=>true,userId=null,mountIn=null,request=(action,data)=>callDevices(action,data,userId)}={} ){
 detachDeviceLanguage?.();detachDeviceLanguage=null;
 const panel=document.createElement('details');panel.className='settings-extra account-devices';panel.innerHTML='<summary>'+uiLeaf('deviceUi.title')+'</summary><div class="account-device-body"><p role="status"></p><div class="account-device-list"></div><div class="account-device-actions"><button class="button secondary" type="button" data-devices-refresh>'+uiLeaf('settingsExtra.update')+'</button><button class="button secondary" type="button" data-devices-toggle hidden>'+uiLeaf('deviceUi.all')+'</button><button class="button secondary" type="button" data-devices-more hidden>'+uiLeaf('deviceUi.more')+'</button></div></div>';const out=area.querySelector('#counter-account-out');if(mountIn)mountIn.append(panel);else if(out)area.insertBefore(panel,out);else area.append(panel);
 let generation=0,loaded=false,busy=false,rows=[],cursor=null,expanded=false;
 const live=()=>panel.isConnected&&isActive();const status=panel.querySelector('[role=status]'),list=panel.querySelector('.account-device-list'),refresh=panel.querySelector('[data-devices-refresh]'),more=panel.querySelector('[data-devices-more]'),toggle=panel.querySelector('[data-devices-toggle]');
 const valid=v=>v&&UUID.test(v.id||'')&&typeof v.label==='string'&&v.label.length<=80&&typeof v.current==='boolean'&&Number.isFinite(Date.parse(v.signedInAt));
 const message=e=>e?.code==='list_changed'?uiMessage('deviceUi.listChanged'):e?.code==='mfa_required'?uiMessage('deviceUi.mfa'):e?.code==='invalid_session'?uiMessage('deviceUi.signIn'):uiMessage('deviceUi.loadFailed');
 const render=()=>{const ordered=rows.slice().sort((a,b)=>Number(b.current)-Number(a.current));list.innerHTML=deviceRows(expanded?ordered:ordered.slice(0,3));list.classList.toggle('is-expanded',expanded);toggle.hidden=rows.length<=3&&!cursor;setUiMessage(toggle,expanded?uiMessage('deviceUi.collapse'):uiMessage('deviceUi.all'));more.hidden=!cursor||!expanded;refresh.disabled=more.disabled=toggle.disabled=busy;};
 const load=async append=>{
  if(!live()||busy)return;const id=++generation;busy=true;refresh.disabled=more.disabled=toggle.disabled=true;setUiMessage(status,uiMessage('deviceUi.loading'));
  try{const result=await request('list',append&&cursor?{cursor}:{});if(!live()||id!==generation)return;if(!Array.isArray(result.devices)||result.devices.length>50||result.devices.some(d=>!valid(d))||result.nextCursor!==null&&!UUID.test(result.nextCursor||''))throw Error();const merged=append?[...rows,...result.devices]:result.devices;rows=[...new Map(merged.map(d=>[d.id,d])).values()];cursor=result.nextCursor;loaded=true;setUiMessage(status,rows.length?'':uiMessage('deviceUi.noOthers'));render();}
  catch(e){if(live()&&id===generation)setUiMessage(status,message(e));}
  finally{busy=false;if(live()){refresh.disabled=more.disabled=toggle.disabled=false;}}
 };
 panel.ontoggle=()=>{if(panel.open&&!loaded)void load(false);};refresh.onclick=()=>load(false);more.onclick=()=>load(true);toggle.onclick=()=>{if(!busy&&live()){expanded=!expanded;render();}};
 list.onclick=async e=>{
  const button=e.target.closest('button');if(!button||busy||!live())return;
  const id=button.dataset.deviceRevoke||button.dataset.deviceYes||button.dataset.deviceNo,row=rows.find(d=>d.id===id);if(!row||row.current)return;
  const confirmation=[...list.querySelectorAll('[data-device-confirm]')].find(el=>el.dataset.deviceConfirm===id);
  if(button.dataset.deviceRevoke){confirmation.hidden=false;return;}if(button.dataset.deviceNo){confirmation.hidden=true;return;}
  if(!button.dataset.deviceYes)return;busy=true;refresh.disabled=more.disabled=true;button.disabled=true;setUiMessage(status,uiMessage('deviceUi.revoking'));
  try{const result=await request('revoke',{id});if(!live())return;if(result.ok!==true)throw Error();rows=rows.filter(d=>d.id!==id);setUiMessage(status,uiMessage('deviceUi.revoked'));render();}
  catch(e){if(live()){setUiMessage(status,message(e));button.disabled=false;}}
  finally{busy=false;if(live())refresh.disabled=more.disabled=false;}
 };
 const offLanguage=subscribeLanguage(()=>{if(!panel.isConnected){cleanup();return;}for(const node of panel.querySelectorAll('[data-device-date]'))node.textContent=new Date(node.getAttribute('datetime')).toLocaleString(getLocale(),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});});
 const route=()=>{if(!panel.isConnected)cleanup();},cleanup=()=>{offLanguage();window.removeEventListener('hashchange',route);if(detachDeviceLanguage===cleanup)detachDeviceLanguage=null;};window.addEventListener('hashchange',route);detachDeviceLanguage=cleanup;
 return panel;
}
