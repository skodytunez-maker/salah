import{SKY_MATTE_ATLAS}from './sky-matte-data.js';
import{SKY_CLOCK_MATTE_ATLAS}from './sky-clock-matte-data.js';

const assetRoot=new URL('../',import.meta.url),MAX_PIXELS=2097152,MAX_DIMENSION=2048;
const invalid=reason=>({valid:false,reason,dayFG:null,nightFG:null,dayMetrics:null,nightMetrics:null,dispose(){}});
const abort=signal=>{if(signal?.aborted)throw Error('aborted');};

// Match only the application's known immutable source paths. In particular,
// capacitor/file URLs with origin="null" must still match protocol AND host.
export function skyMatteEntry(source){
 try{
  if(typeof source!=='string'||!source)return null;
  const url=new URL(source,assetRoot);
  if(url.protocol!==assetRoot.protocol||url.host!==assetRoot.host||!url.pathname.startsWith(assetRoot.pathname))return null;
  const key=url.pathname.slice(assetRoot.pathname.length);
  return Object.hasOwn(SKY_MATTE_ATLAS,key)?{key,entry:SKY_MATTE_ATLAS[key]}:Object.hasOwn(SKY_CLOCK_MATTE_ATLAS,key)?{key,entry:SKY_CLOCK_MATTE_ATLAS[key]}:null;
 }catch{return null;}
}

// The atlas stores foreground bits, including disconnected leaves, window
// frames and bridge stays. Decoding never guesses sky from the current image.
export function decodeForegroundAlpha(entry){
 if(!entry||!Number.isInteger(entry.maskWidth)||!Number.isInteger(entry.maskHeight)||entry.maskWidth<1||entry.maskHeight<1||entry.maskWidth>MAX_DIMENSION||entry.maskHeight>MAX_DIMENSION||entry.maskWidth*entry.maskHeight>MAX_PIXELS||(entry.start!==0&&entry.start!==1)||typeof entry.runs!=='string'||entry.runs.length>1000000)throw Error('invalid-matte');
 const size=entry.maskWidth*entry.maskHeight,alpha=new Uint8ClampedArray(size);let offset=0,value=entry.start;
 for(const token of entry.runs.split('.')){
  if(!/^[0-9a-z]{1,5}$/.test(token))throw Error('invalid-matte');
  const count=parseInt(token,36);
  if(count<1||offset+count>size)throw Error('invalid-matte');
  if(value)alpha.fill(255,offset,offset+count);
  offset+=count;value=1-value;
 }
 if(offset!==size)throw Error('invalid-matte');
 return alpha;
}

function sourceMatches(image,entry){
 const width=image?.naturalWidth??image?.width,height=image?.naturalHeight??image?.height;
 return image?.complete!==false&&width===entry.width&&height===entry.height;
}

function makeForeground(found,image,{canvasFactory,maxDimension,signal}){
 abort(signal);const{entry,key}=found,scale=Math.min(1,maxDimension/Math.max(entry.width,entry.height));
 const width=Math.max(1,Math.round(entry.width*scale)),height=Math.max(1,Math.round(entry.height*scale));
 let foreground=null,mask=null;
 try{
  const alpha=decodeForegroundAlpha(entry);abort(signal);
  foreground=canvasFactory(width,height);if(!foreground)throw Error('canvas-unavailable');foreground.width=width;foreground.height=height;
  mask=canvasFactory(entry.maskWidth,entry.maskHeight);if(!mask||mask===foreground)throw Error('canvas-unavailable');mask.width=entry.maskWidth;mask.height=entry.maskHeight;
  const context=foreground.getContext('2d'),maskContext=mask.getContext('2d');
  if(!context||!maskContext)throw Error('canvas-unavailable');
  const pixels=maskContext.createImageData(entry.maskWidth,entry.maskHeight);
  for(let i=0;i<alpha.length;i++){const p=i*4;pixels.data[p]=pixels.data[p+1]=pixels.data[p+2]=255;pixels.data[p+3]=alpha[i];}
  maskContext.putImageData(pixels,0,0);abort(signal);
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,0,0,width,height);
  context.globalCompositeOperation='destination-in';context.drawImage(mask,0,0,width,height);context.globalCompositeOperation='source-over';abort(signal);
  return{canvas:foreground,metrics:Object.freeze({sourceKey:key,sourceSha256:entry.sourceSha256,sourceWidth:entry.width,sourceHeight:entry.height,width,height,scale,horizonY:Math.min(height,entry.horizonY*height/entry.height)})};
 }catch(error){if(foreground){foreground.width=foreground.height=0;}throw error;}
 finally{if(mask){mask.width=mask.height=0;}}
}

// A pair commits atomically. Missing/unknown/corrupt sources keep their complete
// original photograph; callers must never enable opaque sky from a coarse mask.
export async function loadSkyMattes({dayURL,nightURL,dayImage,nightImage,signal,canvasFactory=()=>document.createElement('canvas'),maxDimension=1536}={}){
 const day=skyMatteEntry(dayURL),night=skyMatteEntry(nightURL);
 if(!day||!night)return invalid('unknown-source');
 if(!sourceMatches(dayImage,day.entry)||!sourceMatches(nightImage,night.entry))return invalid('source-dimensions');
 if(!Number.isFinite(maxDimension)||maxDimension<128)return invalid('canvas-bound');
 maxDimension=Math.min(MAX_DIMENSION,Math.floor(maxDimension));
 let first=null,second=null;
 try{
  abort(signal);first=makeForeground(day,dayImage,{canvasFactory,maxDimension,signal});
  await Promise.resolve();abort(signal);
  second=makeForeground(night,nightImage,{canvasFactory,maxDimension,signal});abort(signal);
  let disposed=false;
  return{valid:true,dayFG:first.canvas,nightFG:second.canvas,dayMetrics:first.metrics,nightMetrics:second.metrics,dispose(){if(disposed)return;disposed=true;first.canvas.width=first.canvas.height=second.canvas.width=second.canvas.height=0;}};
 }catch(error){for(const part of[first,second])if(part){part.canvas.width=part.canvas.height=0;}return invalid(error?.message==='aborted'?'aborted':'canvas-unavailable');}
}
