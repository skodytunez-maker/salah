import assert from 'node:assert/strict';
import {bindNativeCardSwipe} from '../dist/js/adhkar-swipe.js';
class Node{
 constructor(){this.children=[];this.listeners=new Map();this.style={};this.classes=new Set(['dhikr-passage']);this.classList={add:(...x)=>x.forEach(v=>this.classes.add(v)),remove:(...x)=>x.forEach(v=>this.classes.delete(v))};this.clientWidth=360;this.scrollLeft=0;this.height=500;}
 addEventListener(k,f){if(!this.listeners.has(k))this.listeners.set(k,new Set());this.listeners.get(k).add(f)}
 removeEventListener(k,f){this.listeners.get(k)?.delete(f)}
 emit(k,e={}){for(const f of [...this.listeners.get(k)||[]])f(e)}
 append(n){n.remove();this.children.push(n);n.parentNode=this}
 insertBefore(n,b){n.remove();this.children.splice(this.children.indexOf(b),0,n);n.parentNode=this}
 remove(){if(this.parentNode){this.parentNode.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null}}
 setAttribute(){}
 querySelectorAll(){return[{removeAttribute:()=>this.idsRemoved=true}]}
 getBoundingClientRect(){return{height:this.height}}
 scrollTo({left}){this.scrollLeft=left;this.snapped=left}
}
function harness({previous=true,next=true}={}){
 const parent=new Node(),passage=new Node(),moves=[],frames=[],timers=new Map();let sequence=0,resize,selection='';
 parent.append(passage);passage.ownerDocument={createElement:()=>new Node()};
 const win={getComputedStyle:()=>({marginTop:'28px'}),getSelection:()=>({toString:()=>selection}),requestAnimationFrame:f=>(frames.push(f),frames.length),cancelAnimationFrame(){},setTimeout:f=>(timers.set(++sequence,f),sequence),clearTimeout:id=>timers.delete(id),ResizeObserver:class{constructor(f){resize=f}observe(){}disconnect(){}}};
 const dispose=bindNativeCardSwipe(passage,{win,preview:d=>(d===1?previous:next)?new Node():null,commit:d=>moves.push(d)});
 frames.forEach(f=>f());const row=parent.children[0];
 return{parent,passage,row,moves,dispose,resize,select:t=>selection=t,flush:()=>{for(const f of [...timers.values()])f();timers.clear()}};
}
let h=harness();assert.equal(h.row.scrollLeft,360);assert.equal(h.row.style.height,'500px');
for(const preview of [h.row.children[0],h.row.children[2]]){assert.equal(preview.inert,true);assert.equal(preview.idsRemoved,true);assert(!preview.classes.has('dhikr-passage'))}
h.row.emit('touchstart');h.row.scrollLeft=720;h.row.emit('scroll');h.row.emit('scrollend');assert.deepEqual(h.moves,[],'state waits until the finger is released');
h.row.emit('touchend',{touches:[]});h.flush();assert.deepEqual(h.moves,[-1]);h.row.emit('scrollend');assert.deepEqual(h.moves,[-1],'only one transition per settled page');
assert.equal(h.passage.style.transform,undefined,'no app-owned transform can remain stuck');h.dispose();assert.equal(h.parent.children[0],h.passage);assert([...h.row.listeners.values()].every(s=>s.size===0));
h=harness();h.row.scrollLeft=0;h.row.emit('scrollend');assert.deepEqual(h.moves,[1]);h.dispose();
h=harness();h.row.scrollLeft=430;h.row.emit('scrollend');assert.equal(h.row.snapped,360,'an incomplete swipe returns to the current card');h.row.emit('scrollend');assert.deepEqual(h.moves,[]);h.dispose();
h=harness();h.row.emit('touchstart');h.row.scrollLeft=720;h.row.emit('touchcancel');h.flush();assert.equal(h.row.scrollLeft,360);assert.deepEqual(h.moves,[]);h.dispose();
h=harness();h.row.clientWidth=420;h.resize();assert.equal(h.row.scrollLeft,420,'rotation retains the current card');h.passage.height=800;h.resize();assert.equal(h.row.style.height,'800px','long translations remain vertically reachable');h.dispose();
h=harness({previous:false});assert.equal(h.row.scrollLeft,0);h.row.emit('scrollend');assert.deepEqual(h.moves,[]);h.row.scrollLeft=360;h.row.emit('scrollend');assert.deepEqual(h.moves,[-1]);h.dispose();
console.log('PASS: native snap, touch release, next/previous, cancelled and incomplete swipes, rotation, text height, inert previews, no stuck transforms and single transitions.');
