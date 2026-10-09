export function qrCameraCrop(width,height){if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;const side=Math.min(width,height);return {x:(width-side)/2,y:(height-side)/2,side,size:Math.min(640,Math.round(side))};}
// Camera frames remain on this device; scanning never approves a login by itself.
export function parseSalahQr(value){
 try{const u=new URL(value);if(u.origin!=='https://skodytunez-maker.github.io'||u.pathname!=='/salah/'||u.search||u.username||u.password)return null;
 const [route,query]=u.hash.split('?');if(route!=='#account')return null;const p=new URLSearchParams(query||'');if([...p.keys()].length!==2)return null;
 const id=p.get('qr'),secret=p.get('approve');return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'')&&/^[a-f0-9]{64}$/.test(secret||'')?{id,secret}:null;
 }catch{return null;}
}
let currentClose=null;
export function stopQrScanner(){currentClose?.();currentClose=null;}
let decoderPromise;
function loadDecoder(){return decoderPromise??=new Promise((resolve,reject)=>{if(globalThis.jsQR){resolve(globalThis.jsQR);return;}const script=document.createElement('script');script.src=new URL('./vendor/jsQR.js',import.meta.url).href;script.onload=()=>globalThis.jsQR?resolve(globalThis.jsQR):reject(Error('decoder'));script.onerror=()=>{decoderPromise=null;script.remove();reject(Error('decoder'));};document.head.append(script);});}
export function mountQrScanner(area,{isActive=()=>true,onScan,onStop,parse=parseSalahQr,entryButton=null,entryLabel='Сканировать QR',title='Сканировать QR',hint='Наведите камеру на QR входа SALAH.',invalidHint='Это не QR входа SALAH.'}={}){
 const entry=entryButton||document.createElement('button');entry.type='button';if(!entryButton)entry.className='button secondary qr-login-entry';entry.textContent=entryLabel;if(!entryButton)area.append(entry);
 let close=null;
 entry.onclick=async()=>{
  if(!isActive())return;close?.();onStop?.();document.documentElement.dataset.qrLogin='active';let alive=true,stream=null,timer=null,frameCallback=null,paintCallback=null,previewTimer=null;const previous=[...area.children];previous.forEach(el=>{el.dataset.qrWasHidden=String(el.hidden);el.hidden=true;});
  const panel=document.createElement('section');panel.className='qr-login-panel qr-scanner-panel';panel.innerHTML='<h2>Сканировать QR</h2><div class="qr-camera-frame"><video autoplay muted playsinline aria-label="Камера для сканирования QR"></video><div class="qr-viewfinder" aria-hidden="true"><svg class="qr-camera-watermark" viewBox="0 0 64 64"><path fill-rule="evenodd" d="M4 4h18v18H4zM7 7h12v12H7zM10 10h6v6H10zM42 4h18v18H42zM45 7h12v12H45zM48 10h6v6H48zM4 42h18v18H4zM7 45h12v12H7zM10 48h6v6H10zM30 8h4v12h-4zM28 28h12v12H28zM46 30h10v6H46zM30 46h6v14h-6zM44 44h8v8h-8zM54 54h6v6h-6z"/></svg></div></div><p role="status">Наведите камеру на QR входа SALAH.</p><button type="button" class="button secondary">Отмена</button>';area.append(panel);const heading=panel.querySelector('h2');if(heading){heading.textContent=title;heading.hidden=!title;}panel.querySelector('[role=status]').textContent=hint;
  const video=panel.querySelector('video'),status=panel.querySelector('[role=status]'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  const cleanup=()=>{if(!alive)return;alive=false;if(currentClose===cleanup)currentClose=null;delete document.documentElement.dataset.qrLogin;clearTimeout(timer);clearTimeout(previewTimer);if(frameCallback!==null)video.cancelVideoFrameCallback?.(frameCallback);if(paintCallback!==null)cancelAnimationFrame(paintCallback);stream?.getTracks().forEach(t=>t.stop());video.srcObject=null;panel.remove();previous.forEach(el=>{el.hidden=el.dataset.qrWasHidden==='true';delete el.dataset.qrWasHidden;});document.removeEventListener('visibilitychange',hidden);window.removeEventListener('hashchange',cleanup);window.removeEventListener('pagehide',cleanup);};
  const hidden=()=>{if(document.hidden)cleanup();};close=cleanup;currentClose=cleanup;panel.querySelector('button').onclick=cleanup;document.addEventListener('visibilitychange',hidden);window.addEventListener('hashchange',cleanup);window.addEventListener('pagehide',cleanup);
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('unsupported');
   // Request camera only after the user's explicit click; never request microphone.
   const pending=navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   pending.then(s=>{if(!alive)s.getTracks().forEach(t=>t.stop());},()=>{});
   stream=await pending;if(!alive||!isActive()){cleanup();return;}video.srcObject=stream;await video.play();if(!alive)return;
   // Safari may paint the camera at its native portrait ratio before cover settles.
   // Keep the fixed square placeholder until a real frame has reached the compositor.
   let previewScheduled=false;const showPreview=()=>{if(!alive||previewScheduled)return;previewScheduled=true;clearTimeout(previewTimer);paintCallback=requestAnimationFrame(()=>{if(!alive)return;paintCallback=requestAnimationFrame(()=>{paintCallback=null;if(alive&&video.readyState>=2&&video.videoWidth&&video.videoHeight)panel.dataset.cameraReady='true';});});};
   if(video.requestVideoFrameCallback)frameCallback=video.requestVideoFrameCallback(()=>{frameCallback=null;showPreview();});else showPreview();
   // A still camera frame may already be presented before callback registration.
   previewTimer=setTimeout(()=>{if(video.readyState>=2)showPreview();},300);
   const decode=await loadDecoder();if(!alive)return;
   const tick=()=>{
    if(!alive||!isActive()){cleanup();return;}
    if(video.readyState>=2&&video.videoWidth&&video.videoHeight&&ctx){const crop=qrCameraCrop(video.videoWidth,video.videoHeight);canvas.width=canvas.height=crop.size;ctx.drawImage(video,crop.x,crop.y,crop.side,crop.side,0,0,canvas.width,canvas.height);const frame=ctx.getImageData(0,0,canvas.width,canvas.height);const result=decode(frame.data,frame.width,frame.height,{inversionAttempts:'attemptBoth'});
     if(result){const request=parse(result.data);if(request){cleanup();onScan?.(request);return;}status.textContent=invalidHint;}}
    timer=setTimeout(tick,250);
   };tick();
  }catch(e){stream?.getTracks().forEach(t=>t.stop());video.srcObject=null;if(alive){video.hidden=true;status.textContent=['NotAllowedError','PermissionDeniedError'].includes(e?.name)?'Разрешите доступ к камере и попробуйте снова.':e?.name==='NotFoundError'?'Камера не найдена.':'Не удалось открыть камеру. Попробуйте снова.';}}
 };
 const dispose=()=>{close?.();if(!entryButton)entry.remove();};dispose.open=()=>entry.onclick();return dispose;
}
