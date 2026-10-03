import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const html=await readFile(new URL('dist/index.html',root),'utf8');
const policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
assert.ok(policy.includes("script-src 'self' https://gc.zgo.at;"));
assert.doesNotMatch(policy,/unsafe-eval/);
assert.match(policy,/script-src-attr 'none'/);
assert.match(policy,/object-src 'none'/);
assert.match(policy,/base-uri 'none'/);
assert.match(html,/<meta name="referrer" content="no-referrer">/);
assert.match(policy,/connect-src[^;]*https:\/\/kbltwszfvphgbxdbczsb\.supabase\.co/);
// The API-backed Luhaidan endpoint redirects MP3 downloads and streaming to the official CDN.
// Both media playback and offline fetch must permit the redirect destination.
for(const directive of ['media-src','connect-src']){
 const sources=policy.split(';').map(x=>x.trim()).find(x=>x.startsWith(directive+' ')).split(/\s+/).slice(1);
 for(const url of ['https://server8.mp3quran.net/lhdan/001.mp3','https://cdn.mp3quran.net/audio/muhammad-luhaidan/r1/001.mp3','https://server6.mp3quran.net/s_bud/001.mp3','https://server7.mp3quran.net/shur/001.mp3','https://server9.mp3quran.net/hthfi/001.mp3','https://server11.mp3quran.net/sds/001.mp3','https://server13.mp3quran.net/jhn/001.mp3'])assert.ok(sources.includes(new URL(url).origin),directive+' must allow the verified recitation redirect');
}
assert.doesNotMatch(policy,/script-src[^;]*cdn\.mp3quran\.net/);
const connectSources=policy.split(';').find(x=>x.trim().startsWith('connect-src '));assert.ok(connectSources.trim().split(/\s+/).includes('https://www.mp3quran.net'));
const frameSources=policy.split(';').find(x=>x.trim().startsWith('frame-src ')).trim().split(/\s+/).slice(1);assert.deepEqual(frameSources.sort(),['https://salah-saadi.goatcounter.com','https://www.youtube-nocookie.com'].sort());
const sdk=await readFile(new URL('dist/js/vendor/supabase.js',root));
assert.equal(createHash('sha256').update(sdk).digest('hex'),'59d39487c3589843b410322d8a3d562ce022aba1e5ccb16898ef3fb2a0da2ecd');
const events={};
const context=vm.createContext({URL,Request,Response,Headers,Map,Set,setTimeout,clearTimeout,AbortController,self:{registration:{scope:'https://skodytunez-maker.github.io/salah/'},location:{origin:'https://skodytunez-maker.github.io'},addEventListener:(type,fn)=>events[type]=fn}});
vm.runInContext(await readFile(new URL('dist/sw.js',root),'utf8'),context);
// The installed cabinet must retain its launch page even offline; the public
// application must keep its own manifest and home entry.
assert.equal(vm.runInContext("navigationShell(new URL('https://skodytunez-maker.github.io/salah/owner.html'))",context),'https://skodytunez-maker.github.io/salah/owner.html');
assert.equal(vm.runInContext("navigationShell(new URL('https://skodytunez-maker.github.io/salah/'))",context),'https://skodytunez-maker.github.io/salah/index.html');
assert.equal(ownerPolicy(await readFile(new URL('dist/owner.html',root),'utf8')),policy);
function ownerPolicy(source){return source.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];}
function handled(path,{method='GET',auth=false}={}){let result=false;const request=new Request('https://skodytunez-maker.github.io'+path,{method,headers:auth?{Authorization:'Bearer test'}:{}});events.fetch({request,respondWith:()=>{result=true},waitUntil:()=>{}});return result;}
// Never invoke shell serving for an API, authenticated request, or another app.
assert.equal(handled('/salah/api/private'),false);
assert.equal(handled('/salah/js/app.js',{auth:true}),false);
assert.equal(handled('/salah/api/private',{method:'POST'}),false);
assert.equal(handled('/other-app/js/app.js'),false);
assert.equal(handled('/salah/data/quran/1.json'),false);
// Existing backup validation rejects injected keys without replacing user data.
const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),get length(){return values.size},key:i=>[...values.keys()][i]};
const {createBackup,validateBackup,restoreBackup}=await import('../dist/js/backup.js');
const {defaults}=await import('../dist/js/storage.js');
const document={version:2,app:'SALAH',settings:defaults,history:{},personal:{'adhkar-progress-v2':{version:2,totals:{tasbih:27},days:{}}}};
const prepared=validateBackup(document);
assert.equal(prepared.preview.adhkarRepetitions,27);
assert.throws(()=>validateBackup(JSON.stringify(document).replace('"tasbih":27','"__proto__":{}')),/Недопустимый ключ/);
assert.throws(()=>validateBackup({...document,personal:{'admin-role':true}}),/Неизвестные личные/);
assert.throws(()=>restoreBackup(prepared,{confirmed:false}),/подтвердите/);
prepared.backup.personal['adhkar-progress-v2'].totals.tasbih=0;
assert.throws(()=>restoreBackup(prepared,{confirmed:true}),/изменилась/);
assert.equal(values.size,0);
const validated=validateBackup(document);restoreBackup(validated,{confirmed:true});
assert.equal(JSON.parse(values.get('salah:adhkar-progress-v2')).totals.tasbih,27);
values.set('salah-owner-session-v1','private-session-test-value');
assert.ok(!JSON.stringify(createBackup({storage:localStorage,settings:defaults,history:{}})).includes('private-session-test-value'));
console.log('PASS: CSP restrictions, private requests bypass offline cache, malicious/mutated backups rejected, cumulative counts preserved.');

values.set('salah:counter-active-account','account-test');const oldBackup=validateBackup({...document,personal:{'adhkar-progress-v2':{version:2,totals:{tasbih:5},days:{}}}});restoreBackup(oldBackup,{confirmed:true});assert.equal(JSON.parse(values.get('salah:adhkar-progress-v2')).totals.tasbih,27);console.log('PASS: restoring an older backup cannot subtract cloud-account lifetime totals.');
