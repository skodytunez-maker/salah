import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{createHash}from 'node:crypto';
import{SKY_MATTE_ATLAS,SKY_MATTE_VERSION}from '../dist/js/sky-matte-data.js';
import{skyMatteEntry,decodeForegroundAlpha,loadSkyMattes}from '../dist/js/sky-matte.js';

const hash=value=>createHash('sha256').update(value).digest('hex'),dist=new URL('../dist/',import.meta.url);
const catalog=JSON.parse(await readFile(new URL('wallpapers/catalog.json',dist),'utf8')),expected=new Set();
for(const city of catalog.cities)for(const entry of[city,city.tablet].filter(Boolean))for(const phase of['day','night'])expected.add(entry[phase]);
for(const key of['assets/day-mosque.webp','assets/night-mosque.webp','assets/window-new-york-day.webp','assets/window-new-york-night.webp','assets/window-new-york-day-tablet-v1.webp','assets/window-new-york-night-tablet-v1.webp'])expected.add(key);
assert.equal(SKY_MATTE_VERSION,1);assert.equal(expected.size,63);assert.deepEqual(Object.keys(SKY_MATTE_ATLAS).sort(),[...expected].sort(),'Every offered source, including wide variants, has its own reviewed matte');
function webpSize(bytes){
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 for(let offset=12;offset+8<=bytes.length;){const tag=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),p=offset+8;
  if(tag==='VP8X')return[1+bytes.readUIntLE(p+4,3),1+bytes.readUIntLE(p+7,3)];
  if(tag==='VP8L'){const n=bytes.readUInt32LE(p+1);return[(n&0x3fff)+1,((n>>>14)&0x3fff)+1];}
  if(tag==='VP8 '){assert.equal(bytes.toString('hex',p+3,p+6),'9d012a');return[bytes.readUInt16LE(p+6)&0x3fff,bytes.readUInt16LE(p+8)&0x3fff];}
  offset=p+size+(size&1);
 }throw Error('Missing WebP dimensions');
}
const masks=new Map();let sourceBytes=0;
for(const[key,entry]of Object.entries(SKY_MATTE_ATLAS)){
 const source=await readFile(new URL(key,dist));sourceBytes+=source.length;
 assert.equal(hash(source),entry.sourceSha256,key+' source bytes stay unchanged');assert.deepEqual(webpSize(source),[entry.width,entry.height]);
 assert.equal(entry.maskWidth,entry.width);assert.equal(entry.maskHeight,entry.height);
 const alpha=decodeForegroundAlpha(entry);assert.equal(alpha.length,entry.width*entry.height);assert.equal(hash(alpha.map(x=>x/255)),entry.maskSha256,key+' native foreground bits match the reviewed matte');
 let foreground=0,lastSky=0;for(let i=0;i<alpha.length;i++){if(alpha[i])foreground++;else lastSky=Math.floor(i/entry.width)+1;}
 assert.ok(foreground>alpha.length*.02&&foreground<alpha.length*.99,key+' keeps meaningful foreground and sky');assert.equal(entry.horizonY,lastSky);masks.set(key,alpha);
 assert.equal(skyMatteEntry('./'+key).key,key);assert.equal(skyMatteEntry(new URL(key,dist).href).key,key);
}
const pixel=(key,x,y)=>masks.get(key)[y*SKY_MATTE_ATLAS[key].width+x];
// These are independently inspected ORIGINAL-source coordinates, not rectangle
// bounds inferred from the old body masks. They reproduce v3's actual losses.
for(const phase of['day','night']){
 const key=`wallpapers/afghanistan/afghanistan-${phase}-final.webp`;
 for(const[x,y]of[[20,20],[60,80],[100,180],[180,30],[20,350],[220,500]])assert.equal(pixel(key,x,y),255,'Overhanging leaf/branch remains foreground');
 for(const[x,y]of[[200,100],[250,100],[150,300],[50,600]])assert.equal(pixel(key,x,y),0,'Real holes between leaves remain open sky');
}
for(const phase of['day-tablet-v1','night-tablet-v2']){
 const key=`wallpapers/tyumen/${phase}.webp`;
 for(const[x,y]of[[1000,400],[900,440],[1100,450],[1050,430]])assert.equal(pixel(key,x,y),0,'Sky UNDER the bridge fan is not a solid foreground wedge');
 for(const[x,y]of[[1000,456],[1149,350]])assert.equal(pixel(key,x,y),255,'Native cable/pylon remains foreground');
}
assert.equal(pixel('wallpapers/tyumen/day-v1.webp',500,838),255,'Portrait bridge stays are retained independently from the wide night source');
for(const[x,y]of[[200,580],[400,550],[800,500],[510,550]])assert.equal(pixel('assets/night-mosque.webp',x,y),255,'Night mountain ridge is connected foreground');
for(const[x,y]of[[200,560],[400,510],[800,460],[510,540]])assert.equal(pixel('assets/night-mosque.webp',x,y),0,'Sky above the actual ridge has no leftover sky fragments');
for(let y=128;y<=205;y++)for(let x=1200;x<=1260;x++)assert.equal(pixel('assets/night-mosque.webp',x,y),0,'The original painted crescent is sky, so unified foreground cannot retain a second baked Moon');
for(const phase of['day','night']){
 const key=`wallpapers/derbent/${phase}-v1.webp`;
 for(const[x,y]of[[100,1040],[400,1060],[800,1080]])assert.equal(pixel(key,x,y),255,'Caspian Sea water remains original foreground, even where blue water touches blue sky');
 for(const[x,y]of[[100,980],[400,980],[800,980]])assert.equal(pixel(key,x,y),0,'The real sky above the photographic sea horizon stays open');
}

// Native Al-Aqsa night-source roof samples. The former phone alpha retained a
// detached blue-sky arc while cutting the real left dome; the wide alpha also
// kept a blue rim outside the photographed silhouette. Midday/night blending
// must not manufacture a second outline from those pixels.
const aqsaPhone='wallpapers/al-aqsa/night-phone-v1.webp',aqsaWide='wallpapers/al-aqsa/night-v1.webp';
for(const[x,y]of[[370,1005],[375,994],[866,490]])assert.equal(pixel(x>600?aqsaWide:aqsaPhone,x,y),0,'Source-inspected sky outside the night dome stays transparent');
for(const[x,y]of[[390,982],[395,980],[400,980],[866,500]])assert.equal(pixel(x>600?aqsaWide:aqsaPhone,x,y),255,'The actual night metal roof remains opaque and connected');
for(const[key,columns,base]of[[aqsaPhone,[[370,1006],[390,980],[415,965],[455,973],[480,1001]],1034],[aqsaWide,[[674,491],[714,445],[754,426],[826,445],[866,494]],529]])for(const[x,edge]of columns){
 assert.equal(pixel(key,x,edge-1),0,'The selected native roof edge has no outer sky fringe');
 for(let y=edge;y<=base;y++)assert.equal(pixel(key,x,y),255,'A night roof column has one real boundary and no cut-out strip');
}
// Independently reviewed photographs distinguish pale/snowy outer ridges from
// their sky and from stronger mountain layers behind them. These coordinates
// reproduced missing real rock/snow and floating fragments in the old atlas.
for(const[key,rock,sky]of[
 ['wallpapers/khujand/day-v1.webp',[125,992],[723,911]],
 ['wallpapers/khujand/night-v1.webp',[87,999],[213,936]],
 ['wallpapers/khujand/day-tablet-v1.webp',[263,469],[1292,369]],
 ['wallpapers/khujand/night-tablet-v1.webp',[276,465],[1296,367]],
 ['wallpapers/almaty/day-v1.webp',[335,1085],[586,1069]],
 ['wallpapers/almaty/night-v1.webp',[485,1101],[585,1071]],
 ['wallpapers/pamir/day-v1.webp',[4,916],[99,848]],
 ['wallpapers/pamir/night-v1.webp',[345,895],[208,860]]
]){
 assert.equal(pixel(key,...rock),255,key+' retains the actual outer mountain, including pale and snowy parts');
 assert.equal(pixel(key,...sky),0,key+' does not retain detached old-sky strips above the physical ridge');
}
for(const[key,points]of[
 ['wallpapers/kaspiysk/day-v1.webp',[[500,992],[510,997],[520,1004]]],
 ['wallpapers/moscow/day-v1.webp',[[481,1068],[485,1070],[489,1072]]]
])for(const[x,y]of points)assert.equal(pixel(key,x,y),255,key+' retains the source-inspected bright outer dome shoulder');
assert.equal(pixel('wallpapers/kaspiysk/day-v1.webp',500,980),0,'Sky above the actual white dome is still transparent');
assert.equal(pixel('wallpapers/moscow/day-v1.webp',510,1080),0,'Sky above the actual golden dome is still transparent');

for(const source of['https://other.invalid/assets/day-mosque.webp','data:image/png,anything','blob:fixture','../private.webp','./assets/unknown.webp','file://other-host/'+new URL('assets/day-mosque.webp',dist).pathname])assert.equal(skyMatteEntry(source),null,'Unknown/cross-host URLs never acquire an opaque sky');
for(const bad of[{...SKY_MATTE_ATLAS['assets/day-mosque.webp'],runs:'0'},{...SKY_MATTE_ATLAS['assets/day-mosque.webp'],runs:'zzzzz'},{...SKY_MATTE_ATLAS['assets/day-mosque.webp'],runs:'1'},{maskWidth:999999,maskHeight:999999,start:0,runs:'1'}])assert.throws(()=>decodeForegroundAlpha(bad),/invalid-matte/);

// A small software canvas exercises actual alpha compositing/independent source
// dimensions without a browser/GPU or downloading images in the test runner.
class PixelCanvas{
 width=0;height=0;pixels=null;globalCompositeOperation='source-over';
 getContext(){return this;}
 createImageData(width,height){return{width,height,data:new Uint8ClampedArray(width*height*4)};}
 putImageData(data){this.pixels=data.data;}
 drawImage(source,_x,_y,width,height){
  const pixels=this.pixels||new Uint8ClampedArray(this.width*this.height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const p=(y*this.width+x)*4;
   if(source instanceof PixelCanvas){const q=(Math.min(source.height-1,Math.floor(y*source.height/height))*source.width+Math.min(source.width-1,Math.floor(x*source.width/width)))*4;assert.equal(this.globalCompositeOperation,'destination-in');pixels[p+3]=Math.round(pixels[p+3]*source.pixels[q+3]/255);if(!pixels[p+3])pixels.fill(0,p,p+4);}
   else pixels.set(source.color,p);
  }this.pixels=pixels;
 }
}
const made=[],factory=()=>{const canvas=new PixelCanvas();made.push(canvas);return canvas;},image=key=>({naturalWidth:SKY_MATTE_ATLAS[key].width,naturalHeight:SKY_MATTE_ATLAS[key].height,complete:true,color:[37,83,141,255]});
const dayKey='wallpapers/tyumen/day-v1.webp',nightKey='wallpapers/tyumen/night-tablet-v2.webp',args={dayURL:dayKey,nightURL:nightKey,dayImage:image(dayKey),nightImage:image(nightKey),canvasFactory:factory,maxDimension:128};
let requests=0;const fetchBefore=globalThis.fetch;globalThis.fetch=async()=>{requests++;throw Error('No matte request allowed');};
try{
 const pair=await loadSkyMattes(args);assert.equal(pair.valid,true);assert.equal(made.length,4,'Only the selected two mattes and two foreground canvases are allocated');
 assert.deepEqual([pair.dayFG.width,pair.dayFG.height],[59,128]);assert.deepEqual([pair.nightFG.width,pair.nightFG.height],[128,85],'Day/night retain their own source geometry');
 for(const[canvas,key,metrics]of[[pair.dayFG,dayKey,pair.dayMetrics],[pair.nightFG,nightKey,pair.nightMetrics]]){
  assert.equal(metrics.sourceKey,key);assert.ok(metrics.horizonY>0&&metrics.horizonY<=canvas.height);
  for(const[x,y]of[[2,2],[Math.floor(canvas.width/2),Math.floor(canvas.height*.9)]]){
   const sx=Math.floor(x*SKY_MATTE_ATLAS[key].width/canvas.width),sy=Math.floor(y*SKY_MATTE_ATLAS[key].height/canvas.height),alpha=pixel(key,sx,sy),p=(y*canvas.width+x)*4;
   assert.equal(canvas.pixels[p+3],alpha);assert.deepEqual([...canvas.pixels.slice(p,p+4)],alpha?[37,83,141,255]:[0,0,0,0],'FG keeps source color; SKY becomes transparent');
  }
 }
 assert.ok(made.filter(x=>x!==pair.dayFG&&x!==pair.nightFG).every(x=>x.width===0&&x.height===0),'Temporary native mask canvases are released');pair.dispose();pair.dispose();assert.ok(made.every(x=>x.width===0&&x.height===0));
 const before=made.length;assert.equal((await loadSkyMattes({...args,dayURL:'./assets/unknown.webp'})).valid,false);assert.equal((await loadSkyMattes({...args,nightImage:{...image(nightKey),naturalHeight:1}})).valid,false);assert.equal((await loadSkyMattes({...args,dayImage:{...image(dayKey),complete:false}})).valid,false);assert.equal(made.length,before,'Bad sources are rejected before canvas allocation');
 const controller=new AbortController();queueMicrotask(()=>controller.abort());const cancelled=await loadSkyMattes({...args,signal:controller.signal});assert.equal(cancelled.valid,false);assert.equal(cancelled.reason,'aborted');assert.ok(made.every(x=>x.width===0&&x.height===0),'Abort between pair phases releases the first FG and cannot commit a partial pair');
 let calls=0;const failure=await loadSkyMattes({...args,canvasFactory:()=>{if(++calls===3)throw Error('GPU unavailable');return factory();}});assert.equal(failure.valid,false);assert.ok(made.every(x=>x.width===0&&x.height===0),'Late canvas failure releases the completed first FG');
 assert.equal(requests,0,'Offline mattes use bundled data and no network/model');
}finally{globalThis.fetch=fetchBefore;}
console.log(`PASS: ${expected.size} immutable source mattes (${sourceBytes} source bytes), native contour regressions, independent pair alpha/geometry, offline/abort/failure disposal.`);
