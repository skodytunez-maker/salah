import{stopQrScanner}from './qr-scanner.js';
import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{esc,uiLeaf,uiAttribute,uiMessage,setUiMessage,setUiAttribute}from './ui.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,SECRET=/^[a-f0-9]{64}$/;
const LABELS={computer:'qrUi.computer',tablet:'qrUi.tablet',phone:'qrUi.phone'};
let approval=null,dispose=null;
export function captureQrApproval(){
 const p=new URLSearchParams(location.hash.split('?')[1]||'');if(!p.has('qr'))return false;
 const id=p.get('qr'),secret=p.get('approve');approval=UUID.test(id||'')&&SECRET.test(secret||'')?{id,secret}:null;
 // Never leave approval credentials in browser history or copied account links.
 history.replaceState(history.state,'',location.pathname+location.search+'#account');return true;
}
export function setQrApproval(request){approval=request;}
export const hasQrApproval=()=>!!approval;
export function stopQrLogin(){stopQrScanner();dispose?.();dispose=null;}
async function call(action,data={},bearer){
 const r=await fetch(OWNER_PROJECT_URL+'/functions/v1/qr-login',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},body:JSON.stringify({action,...data}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
 const value=await r.json();if(!r.ok)throw Object.assign(Error(value.error||'unavailable'),{code:value.error});return value;
}
function errorText(e){return e?.code==='mfa_required'?uiMessage('qrUi.mfa'):e?.code==='try_later'?uiMessage('qrUi.tryLater'):['expired','already_used','not_approved'].includes(e?.code)?uiMessage('qrUi.expired'):e?.code==='invalid_session'?uiMessage('qrUi.sessionEnded'):uiMessage('qrUi.connectionFailed');}
const deviceKind=()=>/iPad|Tablet|Android(?!.*Mobile)/i.test(navigator.userAgent)||navigator.maxTouchPoints>1&&/Macintosh/i.test(navigator.userAgent)?'tablet':/Mobile|iPhone/i.test(navigator.userAgent)?'phone':'computer';
export async function mountQrApproval(area,session,finished){
 stopQrLogin();const request=approval;if(!request)return false;
 let alive=true,busy=false;document.documentElement.dataset.qrLogin='active';dispose=()=>{alive=false;delete document.documentElement.dataset.qrLogin;};
 if(!session){const note=document.createElement('p');note.className='muted';setUiMessage(note,uiMessage('qrUi.phoneSignIn'));area.prepend(note);return false;}
 area.innerHTML='<section class="qr-login-panel"><h2>'+uiLeaf('qrUi.otherDeviceTitle')+'</h2><p role="status" id="qr-status">'+uiLeaf('qrUi.checking')+'</p><div id="qr-approval-content"></div></section>';
 const status=area.querySelector('#qr-status'),content=area.querySelector('#qr-approval-content');
 try{
  const preview=await call('preview',request,session.access_token);if(!alive)return true;
  if(preview.state!=='pending')throw {code:'already_used'};
  setUiMessage(status,'');content.innerHTML='<p>'+uiLeaf(LABELS[preview.device]||'qrUi.otherDevice')+'</p><strong class="qr-pairing-code">'+esc(preview.code)+'</strong><p class="muted">'+uiLeaf('qrUi.compareNote')+'</p><button class="button" id="qr-approve">'+uiLeaf('qrUi.approve')+'</button><button class="button secondary" id="qr-deny">'+uiLeaf('qrUi.deny')+'</button>';
  const decide=async approved=>{
   if(!alive||busy)return;busy=true;content.querySelectorAll('button').forEach(b=>b.disabled=true);
   try{
    const current=await accountAuthClient().auth.getSession();if(current.error||current.data?.session?.user?.id!==session.user.id)throw {code:'invalid_session'};
    await call(approved?'approve':'deny',request,current.data.session.access_token);if(!alive)return;
    approval=null;delete document.documentElement.dataset.qrLogin;content.innerHTML='';setUiMessage(status,approved?uiMessage('qrUi.approved'):uiMessage('qrUi.denied'));
    const done=document.createElement('button');done.className='button secondary';setUiMessage(done,uiMessage('accountUi.myAccount'));done.onclick=finished;content.append(done);
   }catch(e){if(alive){setUiMessage(status,errorText(e));busy=false;content.querySelectorAll('button').forEach(b=>b.disabled=false);}}
  };
  content.querySelector('#qr-approve').onclick=()=>decide(true);content.querySelector('#qr-deny').onclick=()=>decide(false);
 }catch(e){if(alive){approval=null;delete document.documentElement.dataset.qrLogin;setUiMessage(status,errorText(e));content.innerHTML=(e?.code==='mfa_required'?'<a class="button" href="#account?owner=1">'+uiLeaf('accountUi.secureSignIn')+'</a>':'')+'<button class="button secondary">'+uiLeaf('accountUi.myAccount')+'</button>';content.querySelector('button').onclick=finished;}}
 return true;
}
export function mountQrLogin(area,finished){
 const button=document.createElement('button');button.type='button';button.className='button secondary qr-login-entry';setUiMessage(button,uiMessage('qrUi.entry'));area.append(button);
 button.onclick=async()=>{
  stopQrLogin();document.documentElement.dataset.qrLogin='active';let alive=true,request=null,polling=false,redeeming=false,timer=null;
  const previous=[...area.children];previous.forEach(el=>{el.dataset.qrWasHidden=String(el.hidden);el.hidden=true;});
  const panel=document.createElement('section');panel.className='qr-login-panel';panel.innerHTML='<h2>'+uiLeaf('qrUi.title')+'</h2><div class="qr-login-code" '+uiAttribute('qrUi.codeLabel',{},'aria-label')+'></div><strong class="qr-pairing-code"></strong><p class="muted">'+uiLeaf('qrUi.phoneNote')+'</p><p role="status">'+uiLeaf('qrUi.preparing')+'</p><button class="button secondary" type="button">'+uiLeaf('common.cancel')+'</button>';area.append(panel);
  const status=panel.querySelector('[role=status]');
  const cleanup=()=>{if(!alive)return;alive=false;delete document.documentElement.dataset.qrLogin;clearTimeout(timer);document.removeEventListener('visibilitychange',resume);if(request&&!redeeming)call('cancel',{id:request.id,secret:request.pollSecret}).catch(()=>{});panel.remove();previous.forEach(el=>{el.hidden=el.dataset.qrWasHidden==='true';delete el.dataset.qrWasHidden;});};
  dispose=cleanup;panel.querySelector('button').onclick=stopQrLogin;
  const tick=async()=>{
   if(!alive||polling||document.hidden||!request)return;
   if(Date.now()>=request.expiresAt){setUiMessage(status,uiMessage('qrUi.expiredCancel'));panel.querySelector('.qr-login-code').replaceChildren();return;}
   polling=true;
   try{
    const value=await call('status',{id:request.id,secret:request.pollSecret});if(!alive)return;
    if(value.state==='approved'){
     // Do not replace an account signed in by another tab while this QR waited.
     const current=await accountAuthClient().auth.getSession();if(!alive)return;if(current.error||current.data?.session){cleanup();return;}
     redeeming=true;setUiMessage(status,uiMessage('accountUi.signingIn'));const grant=await call('redeem',{id:request.id,secret:request.pollSecret});if(!alive)return;
     const latest=await accountAuthClient().auth.getSession();if(!alive)return;if(latest.error||latest.data?.session){cleanup();return;}
     const {data,error}=await accountAuthClient().auth.verifyOtp({token_hash:grant.tokenHash,type:'email'});if(error||!data?.session?.user?.email_confirmed_at)throw {code:'invalid_session'};
     if(alive){cleanup();dispose=null;finished();}return;
    }
    if(value.state==='denied'||value.state==='consumed'){setUiMessage(status,value.state==='denied'?uiMessage('qrUi.denied'):uiMessage('qrUi.used'));panel.querySelector('.qr-login-code').replaceChildren();return;}
    setUiMessage(status,uiMessage('qrUi.confirmOnPhone'));
   }catch(e){if(!alive)return;setUiMessage(status,errorText(e));if(redeeming||['expired','invalid_session'].includes(e?.code)){panel.querySelector('.qr-login-code').replaceChildren();return;}}
   finally{polling=false;}
   if(alive)timer=setTimeout(tick,2500);
  };
  const resume=()=>{if(!document.hidden){clearTimeout(timer);tick();}};document.addEventListener('visibilitychange',resume);
  try{
   request=await call('create',{device:deviceKind()});if(!alive){call('cancel',{id:request.id,secret:request.pollSecret}).catch(()=>{});return;}
   const {default:qrcode}=await import('./vendor/qrcode-generator.js');if(!alive)return;
   const qr=qrcode(0,'M');qr.addData('https://skodytunez-maker.github.io/salah/#account?qr='+request.id+'&approve='+request.approvalSecret);qr.make();
   panel.querySelector('.qr-login-code').innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});panel.querySelector('.qr-pairing-code').textContent=request.code;tick();
  }catch(e){if(alive)setUiMessage(status,errorText(e));}
 };
}
if(typeof window!=='undefined')window.addEventListener('hashchange',()=>{if(location.hash.split('?')[0]!=='#account'){stopQrLogin();approval=null;}});
