import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {bindQiblaSwipe} from '../dist/js/home-swipe.js';
import {bindOwnerCardNavigation} from '../dist/js/owner-card-navigation.js';

const files=Object.fromEntries(await Promise.all(['adhkar','learning'].map(async name=>[name,await readFile(new URL('../dist/js/'+name+'.js',import.meta.url),'utf8')])));
function horizontal(kind){
 const listeners=new Map(),moves=[];let selected='';
 const shell={tabIndex:0,addEventListener:(type,fn)=>listeners.set(type,fn),setPointerCapture(){}};
 const host={querySelector:selector=>selector.endsWith('shell')?shell:{click:()=>moves.push(selector.endsWith('next')?1:-1),focus(){}}};
 const name=kind==='adhkar'?'bindSwipe':'bindLessonNavigation';
 const context=createContext({host,window:{getSelection:()=>({toString:()=>selected})},Date,cursor:1,suppressTapUntil:0,moveLesson:direction=>moves.push(direction)});
 new Script(files[kind].split('\n').find(line=>line.startsWith('function '+name+'('))+';'+name+'()').runInContext(context);
 return{listeners,moves,context,select:text=>selected=text};
}
const pointer=(x,y,extra={})=>({isPrimary:true,button:0,pointerType:'touch',pointerId:1,clientX:x,clientY:y,timeStamp:100,target:{closest:()=>null},preventDefault(){},...extra});
for(const kind of ['adhkar','learning']){
 const h=horizontal(kind),emit=(type,event)=>h.listeners.get(type)?.(event);
 for(const [x,expected]of [[80,1],[300,-1]]){emit('pointerdown',pointer(190,200));emit('pointerup',pointer(x,205));assert.equal(h.moves.at(-1),expected,kind+' direction');}
 const before=h.moves.length;
 emit('pointerdown',pointer(190,200));emit('pointerup',pointer(175,350));
 emit('pointerdown',pointer(190,200));emit('pointercancel',{});emit('pointerup',pointer(70,205));
 emit('pointerdown',pointer(190,200));emit('pointerup',pointer(70,205,{pointerId:2}));
 emit('pointerdown',pointer(190,200,{pointerType:'mouse'}));emit('pointerup',pointer(70,205,{pointerType:'mouse'}));
 h.select('Выделенный текст');emit('pointerdown',pointer(190,200));emit('pointerup',pointer(70,205));h.select('');
 // An ignored second touch/control must clear an old start, not reuse it.
 for(const ignored of [{isPrimary:false},{button:2},{target:{closest:()=>({})}}]){emit('pointerdown',pointer(190,200));emit('pointerdown',pointer(190,200,ignored));emit('pointerup',pointer(70,205));}
 assert.equal(h.moves.length,before,kind+' scrolling, cancellation, selection, mouse and controls cannot turn a page');
 emit('keydown',{key:'ArrowLeft',target:{closest:()=>({})},preventDefault(){}});assert.equal(h.moves.length,before,'Keyboard controls retain their own actions');
 if(kind==='adhkar'){emit('pointerdown',pointer(190,200));emit('pointercancel',{});let blocked=false;emit('click',{isTrusted:true,preventDefault(){blocked=true},stopPropagation(){}});assert.equal(blocked,true,'Cancelled scroll cannot open the explanation as a tap');}
}
const listeners=new Map();let opened=0,selection='';
const surface={ownerDocument:{defaultView:{getSelection:()=>({toString:()=>selection})}},addEventListener:(type,fn)=>listeners.set(type,fn),setPointerCapture(){}};
bindQiblaSwipe(surface,()=>opened++);
const swipe=(end,extra={})=>{listeners.get('pointerdown')(pointer(180,250,extra));listeners.get('pointerup')(pointer(...end,{timeStamp:400,...extra}));};
swipe([182,150]);assert.equal(opened,1);
swipe([80,245]);swipe([180,340]);swipe([180,150],{isPrimary:false});swipe([180,150],{target:{closest:()=>({})}});
selection='Текст';swipe([180,150]);selection='';assert.equal(opened,1);
listeners.get('pointerdown')(pointer(180,250));listeners.get('pointercancel')();listeners.get('pointerup')(pointer(180,150,{timeStamp:400}));assert.equal(opened,1);
let clickBlocked=false;listeners.get('click')({preventDefault(){clickBlocked=true},stopImmediatePropagation(){}});assert.equal(clickBlocked,true,'Qibla gesture must not also open the clock');
let closed=0;const detail={};bindOwnerCardNavigation(detail,{dismiss:()=>closed++,isOpen:()=>true,win:{getSelection:()=>({toString:()=>''})}});
detail.onpointerdown(pointer(200,100,{button:2}));detail.onpointerup(pointer(80,100));assert.equal(closed,0);
console.log('PASS: all four swipe surfaces keep intended directions and reject scrolling, cancelled/mismatched pointers, selection, controls and duplicate clicks.');
