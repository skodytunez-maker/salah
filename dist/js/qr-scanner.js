// Camera frames remain on this device; scanning never approves a login by itself.
export function parseSalahQr(value){
 try{const u=new URL(value);if(u.origin!=='https://skodytunez-maker.github.io'||u.pathname!=='/salah/'||u.search||u.username||u.password)return null;
 const [route,query]=u.hash.split('?');if(route!=='#account')return null;const p=new URLSearchParams(query||'');if([...p.keys()].length!==2)return null;
 const id=p.get('qr'),secret=p.get('approve');return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'')&&/^[a-f0-9]{64}$/.test(secret||'')?{id,secret}:null;
 }catch{return null;}
}
let decoderPromise;
function loadDecoder(){return decoderPromise??=new Promise((resolve,reject)=>{if(globalThis.jsQR){resolve(globalThis.jsQR);return;}const script=document.createElement('script');script.src=new URL('./vendor/jsQR.js',import.meta.url).href;script.onload=()=>globalThis.jsQR?resolve(globalThis.jsQR):reject(Error('decoder'));script.onerror=()=>{decoderPromise=null;script.remove();reject(Error('decoder'));};document.head.append(script);});}
export function mountQrScanner(area,{isActive=()=>true,onScan,onStop}={}){
 const entry=document.createElement('button');entry.type='button';entry.className='button secondary qr-login-entry';entry.textContent='Сканировать QR';area.append(entry);
 let close=null;
 entry.onclick=async()=>{
  if(!isActive())return;close?.();onStop?.();document.documentElement.dataset.qrLogin='active';let alive=true,stream=null,timer=null;const previous=[...area.children];previous.forEach(el=>{el.dataset.qrWasHidden=String(el.hidden);el.hidden=true;});
  const panel=document.createElement('section');panel.className='qr-login-panel qr-scanner-panel';panel.innerHTML='<h2>Сканировать QR</h2><video autoplay muted playsinline aria-label="Камера для сканирования QR"></video><p role="status">Наведите камеру на QR входа SALAH.</p><button type="button" class="button secondary">Отмена</button>';area.append(panel);
  const video=panel.querySelector('video'),status=panel.querySelector('[role=status]'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  const cleanup=()=>{if(!alive)return;alive=false;delete document.documentElement.dataset.qrLogin;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());video.srcObject=null;panel.remove();previous.forEach(el=>{el.hidden=el.dataset.qrWasHidden==='true';delete el.dataset.qrWasHidden;});document.removeEventListener('visibilitychange',hidden);window.removeEventListener('hashchange',cleanup);window.removeEventListener('pagehide',cleanup);};
  const hidden=()=>{if(document.hidden)cleanup();};close=cleanup;panel.querySelector('button').onclick=cleanup;document.addEventListener('visibilitychange',hidden);window.addEventListener('hashchange',cleanup);window.addEventListener('pagehide',cleanup);
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('unsupported');
   // Request camera only after the user's explicit click; never request microphone.
   const pending=navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   pending.then(s=>{if(!alive)s.getTracks().forEach(t=>t.stop());},()=>{});
   stream=await pending;if(!alive||!isActive()){cleanup();return;}video.srcObject=stream;await video.play();const decode=await loadDecoder();if(!alive)return;
   const tick=()=>{
    if(!alive||!isActive()){cleanup();return;}
    if(video.readyState>=2&&video.videoWidth&&ctx){const scale=Math.min(1,720/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);ctx.drawImage(video,0,0,canvas.width,canvas.height);const frame=ctx.getImageData(0,0,canvas.width,canvas.height);const result=decode(frame.data,frame.width,frame.height,{inversionAttempts:'attemptBoth'});
     if(result){const request=parseSalahQr(result.data);if(request){cleanup();onScan?.(request);return;}status.textContent='Это не QR входа SALAH.';}}
    timer=setTimeout(tick,250);
   };tick();
  }catch(e){stream?.getTracks().forEach(t=>t.stop());video.srcObject=null;if(alive){video.hidden=true;status.textContent=['NotAllowedError','PermissionDeniedError'].includes(e?.name)?'Разрешите доступ к камере и попробуйте снова.':e?.name==='NotFoundError'?'Камера не найдена.':'Не удалось открыть камеру. Попробуйте снова.';}}
 };
 return ()=>{close?.();entry.remove();};
}
