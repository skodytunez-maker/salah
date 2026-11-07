import assert from 'node:assert/strict';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {createDhikrFeedback} from '../dist/js/dhikr-feedback.js';
const window=new Window(),host=window.document.createElement('div'),prefs=new Map();let taps=[],clicks=[],contexts=[],failSave=false,errors=0;
class AudioContext {
 state='suspended';currentTime=10;destination={};
 constructor(){contexts.push(this)}
 resume(){this.state='running';return Promise.resolve()}
 close(){this.state='closed';return Promise.resolve()}
 createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
 createOscillator(){return{frequency:{setValueAtTime(value){clicks.push(value)}},connect(){},disconnect(){},start(){},stop(){}}}
}
const environment={AudioContext,navigator:{vibrate:value=>taps.push(value)},document:{visibilityState:'visible'}};
const options={read:(key,fallback)=>prefs.get(key)??fallback,write:(key,value)=>{if(failSave)return false;prefs.set(key,value);return true},haptic:()=>false,environment:()=>environment,onError:()=>errors++};
const feedback=createDhikrFeedback(options);host.innerHTML=feedback.markup();feedback.bind(host);
feedback.prepare()();assert.equal(taps.length,0);assert.equal(contexts.length,0,'Opted-out sound never creates an audio session');
const toggle=(id,value)=>{const input=host.querySelector('#dhikr-feedback-'+id);input.checked=value;input.onchange();};
toggle('sound',true);assert.equal(clicks.length,1);feedback.prepare()();assert.equal(clicks.length,2);assert.equal(taps.length,0);
toggle('vibration',true);const a=clicks.length,b=taps.length;feedback.prepare()(true);assert.equal(clicks.length,a+1);assert.equal(taps.length,b+1);assert.equal(taps.at(-1),20,'Both outputs can operate together');
const queued=feedback.prepare();feedback.stop();queued();assert.equal(clicks.length,a+1,'Leaving the screen cancels a delayed count click');assert.equal(taps.length,b+1);
environment.document.visibilityState='hidden';feedback.prepare()();assert.equal(clicks.length,a+1);assert.equal(taps.length,b+1);
environment.document.visibilityState='visible';toggle('sound',false);const c=clicks.length;feedback.prepare()();assert.equal(clicks.length,c);assert.equal(taps.at(-1),8);
failSave=true;toggle('sound',true);assert.equal(errors,1);assert.equal(host.querySelector('#dhikr-feedback-sound').checked,false,'Failed persistence must not enable sound');
delete environment.navigator.vibrate;host.innerHTML=feedback.markup();assert.ok(host.querySelector('#dhikr-feedback-vibration').disabled);assert.match(host.textContent,/Вибрация недоступна/);
const restored=createDhikrFeedback(options);assert.ok(!restored.markup().includes('id="dhikr-feedback-sound" type="checkbox" checked'));
feedback.stop();restored.stop();await window.happyDOM.close();
console.log('PASS: independent persisted sound/haptic preferences, simultaneous output, no opt-out audio session, no delayed/hidden-page click, unsupported vibration and failed writes.');
