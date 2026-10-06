import assert from 'node:assert/strict';
import {normalizeStandaloneLaunch} from '../dist/js/app-start.js';
import {readFile} from 'node:fs/promises';

function run({hash, standalone=true, pathname='/salah/', search=''}) {
  const locationObject={hash,pathname,search};
  const calls=[];
  const historyObject={state:null,replaceState:(state,title,url)=>calls.push({state,title,url})};
  const result=normalizeStandaloneLaunch({locationObject,historyObject,isStandalone:standalone});
  return {result,calls};
}
const installedSettings=run({hash:'#settings'});
assert.equal(installedSettings.result,true);
assert.deepEqual(installedSettings.calls,[{state:null,title:'',url:'/salah/#home'}]);
assert.equal(run({hash:'#settings',standalone:false}).result,false);
assert.equal(run({hash:'#quran'}).result,false);
assert.equal(run({hash:'#adhkar?group=morning'}).result,false);
assert.equal(run({hash:'#settings',search:'?source=shortcut'}).calls[0].url,'/salah/?source=shortcut#home');

const manifest=JSON.parse(await readFile(new URL('../dist/manifest.json',import.meta.url),'utf8'));
assert.equal(manifest.start_url,'./#home');
console.log('PASS: installed SALAH starts on Home, while web sessions and deep links stay unchanged.');
