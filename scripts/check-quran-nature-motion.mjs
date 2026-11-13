import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const w=new Window({url:'https://salah.invalid/#home'});Object.assign(globalThis,{window:w,document:w.document,localStorage:w.localStorage});
const{mountNatureMotion,paintNatureMotion}=await import('../dist/js/quran-nature-motion.js');
const kinds=['rain','wind','fire','forest','ocean'];
function context(){const calls=[];const gradient={addColorStop(...args){calls.push(['colorStop',...args]);}};const c={calls};for(const name of ['save','restore','setTransform','clearRect','translate','scale','fillRect','beginPath','closePath','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','stroke','fill','arc'])c[name]=(...args)=>{assert.ok(args.every(v=>typeof v!=='number'||Number.isFinite(v)),name+' uses finite coordinates');calls.push([name,...args]);};for(const name of ['createRadialGradient','createLinearGradient'])c[name]=(...args)=>{calls.push([name,...args]);return gradient;};return c;}
const signatures=[];for(const kind of kinds){const c=context();paintNatureMotion(c,kind,0);const initial=JSON.stringify(c.calls);c.calls.length=0;paintNatureMotion(c,kind,7.5);assert.notEqual(JSON.stringify(c.calls),initial,kind+' actually changes over time');signatures.push(initial);}assert.equal(new Set(signatures).size,5,'Each mode has a distinct drawing');
let hidden=false,systemReduced=false,reduced=false,allocations=0,next=0;const frames=new Map(),mediaListeners=new Set(),resizers=[];
Object.defineProperties(w.document,{hidden:{configurable:true,get:()=>hidden},visibilityState:{configurable:true,get:()=>hidden?'hidden':'visible'}});
w.requestAnimationFrame=fn=>{const id=++next;frames.set(id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
w.matchMedia=()=>({get matches(){return systemReduced;},addEventListener:(_name,fn)=>mediaListeners.add(fn),removeEventListener:(_name,fn)=>mediaListeners.delete(fn)});
w.ResizeObserver=class{constructor(fn){this.fn=fn;resizers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
const panel=w.document.createElement('section');panel.dataset.nature='rain';panel.innerHTML='<button data-toggle>Pause</button><input type="range">';w.document.body.append(panel);let bounds={width:393,height:852};panel.getBoundingClientRect=()=>bounds;
const c=context(),before=w.localStorage.length,button=panel.querySelector('button');let clicks=0;button.onclick=()=>clicks++;
const motion=mountNatureMotion(panel,{doc:w.document,win:w,isReduced:()=>reduced,createContext:()=>{allocations++;return c;}});
assert.equal(allocations,0,'Compact playback never allocates a canvas or schedules animation');assert.equal(frames.size,0);
function step(now){const entries=[...frames];frames.clear();for(const[_id,fn]of entries)fn(now);}
panel.classList.add('is-expanded');motion.sync();assert.equal(allocations,1);assert.equal(frames.size,1);const canvas=panel.querySelector('canvas');assert.equal(canvas.getAttribute('aria-hidden'),'true');assert.equal(canvas.hidden,false);assert.ok(canvas.width*canvas.height<=750000,'Bound pixel buffer independently of screen density');
step(0);const painted=c.calls.length;step(10);assert.equal(c.calls.length,painted,'High-refresh screens do not force full-rate paints');step(50);assert.ok(c.calls.length>painted);assert.equal(frames.size,1,'Only one animation loop exists');
for(const kind of kinds){panel.dataset.nature=kind;motion.sync();step(100);assert.equal(allocations,1,'Mode changes reuse the same canvas');assert.equal(frames.size,1);}
panel.dataset.nature='fire';motion.sync();c.calls.length=0;step(160);const transform=c.calls.find(row=>row[0]==='translate');const scale=Math.max(393/940,852/1672);assert.equal(transform[1],(393-940*scale)*.7,'Hearth glow follows the existing70% cover crop');
button.click();assert.equal(clicks,1,'Existing connected controls are retained');assert.equal(panel.querySelector('input').type,'range');
for(const mutate of [()=>{hidden=true;},()=>{reduced=true;},()=>{systemReduced=true;},()=>{panel.hidden=true;},()=>{delete panel.dataset.nature;},()=>{panel.classList.remove('is-expanded');}]){
 mutate();motion.sync();assert.equal(frames.size,0,'Hidden, reduced or absent scene schedules no frames');assert.equal(canvas.hidden,true);hidden=false;reduced=false;systemReduced=false;panel.hidden=false;panel.dataset.nature='rain';panel.classList.add('is-expanded');motion.sync();assert.equal(frames.size,1);
}
w.dispatchEvent(new w.Event('pagehide'));assert.equal(frames.size,0,'BFCache/page hide pauses even before visibility changes');w.dispatchEvent(new w.Event('pageshow'));assert.equal(frames.size,1);
systemReduced=true;for(const fn of mediaListeners)fn();assert.equal(frames.size,0);systemReduced=false;for(const fn of mediaListeners)fn();assert.equal(frames.size,1);
hidden=true;w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(frames.size,0);hidden=false;w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(frames.size,1);
bounds={width:1200,height:2400};resizers[0].fn();assert.ok(canvas.width*canvas.height<=750000);assert.equal(frames.size,1);
const stale=[...frames.values()][0];motion.destroy();motion.destroy();assert.equal(frames.size,0);assert.equal(panel.querySelector('canvas'),null);assert.equal(mediaListeners.size,0);assert.equal(resizers[0].disconnected,true);stale(900);assert.equal(frames.size,0,'A queued frame cannot resurrect disposed motion');assert.equal(w.localStorage.length,before,'Visual effects never write account or playback data');
for(const createContext of [()=>null,()=>{throw Error('Canvas unavailable');}]){const safe=mountNatureMotion(panel,{doc:w.document,win:w,createContext});assert.equal(frames.size,0);assert.equal(panel.querySelector('canvas'),null);safe.destroy();button.click();}assert.equal(clicks,3,'Missing graphics support leaves working controls and static wallpaper');
const css=await fs.readFile(new URL('../dist/quran-player.css',import.meta.url),'utf8');assert.match(css,/is-expanded\[data-nature\]\{isolation:isolate\}/);assert.match(css,/\.quran-nature-motion\{[^}]*position:absolute[^}]*z-index:-1[^}]*pointer-events:none/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{#quran-global-player>\.quran-nature-motion\{display:none!important\}\}/);
const source=await fs.readFile(new URL('../dist/js/quran-nature-motion.js',import.meta.url),'utf8');assert.doesNotMatch(source,/\b(?:fetch|Audio|AudioContext|setInterval|setTimeout)\s*\(/,'Motion neither downloads media nor creates audio or background timers');
console.log('PASS: five distinct time-varying effects, original controls,24fps paint cap, bounded pixels, correct fireplace crop, reduced motion, hidden/compact/BFCache suspension, mode reuse, unsupported graphics and complete disposal. Drawing-command/lifecycle test, not pixel-rendered device QA.');
await w.happyDOM.close();
