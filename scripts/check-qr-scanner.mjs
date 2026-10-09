import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const {parseSalahQr}=await import(new URL('dist/js/qr-scanner.js',root));
const id='11111111-1111-4111-8111-111111111111',secret='a'.repeat(64),url='https://skodytunez-maker.github.io/salah/#account?qr='+id+'&approve='+secret;
assert.deepEqual(parseSalahQr(url),{id,secret});
for(const bad of [url.replace('https:','http:'),url.replace('skodytunez-maker.github.io','evil.test'),url+'&approve='+secret,url+'&owner=1',url.replace('/salah/','/sahaba/'),url.replace('#account','#home'),'javascript:alert(1)',url.replace(secret,'bad')])assert.equal(parseSalahQr(bad),null);
const vendor=await fs.readFile(new URL('dist/js/vendor/jsQR.js',root),'utf8'),provenance=JSON.parse(await fs.readFile(new URL('dist/js/vendor/jsQR-source.json',root),'utf8'));
assert.equal(createHash('sha256').update(vendor).digest('hex'),provenance.sha256);
const context=vm.createContext({Uint8ClampedArray});vm.runInContext(vendor,context);
const {default:qrcode}=await import(new URL('dist/js/vendor/qrcode-generator.js',root));const qr=qrcode(0,'M');qr.addData(url);qr.make();const count=qr.getModuleCount(),scale=5,size=(count+8)*scale,data=new Uint8ClampedArray(size*size*4).fill(255);
for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x))for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++){const offset=(((y+4)*scale+yy)*size+(x+4)*scale+xx)*4;data[offset]=data[offset+1]=data[offset+2]=0;}
assert.equal(context.jsQR(data,size,size).data,url);
const source=await fs.readFile(new URL('dist/js/qr-scanner.js',root),'utf8');assert.match(source,/audio:false/);assert.match(source,/getTracks().*stop()/);assert.match(source,/document.hidden/);assert.ok(!/localStorage|sessionStorage|location.href|window.open|console.log|fetch/.test(source));
const android=await fs.readFile(new URL('mobile/scripts/configure-android.mjs',root),'utf8'),ios=await fs.readFile(new URL('mobile/scripts/configure-ios.rb',root),'utf8');assert.match(android,/android.permission.CAMERA/);assert.match(ios,/NSCameraUsageDescription/);
console.log('PASS: real QR pixels decoded locally, strict SALAH-only URL, camera lifecycle and native permissions.');

const {mountQrScanner,stopQrScanner}=await import(new URL('dist/js/qr-scanner.js',root));
const listeners=new Map();
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.hidden=false;this.readyState=2;this.videoWidth=20;this.videoHeight=20;}
 append(el){el.parent=this;this.children.push(el);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 set innerHTML(v){this.nodes={video:new Element('video'),'[role=status]':new Element('p'),button:new Element('button')};}
 querySelector(s){return this.nodes[s];}
 async play(){}
 getContext(){return {drawImage(){},getImageData(){return {data:new Uint8ClampedArray(1600),width:20,height:20};}};}
}
globalThis.document={documentElement:{dataset:{}},createElement:t=>new Element(t),hidden:false,head:new Element('head'),addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:(n,f)=>{if(listeners.get(n)===f)listeners.delete(n);}};
globalThis.window={addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:(n,f)=>{if(listeners.get(n)===f)listeners.delete(n);}};
let grant,stops=0,cameraRequests=0,scanned=0;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:opts=>{assert.equal(opts.audio,false);cameraRequests++;return new Promise(resolve=>grant=resolve);}}}});
let frameData=url;globalThis.jsQR=()=>({data:frameData});
const area=new Element('section'),existing=new Element('p');area.append(existing);mountQrScanner(area,{onScan:request=>{assert.deepEqual(request,{id,secret});scanned++;}});
assert.equal(cameraRequests,0,'camera must not open on account entry');
const first=area.children.at(-1).onclick();assert.equal(document.documentElement.dataset.qrLogin,'active');area.children.at(-1).querySelector('button').onclick();grant({getTracks:()=>[{stop:()=>stops++}]});await first;assert.equal(stops,1);assert.equal(document.documentElement.dataset.qrLogin,undefined);assert.equal(scanned,0);assert.equal(existing.hidden,false);assert.equal(listeners.size,0);
const second=area.children.at(-1).onclick();grant({getTracks:()=>[{stop:()=>stops++}]});await second;assert.equal(scanned,1);assert.equal(stops,2);assert.equal(existing.hidden,false);assert.equal(listeners.size,0);
console.log('PASS: no automatic camera prompt; cancellation stops late camera grant; successful scan stops stream and preserves account view.');
const third=area.children.at(-1).onclick();stopQrScanner();grant({getTracks:()=>[{stop:()=>stops++}]});await third;assert.equal(stops,3);assert.equal(scanned,1);assert.equal(listeners.size,0);console.log('PASS: account rerender cancels pending scanner without navigation.');

const {qrCameraCrop}=await import(new URL('dist/js/qr-scanner.js',root));
assert.deepEqual(qrCameraCrop(1280,720),{x:280,y:0,side:720,size:640});assert.deepEqual(qrCameraCrop(720,1280),{x:0,y:280,side:720,size:640});assert.deepEqual(qrCameraCrop(320,320),{x:0,y:0,side:320,size:320});assert.equal(qrCameraCrop(0,720),null);assert.equal(qrCameraCrop(720,NaN),null);
console.log('PASS: scanner decodes precisely the square visible in portrait and landscape; decorative overlay never reaches the decoder.');

// A caller may select the listening parser without widening account QR approval.
const {parseListeningQr,listeningShareUrl}=await import(new URL('dist/js/quran-listen-share-core.js',root));
const sharedListening=listeningShareUrl({surah:2,reciter:'ar.alafasy',ayah:255,seconds:2.5});
const receiverArea=new Element('section'),receiverExisting=new Element('p');receiverArea.append(receiverExisting);let listeningScanned=0;
frameData=sharedListening;
const receiverDispose=mountQrScanner(receiverArea,{parse:parseListeningQr,entryLabel:'Сканировать',onScan:value=>{assert.equal(value.hash,new URL(sharedListening).hash);listeningScanned++;}});
const receive=receiverDispose.open();grant({getTracks:()=>[{stop:()=>stops++}]});await receive;assert.equal(listeningScanned,1);assert.equal(receiverExisting.hidden,false);assert.equal(listeners.size,0);receiverDispose();
assert.equal(parseSalahQr(sharedListening),null,'Account scanner still rejects listening links');
console.log('PASS: dedicated in-app listening scan, no account-link approval, local callback and stream cleanup.');
