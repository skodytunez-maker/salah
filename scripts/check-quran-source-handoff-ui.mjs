
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const win=new Window({url:'https://salah.test/#quran'});
for(const [key,value]of Object.entries({window:win,document:win.document,location:win.location,localStorage:win.localStorage,navigator:win.navigator,innerHeight:844,getComputedStyle:win.getComputedStyle.bind(win)}))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
globalThis.fetch=async input=>{const url=new URL(String(input),location.href);if(url.origin!=='https://salah.test')return new Response('',{status:404});try{return new Response(await fs.readFile(new URL('../dist'+url.pathname,import.meta.url)));}catch{return new Response('',{status:404});}};
const tracks=[];
globalThis.Audio=class{
 constructor(src){this.src=src;this.currentSrc=src;this.currentTime=0;this.duration=70;this.readyState=1;this.paused=true;this.ended=false;tracks.push(this);}
 async play(){
  if(this.currentSrc!==this.src){
   this.currentTime=0;this.ended=false;this.paused=true;this.onpause?.();await Promise.resolve();
  }
  this.currentSrc=this.src;this.paused=false;this.ended=false;this.onplay?.();
 }
 pause(){this.paused=true;this.onpause?.();}
 load(){}setAttribute(){}removeAttribute(name){if(name==='src')this.src='';}
};
const {mountQuranPlayer}=await import('../dist/js/quran-player-bar.js');
const {quranPlayback}=await import('../dist/js/quran-session.js');
const {loadSurah}=await import('../dist/js/quran-data.js');
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setTimeout(r,5));};
const dock=document.createElement('div');dock.id='app-bottom-dock';const nav=document.createElement('nav');nav.id='mobile-nav';dock.append(nav);document.body.append(dock);
const unmount=mountQuranPlayer();
await quranPlayback.start(await loadSurah(96),'ar.yasseraldossaricontinuous');await flush();
const panel=document.getElementById('quran-global-player');
assert.equal(panel.hidden,false);
for(const number of [96,97,98,99]){
 assert.equal(quranPlayback.state.surah.number,number);
 assert.equal(quranPlayback.state.status,'playing');
 const audio=tracks[0];audio.currentTime=audio.duration;audio.ended=true;audio.paused=true;audio.onended();await flush();
 assert.equal(quranPlayback.state.surah.number,number+1);
 assert.equal(quranPlayback.state.status,'playing','Mounted player observers cannot cancel new-source playback');
 assert.equal(audio.paused,false);
 assert.equal(tracks.length,1);
}
panel.querySelector('[data-toggle]').click();await flush();
assert.equal(quranPlayback.state.status,'paused');
assert.equal(tracks[0].paused,true);
const src=tracks[0].src;tracks[0].currentTime=12;
panel.querySelector('[data-toggle]').click();await flush();
assert.equal(quranPlayback.state.status,'playing');
assert.equal(tracks[0].src,src);assert.equal(tracks[0].currentTime,12);
quranPlayback.stop();unmount();await win.happyDOM.close();
console.log('PASS: real mounted player, Quran data, short-surah 96→100 source-selection handoffs, one native source, manual Pause and same-position Resume. Audio events are modeled; no phone verification claimed.');
