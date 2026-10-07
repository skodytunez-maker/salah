import assert from 'node:assert/strict';
import {bindNativeCardSwipe} from '../dist/js/adhkar-swipe.js';
class Node{
 constructor(){this.children=[];this.listeners=new Map();this.style={};this.classes=new Set(['dhikr-passage']);this.classList={add:(...x)=>x.forEach(v=>this.classes.add(v)),remove:(...x)=>x.forEach(v=>this.classes.delete(v))};this.clientWidth=360;this.scrollLeft=0;this.height=500;}
 addEventListener(k,f){if(!this.listeners.has(k))this.listeners.set(k,new Set());this.listeners.get(k).add(f)}
 removeEventListener(k,f){this.listeners.get(k)?.delete(f)}
 emit(k,e={touches:[{identifier:1,clientX:250,clientY:100}]}){for(const f of [...this.listeners.get(k)||[]])f(e)}
 append(n){n.remove();this.children.push(n);n.parentNode=this}
 insertBefore(n,b){n.remove();this.children.splice(this.children.indexOf(b),0,n);n.parentNode=this}
 remove(){if(this.parentNode){this.parentNode.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null}}
 setAttribute(){}
 removeAttribute(){}
 querySelectorAll(){return[{getAttribute:()=> 'preview-audio',removeAttribute:()=>this.idsRemoved=true,setAttribute:()=>this.idsRestored=true}]}
 getBoundingClientRect(){return{height:this.height}}
 scrollTo({left}){this.scrollLeft=left;this.snapped=left}
}
function harness({previous=true,next=true,surface=false}={}){
 const parent=new Node(),passage=new Node(),moves=[],incoming=[],frames=[],timers=new Map();let sequence=0,resize,selection='';
 parent.append(passage);passage.ownerDocument={createElement:()=>new Node()};
 const win={getComputedStyle:()=>({marginTop:'28px'}),getSelection:()=>({toString:()=>selection}),requestAnimationFrame:f=>(frames.push(f),frames.length),cancelAnimationFrame(){},setTimeout:f=>(timers.set(++sequence,f),sequence),clearTimeout:id=>timers.delete(id),ResizeObserver:class{constructor(f){resize=f}observe(){}disconnect(){}}};
 const back=[],dispose=bindNativeCardSwipe(passage,{win,gestureSurface:surface?parent:null,onBoundaryBack:()=>back.push(true),preview:d=>(d===1?previous:next)?new Node():null,commit:(d,page)=>{moves.push(d);incoming.push(page)}});
 frames.splice(0).forEach(f=>f(0));const row=parent.children[0];
 return{parent,passage,row,moves,incoming,back,dispose,resize,select:t=>selection=t,flush:()=>{for(let t=16;t<=320;t+=16)frames.splice(0).forEach(f=>f(t));const pending=[...timers.values()];timers.clear();pending.forEach(f=>f())}};
}
let h=harness();assert.equal(h.row.scrollLeft,360);assert.equal(h.row.style.height,'500px');
for(const preview of [h.row.children[0],h.row.children[2]]){assert.equal(preview.inert,true);assert.equal(preview.idsRemoved,true);assert(preview.classes.has('dhikr-passage'),'preview uses identical typography')}
h.row.emit('touchstart');h.row.scrollLeft=720;h.row.emit('scroll');h.row.emit('scrollend');assert.deepEqual(h.moves,[],'state waits until the finger is released');
h.row.emit('touchend',{touches:[]});h.flush();assert.deepEqual(h.moves,[-1]);assert.equal(h.incoming[0],h.row.children[2],'commit retains the exact pre-rendered node');assert.equal(h.incoming[0].idsRestored,true);assert.equal(h.incoming[0].inert,false);assert(h.incoming[0].classes.has('adhkar-carousel-page'),'commit must not collapse flex geometry before detaching the incoming page');h.row.emit('scrollend');assert.deepEqual(h.moves,[-1],'only one transition per settled page');
assert.equal(h.passage.style.transform,undefined,'no app-owned transform can remain stuck');h.dispose();assert.equal(h.parent.children[0],h.passage);assert([...h.row.listeners.values()].every(s=>s.size===0));
h=harness();h.row.scrollLeft=0;h.row.emit('scrollend');assert.deepEqual(h.moves,[1]);h.dispose();
h=harness();h.row.scrollLeft=430;h.row.emit('scrollend');assert.equal(h.row.snapped,360,'an incomplete swipe returns to the current card');h.row.emit('scrollend');assert.deepEqual(h.moves,[]);h.dispose();
h=harness();h.row.emit('touchstart');h.row.scrollLeft=720;h.row.emit('touchcancel');h.flush();assert.equal(h.row.scrollLeft,360);assert.deepEqual(h.moves,[]);h.dispose();
h=harness();h.row.clientWidth=420;h.resize();assert.equal(h.row.scrollLeft,420,'rotation retains the current card');h.passage.height=800;h.resize();assert.equal(h.row.style.height,'800px','long translations remain vertically reachable');h.dispose();
h=harness();h.row.children[2].height=800;h.row.scrollLeft=540;h.row.emit('scroll');assert.equal(h.row.style.height,'650px','height follows the incoming card during the drag');h.dispose();
h=harness({previous:false});assert.equal(h.row.scrollLeft,0);h.row.emit('scrollend');assert.deepEqual(h.moves,[]);h.row.scrollLeft=360;h.row.emit('scrollend');assert.deepEqual(h.moves,[-1]);h.dispose();
const touch=(x,y=100)=>({touches:[{identifier:1,clientX:x,clientY:y}],preventDefault(){this.prevented=true}});
h=harness();h.row.emit('touchstart',touch(250));const move=touch(30);h.row.emit('touchmove',move);assert(move.prevented);assert.equal(h.row.scrollLeft,580);h.row.emit('touchend',{touches:[]});assert.deepEqual(h.moves,[]);h.flush();assert.deepEqual(h.moves,[-1]);assert.equal(h.row.scrollLeft,720);h.dispose();
h=harness();h.row.emit('touchstart',touch(30));h.row.emit('touchmove',touch(250));h.row.emit('touchend',{touches:[]});h.flush();assert.deepEqual(h.moves,[1]);assert.equal(h.row.scrollLeft,0);h.dispose();
h=harness();h.row.emit('touchstart',touch(250));h.row.emit('touchmove',touch(220));h.row.emit('touchend',{touches:[]});h.flush();assert.deepEqual(h.moves,[]);assert.equal(h.row.scrollLeft,360);h.dispose();
h=harness();h.row.emit('touchstart',touch(250));const vertical=touch(245,210);h.row.emit('touchmove',vertical);assert.equal(vertical.prevented,undefined);assert.equal(h.row.scrollLeft,360);h.row.emit('touchend',{touches:[]});h.flush();assert.deepEqual(h.moves,[]);h.dispose();
console.log('PASS: controlled touch transitions in both directions, short and vertical gestures, cancellation, rotation, retained nodes and counters.');

h=harness({surface:true});h.parent.emit('touchstart',touch(250));h.parent.emit('touchmove',touch(30));h.parent.emit('touchend',{touches:[]});h.flush();assert.deepEqual(h.moves,[-1],'blank-area gesture uses the same carousel');h.dispose();assert([...h.parent.listeners.values()].every(s=>s.size===0));
h=harness({surface:true});const control=touch(250);control.target={closest:()=>true};h.parent.emit('touchstart',control);h.parent.emit('touchmove',touch(30));h.parent.emit('touchend',{touches:[]});h.flush();assert.deepEqual(h.moves,[],'counter and buttons retain taps');h.dispose();
h=harness({previous:false,surface:true});h.parent.emit('touchstart',touch(30));h.parent.emit('touchmove',touch(250));h.parent.emit('touchend',{touches:[]});h.flush();assert.deepEqual(h.back,[true]);assert.deepEqual(h.moves,[]);h.dispose();
console.log('PASS: blank-area card gestures, first-card return, unaffected controls and cleanup.');
