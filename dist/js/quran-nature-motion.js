import{settings}from './storage.js';

const KINDS=new Set(['rain','wind','fire','forest','ocean']);
const WIDTH=940,HEIGHT=1672,FRAME_MS=1000/24,MAX_PIXELS=750000;
const part=(i,salt=0)=>((i*73+salt*37)%997)/997;
function glow(ctx,x,y,r,color,alpha){const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,'rgba('+color+','+alpha+')');gradient.addColorStop(1,'rgba('+color+',0)');ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,2*r,2*r);}

// Coordinates follow the existing 9:16 photographs; no portrait or control is painted.
export function paintNatureMotion(ctx,kind,t){
 if(kind==='rain'){
  ctx.lineCap='round';
  for(let i=0;i<62;i++){const x=part(i,3)*1100-80,y=(part(i,8)*1800+t*(235+part(i,4)*160))%1800-65,length=23+part(i,2)*29;ctx.strokeStyle='rgba(205,222,231,'+(.055+part(i,1)*.08)+')';ctx.lineWidth=.8+part(i,9)*.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+length);ctx.stroke();}
 }else if(kind==='wind'){
  ctx.lineCap='round';
  for(let i=0;i<32;i++){const x=part(i,5)*WIDTH,y=990+part(i,7)*670,h=34+part(i,2)*64,bend=17+Math.sin(t*.7+i*.8)*12;ctx.strokeStyle='rgba(211,191,127,'+(.05+part(i,6)*.075)+')';ctx.lineWidth=.8+part(i,1);ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+bend*.35,y-h*.65,x+bend,y-h);ctx.stroke();}
  glow(ctx,470+Math.sin(t*.18)*130,970,290,'236,222,166',.025+.008*Math.sin(t*.43));
 }else if(kind==='fire'){
  ctx.save();ctx.globalCompositeOperation='screen';
  const warmth=.105+.025*Math.sin(t*1.4)+.016*Math.sin(t*2.1+.8);
  glow(ctx,837,1008,145,'238,106,26',warmth);
  glow(ctx,827,1028,60,'255,172,65',warmth*.9);
  glow(ctx,752,1150,195,'224,91,24',warmth*.3);
  ctx.restore();
 }else if(kind==='forest'){
  const x=590+Math.sin(t*.22)*22;
  const light=ctx.createLinearGradient(x,180,x-230,1160);light.addColorStop(0,'rgba(214,234,165,0)');light.addColorStop(.45,'rgba(214,234,165,'+(.018+.007*Math.sin(t*.39))+')');light.addColorStop(1,'rgba(214,234,165,0)');ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(x,160);ctx.lineTo(x+90,180);ctx.lineTo(x-150,1240);ctx.lineTo(x-360,1200);ctx.closePath();ctx.fill();
  for(let i=0;i<19;i++){const px=100+part(i,1)*740+Math.sin(t*.17+i)*12,py=380+((part(i,4)*830-t*(3+part(i,3)*5))%900+900)%900;ctx.fillStyle='rgba(223,228,170,'+(.045+.035*Math.sin(t*.4+i)**2)+')';ctx.beginPath();ctx.arc(px,py,.8+part(i,6)*1.1,0,Math.PI*2);ctx.fill();}
 }else if(kind==='ocean'){
  ctx.lineCap='round';
  for(let i=0;i<4;i++){const phase=(t*.055+i*.25)%1,y=1020+phase*245;ctx.strokeStyle='rgba(215,237,229,'+(.025+.06*Math.sin(phase*Math.PI))+')';ctx.lineWidth=1.3+phase*1.5;ctx.beginPath();ctx.moveTo(-60,y);ctx.bezierCurveTo(240,y-25,580,y+85,1020,y+230);ctx.stroke();}
  glow(ctx,230,1090,125,'223,232,207',.025+.012*Math.sin(t*.7));
 }
}

export function mountNatureMotion(panel,{doc=document,win=window,isReduced=()=>settings.motion||settings.transitions===false,createContext=canvas=>canvas.getContext('2d',{alpha:true})}={}){
 let disposed=false,failed=false,pageHidden=false,canvas=null,ctx=null,raf=null,kind=null,phase=0,lastTime=null,lastPaint=-Infinity,width=0,height=0,dpr=1;
 const media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const selected=()=>KINDS.has(panel.dataset.nature)?panel.dataset.nature:null;
 const eligible=()=>!disposed&&!failed&&!pageHidden&&!doc.hidden&&doc.visibilityState!=='hidden'&&panel.isConnected&&!panel.hidden&&panel.classList.contains('is-expanded')&&!!selected()&&!media?.matches&&!isReduced();
 const pause=()=>{if(raf!==null)win.cancelAnimationFrame?.(raf);raf=null;lastTime=null;lastPaint=-Infinity;if(canvas)canvas.hidden=true;};
 function size(){const bounds=panel.getBoundingClientRect();if(!Number.isFinite(bounds.width)||!Number.isFinite(bounds.height)||bounds.width<=0||bounds.height<=0)return false;width=bounds.width;height=bounds.height;dpr=Math.min(1.25,Math.max(1,Number(win.devicePixelRatio)||1),Math.sqrt(MAX_PIXELS/(width*height)));const w=Math.max(1,Math.floor(width*dpr)),h=Math.max(1,Math.floor(height*dpr));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;return true;}
 function frame(now){raf=null;if(!eligible()){pause();return;}try{
  if(lastTime!==null)phase+=Math.max(0,Math.min(100,now-lastTime))/1000;lastTime=now;
  if(now-lastPaint>=FRAME_MS){lastPaint=now;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);const scale=Math.max(width/WIDTH,height/HEIGHT);ctx.save();ctx.translate((width-WIDTH*scale)*(kind==='fire'?.7:.5),(height-HEIGHT*scale)*.5);ctx.scale(scale,scale);paintNatureMotion(ctx,kind,phase);ctx.restore();}
  raf=win.requestAnimationFrame(frame);
 }catch{failed=true;pause();canvas?.remove();canvas=null;ctx=null;}}
 function sync(){if(!eligible()){pause();return;}if(typeof win.requestAnimationFrame!=='function')return;
  if(!canvas){canvas=doc.createElement('canvas');canvas.className='quran-nature-motion';canvas.setAttribute('aria-hidden','true');canvas.setAttribute('role','presentation');try{ctx=createContext(canvas);}catch{}if(!ctx){failed=true;canvas=null;return;}panel.prepend(canvas);}
  if(kind!==selected()){kind=selected();phase=0;lastPaint=-Infinity;}
  if(!size()){pause();return;}canvas.hidden=false;if(raf===null)raf=win.requestAnimationFrame(frame);
 }
 const observer=typeof win.MutationObserver==='function'?new win.MutationObserver(sync):null;observer?.observe(panel,{attributes:true,attributeFilter:['class','hidden','data-nature']});
 const resize=typeof win.ResizeObserver==='function'?new win.ResizeObserver(sync):null;resize?.observe(panel);
 const hide=()=>{pageHidden=true;pause();},show=()=>{pageHidden=false;sync();};
 doc.addEventListener('visibilitychange',sync);win.addEventListener('resize',sync);win.addEventListener('pagehide',hide);win.addEventListener('pageshow',show);win.addEventListener('salah:settings-changed',sync);
 if(media?.addEventListener)media.addEventListener('change',sync);else media?.addListener?.(sync);
 sync();
 return{sync,destroy(){if(disposed)return;disposed=true;pause();observer?.disconnect();resize?.disconnect();doc.removeEventListener('visibilitychange',sync);win.removeEventListener('resize',sync);win.removeEventListener('pagehide',hide);win.removeEventListener('pageshow',show);win.removeEventListener('salah:settings-changed',sync);if(media?.removeEventListener)media.removeEventListener('change',sync);else media?.removeListener?.(sync);if(canvas){canvas.width=1;canvas.height=1;canvas.remove();}canvas=null;ctx=null;}};
}
