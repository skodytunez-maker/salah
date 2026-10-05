import assert from 'node:assert/strict';
import{bindSwipeMotion,swipeDecision}from '../dist/js/swipe-motion.js';
import{createRouteBackStack,resolveBackAction}from '../dist/js/edge-back.js';
class Events{
 listeners=new Map();addEventListener(k,f){if(!this.listeners.has(k))this.listeners.set(k,new Set());this.listeners.get(k).add(f)}removeEventListener(k,f){this.listeners.get(k)?.delete(f)}emit(k,e={}){for(const fn of [...this.listeners.get(k)||[]])fn(e)}
}
const classes=()=>({add(){},remove(){}});
function harness({allow=()=>true,reduced=false,preview=false}={}){
 let time=0,selection='';const frames=new Map(),timers=new Map(),moves=[],animations=[],ghosts=[];let seq=0;
 const win=new Events();Object.assign(win,{getSelection:()=>({toString:()=>selection}),matchMedia:()=>({matches:reduced}),requestAnimationFrame:f=>{frames.set(++seq,f);return seq},cancelAnimationFrame:id=>frames.delete(id),setTimeout:f=>{timers.set(++seq,f);return seq},clearTimeout:id=>timers.delete(id)});
 const doc=new Events();doc.documentElement={classList:classes()};
 const node=new Events();Object.assign(node,{ownerDocument:doc,isConnected:true,style:{removeProperty(k){delete this[k]}},classList:classes(),getBoundingClientRect:()=>({left:16,top:140,width:360}),setPointerCapture(){},releasePointerCapture(){},parentNode:{append(){}},animate(keyframes,options){const a={keyframes,options,cancel(){this.cancelled=true}};animations.push(a);return a}});
 const dispose=bindSwipeMotion(node,{win,now:()=>time,canMove:allow,reduced:()=>reduced,commit:d=>moves.push(d),preview:preview?direction=>{const g={dataset:{},classList:classes(),style:{},setAttribute(){},querySelectorAll:()=>[],remove(){this.removed=true},animate:node.animate};ghosts.push(g);return g}:undefined});
 const pointer=(x,y=100,extra={})=>({clientX:x,clientY:y,pointerId:1,pointerType:'touch',isPrimary:true,button:0,target:{closest:()=>null},preventDefault(){},...extra});
 return{node,win,doc,moves,frames,timers,animations,ghosts,dispose,selection:t=>selection=t,emit:(type,x,y,extra)=>node.emit(type,pointer(x,y,extra)),time:n=>time=n,paint(){for(const[id,f]of [...frames]){frames.delete(id);f()}},complete(){animations.findLast(a=>a.onfinish)?.onfinish()},click(){let blocked=false;node.emit('click',{isTrusted:true,preventDefault(){blocked=true},stopImmediatePropagation(){}});return blocked}};
}
// Drag is interactive, frame-coalesced, and does not navigate until the release settles.
let h=harness({preview:true});h.emit('pointerdown',220);h.time(40);h.emit('pointermove',170);h.time(80);h.emit('pointermove',100);assert.equal(h.frames.size,1);h.paint();assert.match(h.node.style.transform,/-120px/);assert.match(h.ghosts[0].style.transform,/240px/);assert.deepEqual(h.moves,[]);h.time(90);h.emit('pointerup',100);assert.deepEqual(h.moves,[]);assert.equal(h.click(),true);h.node.emit('click',{isTrusted:false,preventDefault(){assert.fail('Internal navigation click must stay available')},stopImmediatePropagation(){}});h.complete();assert.deepEqual(h.moves,[-1]);assert.equal(h.node.style.transform,undefined);assert.equal(h.ghosts[0].removed,true);assert.equal(h.timers.size,0);h.dispose();
// A slow short drag cancels. A deliberate fast flick of 40px completes.
h=harness();h.emit('pointerdown',220);h.time(250);h.emit('pointermove',180);h.paint();h.time(400);h.emit('pointerup',180);h.complete();assert.deepEqual(h.moves,[]);assert.equal(h.node.style.transform,undefined);h.time(1000);h.emit('pointerdown',220);h.time(1040);h.emit('pointermove',180);h.paint();h.time(1050);h.emit('pointerup',180);h.complete();assert.deepEqual(h.moves,[-1]);h.dispose();
// Reversing the finger back near the start cancels; an unavailable previous card resists.
assert.equal(swipeDecision({dx:22,dy:0,width:360,velocity:-.9}),0);
h=harness({allow:d=>d<0});h.emit('pointerdown',120);h.time(100);h.emit('pointermove',240);h.paint();assert.match(h.node.style.transform,/19.2px/);h.emit('pointerup',240);h.complete();assert.deepEqual(h.moves,[]);h.dispose();
// Scrolling, selection, controls, mouse, multi-touch and OS cancellation never navigate.
for(const mode of ['vertical','selection','control','mouse','multitouch','cancel']){
 h=harness();h.emit('pointerdown',220,100,mode==='control'?{target:{closest:()=>({})}}:mode==='mouse'?{pointerType:'mouse'}:{});
 if(mode==='selection')h.selection('Text');if(mode==='multitouch')h.emit('pointerdown',200,100,{isPrimary:false,pointerId:2});
 h.time(150);h.emit('pointermove',mode==='vertical'?215:70,mode==='vertical'?240:100);h.paint();if(mode==='cancel')h.node.emit('pointercancel');h.emit('pointerup',70);h.complete();assert.deepEqual(h.moves,[],mode);h.dispose();
}
// Leaving the page during the settle prevents delayed navigation; no timers/listeners leak.
for(const event of ['hashchange','popstate','pagehide','blur','resize']){h=harness();h.emit('pointerdown',220);h.time(100);h.emit('pointermove',70);h.paint();h.emit('pointerup',70);h.win.emit(event);h.complete();assert.deepEqual(h.moves,[],event);assert.equal(h.node.style.transform,undefined);h.dispose();assert.ok([...h.win.listeners.values()].every(s=>s.size===0));assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);}
h=harness({reduced:true});h.emit('pointerdown',220);h.time(100);h.emit('pointermove',70);h.paint();h.emit('pointerup',70);assert.deepEqual(h.moves,[-1]);assert.equal(h.animations.length,0);h.dispose();
// Route Back is confined to entries created in this session, with forward and branch support.
const win=new Events(),entries=[{hash:'#home',state:{other:'preserved'}}];let at=0,backCalls=0;
win.history={get state(){return entries[at].state},replaceState(state){entries[at].state=state},back(){backCalls++;if(at)at--;win.emit('popstate');win.emit('hashchange')},forward(){if(at<entries.length-1)at++;win.emit('popstate');win.emit('hashchange')}};
const stack=createRouteBackStack(win),go=hash=>{entries.splice(at+1);entries.push({hash,state:null});at++;win.emit('hashchange')};
assert.equal(stack.canBack(),false);stack.back();assert.equal(backCalls,0);assert.equal(entries[0].state.other,'preserved');go('#more');go('#settings');stack.back();assert.equal(entries[at].hash,'#more');stack.back();assert.equal(entries[at].hash,'#home');assert.equal(stack.canBack(),false);assert.equal(stack.canForward(),true);stack.forward();assert.equal(entries[at].hash,'#more');assert.equal(stack.canBack(),true);go('#quran');assert.equal(stack.canForward(),false);stack.back();assert.equal(entries[at].hash,'#more');assert.equal(stack.canForward(),true);stack.forward();assert.equal(entries[at].hash,'#quran');assert.equal(stack.canForward(),false);stack.back();
entries.splice(at+1);entries.push({hash:'#more',state:{...entries[at].state,salahOwnerCard:'private'}});at++;assert.equal(stack.canForward(),false,'A private card discards the old forward branch');win.history.back();assert.equal(stack.canForward(),false,'Forward must not recreate a private card');stack.dispose();
// The user detail/list and reader/list are always consumed before the route history.
let returned=0,routeBack=0;const button={disabled:false,closest:()=>null,getClientRects:()=>[{}],click:()=>returned++};
for(const id of ['owner-user-back','adhkar-close','dua-list','counter-close']){const app={querySelector:q=>q==='#'+id?button:null};resolveBackAction(app,{canBack:()=>true,back:()=>routeBack++})();}
assert.equal(returned,4);assert.equal(routeBack,0);resolveBackAction({querySelector:()=>null},{canBack:()=>true,back:()=>routeBack++})();assert.equal(routeBack,1);
assert.equal(resolveBackAction({querySelector:()=>null},{canBack:()=>false}),null);
let homeCalls=0;const homeLink={...button,click:()=>homeCalls++};resolveBackAction({querySelector:q=>q.includes('.menu-home-access')?homeLink:null},{canBack:()=>false})();assert.equal(homeCalls,1,'Opening Menu directly still provides a route Home');
console.log('PASS: interactive drag/preview, thresholds and velocity, cancel/reversal/boundaries, no duplicate click, lifecycle cleanup, reduced motion, nested Back and safe route history.');
