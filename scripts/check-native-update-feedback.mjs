import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {checkNativeUpdate,registerAppWorker,checkAppUpdate,updateStatusMessage} from '../dist/js/pwa-updates.js';
const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
let registrations=0;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,serviceWorker:{getRegistrations:async()=>[],register:async()=>{registrations++;throw Error('Native must not register a browser worker');}}}});
globalThis.document={addEventListener(){}};
for(const status of ['current','available','loading','native-required','rolled-back'])
 assert.equal(await checkNativeUpdate({check:async()=>({status})}),status);
for(const updater of [null,{check:async()=>{throw Error('bridge failed');}},{check:async()=>({status:'unknown'})},{check:async()=>({status:'unavailable'})}])
 assert.equal(await checkNativeUpdate(updater),'native-unavailable');
assert.equal(await checkNativeUpdate({check:()=>new Promise(()=>{})},{timeoutMs:5}),'loading','A stalled native download cannot strand the button');
navigator.onLine=false;assert.equal(await checkNativeUpdate({check:()=>{throw Error('Must not be called offline');}}),'offline');navigator.onLine=true;
globalThis.Capacitor={isNativePlatform:()=>true,Plugins:{}};
await registerAppWorker();assert.equal(await checkAppUpdate(),'native-unavailable');assert.equal(registrations,0);
globalThis.Capacitor.Plugins.SalahLiveUpdate={check:async()=>({status:'native-required'})};
await registerAppWorker();assert.equal(await checkAppUpdate(),'native-required');assert.equal(registrations,0);
assert.ok(updateStatusMessage('native-required').includes('Google Play'));
assert.ok(updateStatusMessage('rolled-back').includes('не запустилось'));
assert.ok(!updateStatusMessage('unavailable').includes('браузер'));
assert.equal(updateStatusMessage('available'),'','Already handled by the native checker');
const app=await readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');
assert.match(await readFile(new URL('../dist/style.css',import.meta.url),'utf8'),/#install\[hidden\]\{display:none!important\}/,'Button styles must not override hidden native install action');
const begin=app.indexOf("document.getElementById('check-update').onclick=async()=>");
const end=app.indexOf("document.getElementById('release-notes')",begin);
assert.ok(begin>=0&&end>begin);
const callback=app.slice(begin,end),messages=[];
const label={textContent:'Обновить'},button={disabled:false,isConnected:true,querySelector:()=>label};
for(const status of ['current','loading','offline','native-unavailable','native-required','rolled-back']){
 vm.runInNewContext(callback,{document:{getElementById:()=>button},checkAppUpdate:async()=>status,updateStatusMessage,toast:message=>messages.push(message)});
 const operation=button.onclick();assert.equal(button.disabled,true);await operation;
 assert.equal(button.disabled,false);assert.equal(label.textContent,'Обновить');assert.equal(messages.at(-1),updateStatusMessage(status));
}
delete globalThis.Capacitor;delete globalThis.document;
if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;
console.log('PASS: native failures, rollback, required Play update and slow download produce accurate feedback and restore the button; missing bridge never starts a browser worker.');
