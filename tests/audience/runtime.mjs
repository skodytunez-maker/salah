import assert from 'node:assert/strict';
import{Window}from '../staff/node_modules/happy-dom/lib/index.js';
import{AUDIENCE_KEY}from '../../dist/js/audience-core.js';
const mode=process.argv[2],win=new Window({url:'https://localhost/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
win.document.body.innerHTML='<main id="app"></main><dialog id="modal"><div id="modal-content"></div></dialog><div id="toast" hidden></div>';
Object.assign(globalThis,{window:win,document:win.document,localStorage:win.localStorage,location:win.location});
let nativeChoices=[],requests=0,authFactories=0,cameraCalls=0,locationCalls=0;
globalThis.fetch=async()=>{requests++;throw Error('Unexpected remote request');};
win.supabase={createClient(){authFactories++;return {auth:{onAuthStateChange(){}}};}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,mediaDevices:{getUserMedia(){cameraCalls++;throw Error('camera');}},geolocation:{getCurrentPosition(){locationCalls++;}}}});
globalThis.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'android',Plugins:{SalahSupportPush:{getStatus:async()=>({familiesRequired:mode!=='legacy'}),setAudience:async value=>{nativeChoices.push(value.adult);if(mode==='native-failure')throw Error('unavailable');}}}};
if(mode==='child')win.localStorage.setItem(AUDIENCE_KEY,JSON.stringify({version:1,group:'restricted'}));
if(mode==='adult'||mode==='native-failure')win.localStorage.setItem(AUDIENCE_KEY,JSON.stringify({version:1,group:'adult'}));
const {ensureAudienceChoice,personalDataAllowed}=await import('../../dist/js/audience.js');
assert.equal(personalDataAllowed(),false,'Unknown native audience is restricted before startup');
const choice=ensureAudienceChoice({now:()=>new Date(2026,9,16,12)}).then(value=>({value}),error=>({error}));
if(['unknown','birth-child','birth-adult'].includes(mode)){
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(document.querySelector('.audience-gate'));assert.equal(requests,0);assert.equal(personalDataAllowed(),false);
 if(mode==='unknown')document.querySelector('[data-private]').click();
 else{document.querySelector('#audience-birth-date').value=mode==='birth-adult'?'2000-01-15':'2015-02-03';document.querySelector('.audience-gate form').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));}
}
const result=await choice;
if(mode==='native-failure'){assert.ok(result.error);assert.equal(personalDataAllowed(),false);assert.ok(document.getElementById('app').textContent.includes('защиту'));}
else if(mode==='adult'||mode==='legacy'||mode==='birth-adult'){
 assert.equal(result.value,'adult');assert.equal(personalDataAllowed(),true);
 assert.deepEqual(nativeChoices,mode==='legacy'?[]:[true]);
 const {accountAuthClient}=await import('../../dist/js/owner-auth.js');accountAuthClient();assert.equal(authFactories,1);
 assert.equal(document.querySelector('meta[http-equiv="Content-Security-Policy"]'),null);
}else{
 assert.equal(result.value,'restricted');assert.equal(personalDataAllowed(),false);assert.deepEqual(nativeChoices,[false]);
 assert.deepEqual(JSON.parse(localStorage.getItem(AUDIENCE_KEY)),{version:1,group:'restricted'});
 assert.equal(document.querySelector('.audience-gate'),null);
 const policy=document.querySelector('meta[http-equiv="Content-Security-Policy"]');assert.ok(policy);assert.ok(!policy.content.includes('supabase'));assert.ok(policy.content.includes("frame-src 'none'"));
 const {accountAuthClient}=await import('../../dist/js/owner-auth.js');assert.throws(accountAuthClient,/Личные данные защищены/);assert.equal(authFactories,0);
 const {loadCompetition}=await import('../../dist/js/competition-client.js');assert.deepEqual(await loadCompetition(),[]);
 const {loadPopularReciters}=await import('../../dist/js/reciter-popularity.js');assert.deepEqual(await loadPopularReciters(),[]);
 const {sendErrorBatch}=await import('../../dist/js/error-reporting.js');await sendErrorBatch([],337);
 const {locateCity}=await import('../../dist/js/city-data.js');await assert.rejects(()=>locateCity({latitude:57,longitude:65}),/вручную/);
 const {mountQrScanner}=await import('../../dist/js/qr-scanner.js');const button=document.createElement('button');document.body.append(button);const scanner=mountQrScanner(document.getElementById('app'),{entryButton:button});scanner.open();assert.equal(button.hidden,true);assert.equal(cameraCalls,0);assert.equal(locationCalls,0);
 const a=document.createElement('a');a.href='https://www.instagram.com/salahbysaadi/';document.body.append(a);const click=new win.MouseEvent('click',{bubbles:true,cancelable:true});a.dispatchEvent(click);assert.equal(click.defaultPrevented,true);
}
const {illustratedReleaseMarkup,bindIllustratedRelease}=await import('../../dist/js/release-gallery.js');const news=document.createElement('div');news.innerHTML=illustratedReleaseMarkup(338);assert.doesNotThrow(()=>bindIllustratedRelease(news));assert.equal(news.querySelector('.release-feature').getAttribute('aria-hidden'),'false');
assert.equal(requests,0);await win.happyDOM.close();console.log('PASS audience runtime: '+mode+'; no unintended network, camera or profile exposure');
