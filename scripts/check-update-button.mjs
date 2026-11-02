import assert from 'node:assert/strict';
import{mountUpdateButton}from '../dist/js/update-button.js';

function fixture(options){
 const label={textContent:'Обновить'},attributes={},status={hidden:true,textContent:'',setAttribute(k,v){this[k]=v;}};
 const button={disabled:false,isConnected:true,ownerDocument:{createElement:()=>status},querySelector:()=>label,setAttribute(k,v){attributes[k]=v;},removeAttribute(k){delete attributes[k];},after(node){root.status=node;}};
 const root={status:null,querySelector(selector){return selector==='#check-update'?button:this.status;}};
 mountUpdateButton(root,options);return{root,button,label,status,attributes};
}
let finish,checks=0,applies=0;
const loading=fixture({check:()=>{checks++;return new Promise(resolve=>finish=resolve);},apply:async()=>{applies++;return'updating';}});
const first=loading.button.onclick();assert.equal(loading.button.disabled,true);assert.equal(loading.attributes['aria-busy'],'true');assert.match(loading.label.textContent,/Проверяем/);assert.equal(loading.status.hidden,false);assert.match(loading.status.textContent,/Проверяем/);
await Promise.resolve();await loading.button.onclick();assert.equal(checks,1,'Duplicate taps share the in-progress action');
finish('available');await first;assert.equal(applies,1);assert.match(loading.status.textContent,/Устанавливаем/);assert.equal(loading.button.disabled,false);assert.equal(loading.attributes['aria-busy'],undefined);assert.equal(loading.label.textContent,'Обновить');
assert.equal(loading.status.role,'status');assert.equal(loading.status['aria-live'],'polite');assert.equal(loading.attributes['aria-describedby'],'app-update-status');

for(const [state,pattern]of [['current',/последняя версия/],['loading',/загружается/],['offline',/интернет/],['unavailable',/пока недоступна/]]){
 let applied=0;const ui=fixture({check:async()=>state,apply:async()=>{applied++;return'updating';}});await ui.button.onclick();assert.match(ui.status.textContent,pattern);assert.equal(ui.status.hidden,false);assert.equal(applied,0);assert.equal(ui.button.disabled,false);
}
for(const [state,pattern]of [['deferred',/после завершения/],['restart',/тот же значок/]]){const ui=fixture({check:async()=> 'available',apply:async()=>state});await ui.button.onclick();assert.match(ui.status.textContent,pattern);}
const failure=fixture({check:async()=>{throw Error('offline failure');},apply:()=>{throw Error('must not apply');}});await failure.button.onclick();assert.match(failure.status.textContent,/Не удалось/);assert.equal(failure.button.disabled,false);

let late,lateApplies=0;const timeout=fixture({timeoutMs:5,check:()=>new Promise(resolve=>late=resolve),apply:async()=>{lateApplies++;return'updating';}});await timeout.button.onclick();assert.match(timeout.status.textContent,/больше времени/);assert.equal(timeout.button.disabled,false);late('available');await Promise.resolve();await Promise.resolve();assert.equal(lateApplies,0,'A timed-out check cannot apply later behind the user');
let departedResolve;const departed=fixture({check:()=>new Promise(resolve=>departedResolve=resolve),apply:async()=>{throw Error('Detached button cannot apply');}});const pending=departed.button.onclick();await Promise.resolve();departed.button.isConnected=false;departedResolve('available');await pending;
console.log('PASS: immediate/persistent accessible Update feedback, one-action apply, every outcome, timeout recovery, duplicate taps, failures and departed screens.');
