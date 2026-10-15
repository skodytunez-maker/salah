import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {createRuqyahSession} from '../dist/js/ruqyah-session.js';
import {RUQYAH_RECORDINGS} from '../dist/js/ruqyah-catalog.js';
import {RECITERS,reciterInfo} from '../dist/js/quran-reciters.js';
import {createListeningMeter,formatListeningTime,listeningDayKey,listeningPeriodTotals,addListeningDay} from '../dist/js/reciter-popularity-core.js';

let credited=0;
const meter=createListeningMeter({onProgress:(_,n)=>credited+=n});
const recording=(id,position,seekRevision=0)=>({reciter:'ar.alafasy',recordingId:id,positionSeconds:position,seekRevision,status:'playing'});
meter.sample(recording('first',0),0,true);
meter.sample(recording('second',1),1000,true);
assert.equal(credited,0,'Switching recordings by the same reader must establish a new baseline');
meter.sample(recording('second',2),2000,true);
assert.equal(credited,1);
meter.sample(recording('second',4,1),3000,true);
assert.equal(credited,1,'Even a small forward seek is not listening');

let clock=Date.parse('2026-10-15T12:00:00Z'),auth={signedIn:true,userId:'listener-one'},tick,competition;
const tracks=[],store=new Map(),reports=[],events=new Map(),quranListeners=new Set();
let quran={status:'stopped',reciter:null,surah:null};
const quranPlayback={get state(){return quran},subscribe(fn){quranListeners.add(fn);fn();return()=>quranListeners.delete(fn)}};
const emitQuran=()=>{for(const fn of quranListeners)fn();};
class Audio {
 constructor(){this.currentTime=0;this.duration=5000;this.paused=true;tracks.push(this);}
 async play(){this.paused=false;this.onplay?.();}
 pause(){this.paused=true;this.onpause?.();}
}
const ruqyah=createRuqyahSession({createAudio:()=>new Audio(),media:{update(){},clear(){}},focus(){},claim(){if(quran.status==='playing'){quran={...quran,status:'paused'};emitQuran();}}});
const source=await fs.readFile(new URL('../dist/js/reciter-popularity.js',import.meta.url),'utf8');
const context=vm.createContext({initCompetition:options=>competition=options,read:(k,d)=>store.has(k)?store.get(k):d,write:(k,v)=>{store.set(k,structuredClone(v));return true;},esc:String,OWNER_PROJECT_URL:'https://fixture.invalid',OWNER_PUBLIC_KEY:'fixture',RECITERS,reciterInfo,createListeningMeter,formatListeningTime,listeningDayKey,listeningPeriodTotals,addListeningDay,Date,window:{addEventListener:(n,f)=>events.set(n,f),dispatchEvent(){}},document:{hidden:false,addEventListener(){}},navigator:{onLine:true},crypto:{randomUUID},Event:class{},setInterval:f=>tick=f,AbortSignal,fetch:async(_url,options)=>{reports.push(JSON.parse(options.body));return{ok:true,json:async()=>({ok:true,counted:true})};}});
const api=vm.runInContext(source.replace(/^import.*\n/gm,'').replace(/^export \{.*\};?$/gm,'').replace(/export /g,'')+';({initReciterPopularity,personalListening});',context);
api.initReciterPopularity({playback:quranPlayback,ruqyah,getAccount:()=>auth,getClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:auth.userId},access_token:'fixture'}}})}}),now:()=>clock});
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));};
const totals=id=>api.personalListening().totals[id]||0;
const advance=async seconds=>{for(let i=0;i<seconds;i++){clock+=1000;const a=tracks.at(-1);if(a&&!a.paused){a.currentTime+=1;a.ontimeupdate?.();}await tick();}};
assert.equal(tracks.length,0,'Statistics must not start audio');
ruqyah.start('luhaidan-audio');await flush();await advance(65);
assert.equal(totals('ar.muhammadalluhaidan'),65,'Ruqyah credits the real reader in My Top');
assert.equal(reports.length,1,'A full minute reaches the shared Top SALAH queue');
assert.equal(reports[0].reciter,'ar.muhammadalluhaidan');
assert.deepEqual(Object.keys(reports[0]).sort(),['consent','eventId','reciter'],'No recording, verse or extra personal information is transmitted');
assert.equal(competition.getSnapshot().totals['ar.muhammadalluhaidan'],65,'Competition and hour awards use the same accumulated listening');
ruqyah.pause();clock+=300000;await tick();assert.equal(totals('ar.muhammadalluhaidan'),65,'Paused time is excluded');
ruqyah.seek(500);ruqyah.toggle();await flush();await advance(5);
assert.equal(totals('ar.muhammadalluhaidan'),70,'Resume credits only new playback, not the seek');
clock+=1000;ruqyah.seek(tracks.at(-1).currentTime+2);await tick();
assert.equal(totals('ar.muhammadalluhaidan'),70,'Small seek jumps are excluded in the real session');
await advance(1);assert.equal(totals('ar.muhammadalluhaidan'),71);
ruqyah.stop();quran={status:'playing',reciter:'ar.alafasy',surah:{number:1},trackPositionSeconds:0};emitQuran();
for(let i=0;i<5;i++){clock+=1000;quran={...quran,trackPositionSeconds:i+1};emitQuran();await tick();}
assert.equal(totals('ar.alafasy'),5,'Ordinary Quran playback still counts after ruqyah');
ruqyah.start('alafasy-ruqyah');await flush();await advance(5);
assert.equal(totals('ar.alafasy'),10,'The retained Quran position is not counted alongside ruqyah');
assert.equal(quran.status,'paused');
auth={signedIn:true,userId:'listener-two'};await tick();assert.equal(totals('ar.alafasy'),0,'Account switches never transfer listening');
store.set('reciter-popularity-consent-v1:listener-two',false);events.get('salah:popularity-consent')();
const sent=reports.length;await advance(65);assert.equal(reports.length,sent,'Opt-out is preserved for ruqyah');assert.equal(totals('ar.alafasy'),65,'Private personal totals continue independently of shared participation');
ruqyah.stop();
for(const record of RUQYAH_RECORDINGS)assert.ok(RECITERS.some(r=>r.id===record.reciter),'Every ruqyah record maps to a known ranking reader');
const app=await fs.readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');
assert.match(app,/initReciterPopularity\(\{playback:quranPlayback,ruqyah:ruqyahPlayback,/,'The production entry point must connect the actual ruqyah player');
console.log('PASS: ruqyah My Top, shared minute reports, competition snapshot, real player pause/resume/seek, recording identity, exclusive playback, account isolation and opt-out.');
