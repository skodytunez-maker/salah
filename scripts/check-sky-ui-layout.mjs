import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {layoutSkyObjects,solveSkyUiPosition} from '../dist/js/sky-ui-layout.js';
import {skyObjects,skyProjectionFrame,projectSkyObjects,moonAppearance} from '../dist/js/wallpapers.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clear=(p,r,radius,padding=8)=>Math.hypot(p.x-clamp(p.x,r.left-padding,r.right+padding),p.y-clamp(p.y,r.top-padding,r.bottom+padding))>=radius-1e-6;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const bounds={left:0,top:0,right:100,bottom:100},block={left:40,top:40,right:60,bottom:60};
const center={x:50,y:50},above=solveSkyUiPosition(center,{bounds,obstacles:[block],radius:5,padding:0});
assert.deepEqual(above,{x:50,y:35},'Equidistant free space above wins without a random side flip');
const corner=solveSkyUiPosition({x:34,y:34},{bounds,obstacles:[block],radius:10,padding:0});
near(corner.x,40-Math.sqrt(50));near(corner.y,40-Math.sqrt(50));assert.ok(clear(corner,block,10,0),'The real circle corner is used, not a larger square exclusion');
const original={x:15,y:15};assert.equal(solveSkyUiPosition(original,{bounds,obstacles:[block],radius:5}),original);
assert.equal(solveSkyUiPosition(center,{bounds,obstacles:[bounds],radius:5}),center,'A fully occupied sky does not manufacture a position or hide the body');
for(const invalid of [{},{bounds:{left:0,top:0,right:0,bottom:100}},{bounds,radius:NaN}])assert.equal(solveSkyUiPosition(center,invalid),center);

// Independent coarse exhaustive reference checks nearest-distance selection
// when projections are blocked by another control. Production uses exact finite
// boundary intersections, while this check only samples a one-pixel grid.
for(const obstacles of [[block,{left:25,top:20,right:75,bottom:38}],[{left:15,top:42,right:75,bottom:56},{left:55,top:20,right:70,bottom:85}],[{left:30,top:30,right:55,bottom:80},{left:48,top:12,right:75,bottom:55}]]){
 const solved=solveSkyUiPosition(center,{bounds,obstacles,radius:5,padding:2});assert.ok(obstacles.every(r=>clear(solved,r,5,2)));
 let sampled=Infinity;for(let y=5;y<=95;y++)for(let x=5;x<=95;x++)if(obstacles.every(r=>clear({x,y},r,5,2)))sampled=Math.min(sampled,Math.hypot(x-50,y-50));
 assert.ok(Math.hypot(solved.x-50,solved.y-50)<=sampled+1e-6,'Exact candidate is at least as near as the independent exhaustive grid');
 const reverse=solveSkyUiPosition(center,{bounds,obstacles:[...obstacles].reverse(),radius:5,padding:2});near(reverse.x,solved.x);near(reverse.y,solved.y);
}

const viewport={width:393,height:853},frame={left:-1,top:0,width:395,height:854},label={left:112,top:389,right:281,bottom:409},timer={left:109,top:429,right:284,bottom:468},brand={left:134,top:271,right:263,bottom:326},player={left:26,top:674,right:367,bottom:744};
const screenshot={sunX:50,sunY:65,sun:0,moonX:(163-frame.left)/frame.width*100,moonY:393/frame.height*100,moon:.42,horizonY:56.1,phase:.25};
const shifted=layoutSkyObjects(screenshot,{frame,viewport,obstacles:[brand,label,timer,player]});
const projectedPoint=(sky,body,f=frame)=>({x:f.left+sky[body+'X']/100*f.width,y:f.top+sky[body+'Y']/100*f.height});
const shiftedMoon=projectedPoint(shifted,'moon');assert.ok(shiftedMoon.y<389-8-9);assert.ok([brand,label,timer,player].every(r=>clear(shiftedMoon,r,frame.width*.025)));assert.equal(shifted.moon,screenshot.moon);assert.equal(shifted.sun,0);assert.equal(shifted.horizonY,screenshot.horizonY);assert.equal(shifted.phase,screenshot.phase);
assert.deepEqual(layoutSkyObjects(screenshot,{frame,viewport,obstacles:[brand,label,timer,player]}),shifted,'The same mini-player and text layout cannot alternate positions');
assert.equal(layoutSkyObjects(screenshot,{frame,viewport,obstacles:[]}),screenshot,'Without an actual overlap the astronomical visual projection is byte-for-byte untouched');
const below={...screenshot,moonY:60};assert.equal(layoutSkyObjects(below,{frame,viewport,obstacles:[{left:0,top:350,right:393,bottom:650}]}),below,'A subhorizon or partly rising disc is never lifted over the horizon');
const hidden={...screenshot,moon:0};assert.equal(layoutSkyObjects(hidden,{frame,viewport,obstacles:[label]}),hidden);
assert.equal(layoutSkyObjects(screenshot,{frame:null,viewport,obstacles:[label]}),screenshot,'Missing layout measurements keep a safe unchanged fallback');

for(const v of [{width:320,height:568},{width:430,height:932},{width:1024,height:768}]){
 const f={left:-v.width*.3,top:-20,width:v.width*1.6,height:v.height+40};
 const sky={sun:1,sunX:50,sunY:30,moon:0,moonX:20,moonY:20,horizonY:70};
 const p=projectedPoint(sky,'sun',f),r={left:p.x-50,top:p.y-8,right:p.x+50,bottom:p.y+8};
 const next=layoutSkyObjects(sky,{frame:f,viewport:v,obstacles:[r]}),q=projectedPoint(next,'sun',f),radius=clamp(v.width*.044,18,28)/2;
 assert.ok(clear(q,r,radius));assert.ok(q.x>=radius&&q.x<=v.width-radius&&q.y>=radius&&q.y<=f.top+f.height*.7-radius,'Phone/tablet source-space crop maps to visible viewport bounds');assert.equal(next.sun,1);assert.equal(next.horizonY,70);
 assert.ok(q.y>=v.height*.07,'Safe placement retains the projected sky ceiling, outside the status bar/notch');
}

// Execute the real production paintSky function with real HappyDOM nodes.
// Bounding rectangles are supplied because this is an offline DOM fixture,
// not a browser layout/device claim. Each node must be measured only once.
const source=await readFile(new URL('../dist/js/weather.js',import.meta.url),'utf8'),start=source.indexOf('function paintSky('),end=source.indexOf('function skyNeedsAnimation()',start);
assert.ok(start>=0&&end>start);
const w=new Window({url:'https://fixture.invalid/#home'}),doc=w.document;
doc.body.className='home-page';doc.body.innerHTML='<div id="home-scene"></div><div class="app-home-top"><strong>SALAH</strong><span>Тюмень</span></div><div class="central-next-label">Следующий · Иша · 18:15</div><output id="countdown" tabindex="0">00:21:41</output><span class="central-note" hidden>Hidden note</span><div class="central-prayer timetable" style="display:none">Hidden table</div><section class="quran-global-player">Аль-А’раф</section>';
const measured=new Map(),nodes=[...doc.querySelectorAll('.app-home-top,.central-next-label,#countdown,.central-note,.central-prayer.timetable,.quran-global-player')];
for(const [i,node]of nodes.entries())node.getBoundingClientRect=()=>{measured.set(node,(measured.get(node)||0)+1);const r=[brand,label,timer,{left:0,top:0,right:393,bottom:853},{left:0,top:0,right:393,bottom:853},player][i];return{...r,width:r.right-r.left,height:r.bottom-r.top};};
const scene=doc.getElementById('home-scene'),countdown=doc.getElementById('countdown');countdown.focus();let renders=0;
const city={latitude:57.153,longitude:65.5343},instant=Date.parse('2026-11-17T12:53:00Z'),raw=skyObjects(instant,null,'auto',null,city),appearance=moonAppearance(instant,city);
const projectionContext={...viewport,wallpaper:'landmark',landmark:'al-aqsa'},projectionPlane=skyProjectionFrame(projectionContext),projected=projectSkyObjects(raw,projectionContext),liveMoon=projectedPoint(projected,'moon',projectionPlane);
// Use the actual projected Moon as a live label overlap, then move the label
// like the mini-player changes Home's available content height.
let currentLabel={left:liveMoon.x-40,right:liveMoon.x+70,top:liveMoon.y-8,bottom:liveMoon.y+8};nodes[1].getBoundingClientRect=()=>{measured.set(nodes[1],(measured.get(nodes[1])||0)+1);return{...currentLabel,width:110,height:16};};
const ctx=vm.createContext({liveSkyActive:()=>true,document:doc,window:w,settings:{wallpaper:'landmark',landmarkCity:'al-aqsa',backgroundMode:'auto',city},skyProjectionContext:projectionContext,skyProjectionPlane:projectionPlane,skyProjectionKey:'fixture',projectSkyObjects,layoutSkyObjects,landmarkEntry:{id:'al-aqsa'},lastSkySample:null,lastSkyStamp:null,skyProjected:null,previousSkyContext:null,previousSkyTime:null,previousSky:null,previewOverride:null,previewStarted:null,lastSkyHorizon:58,renderUnifiedSky:()=>renders++});
vm.runInContext(source.slice(start,end),ctx);ctx.paintSky(scene,raw,instant);
const integrated=ctx.skyProjected,integratedMoon=projectedPoint(integrated,'moon',projectionPlane);assert.ok(clear(integratedMoon,currentLabel,clamp(projectionPlane.width*.05,18,32)/2));assert.notEqual(integrated.moonY,projected.moonY);assert.equal(integrated.moon,raw.moon);assert.equal(integrated.sun,raw.sun);assert.equal(appearance.fraction,moonAppearance(instant,city).fraction);assert.equal(doc.activeElement,countdown);assert.equal(countdown.textContent,'00:21:41');assert.equal(renders,1);
for(const n of [nodes[0],nodes[1],nodes[2],nodes[5]])assert.equal(measured.get(n),1,'A visible obstacle is measured once for both bodies in one paint');for(const n of [nodes[3],nodes[4]])assert.equal(measured.get(n),undefined,'Hidden controls do not reserve sky');
currentLabel={...currentLabel,top:currentLabel.top+70,bottom:currentLabel.bottom+70};measured.clear();ctx.paintSky(scene,raw,instant+1000);assert.equal(ctx.skyProjected.moonY,projected.moonY,'Removing the overlap restores the original live projection without sticky offsets');assert.equal(doc.activeElement,countdown);assert.equal(renders,2);
currentLabel={left:liveMoon.x-70,right:liveMoon.x+70,top:70,bottom:490};ctx.paintSky(scene,raw,instant+2000);assert.ok(Math.abs(ctx.skyProjected.moonX-projected.moonX)>15,'A crowded vertical control can require a substantial sideways UI adjustment');assert.equal(scene.classList.contains('sky-reset'),false,'A UI nudge keeps the existing smooth position transition even when it exceeds the astronomical-jump threshold');
doc.body.classList.remove('home-page');measured.clear();ctx.paintSky(scene,raw,instant+2000);assert.equal(measured.size,0,'Other app sections do not read or adapt Home UI');assert.equal(ctx.skyProjected.moonY,projected.moonY);
const css=await readFile(new URL('../dist/day-night.css',import.meta.url),'utf8');assert.ok(css.includes('transition:left 1.1s linear,top 1.1s linear,opacity 1s linear'),'The existing position transition absorbs layout changes');
await w.happyDOM.close();
console.log('PASS: nearest circle-safe Home placement, exact source crop, no-space/horizon/hidden identity, deterministic phone/tablet results; real paintSky DOM integration measures each visible obstacle once, preserves timer/focus/astronomy and restores the unblocked projection.');
