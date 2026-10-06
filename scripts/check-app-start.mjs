import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
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

// Execute the actual application call with the prayer journal bound to "history",
// exactly as in app.js. This used to throw before nav or the first screen rendered.
const appSource=await readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');
const launchCall=appSource.split('\n').find(line=>line.startsWith('normalizeStandaloneLaunch('));
assert.ok(launchCall,'App launch must normalize installed settings navigation');
for(const [hash,standalone,displayStandalone,expected]of [
 ['#settings',true,false,'#home'],['#settings',false,true,'#home'],
 ['#settings',false,false,'#settings'],['#home',true,false,'#home'],
 ['#quran',true,false,'#quran'],['#adhkar?group=morning&view=card&item=surah112',true,false,'#adhkar?group=morning&view=card&item=surah112']
]){
 const journal={'2026-10-07':{Fajr:'done'}},before=JSON.stringify(journal);
 const location={hash,pathname:'/salah/',search:''};let rendered=0;
 const browserHistory={state:{salahRouteStep:'existing-step'},replaceState(state,_title,url){this.state=state;location.hash=url.slice(url.indexOf('#'))}};
 runInNewContext(launchCall+'\nrender();',{normalizeStandaloneLaunch,location,history:journal,
  window:{history:browserHistory,matchMedia:()=>({matches:displayStandalone})},navigator:{standalone},render:()=>rendered++});
 assert.equal(rendered,1,'Installed app must reach the first render after reload');
 assert.equal(location.hash,expected);assert.equal(JSON.stringify(journal),before,'Prayer history is preserved');
 assert.equal(browserHistory.state.salahRouteStep,'existing-step','Existing navigation state is preserved');
}
const denied={hash:'#settings',pathname:'/salah/',search:''};
assert.equal(normalizeStandaloneLaunch({locationObject:denied,historyObject:{},isStandalone:true}),false);
assert.doesNotThrow(()=>normalizeStandaloneLaunch({locationObject:denied,historyObject:{replaceState(){throw Error('History unavailable')}},isStandalone:true}));
assert.equal(denied.hash,'#settings','Denied navigation still allows the settings screen to render');

const worker=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
const assets=JSON.parse(worker.match(/const ASSETS=(\[[^;]+\]);/)[1]);
for(const match of appSource.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g)){
 const path=new URL(match[1],new URL('../dist/js/app.js',import.meta.url)).pathname;
 const asset='./'+path.slice(path.lastIndexOf('/dist/')+6);
 assert.ok(assets.includes(asset),'Mandatory startup import must be precached: '+asset);
}
console.log('PASS: actual app bootstrap reaches render after an installed Settings update, preserves prayer/navigation data, survives denied history and caches every startup import.');
