import assert from 'node:assert/strict';
import{getDevicePosition}from '../dist/js/city-location.js';
function fixture(){let id=0;const pending=new Map(),calls=[];const opts={geolocation:{getCurrentPosition(ok,error,options){calls.push({ok,error,options})}},setTimer(fn,ms){pending.set(++id,{fn,ms});return id},clearTimer(id){pending.delete(id)}};return{opts,calls,pending,fire(){const [id,item]=pending.entries().next().value;pending.delete(id);item.fn()}}}
const pos={coords:{latitude:57.15222,longitude:65.52722,accuracy:2000}};
let f=fixture(),p=getDevicePosition(f.opts);assert.equal(f.calls.length,1);assert.equal(f.calls[0].options.enableHighAccuracy,false);assert.equal(f.calls[0].options.maximumAge,900000);f.calls[0].ok(pos);assert.equal(await p,pos);assert.equal(f.pending.size,0);
f=fixture();p=getDevicePosition(f.opts);f.calls[0].error({code:2});assert.equal(f.calls.length,2);assert.equal(f.calls[1].options.enableHighAccuracy,true);assert.equal(f.calls[1].options.maximumAge,0);let resolved=false;p.then(()=>resolved=true);f.calls[0].ok(pos);await Promise.resolve();assert.equal(resolved,false,'A late callback from the previous attempt cannot win');f.calls[1].ok(pos);assert.equal(await p,pos);assert.equal(f.pending.size,0);
f=fixture();p=getDevicePosition(f.opts);const denial=assert.rejects(p,e=>e.code===1);f.calls[0].error({code:1});await denial;assert.equal(f.calls.length,1,'A denial never triggers a second permission request');assert.equal(f.pending.size,0);
f=fixture();p=getDevicePosition(f.opts);const timeout=assert.rejects(p,e=>e.code===3);f.fire();assert.equal(f.calls.length,2);f.fire();await timeout;assert.equal(f.pending.size,0,'A WebView that never calls back cannot hang the button');
f=fixture();const c=new AbortController();p=getDevicePosition({...f.opts,signal:c.signal});const aborted=assert.rejects(p,e=>e.name==='AbortError');c.abort();await aborted;f.calls[0].ok(pos);assert.equal(f.pending.size,0);assert.equal(f.calls.length,1,'Closing the dialog cannot retry');
f=fixture();const pre=new AbortController();pre.abort();await assert.rejects(getDevicePosition({...f.opts,signal:pre.signal}),e=>e.name==='AbortError');assert.equal(f.calls.length,0);
f=fixture();p=getDevicePosition(f.opts);f.calls[0].ok({coords:{latitude:100,longitude:0}});assert.equal(f.calls.length,2);f.calls[1].ok(pos);await p;
await assert.rejects(getDevicePosition({geolocation:null}),e=>e.code===2);
console.log('PASS: coarse-first city lookup, bounded GPS fallback, permission-denial stop, silent-WebView watchdog, late callbacks, invalid coordinates and abort cleanup.');
