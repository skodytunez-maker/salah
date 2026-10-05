import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {orientationSample,createCompassController} from '../dist/js/qibla.js';
import {bearing} from '../dist/js/prayers.js';
import {magneticField,magneticDeclination} from '../dist/js/geomagnetism.js';
import {createCompassPresentation,createDirectionTracker,signedAngleDifference,glowForError} from '../dist/js/qibla-math.js';
import {renderQiblaView} from '../dist/js/qibla-view.js';
// Independent AlAdhan Qibla API results fetched 2026-10-04; tolerance covers Kaaba coordinate rounding.
for(const [lat,lon,expected] of [[57.1522,65.5272,218.55214147374403],[40.7128,-74.006,58.481712034206865],[-33.8688,151.2093,277.499589412883]])assert.ok(Math.abs(bearing(lat,lon)-expected)<.001);
for(const [lat,lon] of [[NaN,0],[0,181],[91,0],[21.422487,39.826206],[-21.422487,-140.173794]])assert.ok(Number.isNaN(bearing(lat,lon)));
assert.ok(Math.abs(bearing(0,39.826206))<1e-9);assert.ok(Math.abs(bearing(60,39.826206)-180)<1e-9);
// Published NOAA WMM2025 test values, at WGS84 height zero.
for(const [lat,lon,declination,h] of [[80,0,1.28,6523.2],[0,120,-.16,39677.9],[-80,-120,68.78,16898.1]]){const value=magneticField(lat,lon,new Date('2025-01-01T00:00:00Z'),0);assert.ok(Math.abs(value.declination-declination)<.01);assert.ok(Math.abs(value.horizontalIntensity-h)<.2);}
assert.equal(magneticDeclination(50,60,new Date('2030-01-01T00:00:00Z')),null);assert.equal(magneticDeclination(91,0),null);
const level={beta:0,gamma:0};
assert.equal(orientationSample({...level,webkitCompassHeading:350},0,15).heading,5);
assert.equal(orientationSample({...level,absolute:true,alpha:10},0,15).heading,5);
assert.equal(orientationSample({...level,webkitCompassHeading:10},90,0).heading,100);
assert.equal(orientationSample({...level,webkitCompassHeading:10},-90,0).heading,280);
assert.equal(orientationSample({...level,alpha:10,absolute:false}),null,'Relative gyroscope rotation cannot establish north');
assert.equal(orientationSample({...level,absolute:true,alpha:null}),null);
assert.equal(orientationSample({...level,webkitCompassHeading:-1}),null);
assert.equal(orientationSample({...level,webkitCompassHeading:10},0,null),null,'Missing magnetic correction must not masquerade as true north');
assert.equal(orientationSample({webkitCompassHeading:10}).level,false,'Unknown tilt cannot claim alignment');
assert.equal(orientationSample({...level,beta:36,webkitCompassHeading:10}).level,false);
assert.equal(orientationSample({...level,webkitCompassHeading:10,webkitCompassAccuracy:-1}).accurate,false);
assert.equal(orientationSample({...level,webkitCompassHeading:10,webkitCompassAccuracy:26}).accurate,false);
const tracker=createDirectionTracker();assert.equal(tracker.update(359,1,0).signedError,2);assert.ok(Math.abs(tracker.update(1,1,100).signedError)<2);assert.equal(signedAngleDifference(1,359),-2);
for(const [a,b] of [[0,1],[1,2],[2,5],[5,10],[10,15],[15,30]])assert.ok(glowForError(a)>=glowForError(b),'Qibla light must strengthen as alignment improves');
assert.equal(glowForError(0),1);assert.equal(glowForError(30),0);assert.equal(glowForError(90),0);
const qiblaHtml=renderQiblaView({cityName:'Тюмень',bearing:218.5,hasCity:true});assert.match(qiblaHtml,/Чем точнее направление, тем ярче становится свет\./);
const qiblaCss=await readFile(new URL('../dist/qibla.css',import.meta.url),'utf8');assert.doesNotMatch(qiblaCss,/var\(--qibla-light\)\s*\*/,'Qibla glow must not rely on unsupported CSS multiplication');
const states=[];let listener,visibility,screenChanged,now=0,visible=true,headingAngle=0,off=0,vibrations=0,frame=0;const frames=new Map(),timers=new Map();let counter=0;
const environment={supported:()=>true,requestPermission:async()=> 'granted',subscribe:fn=>{listener=fn;return()=>{listener=null;off++;}},watchVisibility:fn=>{visibility=fn;return()=>visibility=null;},watchScreen:fn=>{screenChanged=fn;return()=>screenChanged=null;},screenAngle:()=>headingAngle,visible:()=>visible,now:()=>now,setTimer:fn=>{const id=++counter;timers.set(id,fn);return id;},clearTimer:id=>timers.delete(id),requestFrame:fn=>{const id=++frame;frames.set(id,fn);return id;},cancelFrame:id=>frames.delete(id)};
function flush(){for(const [id,fn]of [...frames]){frames.delete(id);fn(now);}}
const controller=createCompassController({bearing:90,declination:10,onState:s=>states.push(s),onHaptic:()=>vibrations++,environment});await controller.enable();
listener({...level,webkitCompassHeading:80});flush();assert.equal(states.at(-1).aligned,true);assert.equal(vibrations,1);
now=100;listener({...level,webkitCompassHeading:80});flush();assert.equal(vibrations,1,'No repeated vibration while aligned');
now=200;listener({webkitCompassHeading:80});assert.equal(states.at(-1).hasHeading,false);assert.equal(states.at(-1).aligned,false);
now=210;listener({...level,webkitCompassHeading:40});flush();assert.equal(states.at(-1).phase,'unreliable','A brief threshold crossing cannot claim recovered accuracy');
now=370;listener({...level,webkitCompassHeading:40});flush();assert.equal(states.at(-1).instruction,'Поверните правее','Recovery must use the new measured direction');
visible=false;visibility();assert.equal(listener,null);assert.equal(states.at(-1).phase,'paused');
visible=true;visibility();now=420;listener({...level,webkitCompassHeading:120});flush();assert.equal(states.at(-1).instruction,'Поверните левее');
headingAngle=90;screenChanged();assert.equal(states.at(-1).hasHeading,false);now=500;listener({...level,webkitCompassHeading:350});flush();assert.equal(states.at(-1).aligned,true);
controller.destroy();assert.equal(listener,null);assert.equal(visibility,null);assert.equal(screenChanged,null);assert.equal(frames.size,0);assert.equal(timers.size,0);assert.ok(off>=2);
const denied=[];const access=createCompassController({bearing:90,onState:s=>denied.push(s),environment:{...environment,requestPermission:async()=> 'denied'}});await access.enable();assert.equal(denied.at(-1).hasHeading,false);assert.equal(denied.at(-1).phase,'denied');access.destroy();
const stalled=[];const unavailable=createCompassController({bearing:90,onState:s=>stalled.push(s),environment});await unavailable.enable();[...timers.values()][0]();assert.equal(stalled.at(-1).phase,'unavailable');assert.equal(stalled.at(-1).hasHeading,false);unavailable.destroy();
const gentle=[];let gentleListener;const gentleEnvironment={...environment,subscribe:fn=>{gentleListener=fn;return()=>gentleListener=null;},screenAngle:()=>0,visible:()=>true};const gentleController=createCompassController({bearing:90,declination:0,onState:s=>gentle.push(s),environment:gentleEnvironment});await gentleController.enable();now=500;gentleListener({...level,webkitCompassHeading:70});flush();assert.equal(gentle.at(-1).instruction,'Поверните немного правее');gentleController.destroy();
console.log('PASS: independent Qibla bearings, NOAA magnetic model, magnetic-to-true north, screen rotations, relative/missing/tilted/invalid sensors, circular smoothing, graded light, gentle turn guidance, permission denial, timeout and resume cleanup.');

// The drawing holds its last angle during temporary tilt and hides alignment.
const presentation=createCompassPresentation();
assert.deepEqual(presentation.update({hasHeading:true,heading:359,signedError:91}),{north:-359,target:91});
assert.equal(presentation.update({hasHeading:false}),null);
assert.equal(presentation.update({hasHeading:true,heading:359.2,signedError:90.8}),null,'Sub-degree noise cannot shake the drawing');
assert.deepEqual(presentation.update({hasHeading:true,heading:1,signedError:89}),{north:-361,target:89},'North crossing must rotate 2 degrees, not a full circle');
for(const heading of [.9,1.1,1.2,.8])assert.equal(presentation.update({hasHeading:true,heading,signedError:90-heading}),null);
assert.deepEqual(presentation.update({hasHeading:true,heading:2,signedError:88}),{north:-362,target:88},'Slow deliberate motion is not frozen');
const stableStates=[];let stableListener,stableHaptics=0;
const stableController=createCompassController({bearing:90,onState:s=>stableStates.push(s),onHaptic:()=>stableHaptics++,environment:{...gentleEnvironment,subscribe:fn=>{stableListener=fn;return()=>stableListener=null;}}});
await stableController.enable();now=1000;stableListener({...level,webkitCompassHeading:90});flush();assert.equal(stableHaptics,1);
for(let i=1;i<=10;i++){now+=40;stableListener({...level,beta:i%2?36:34,webkitCompassHeading:90});flush();assert.equal(stableStates.at(-1).aligned,false);}
assert.equal(stableStates.filter(s=>s.phase==='unreliable').length,1,'Repeated tilt samples must not repeatedly redraw the warning');
now+=160;stableListener({...level,webkitCompassHeading:90});flush();assert.equal(stableStates.at(-1).aligned,true);assert.equal(stableHaptics,1,'Tilting in and out cannot repeatedly rearm vibration');
now+=40;stableListener({...level,webkitCompassHeading:90,webkitCompassAccuracy:40});assert.equal(stableStates.at(-1).hasHeading,false);
now+=40;stableListener({...level,webkitCompassHeading:90});flush();assert.equal(stableStates.at(-1).hasHeading,false);
now+=160;stableListener({...level,webkitCompassHeading:90});flush();assert.equal(stableStates.at(-1).aligned,true);assert.equal(stableHaptics,1);
stableController.destroy();assert.equal(frames.size,0);assert.equal(timers.size,0);
console.log('PASS: compass drawing survives tilt, ignores sub-degree jitter, crosses north continuously, waits for stable readings and never repeats haptics after brief tilt.');
