import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const w=new Window({url:'https://skodytunez-maker.github.io/salah/#knowledge',settings:{disableIframePageLoading:true}}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,location:w.location,localStorage:w.localStorage});
const probe={verified:false,claims:0,token:async()=>'test-access-token'};globalThis.__ownerFrameProbe=probe;
let code=await fs.readFile(new URL('../dist/js/owner-learning-frame.js',import.meta.url),'utf8');
code=code.replace(/import\{ownerVerified,ownerPreviewAccessToken\}from '[^']+';/,"const ownerVerified=()=>globalThis.__ownerFrameProbe.verified,ownerPreviewAccessToken=()=>globalThis.__ownerFrameProbe.token();");
code=code.replace(/import\{claimPlayback\}from '[^']+';/,"const claimPlayback=()=>globalThis.__ownerFrameProbe.claims++;");
const{mountOwnerLearningPreview:mount,stopOwnerLearningPreview:stop,ownerLearningBusy:busy,validOwnerCourseProgress:valid}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const host=doc.createElement('main');doc.body.append(host);
const sent=[],source={postMessage:(data,origin)=>sent.push({data,origin})},realCreate=doc.createElement.bind(doc);
doc.createElement=(tag,...rest)=>{const node=realCreate(tag,...rest);if(tag==='iframe')Object.defineProperty(node,'contentWindow',{configurable:true,get:()=>source});return node;};
assert.equal(mount(host,'muallim'),false);assert.equal(host.querySelector('iframe'),null);
probe.verified=true;assert.equal(mount(host,'unknown'),false);assert.equal(mount(host,'muallim'),true);
const frame=host.querySelector('iframe'),url=new URL(frame.src),origin=url.origin,nonce=new URLSearchParams(url.hash.slice(1)).get('nonce');
assert.equal(url.origin,'https://desktop-jecm5lt.taila4556d.ts.net');assert.equal(url.pathname,'/embed');assert.ok(!frame.src.includes('test-access-token'));assert.ok(frame.allow.includes('microphone'));
const message=(data,{from=origin,sourceWindow=source}={})=>w.dispatchEvent(new w.MessageEvent('message',{origin:from,source:sourceWindow,data:{nonce,...data}}));
for(const options of [{from:'https://attacker.invalid'},{sourceWindow:{}},{}]){
 const old=sent.length;message({type:'salah:owner-preview-ready',...(Object.keys(options).length?{}:{nonce:'wrong-nonce'})},options);await new Promise(r=>setTimeout(r,0));assert.equal(sent.length,old);
}
message({type:'salah:owner-preview-ready'});await new Promise(r=>setTimeout(r,0));assert.equal(sent.at(-1).data.token,'test-access-token');assert.equal(sent.at(-1).origin,origin);
message({type:'salah:owner-preview-busy',busy:true});assert.equal(busy(),true);assert.equal(probe.claims,1);
message({type:'salah:owner-preview-busy',busy:false});assert.equal(busy(),false);
const good={version:1,last:'fatha',completed:['letters','joining']};
assert.ok(valid(good));assert.ok(!valid({...good,role:'teacher'}));assert.ok(!valid({...good,completed:['__proto__']}));assert.ok(!valid({...good,completed:['letters','letters']}));
message({type:'salah:owner-preview-progress',value:{...good,role:'teacher'}});assert.equal(localStorage.getItem('salah:muallim-sani-progress'),null);
message({type:'salah:owner-preview-progress',value:good});assert.deepEqual(JSON.parse(localStorage.getItem('salah:muallim-sani-progress')),good);
message({type:'salah:owner-preview-navigate',hash:'https://attacker.invalid'});assert.equal(location.hash,'#knowledge');
message({type:'salah:owner-preview-navigate',hash:'#knowledge?view=alphabet'});assert.equal(location.hash,'#knowledge?view=alphabet');
stop();assert.ok(!frame.isConnected);assert.equal(busy(),false);
let resolve;probe.token=()=>new Promise(r=>resolve=r);mount(host,'online-lessons');const other=host.querySelector('iframe'),params=new URLSearchParams(new URL(other.src).hash.slice(1));
const old=sent.filter(x=>x.data.token).length;message({type:'salah:owner-preview-ready',nonce:params.get('nonce')});await new Promise(r=>setTimeout(r,0));
probe.verified=false;resolve('stale-token');await new Promise(r=>setTimeout(r,0));assert.equal(sent.filter(x=>x.data.token).length,old,'A late token cannot cross a revoked owner boundary');
stop();await w.happyDOM.close();console.log('PASS: internal owner frame, strict origin/source/nonce handshake, token privacy, revocation, validated progress and audio/update state.');

