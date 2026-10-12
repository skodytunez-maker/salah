import assert from 'node:assert/strict';
const URLParams=URLSearchParams;
import {runInNewContext} from 'node:vm';
import {normalizeStandaloneLaunch,rememberStandaloneResume,WARM_LAUNCH_KEY} from '../dist/js/app-start.js';
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
assert.equal(run({hash:'#quran'}).result,true);
assert.equal(run({hash:'#adhkar?group=morning'}).result,true);
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
 ['#quran',true,false,'#home'],['#adhkar?group=morning&view=card&item=surah112',true,false,'#adhkar?group=morning&view=card&item=surah112']
]){
 const journal={'2026-10-07':{Fajr:'done'}},before=JSON.stringify(journal);
 const location={hash,pathname:'/salah/',search:''};let rendered=0;
 const browserHistory={state:{salahRouteStep:'existing-step'},replaceState(state,_title,url){this.state=state;location.hash=url.slice(url.indexOf('#'))}};
 runInNewContext(launchCall+'\nrender();',{normalizeStandaloneLaunch,location,history:journal,
  window:{history:browserHistory,matchMedia:()=>({matches:displayStandalone})},navigator:{standalone},URLSearchParams:URLParams,render:()=>rendered++});
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

for(const type of ['reload','back_forward']){const loc={hash:'#quran',pathname:'/salah/',search:''};assert.equal(normalizeStandaloneLaunch({locationObject:loc,historyObject:{replaceState(){throw Error('Should preserve resume');}},isStandalone:true,navigationType:type}),false);}assert.equal(run({hash:'#quran',search:'?entry=shortcut'}).result,false);assert.equal(run({hash:'#quran?surah=2&ayah=255'}).result,false);assert.equal(run({hash:'#support?thread=example'}).result,false);assert.equal(run({hash:'#access_token=callback'}).result,false);assert.equal(run({hash:'#account',search:'?code=callback'}).result,false);console.log('PASS: fresh installed/native launches use Home; reload/warm documents, shortcuts, auth and item/message deep links remain intact.');

const resumeStorage=new Map(),storageObject={getItem:k=>resumeStorage.get(k),setItem:(k,v)=>resumeStorage.set(k,v),removeItem:k=>resumeStorage.delete(k)},resumeEvents={},resumeDoc={hidden:true,addEventListener:(k,f)=>resumeEvents[k]=f},resumeLocation={hash:'#quran?surah=2&ayah=3'};rememberStandaloneResume({storageObject,locationObject:resumeLocation,documentObject:resumeDoc,windowObject:{addEventListener(){}},isStandalone:true});resumeEvents.visibilitychange();const recovered={hash:'#home',pathname:'/salah/',search:''},resumeHistory={state:{},replaceState(_s,_t,url){recovered.hash=url.slice(url.indexOf('#'));}};assert.equal(normalizeStandaloneLaunch({locationObject:recovered,historyObject:resumeHistory,isStandalone:true,storageObject}),true);assert.equal(recovered.hash,resumeLocation.hash);assert.equal(resumeStorage.has(WARM_LAUNCH_KEY),false);resumeEvents.visibilitychange();resumeDoc.hidden=false;resumeEvents.visibilitychange();assert.equal(resumeStorage.has(WARM_LAUNCH_KEY),false);resumeLocation.hash='#account?qr=private-request';resumeDoc.hidden=true;resumeEvents.visibilitychange();assert.equal(resumeStorage.has(WARM_LAUNCH_KEY),false);console.log('PASS: minimized installed documents preserve their exact safe route after process restoration; same-document resume clears marker and auth/QR secrets are never recorded.');
