import assert from 'node:assert/strict';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{createPlayerWindowHistory}from '../dist/js/quran-player-navigation.js';
import{initEdgeBack}from '../dist/js/edge-back.js';

function historyHarness(route='#home'){
 const entries=[{url:'https://example.invalid/#more',state:{route:'menu'}},{url:'https://example.invalid/'+route,state:{route:'origin'}}],listeners=new Map();let at=1,queued=0,dismissed=0,changes=0;
 const win={location:{get href(){return entries[at].url;}},addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);}};
 win.history={get state(){return entries[at].state;},pushState(state,_title,url){entries.splice(at+1);entries.push({url:url||entries[at].url,state});at++;},replaceState(state,_title,url){entries[at]={state,url:url||entries[at].url};},back(){queued++;}};
 const controller=createPlayerWindowHistory({win,dismiss:()=>dismissed++,onChange:()=>changes++});
 return{controller,win,entries,get index(){return at;},get pending(){return queued;},get dismissed(){return dismissed;},get changes(){return changes;},get listeners(){return [...listeners.values()].reduce((n,s)=>n+s.size,0);},flush(){assert(queued>0);queued--;at=Math.max(0,at-1);for(const fn of [...listeners.get('popstate')||[]])fn();},forward(){at=Math.min(entries.length-1,at+1);for(const fn of [...listeners.get('popstate')||[]])fn();},navigate(hash){win.history.pushState({},'','https://example.invalid/'+hash);for(const fn of [...listeners.get('hashchange')||[]])fn();}};
}
for(const route of ['#home','#quran?surah=7']){
 const h=historyHarness(route);h.controller.open();assert.equal(h.index,2);assert.equal(h.win.location.href,'https://example.invalid/'+route);assert(h.win.history.state.salahPlayerWindow);assert.equal(h.win.history.state.route,'origin');
 h.win.history.back();h.flush();assert.equal(h.dismissed,1,'Native Back closes the layer');assert.equal(h.index,1,'Native Back must not consume the originating route');assert.equal(h.win.location.href,'https://example.invalid/'+route);
 h.forward();assert.equal(h.dismissed,1);assert.equal(h.win.history.state.salahPlayerWindow,undefined,'Forward cannot resurrect a closed player');h.controller.destroy();assert.equal(h.listeners,0);
}
{
 const h=historyHarness();h.controller.open();h.controller.close();assert.equal(h.pending,1);h.controller.open();assert.equal(h.index,2,'Rapid reopen waits for the old asynchronous Back');h.flush();assert.equal(h.index,2);assert(h.win.history.state.salahPlayerWindow);assert.equal(h.dismissed,0);h.controller.close();h.flush();assert.equal(h.index,1);assert.equal(h.win.location.href,'https://example.invalid/#home');h.controller.destroy();
}
{
 const h=historyHarness();h.controller.open();h.navigate('#quran');assert.equal(h.dismissed,1,'A real route change dismisses without replacing its destination');h.controller.close();assert.equal(h.pending,0);assert.equal(h.win.location.href,'https://example.invalid/#quran');h.controller.destroy();
}
{
 const h=historyHarness();h.win.history.pushState=()=>{throw Error('History unavailable');};h.controller.open();h.controller.close();assert.equal(h.pending,0);assert.equal(h.win.location.href,'https://example.invalid/#home');h.controller.destroy();
}
{
 const h=historyHarness();h.controller.open();h.controller.destroy();assert.equal(h.pending,0,'Destroy must not schedule route navigation');assert.equal(h.win.history.state.salahPlayerWindow,undefined);assert.equal(h.listeners,0);
}

{
 const h=historyHarness();h.controller.open();h.controller.close();h.navigate('#quran');assert.equal(h.pending,1);h.flush();assert.equal(h.win.location.href,'https://example.invalid/#quran','A delayed layer Back must preserve a destination selected after closing');h.controller.destroy();
}

// The real edge recognizer must cancel both a painted drag and a settling drag
// when a modal opens; a stale completion must never navigate or leave a blank app.
const w=new Window({url:'https://example.invalid/#more'}),doc=w.document,app=doc.createElement('main');doc.body.append(app);app.innerHTML='<h1>Origin</h1>';
app.getBoundingClientRect=()=>({left:0,top:0,width:393,height:844});const frames=new Map();let frameId=0,backs=0;const animations=[];
w.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};w.cancelAnimationFrame=id=>frames.delete(id);
app.animate=()=>{const a={cancel(){this.cancelled=true;}};animations.push(a);return a;};
w.history.back=()=>{backs++;};const dispose=initEdgeBack(app,{win:w,doc});w.history.pushState({},'','#home');w.dispatchEvent(new w.Event('hashchange'));
const edge=doc.querySelector('.app-back-edge'),sheet=doc.createElement('dialog');doc.body.append(sheet);
const pointer=(type,x)=>edge.dispatchEvent(new w.PointerEvent(type,{bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:200}));
const paint=()=>{for(const[id,fn]of [...frames]){frames.delete(id);fn();}};
for(const settling of [false,true]){
 assert.equal(edge.hidden,false);pointer('pointerdown',2);pointer('pointermove',160);paint();assert.match(app.style.transform,/translate3d/);
 if(settling)pointer('pointerup',160);
 sheet.showModal();w.dispatchEvent(new w.Event('salah:player-window'));assert.equal(edge.hidden,true);assert.equal(app.style.transform,'','Opening the player removes the underlying drag transform');assert.equal(frames.size,0);
 animations.at(-1)?.onfinish?.();pointer('pointerup',160);assert.equal(backs,0,'A stale gesture cannot consume Home history');assert.equal(w.location.hash,'#home');
 sheet.close();w.dispatchEvent(new w.Event('salah:player-window'));
}
dispose();assert.equal(doc.querySelector('.app-navigation-edge'),null);assert.equal(app.style.transform,'');await w.happyDOM.close();
console.log('PASS: native player Back preserves Home/Quran origin, rapid reopen and Forward are safe; opening a modal cancels painted/settling edge navigation and removes stale transforms.');
