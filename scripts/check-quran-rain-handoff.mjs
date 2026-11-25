
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';

const win=new Window({url:'https://salah.test/#quran'});
for(const [key,value] of Object.entries({
 window:win,document:win.document,location:win.location,localStorage:win.localStorage,
 navigator:win.navigator,innerHeight:844,getComputedStyle:win.getComputedStyle.bind(win)
}))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
let locked=false;
Object.defineProperty(document,'hidden',{configurable:true,get:()=>locked});
const actions={};
Object.defineProperty(navigator,'mediaSession',{value:{
 setActionHandler(name,action){actions[name]=action;},
 setPositionState(){}
}});

globalThis.fetch=async input=>{
 const url=new URL(String(input),location.href);
 if(url.protocol==='file:'&&url.pathname.endsWith('/assets/player-nature-493/rain.mp3')){
  return new Response(new Uint8Array([1]));
 }
 if(url.origin!=='https://salah.test')return new Response('',{status:404});
 try{return new Response(await fs.readFile(new URL('../dist'+url.pathname,import.meta.url)));}
 catch{return new Response('',{status:404});}
};

const tracks=[],contexts=[];
let holdNextPlay=false,failNextPlay=false,resolvePlay;
globalThis.Audio=class{
 constructor(src){
  this.src=src;this.currentSrc=src;this.currentTime=0;this.duration=70;
  this.readyState=1;this.paused=true;this.ended=false;tracks.push(this);
 }
 async play(){
  if(failNextPlay){failNextPlay=false;throw new DOMException('Playback denied','NotAllowedError');}
  if(holdNextPlay){holdNextPlay=false;await new Promise(resolve=>{resolvePlay=resolve;});}
  this.currentSrc=this.src;this.paused=false;this.ended=false;this.onplay?.();
 }
 pause(){this.paused=true;this.onpause?.();}
 end(){this.currentTime=this.duration;this.ended=true;this.paused=true;this.onended();}
};
globalThis.AudioContext=class{
 state='suspended';currentTime=0;destination={};suspends=0;resumes=0;sources=0;
 constructor(){contexts.push(this);}
 createGain(){
  return{gain:{value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},
   linearRampToValueAtTime(v){this.value=v;}},connect(){},disconnect(){}};
 }
 createBufferSource(){this.sources++;return{connect(){},disconnect(){},start(){},stop(){}};}
 async decodeAudioData(){return{duration:34,numberOfChannels:2};}
 async resume(){this.resumes++;this.setState('running');}
 async suspend(){this.suspends++;this.setState('suspended');}
 async close(){this.setState('closed');}
 setState(state){this.state=state;this.onstatechange?.();}
};

const {mountQuranPlayer}=await import('../dist/js/quran-player-bar.js');
const {quranPlayback}=await import('../dist/js/quran-session.js');
const {loadSurah}=await import('../dist/js/quran-data.js');
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(resolve=>setTimeout(resolve,5));};
const unmount=mountQuranPlayer();
try{
 const reciter='ar.yasseraldossaricontinuous';
 const panel=document.querySelector('#quran-global-player');
 await quranPlayback.start(await loadSurah(96),reciter);await flush();
 panel.querySelector('[data-nature=rain]').click();await flush();
 assert.equal(contexts.length,1);
 const rain=contexts[0],track=tracks[0];
 assert.equal(rain.state,'running');
 const cycles={suspends:rain.suspends,resumes:rain.resumes,sources:rain.sources};
 const observed=[];
 const unsubscribe=quranPlayback.subscribe(({surah,status})=>observed.push([surah?.number,status]));
 try{
  for(const number of [96,97,98]){
   locked=number!==98;
   track.end();await flush();
   assert.equal(quranPlayback.state.surah.number,number+1);
   assert.equal(quranPlayback.state.status,'playing');
   assert.equal(track.paused,false);
   assert.equal(rain.state,'running');
   assert.equal(rain.suspends,cycles.suspends,'A natural chapter handoff must not call AudioContext.suspend()');
   assert.equal(rain.resumes,cycles.resumes,'A natural chapter handoff must not call AudioContext.resume()');
   assert.equal(rain.sources,cycles.sources,'The rain loop keeps its original source');
  }
  assert.ok(observed.some(([surah,status])=>surah===96&&status==='ended'),'End observers still receive the actual status');
  assert.equal(tracks.length,1);
  holdNextPlay=true;
  track.end();await flush();
  assert.equal(quranPlayback.state.surah.number,100);
  assert.equal(quranPlayback.state.status,'loading');
  assert.equal(rain.state,'running');
  actions.pause();
  assert.equal(quranPlayback.state.status,'paused');
  assert.equal(rain.state,'suspended','System Pause silences rain before returning, even while next audio is starting');
  assert.equal(rain.suspends,cycles.suspends+1);
  resolvePlay();await flush();
  assert.equal(track.paused,true,'A late native play cannot override deliberate Pause');
  assert.equal(rain.state,'suspended');

  locked=false;
  await quranPlayback.start(await loadSurah(112),reciter);await flush();
  assert.equal(rain.state,'running');
  locked=true;
  rain.setState('suspended');
  assert.equal(quranPlayback.state.status,'paused','An actual background system suspension still pauses the recitation');
  assert.equal(track.paused,true);

  locked=false;
  await quranPlayback.start(await loadSurah(113),reciter);await flush();
  quranPlayback.setSleepTimer('end');
  locked=true;
  track.end();await flush();
  assert.equal(quranPlayback.state.surah.number,113);
  assert.equal(quranPlayback.state.status,'paused');
  assert.equal(rain.state,'suspended','End-of-surah sleep timer stops ambience');

  locked=false;
  await quranPlayback.start(await loadSurah(114),reciter);await flush();
  assert.equal(rain.state,'running');
  locked=true;
  track.end();await flush();
  assert.equal(quranPlayback.state.status,'ended');
  assert.equal(rain.state,'suspended','The last surah stops ambience');

  locked=false;
  await quranPlayback.start(await loadSurah(96),reciter);await flush();
  assert.equal(rain.state,'running');
  failNextPlay=true;locked=true;
  track.end();await flush();
  assert.equal(quranPlayback.state.surah.number,97);
  assert.equal(quranPlayback.state.status,'error');
  assert.equal(rain.state,'suspended','A failed next audio start must stop ambience');

  locked=false;
  panel.querySelector('[data-nature=off]').click();
  await quranPlayback.start(await loadSurah(96),reciter);await flush();
  locked=true;
  track.end();await flush();
  assert.equal(quranPlayback.state.surah.number,97);
  assert.equal(quranPlayback.state.status,'playing','Consecutive playback works with rain disabled');
  assert.equal(rain.state,'suspended');
 }finally{unsubscribe();}
}finally{
 quranPlayback.stop();unmount();await win.happyDOM.close();
}
console.log('PASS: mounted Quran player keeps rain running across natural handoffs; system Pause during pending play, external suspension, sleep timer, final surah, failed audio start and rain-off behavior.');
