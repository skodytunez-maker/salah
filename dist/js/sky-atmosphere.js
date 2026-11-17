// A local, DOM-independent sky painter. The caller owns time, astronomy,
// decoded photographic texture, accurate architectural matte and lifecycle.
// Coordinates are pixels; motionTime is seconds. No I/O, storage or timers.
const DAY=86400000,TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=(a,b,t)=>a+(b-a)*t;
const rgbMix=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const rgb=a=>'rgb('+a.map(v=>Math.round(clamp(v,0,255))).join(',')+')';
function hash(day,place,channel){let x=Math.imul(day|0,374761393)^Math.imul(place|0,668265263)^Math.imul(channel+1,982451653);x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967295;}

// Two adjacent daily styles meet exactly at midnight, including their first
// derivative. Solar longitude supplies a timezone-independent local day here;
// this is visual variation, never a civil calendar or prayer-time calculation.
export function skyAtmosphereStyle(frame={}){
 const instant=finite(frame.instant),latitude=clamp(finite(frame.latitude),-90,90),longitude=clamp(finite(frame.longitude),-180,180);
 const solarDay=instant/DAY+longitude/360,index=Math.floor(solarDay),fraction=solarDay-index,t=smooth(fraction);
 const place=Math.imul(Math.round(latitude*100),4099)^Math.round(longitude*100);
 const seed=channel=>mix(hash(index,place,channel),hash(index+1,place,channel),t);
 const clouds=clamp(finite(frame.clouds)),fog=clamp(finite(frame.fog)),day=clamp(finite(frame.day));
 const altitude=finite(frame.sun?.altitude,-30);
 const warmth=smooth((altitude+9)/7)*(1-smooth((altitude-3)/11));
 // Elevated sky/clouds retain scattered light while the photographed ground
 // is already subdued. Explicit day0/day1 lighting choices remain endpoints.
 const skyLight=day+(1-day)*.30*smooth(day/.15);
 // No separate red horizon band: all weather palettes form one colour field.
 const blueShift=(seed(0)-.5)*9,gray=smooth((clouds-.12)/.86);
 let zenith=rgbMix([4,10,24],[32+blueShift,101+blueShift*.35,169+blueShift*.2],skyLight);
 let middle=rgbMix([8,16,32],[92+blueShift,153,198],skyLight);
 let horizon=rgbMix([12,21,38],[163,191,208],skyLight);
 zenith=rgbMix(zenith,rgbMix([9,15,25],[106,119,134],skyLight),gray*.87);
 middle=rgbMix(middle,rgbMix([13,20,31],[139,150,163],skyLight),gray*.9);
 horizon=rgbMix(horizon,rgbMix([17,25,37],[175,180,184],skyLight),gray*.9);
 const fogColor=rgbMix([18,25,38],[165,174,183],skyLight);
 zenith=rgbMix(zenith,fogColor,fog*.86);middle=rgbMix(middle,fogColor,fog*.9);horizon=rgbMix(horizon,fogColor,fog*.94);
 const warmColor=rgbMix([255,173,88],[246,133,158],seed(9)),warmStrength=warmth*(1-fog)*(1-clouds*.72);
 // A daily gold/rose family spreads gently through the same continuous sky
 // field; its stronger light remains directional around the low Sun.
 zenith=rgbMix(zenith,warmColor,warmStrength*.012);middle=rgbMix(middle,warmColor,warmStrength*.045);horizon=rgbMix(horizon,warmColor,warmStrength*.065);
 return {styleKey:index+':'+place,day,skyLight,clouds,fog,warmth,zenith,middle,horizon,
  cropX:seed(1)*1.6,cropY:seed(2)*.5,scale:mix(.88,1.25,seed(3)),
  layerMix:mix(.22,.40,seed(4)),phase:seed(5)*TAU,
  // Positive base advection is continuous. The daily wind perturbation has
  // zero net displacement at the day boundary, avoiding a reset or teleport.
  windOffset:(seed(6)-.5)*.075*Math.sin(Math.PI*fraction)**2,
  windSpeed:.0014+hash(0,place,7)*.0005,
  warmColor,glowStrength:mix(.30,.52,seed(10)),edgeWarmth:mix(.66,1.12,seed(8)),lightStrength:mix(.65,1.35,seed(11))};
}

export function createSkyAtmosphere({canvasFactory,texture=null}={}){
 if(typeof canvasFactory!=='function')throw new TypeError('A canvasFactory is required');
 let disposed=false,textureReference=null,textureWidth=0,textureHeight=0,map=null,sourceReady=false;
 let sourceCanvas=null,fieldCanvas=null,fieldImage=null,fw=0,fh=0;
 const MAX_SOURCE_W=256,MAX_FIELD_W=224,MAX_FIELD_H=272;
 function setTexture(image){
  if(disposed)return false;
  const width=finite(Number.isFinite(image?.naturalWidth)?image.naturalWidth:image?.width),height=finite(Number.isFinite(image?.naturalHeight)?image.naturalHeight:image?.height);
  if(image===textureReference&&width===textureWidth&&height===textureHeight)return sourceReady;
  textureReference=image;textureWidth=width;textureHeight=height;sourceReady=false;map=null;
  if(!image||width<=0||height<=0)return false;
  const w=Math.min(MAX_SOURCE_W,Math.max(2,Math.round(width))),h=Math.max(2,Math.min(256,Math.round(w*height/width)));
  try{
   sourceCanvas??=canvasFactory(w,h);sourceCanvas.width=w;sourceCanvas.height=h;
   const c=sourceCanvas.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,w,h);c.drawImage(image,0,0,w,h);
   const data=c.getImageData(0,0,w,h).data,original=new Float32Array(w*h);
   for(let i=0;i<original.length;i++){const p=i*4;original[i]=(data[p]*.2126+data[p+1]*.7152+data[p+2]*.0722)/255;}
   // Overlap-add the photograph's far edge into its first20%. No reflection:
   // every cloud feature keeps its original orientation across a tile wrap.
   // This four-source blend happens ONCE when the decoded texture changes.
   const tw=Math.max(2,Math.floor(w*.8)),th=Math.max(2,Math.floor(h*.8)),ox=w-tw,oy=h-th;
   const light=new Float32Array(tw*th),histogram=new Uint32Array(256),ranks=new Float32Array(tw*th);
   for(let y=0;y<th;y++)for(let x=0;x<tw;x++){
    const wx=x<ox?smooth(x/ox):1,wy=y<oy?smooth(y/oy):1,x2=x<ox?x+tw:x,y2=y<oy?y+th:y;
    const value=mix(mix(original[y2*w+x2],original[y2*w+x],wx),mix(original[y*w+x2],original[y*w+x],wx),wy);
    light[y*tw+x]=value;histogram[Math.min(255,Math.floor((1-value)*255))]++;
   }
   const cdf=new Float32Array(256);let sum=0;for(let i=0;i<256;i++){sum+=histogram[i];cdf[i]=sum/light.length;}
   for(let i=0;i<light.length;i++)ranks[i]=cdf[Math.min(255,Math.floor((1-light[i])*255))];
   // Cache photographic surface gradients along with the density/light data.
   // Rendering makes just two bilinear field lookups, not extra shifted images.
   const field=new Float32Array(tw*th*4);
   for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const i=y*tw+x,p=i*4;field[p]=ranks[i];field[p+1]=light[i];field[p+2]=(ranks[y*tw+(x+1)%tw]-ranks[y*tw+(x+tw-1)%tw])*tw*.5;field[p+3]=(ranks[((y+1)%th)*tw+x]-ranks[((y+th-1)%th)*tw+x])*th*.5;}
   map={w:tw,h:th,field};sourceReady=true;
  }catch{map=null;sourceReady=false;}
  return sourceReady;
 }
 setTexture(texture);
 const wrap=v=>((v%1)+1)%1;
 function sample(u,v){
  const x=wrap(u)*map.w,y=wrap(v)*map.h,ix=x|0,iy=y|0,fx=x-ix,fy=y-iy,x1=(ix+1)%map.w,y1=(iy+1)%map.h;
  const a=(iy*map.w+ix)*4,b=(iy*map.w+x1)*4,c=(y1*map.w+ix)*4,d=(y1*map.w+x1)*4;
  const wa=(1-fx)*(1-fy),wb=fx*(1-fy),wc=(1-fx)*fy,wd=fx*fy,f=map.field;
  return{rank:f[a]*wa+f[b]*wb+f[c]*wc+f[d]*wd,light:f[a+1]*wa+f[b+1]*wb+f[c+1]*wc+f[d+1]*wd,
   gx:f[a+2]*wa+f[b+2]*wb+f[c+2]*wc+f[d+2]*wd,gy:f[a+3]*wa+f[b+3]*wb+f[c+3]*wc+f[d+3]*wd};
 }
 function fieldAt(u,v,style,motion,aspect){
  const drift=motion*style.windSpeed+style.windOffset;
  // Scale photographic features from viewport width, then crop vertically.
  // A narrow visible sky must show a narrow crop, not the entire photograph
  // squashed into a horizontal ribbon. Both flow layers preserve source aspect.
  const frequency=style.scale*.95,verticalRange=frequency/aspect*(map.w/map.h);
  const aU=u*frequency+style.cropX+drift,aV=v*verticalRange+style.cropY;
  const bU=u*frequency*.71+style.cropX*.6+.48+drift*.63,bV=v*verticalRange*.71+style.cropY*.7+.41+Math.sin(motion*.003+style.phase)*.025;
  const weight=style.layerMix+Math.sin(motion*.004+style.phase)*.035;
  const a=sample(aU,aV),b=sample(bU,bV);
  return {rank:mix(a.rank,b.rank,weight),light:mix(a.light,b.light,weight),gx:mix(a.gx,b.gx*.71,weight),gy:mix(a.gy,b.gy*.71,weight)};
 }
 function densityAt(u,v,style,motion,aspect){
  if(!map||style.clouds===0)return{alpha:0,light:.6,gx:0,gy:0};
  const f=fieldAt(u,v,style,motion,aspect);
  // A continuous optical-depth field keeps photographic cloud wisps. Hard
  // thresholding a photograph would create flat cut-out islands and rims.
  const exponent=clamp((1-style.clouds)/Math.max(.001,style.clouds),.01,32);
  return{alpha:style.clouds===1?1:Math.pow(clamp(f.rank),exponent),light:f.light,gx:f.gx,gy:f.gy};
 }
 function visibility(body,style,motion,width,skyHeight){
  if(style.fog>=.78||style.clouds>=.94)return 0;
  const fogVisibility=1-smooth((style.fog-.08)/.70);
  if(!body||!Number.isFinite(body.x)||!Number.isFinite(body.y)||!map)return fogVisibility;
  // Average a small disc neighbourhood: crossing a photographed cloud edge
  // attenuates the body continuously rather than flashing at a single pixel.
  let density=0;const radius=Math.max(2,Math.min(width,skyHeight)*.014);
  for(const [x,y]of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])density+=densityAt((body.x+x*radius)/width,(body.y+y*radius)/skyHeight,style,motion,width/skyHeight).alpha;
  return fogVisibility*(1-smooth((density/5-.08)/.84));
 }
 function prepare(canvas,width,height){
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const c=canvas.getContext('2d');c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.clearRect(0,0,width,height);return c;
 }
 function render(frame={}){
  if(disposed)return{sourceReady:false,skyVisibility:0,discVisibility:0,moonVisibility:0,styleKey:null};
  const width=Math.max(1,Math.min(4096,Math.round(finite(frame.width,1)))),height=Math.max(1,Math.min(4096,Math.round(finite(frame.height,1))));
  const skyHeight=clamp(finite(frame.horizonY,height),1,height),style=skyAtmosphereStyle(frame),motion=finite(frame.motionTime);
  if(!frame.skyCanvas||!frame.cloudCanvas)throw new TypeError('Two output canvases are required');
  const sky=prepare(frame.skyCanvas,width,height),cloud=prepare(frame.cloudCanvas,width,height);
  const gradient=sky.createLinearGradient(0,0,0,skyHeight);
  gradient.addColorStop(0,rgb(style.zenith));gradient.addColorStop(.54,rgb(style.middle));gradient.addColorStop(1,rgb(style.horizon));
  sky.fillStyle=gradient;sky.fillRect(0,0,width,height);
  const sun=frame.sun,altitude=finite(sun?.altitude,-30);
  if(sun&&Number.isFinite(sun.x)&&style.warmth>0&&style.fog<.75){
   // One directional volume of scattered light, never a horizontal red strip.
   const glow=style.warmth*(1-style.clouds*.76)*(1-style.fog)*style.glowStrength*style.lightStrength;
   const y=skyHeight*1.04,rx=Math.max(24,width*.82),ry=Math.max(24,skyHeight*.60);
   sky.save();sky.translate(sun.x,y);sky.scale(rx,ry);
   const g=sky.createRadialGradient(0,0,0,0,0,1);
   const color=style.warmColor.map(Math.round).join(',');g.addColorStop(0,'rgba('+color+','+glow+')');g.addColorStop(.55,'rgba('+color+','+glow*.3+')');g.addColorStop(1,'rgba('+color+',0)');
   sky.fillStyle=g;sky.fillRect(-sun.x/rx,-y/ry,width/rx,skyHeight/ry);sky.restore();
  }
  if(sourceReady&&style.clouds>0){
   const nextW=Math.min(MAX_FIELD_W,width),nextH=Math.min(MAX_FIELD_H,Math.max(8,Math.round(nextW*skyHeight/width)));
   fieldCanvas??=canvasFactory(nextW,nextH);
   if(nextW!==fw||nextH!==fh){fw=nextW;fh=nextH;fieldCanvas.width=fw;fieldCanvas.height=fh;fieldImage=fieldCanvas.getContext('2d').createImageData(fw,fh);}
   const data=fieldImage.data,aspect=width/skyHeight;
   // A little diffuse blue night ambient keeps opaque clouds readable. This
   // vanishes before ordinary twilight/daylight and never changes body gates.
   const nightRelief=1-smooth(style.skyLight/.16),light=clamp(style.skyLight*.88+.075+nightRelief*.04);
   const warmLuma=style.warmColor[0]*.2126+style.warmColor[1]*.7152+style.warmColor[2]*.0722,warmRGB=style.warmColor.map(c=>c/warmLuma);
   for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){
    const u=x/(fw-1||1),v=y/(fh-1||1),f=densityAt(u,v,style,motion,aspect),i=(y*fw+x)*4;
    const dx=sun?finite(sun.x)/width-u:0,dy=sun?finite(sun.y)/skyHeight-v:1-v;
    // A light vector and cached photographic density gradients identify lit
    // cloud faces. The lighting is genuinely2-D, not a vertical colour column.
    const lx=dx*.75,ly=dy*.85,lz=.42,ll=Math.hypot(lx,ly,lz),nx=-f.gx*.055,ny=-f.gy*.055,nz=.7,nl=Math.hypot(nx,ny,nz);
    const face=clamp((nx*lx+ny*ly+nz*lz)/(nl*ll)),volume=Math.exp(-((dx/.9)**2+(dy/1.35)**2)*.55);
    // Thin, illuminated cloud edges retain a little high-cloud afterglow
    // while the surface is already dark. Thick interiors remain neutral.
    const edge=4*f.alpha*(1-f.alpha),afterglow=style.warmth*volume*(.62+.38*(1-v));
    const litShape=(edge*.55+.45*(.35+.65*f.light))*face,denseShade=1-smooth((style.clouds-.83)/.11);
    const warm=clamp(afterglow*litShape*style.edgeWarmth*style.lightStrength*(1-style.fog)*(1-style.clouds*.40)*denseShade);
    const luminance=(45+f.light*200)*light+edge*face*style.skyLight*18+afterglow*litShape*46*style.lightStrength*(1-style.fog)*(1-style.clouds*.55)*denseShade;
    data[i]=clamp(luminance*mix(.96,warmRGB[0],warm)+nightRelief*2,0,255);data[i+1]=clamp(luminance*mix(.99,warmRGB[1],warm)+nightRelief*5,0,255);data[i+2]=clamp(luminance*mix(1.045,warmRGB[2],warm)+nightRelief*10,0,255);
    data[i+3]=Math.round(f.alpha*255*(1-style.fog*.3));
   }
   fieldCanvas.getContext('2d').putImageData(fieldImage,0,0);cloud.imageSmoothingEnabled=true;cloud.drawImage(fieldCanvas,0,0,width,skyHeight);
  }
  // Fog belongs inside the sky matte, never across the photo foreground.
  if(style.fog>0){cloud.fillStyle='rgba('+rgbMix([22,29,41],[165,174,183],style.day).map(Math.round).join(',')+','+style.fog*.91+')';cloud.fillRect(0,0,width,skyHeight);}
  // discVisibility/moonVisibility are diagnostic local transmissions. Do not
  // multiply them into a body that is already drawn below this alpha layer.
  // skyVisibility is the sole global policy gate for those layered consumers.
  return{sourceReady,skyVisibility:style.fog>=.78||style.clouds>=.94?0:1,discVisibility:visibility(sun,style,motion,width,skyHeight),moonVisibility:visibility(frame.moon,style,motion,width,skyHeight),
   styleKey:style.styleKey,cloudDensity:style.clouds,style,width,height,skyHeight,solarAltitude:altitude};
 }
 function dispose(){disposed=true;textureReference=null;map=null;fieldImage=null;sourceReady=false;if(sourceCanvas){sourceCanvas.width=0;sourceCanvas.height=0;}if(fieldCanvas){fieldCanvas.width=0;fieldCanvas.height=0;}sourceCanvas=null;fieldCanvas=null;}
 return{render,setTexture,dispose};
}
