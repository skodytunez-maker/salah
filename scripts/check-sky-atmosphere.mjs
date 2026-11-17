import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSkyAtmosphere,skyAtmosphereStyle} from '../dist/js/sky-atmosphere.js';

// A controlled photographed-light field exercises actual density extraction,
// flow, local occlusion and cache lifetimes without a browser or native addon.
let reads=0,allocations=0;
class Context{
 constructor(){this.calls=[];this.pixels=null;}
 save(){}restore(){}translate(){}scale(){}
 setTransform(){}clearRect(){this.calls=[];this.pixels=null;}
 createLinearGradient(...points){return{points,stops:[],addColorStop(p,c){this.stops.push([p,c]);}};}
 createRadialGradient(...points){return this.createLinearGradient(...points);}
 fillRect(...rect){this.calls.push({rect,fill:this.fillStyle});}
 drawImage(image){this.source=image;if(image.context?.pixels)this.pixels=Uint8ClampedArray.from(image.context.pixels);this.calls.push({image});}
 getImageData(x,y,w,h){reads++;if(this.source?.tainted)throw Error('SecurityError');const data=new Uint8ClampedArray(w*h*4);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const p=(j*w+i)*4,value=this.source?.pattern==='ramp'?24+Math.round(i/(w-1)*210):24+Math.round((.5+.5*Math.sin(i*.28+j*.075))*210);data[p]=value;data[p+1]=value+3;data[p+2]=value+8;data[p+3]=255;}return{data,width:w,height:h};}
 createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4),width:w,height:h};}
 putImageData(image){this.pixels=image.data;}
}
const canvas=(width=1,height=1)=>({width,height,context:new Context(),getContext(){return this.context;}});
const factory=(w,h)=>{allocations++;return canvas(w,h);};
const texture={width:64,height:48};
const base={width:320,height:640,horizonY:360,day:.30,clouds:.55,fog:0,instant:Date.parse('2026-11-17T11:20:00Z'),latitude:57.153,longitude:65.5343,motionTime:0,sun:{x:240,y:335,altitude:-.3},moon:{x:130,y:180,altitude:18}};
const fields=['cropX','cropY','scale','layerMix','phase','windOffset','windSpeed','edgeWarmth','glowStrength','lightStrength'];
const firstStyle=skyAtmosphereStyle(base);
assert.deepEqual(skyAtmosphereStyle(base),firstStyle,'Reopening a scene never generates a new random style');
const nextStyle=skyAtmosphereStyle({...base,instant:base.instant+86400000});
assert.ok(fields.some(k=>Math.abs(firstStyle[k]-nextStyle[k])>.03),'Adjacent dates genuinely vary the photographed cloud composition');
assert.notDeepEqual(skyAtmosphereStyle({...base,longitude:-74}),firstStyle,'Observer location contributes to the local deterministic style');
const midnight=Date.UTC(2026,10,18)-base.longitude/360*86400000;
const before=skyAtmosphereStyle({...base,instant:midnight-1}),after=skyAtmosphereStyle({...base,instant:midnight+1});
for(const key of fields)assert.ok(Math.abs(before[key]-after[key])<.00001,'Daily '+key+' crosses midnight without a teleport');
for(const key of ['zenith','middle','horizon','warmColor'])for(let i=0;i<3;i++)assert.ok(Math.abs(before[key][i]-after[key][i])<.00001,'No midnight palette flash');
assert.equal(skyAtmosphereStyle({...base,day:0}).skyLight,0,'Manual dark lighting stays dark even if the Sun is actually above the horizon');
assert.equal(skyAtmosphereStyle({...base,day:1}).skyLight,1);
for(const invalid of [{},{latitude:NaN,longitude:Infinity,instant:NaN,clouds:NaN,day:NaN}]){
 const style=skyAtmosphereStyle(invalid);for(const key of fields)assert.ok(Number.isFinite(style[key]));
 for(const key of ['zenith','middle','horizon'])assert.ok(style[key].every(Number.isFinite));
}

const painter=createSkyAtmosphere({canvasFactory:factory,texture});
const skyCanvas=canvas(),cloudCanvas=canvas();
const render=extra=>painter.render({...base,skyCanvas,cloudCanvas,...extra});
const digest=()=>createHash('sha256').update(cloudCanvas.context.pixels||new Uint8Array()).digest('hex');
const initial=render();assert.equal(initial.sourceReady,true);assert.equal(reads,1,'A decoded source is sampled only once');
assert.ok(skyCanvas.context.calls.some(c=>c.rect?.[2]===320&&c.rect?.[3]===640),'One coherent opaque sky fills the externally masked layer');
const gradient=skyCanvas.context.calls.find(c=>c.fill?.stops)?.fill;
assert.deepEqual(gradient.stops.map(s=>s[0]),[0,.54,1],'There is no extra red stripe stop in the continuous sky');
assert.ok(gradient.stops.every(s=>/^rgb\(/.test(s[1])),'The base sky gradient is opaque');
const initialHash=digest();render();assert.equal(digest(),initialHash,'A frozen motion clock gives byte-identical clouds');
render({motionTime:24});assert.notEqual(digest(),initialHash,'Photographic layers advect/evolve when the supplied clock advances');
render({motionTime:0});assert.equal(digest(),initialHash,'Rendering is deterministic even after seeking backwards');
const other=createSkyAtmosphere({canvasFactory:factory,texture});other.render({...base,skyCanvas:canvas(),cloudCanvas:canvas()});
const freshCloud=canvas();other.render({...base,skyCanvas:canvas(),cloudCanvas:freshCloud});assert.equal(createHash('sha256').update(freshCloud.context.pixels).digest('hex'),initialHash,'A remount uses the identical date/location/weather field');other.dispose();

// A partially cloudy sky must have real local differences, rather than a
// scalar that hides or reveals every celestial body over the entire panorama.
const local=[];for(let x=8;x<320;x+=8)local.push(render({sun:{...base.sun,x,y:200}}).discVisibility);
assert.ok(Math.max(...local)-Math.min(...local)>.45,'The same weather occludes a disc differently under photographic clouds and gaps');
assert.equal(render({clouds:0}).discVisibility,1);assert.equal(cloudCanvas.context.pixels,null,'Clear sky has no synthetic cloud overlay');
assert.equal(render({clouds:0}).skyVisibility,1);
assert.equal(render({clouds:1}).skyVisibility,0,'Dense overcast never forces a decorative Sun through a texture gap');
assert.equal(render({clouds:1}).discVisibility,0);assert.equal(render({clouds:0,fog:1}).moonVisibility,0);assert.equal(render({clouds:0,fog:1}).skyVisibility,0,'Actual dense fog hides both bodies');

// All skyline sizes use the same engine, including a very narrow strip of sky.
for(const [w,h,horizon]of [[320,640,14],[853,1844,70],[1024,768,300]]){
 const result=render({width:w,height:h,horizonY:horizon});assert.equal(result.skyHeight,horizon);assert.ok(result.discVisibility>=0&&result.discVisibility<=1);
 assert.ok(cloudCanvas.context.pixels.length<=224*272*4,'Cloud raster work is bounded independently of the full photograph');
}
const allocated=allocations;for(let i=0;i<40;i++)render({motionTime:i/12});assert.equal(allocations,allocated,'Animation does not allocate new canvas/cache layers each frame');
assert.equal(painter.setTexture(texture),true);assert.equal(reads,2,'Reusing the same source does not decode/read it again (the second read belongs to the independent remount)');
const tainted={width:32,height:32,tainted:true};assert.equal(painter.setTexture(tainted),false);assert.equal(render().sourceReady,false,'Unreadable texture gives an honest fallback signal');
const readsAfterError=reads;assert.equal(painter.setTexture(tainted),false);assert.equal(reads,readsAfterError,'The same failed source is not repeatedly sampled');
assert.equal(painter.setTexture(null),false);assert.equal(render({clouds:0}).sourceReady,false,'Texture readiness is explicit even for clear weather');
const pending={width:200,height:150,naturalWidth:0,naturalHeight:0};assert.equal(painter.setTexture(pending),false,'CSS image dimensions do not make an undecoded source ready');pending.naturalWidth=64;pending.naturalHeight=48;assert.equal(painter.setTexture(pending),true,'A source that becomes decoded can recover without replacing its object identity');
assert.equal(painter.setTexture(texture),true);painter.dispose();assert.equal(painter.setTexture(texture),false);assert.equal(render().sourceReady,false,'Disposed painters cannot retain/restart a decoder or source');

// An asymmetric photographic ramp preserves its dominant left-to-right
// orientation through a complete flow cycle. A mirrored sampler reverses it
// for half the cycle and produces the rejected bilateral cloud/oval shapes.
const rampPainter=createSkyAtmosphere({canvasFactory:factory,texture:{width:64,height:48,pattern:'ramp'}}),rampCloud=canvas();let positive=0,negative=0;
for(let i=0;i<17;i++){
 rampPainter.render({...base,skyCanvas:canvas(),cloudCanvas:rampCloud,width:320,height:20,horizonY:20,day:1,clouds:1,sun:{x:230,y:10,altitude:30},motionTime:i/16*2/firstStyle.windSpeed});
 const pixels=rampCloud.context.pixels,row=7*224*4;for(let x=1;x<224;x++){const d=pixels[row+x*4]-pixels[row+(x-1)*4];if(d>0)positive++;else if(d<0)negative++;}
}
// Quantized pixels and the second flow reduce the source ramp's ideal80%
// forward span. The real sampler retains57%; a mirrored negative control
// measured49%, so55% distinguishes the rejected reversal without a pixel hash.
assert.ok(positive/(positive+negative)>.55,'Source orientation must not flip bilaterally on alternate repeated tiles: '+positive+'/'+(positive+negative));rampPainter.dispose();
console.log('PASS: deterministic daily/location variation without midnight seams; continuous opaque sky; photographic local cloud density; independent bounded flow; fog/overcast gates; tiny skies; frozen/remount/seek stability; source readiness and disposal.');
