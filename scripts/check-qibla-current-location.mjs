import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{mountQibla}from '../dist/js/qibla.js';
import{bearing}from '../dist/js/prayers.js';
import{magneticDeclination}from '../dist/js/geomagnetism.js';

const w=new Window({url:'https://salah.invalid/#qibla'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage});
let hidden=false,clock=Date.now(),nextWatch=0,nextFrame=0,nextTimer=0,sensor=null;
Object.defineProperties(doc,{hidden:{configurable:true,get:()=>hidden},visibilityState:{configurable:true,get:()=>hidden?'hidden':'visible'}});
const requests=[],watches=new Map(),cleared=[],frames=new Map(),timers=new Map(),maps=[];
const geolocation={watchPosition(ok,fail,options){const id=nextWatch++;watches.set(id,{ok,fail,options});return id;},clearWatch(id){cleared.push(id);watches.delete(id);}};
const environment={supported:()=>true,requestPermission:async()=> 'granted',subscribe:fn=>{sensor=fn;return()=>sensor=null;},watchVisibility:fn=>{doc.addEventListener('visibilitychange',fn);return()=>doc.removeEventListener('visibilitychange',fn);},watchScreen:()=>()=>{},screenAngle:()=>0,visible:()=>!hidden,now:()=>clock,setTimer:fn=>{const id=++nextTimer;timers.set(id,fn);return id;},clearTimer:id=>timers.delete(id),requestFrame:fn=>{const id=++nextFrame;frames.set(id,fn);return id;},cancelFrame:id=>frames.delete(id)};
const getPosition=options=>new Promise((resolve,reject)=>requests.push({options,resolve,reject}));
const city=Object.freeze({name:'Тюмень',latitude:57.1522,longitude:65.5272}),originalCity=JSON.stringify(city);
const host=doc.createElement('main');doc.body.append(host);
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const fix=(latitude,longitude,accuracy=10)=>({coords:{latitude,longitude,accuracy},timestamp:clock});
const mount=(options={})=>mountQibla(host,{city,environment,haptics:()=>false,locationOptions:{geolocation,getPosition,allowed:()=>true,now:()=>clock},mountMap:(element,options)=>{const row={element,options,positions:[],destroyed:false};maps.push(row);return{setPosition:p=>{row.positions.push(p);return true;},destroy(){row.destroyed=true;}};},...options});
const expected=p=>Math.round(bearing(p.coords.latitude,p.coords.longitude))%360+'°';
const angle=()=>host.querySelector('.qibla-bearing').textContent;
function align(p){assert.equal(typeof sensor,'function');const heading=(bearing(p.coords.latitude,p.coords.longitude)-magneticDeclination(p.coords.latitude,p.coords.longitude)+360)%360;sensor({webkitCompassHeading:heading,webkitCompassAccuracy:5,beta:0,gamma:0});clock+=40;for(const[id,fn]of[...frames]){frames.delete(id);fn(clock);}assert.ok(host.querySelector('#qibla-stage').classList.contains('is-aligned'),'Bearing and magnetic correction both use the device coordinates');}

assert.equal(requests.length,0,'Import/startup does not request GPS');
let ui=mount();assert.equal(requests.length,1,'Opening Qibla starts a current-device fix');assert.match(host.querySelector('.qibla-location').textContent,/Центр выбранного города/);assert.equal(host.querySelector('#qibla-locate').disabled,true);
const first=fix(55.7558,37.6173,18);requests.at(-1).resolve(first);await flush();assert.equal(angle(),expected(first));assert.notEqual(angle(),Math.round(bearing(city.latitude,city.longitude))+'°');assert.match(host.querySelector('.qibla-location').textContent,/Ваше местоположение/);assert.match(host.querySelector('#qibla-location-state').textContent,/±18 м/);assert.equal(watches.size,1);align(first);
const oldWatch=[...watches.values()][0];clock+=1000;const moved=fix(40.7128,-74.006,7);oldWatch.ok(moved);await flush();assert.equal(angle(),expected(moved));align(moved);
clock+=1000;const poor=fix(40.713,-74.0062,700);oldWatch.ok(poor);assert.match(host.querySelector('.qibla-location').textContent,/Приблизительное/);assert.match(host.querySelector('#qibla-location-state').textContent,/±700 м/);
host.querySelector('#qibla-map-toggle').click();assert.equal(maps.at(-1).options.position,poor,'Opening the map reuses this Qibla session’s fresh fix, not settings.city');assert.equal(sensor,null,'Map mode does not keep compass sensors active');
clock+=1000;const improving=fix(40.7131,-74.0063,6);oldWatch.ok(improving);assert.equal(maps.at(-1).positions.at(-1),improving);
const mapRetry=maps.at(-1).options.getPosition();assert.equal(watches.size,0);assert.ok(cleared.includes(0),'Starting map location clears the old watch including ID0');clock+=1000;const mapFix=fix(51.5074,-.1278,9);requests.at(-1).resolve(mapFix);await mapRetry;await flush();assert.equal(angle(),expected(mapFix));
host.querySelector('#qibla-map-toggle').click();await flush();assert.equal(maps.at(-1).destroyed,true);assert.equal(angle(),expected(mapFix),'Returning to compass retains actual coordinates');align(mapFix);
const html=host.innerHTML;ui.destroy();assert.equal(watches.size,0);assert.equal(sensor,null);assert.equal(frames.size,0);assert.equal(timers.size,0);oldWatch.ok(fix(0,0,1));await flush();assert.equal(host.innerHTML,html,'A late old watch cannot redraw a destroyed Qibla');

ui=mount();requests.at(-1).reject({code:1});await flush();assert.match(host.querySelector('.qibla-location').textContent,/Центр выбранного города: Тюмень/);assert.match(host.querySelector('#qibla-location-state').textContent,/Доступ к местоположению закрыт/);assert.equal(host.querySelector('#qibla-locate').disabled,false,'Permission denial leaves an explicit retry');
host.querySelector('#qibla-locate').click();requests.at(-1).reject({code:3});await flush();assert.match(host.querySelector('#qibla-location-state').textContent,/свежую точку вовремя/);assert.equal(angle(),Math.round(bearing(city.latitude,city.longitude))+'°');ui.destroy();
const beforeRestricted=requests.length;ui=mount({locationOptions:{geolocation,getPosition,allowed:()=>false}});await flush();assert.equal(requests.length,beforeRestricted,'Restricted/Families mode never asks for current coordinates');assert.equal(host.querySelector('#qibla-locate').disabled,true);ui.destroy();

ui=mount({city:null});assert.equal(ui.controller,null);const noCityFix=fix(48.8566,2.3522,12);requests.at(-1).resolve(noCityFix);await flush();assert.equal(angle(),expected(noCityFix),'A city is not required for current-device Qibla');assert.equal(host.querySelector('#qibla-city').hidden,true);assert.ok(ui.controller);align(noCityFix);
hidden=true;doc.dispatchEvent(new w.Event('visibilitychange'));assert.equal(watches.size,0,'Hidden Qibla stops location tracking');hidden=false;doc.dispatchEvent(new w.Event('visibilitychange'));const resume=requests.at(-1);assert.equal(resume.options.signal.aborted,false);clock+=1000;const returned=fix(48.857,2.353,8);resume.resolve(returned);await flush();assert.equal(angle(),expected(returned));ui.destroy();

const departing=mount(),oldRequest=requests.at(-1);departing.destroy();assert.equal(oldRequest.options.signal.aborted,true);const entered=mount(),newRequest=requests.at(-1),beforeLate=[angle(),host.querySelector('.qibla-location').textContent,host.querySelector('#qibla-location-state').textContent];oldRequest.resolve(fix(-33.8688,151.2093,1));await flush();assert.deepEqual([angle(),host.querySelector('.qibla-location').textContent,host.querySelector('#qibla-location-state').textContent],beforeLate,'A late initial fix from the previous visit cannot win after reentry');clock+=1000;const newest=fix(52.52,13.405,5);newRequest.resolve(newest);await flush();assert.equal(angle(),expected(newest));entered.destroy();

// Exercise the real flat-map fallback too, rather than only stubbing its loader.
const{mountQiblaMap:mountFlatMap}=await import('../dist/js/qibla-map-fallback.js');
const flatEvents={},flatLayers=new Set();let flatCamera=null,flatZoom=null,flatRemoved=false,flatRequest;
const layer=(kind,data,options)=>({kind,data,options,addTo(){flatLayers.add(this);return this;},on(type,fn){this[type]=fn;return this;}});
const flatMap={setView(point,zoom){flatCamera=Array.from(point);flatZoom=zoom;return this;},on(type,fn){flatEvents[type]=fn;return this;},getBounds:()=>({getNorth:()=>flatCamera[0]+.01,getEast:()=>flatCamera[1]+.01}),getCenter:()=>flatCamera,distance:()=>1000,removeLayer:item=>flatLayers.delete(item),invalidateSize(){},remove(){flatRemoved=true;flatLayers.clear();}};
const L={map:()=>flatMap,control:{zoom:()=>({addTo(){}})},tileLayer:()=>layer('tiles'),circleMarker:(point,options)=>layer('origin',Array.from(point),options),circle:(point,options)=>layer('accuracy',Array.from(point),options),polyline:(points,options)=>layer('line',points,options),layerGroup:children=>layer('ray',children),marker:(point,options)=>layer('arrow',point,options),divIcon:options=>options};
const flat=mountFlatMap(host,{city,position:first,loadLibrary:async()=>L,getPosition:options=>new Promise((resolve,reject)=>flatRequest={options,resolve,reject})});await flush();assert.deepEqual(flatCamera,[first.coords.latitude,first.coords.longitude]);assert.equal(flatZoom,17);assert.equal([...flatLayers].find(row=>row.kind==='accuracy').options.radius,18);assert.match(host.querySelector('#qibla-map-status').textContent,/±18 м/);
flat.setPosition(moved);assert.deepEqual([...flatLayers].find(row=>row.kind==='origin').data.map(n=>Number(n.toFixed(6))),[moved.coords.latitude,moved.coords.longitude]);assert.deepEqual(flatCamera,[first.coords.latitude,first.coords.longitude],'Flat watch updates do not undo manual zoom/pan');
flatEvents.click({latlng:{lat:1,lng:2}});flat.setPosition(newest);assert.deepEqual([...flatLayers].find(row=>row.kind==='origin').data,[1,2],'Flat manual target survives later device updates');assert.match(host.querySelector('#qibla-map-status').textContent,/Выбранная точка/);
host.querySelector('#qibla-map-city').click();assert.match(host.querySelector('#qibla-map-status').textContent,/Центр выбранного города/);host.querySelector('#qibla-map-locate').click();flatRequest.reject({code:1});await flush();assert.match(host.querySelector('#qibla-map-status').textContent,/центр выбранного города, а не ваше местоположение/);
host.querySelector('#qibla-map-locate').click();const flatLate=flatRequest,flatHtml=host.innerHTML;flat.destroy();assert.equal(flatLate.options.signal.aborted,true);flatLate.resolve(newest);await flush();assert.equal(host.innerHTML,flatHtml);assert.equal(flatRemoved,true);assert.equal(flatLayers.size,0);
const flatNoCity=mountFlatMap(host,{position:first,loadLibrary:async()=>L});await flush();assert.ok([...flatLayers].some(row=>row.kind==='origin'));flatNoCity.setPosition(null);assert.equal([...flatLayers].filter(row=>['origin','accuracy','ray','arrow'].includes(row.kind)).length,0,'Flat fallback clears an unavailable device position without a saved city');assert.match(host.querySelector('#qibla-map-status').textContent,/Текущее место не определено/);flatNoCity.destroy();

assert.equal(JSON.stringify(city),originalCity,'GPS never changes the saved prayer-city object');assert.equal(w.localStorage.length,0,'Coordinates are not persisted in local storage');
for(const path of ['dist/js/qibla.js','dist/js/qibla-access.js','dist/js/qibla-map.js','dist/js/qibla-map-fallback.js']){const source=await fs.readFile(new URL('../'+path,import.meta.url),'utf8');assert.doesNotMatch(source,/\b(?:fetch|updateSettings|writeState|setItem|sendBeacon)\s*\(|supabase|selectedCity|owner-access/,'Current coordinates stay inside the Qibla view: '+path);}
console.log('PASS: fresh entry GPS, actual-coordinate bearing+magnetic correction, live accuracy/watch movement, map/compass sharing, honest denied/timeout/city fallback, restricted mode, no-city operation, hidden/exit/reentry cancellation and no coordinate persistence or upload.');
await w.happyDOM.close();
