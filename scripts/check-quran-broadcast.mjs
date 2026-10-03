import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createQuranBroadcast} from '../dist/js/quran-broadcast.js';

const events=new Map(),listeners=new Set(),frames=[];
let pauses=0,detaches=0,doc;
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.attributes=new Map();this.dataset={};this.inert=false;this.isConnected=true;this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,value)=>value?this.classes.add(x):this.classes.delete(x)};this.nodes=new Map()}
 setAttribute(key,value){this.attributes.set(key,value)}
 removeAttribute(key){this.attributes.delete(key)}
 matches(selector){return selector.split(',').includes(this.tag)}
 focus(){doc.activeElement=this}
 append(element){this.children.push(element);element.parent=this}
 replaceChildren(...children){for(const child of this.children)child.isConnected=false;this.children=children;for(const child of children)child.parent=this}
 before(element){this.parent.nodes.set('[data-broadcast-audio]',element)}
 remove(){this.isConnected=false;this.parent.children=this.parent.children.filter(child=>child!==this)}
 querySelector(key){return this.nodes.get(key)}
 querySelectorAll(key){return key==='[data-channel]'?this.channels:key==='button,a[href],iframe'?[this.nodes.get('[data-broadcast-size]'),this.nodes.get('[data-broadcast-stop]'),...this.channels,this.nodes.get('a')]:[]}
 set innerHTML(html){
  if(html.includes("quran-live-audio")){this.nodes.set("[data-audio-toggle]",new Element("button"));this.nodes.set("[data-audio-status]",new Element());return}
  const section=new Element();this.nodes.set('.quran-broadcast-dialog',section);
  for(const key of ['.quran-broadcast-screen','.quran-broadcast-place','.quran-broadcast-title','.quran-broadcast-note','[data-broadcast-size]','[data-broadcast-stop]','a'])section.nodes.set(key,Object.assign(new Element(),{parent:section}));
  section.channels=['makkah','madinah'].map(channel=>Object.assign(new Element('button'),{dataset:{channel}}));
 }
}
const body=new Element('body'),main=new Element('main'),alreadyInert=new Element('nav'),dialog=new Element('dialog'),launch=new Element('button');alreadyInert.inert=true;body.append(main);body.append(alreadyInert);body.append(dialog);
doc={body,activeElement:launch,createElement:tag=>{const element=new Element(tag);if(tag==='iframe')frames.push(element);return element},querySelector:()=>main};
const win={addEventListener:(type,listener)=>events.set(type,listener),removeEventListener:(type,listener)=>{if(events.get(type)===listener)events.delete(type)}};
const playback={pause:()=>pauses++,subscribe:listener=>{listeners.add(listener);listener({status:'paused'});return()=>{listeners.delete(listener);detaches++}}};
let audioStarts=0,audioStops=0,audioElement=null;
const createAudio=()=>({state:{status:'playing'},start(){audioStarts++;audioElement?.remove();audioElement=doc.createElement('audio');return audioElement},toggle(){},stop(){audioStops++;audioElement?.remove();audioElement=null}});
const live=createQuranBroadcast({doc,win,playback,createAudio});
live.minimize();live.stop();assert.equal(frames.length,0,'No iframe or stream loads before opening');
live.open();const root=body.children.at(-1),section=root.querySelector('.quran-broadcast-dialog'),screen=section.querySelector('.quran-broadcast-screen'),first=frames[0];
assert.equal(pauses,1);assert.equal(main.inert,true);assert.equal(dialog.inert,false);
assert.equal(first.referrerPolicy,'strict-origin-when-cross-origin');assert.equal(first.attributes.get('sandbox'),'allow-scripts allow-same-origin allow-presentation');assert.match(first.src,/youtube-nocookie\.com\/embed\/eC4LfEVxvKg/);
section.querySelector('[data-broadcast-size]').onclick();assert.equal(live.state.minimized,true);assert.equal(main.inert,false);assert.equal(alreadyInert.inert,true);assert.equal(doc.activeElement,launch);
events.get('hashchange')();live.minimize();assert.equal(screen.children[0],first);assert.equal(first.isConnected,true);assert.equal(frames.length,1,'Minimizing and navigation retain the connected iframe');
live.open();assert.equal(screen.children[0],first);assert.equal(frames.length,1,'Reopening the broadcast only expands it');assert.equal(live.state.minimized,false);
section.channels[1].onclick();assert.equal(frames.length,2);assert.equal(first.isConnected,false);assert.equal(live.state.channel,'madinah');const medina=frames.at(-1);section.channels[1].onclick();assert.equal(frames.length,2,'Choosing the current channel does not restart it');
root.onkeydown({key:'Escape',preventDefault(){}});assert.equal(live.state.minimized,true);assert.equal(screen.children[0],medina);
for(const listener of listeners)listener({status:'loading'});assert.equal(live.state.active,false);assert.equal(medina.isConnected,false);assert.equal(events.size,0);assert.equal(listeners.size,0);assert.equal(detaches,1,'Starting recitation closes the competing live stream');
live.open();const finalRoot=body.children.at(-1);finalRoot.querySelector('.quran-broadcast-dialog').querySelector('[data-broadcast-stop]').onclick();assert.equal(live.state.active,false);assert.equal(main.inert,false);assert.equal(alreadyInert.inert,true);assert.equal(events.size,0);assert.equal(listeners.size,0);live.stop();
live.open();const audioRoot=body.children.at(-1),audioSection=audioRoot.querySelector('.quran-broadcast-dialog');audioSection.querySelector('[data-broadcast-audio]').onclick();const retainedAudio=audioElement;assert.equal(live.state.audio,true);assert.equal(audioStarts,1);live.minimize();events.get('hashchange')();live.open();assert.equal(audioElement,retainedAudio);assert.equal(retainedAudio.isConnected,true);assert.equal(audioStarts,1,'Minimizing/navigation/expand cannot restart background audio');audioSection.channels[1].onclick();assert.equal(audioStarts,2);assert.equal(retainedAudio.isConnected,false);live.stop();assert.equal(audioStops,1);assert.equal(audioElement,null);
const reader=await readFile(new URL('../dist/js/quran.js',import.meta.url),'utf8');assert.match(reader,/stopQuran\(\)\{minimizeQuranBroadcast\(\)/,'Leaving the reader minimizes the broadcast');
console.log('PASS: lazy stream loading, connected iframe across minimize/navigation/expand, channel changes, audio exclusivity, focus and inert restoration, close cleanup.');
