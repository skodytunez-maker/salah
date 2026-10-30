import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{preloadPronunciation}from '../dist/js/pronunciation-preload.js';
import{foregroundAudioBusy}from '../dist/js/audio-focus.js';
const fixture=()=>({loads:0,preload:'none',load(){this.loads++;},play(){assert.fail('Preparation cannot play audio');}});
let a=fixture();assert.equal(preloadPronunciation(a,{nav:{onLine:true},doc:{hidden:false},busy:()=>false}),true);assert.equal(a.preload,'auto');assert.equal(a.loads,1);assert.equal(foregroundAudioBusy(),false);
for(const state of [{nav:{onLine:false}},{nav:{connection:{saveData:true}}},{doc:{hidden:true}},{busy:()=>true}]){a=fixture();assert.equal(preloadPronunciation(a,{nav:{},doc:{hidden:false},busy:()=>false,...state}),false);assert.equal(a.preload,'none');assert.equal(a.loads,0);}
a=fixture();a.load=()=>{throw Error('not available');};assert.equal(preloadPronunciation(a,{nav:{},doc:{hidden:false},busy:()=>false}),false);assert.equal(a.preload,'none');assert.equal(preloadPronunciation(null),false);
const sw=await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8');assert.ok(sw.includes('"./js/pronunciation-preload.js"'));
for(const path of ['adhkar.js','dua-pronunciation.js']){const source=await fs.readFile(new URL('../dist/js/'+path,import.meta.url),'utf8');assert.match(source,/preloadPronunciation\(audio\)|preloadPronunciation\(dhikrAudio\)/);}
console.log('PASS: current-card preparation without play/focus, hidden/offline/data-saver/other-audio gates, failed preload fallback and offline-shell import.');
