import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import{createAppSharing,PUBLIC_APP_URL,PUBLIC_SHARE_URL}from '../dist/js/app-sharing.js';
const messages=[],links=[],sent=[];
const notify=message=>messages.push(message),fallback=url=>links.push(url);
let copied=[];
const native=createAppSharing({navigator:{share:async payload=>sent.push(payload),clipboard:{writeText:async url=>copied.push(url)}},notify,fallback});
await native.share();assert.deepEqual(sent,[{title:'SALAH',url:PUBLIC_SHARE_URL}]);assert.equal(copied.length,0);assert.equal(messages.length,0,'Opening native share is not proof a recipient received a message');
await native.copy();assert.deepEqual(copied,[PUBLIC_SHARE_URL]);assert.match(messages.pop(),/скопирована/);
const cancelled=createAppSharing({navigator:{share:async()=>{throw {name:'AbortError'}},clipboard:{writeText:async url=>copied.push(url)}},notify,fallback});await cancelled.share();assert.equal(copied.length,1);assert.equal(links.length,0);
const unsupported=createAppSharing({navigator:{clipboard:{writeText:async url=>copied.push(url)}},notify,fallback});await unsupported.share();assert.equal(copied.at(-1),PUBLIC_SHARE_URL);
const denied=createAppSharing({navigator:{share:async()=>{throw Error('NotAllowed')},clipboard:{writeText:async()=>{throw Error('Blocked')}}},notify,fallback});await denied.share();assert.deepEqual(links,[PUBLIC_SHARE_URL]);
const absent=createAppSharing({navigator:{},notify,fallback});await absent.copy();assert.deepEqual(links,[PUBLIC_SHARE_URL,PUBLIC_SHARE_URL]);
let release,requests=0;const pending=createAppSharing({navigator:{share:()=>{requests++;return new Promise(resolve=>release=resolve)},clipboard:{writeText:async()=>requests++}},notify,fallback});const first=pending.share();await pending.share();await pending.copy();assert.equal(requests,1);release();await first;await pending.copy();assert.equal(requests,2);
assert.equal(new URL(PUBLIC_APP_URL).hash,'');assert.equal(new URL(PUBLIC_APP_URL).search,'');
console.log('PASS: sharing uses the public preview URL; native sharing, direct copy, cancellation, denied/missing clipboard, manual fallback and duplicate taps behave safely. No messages sent.');

// The share URL must serve image metadata without JavaScript and open the same app.
const rootHtml=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const shareHtml=await readFile(new URL('../dist/share.html',import.meta.url),'utf8');
assert.equal(new URL(PUBLIC_SHARE_URL).origin,new URL(PUBLIC_APP_URL).origin);
assert.equal(shareHtml,rootHtml.replace('<link rel="canonical" href="'+PUBLIC_APP_URL+'">','<link rel="canonical" href="'+PUBLIC_SHARE_URL+'">').replace('<meta property="og:url" content="'+PUBLIC_APP_URL+'">','<meta property="og:url" content="'+PUBLIC_SHARE_URL+'">'));
assert.ok(shareHtml.includes('<meta property="og:image" content="https://skodytunez-maker.github.io/salah/assets/salah-social-cover-v1.jpg">'));
assert.ok(shareHtml.includes('<script type="module" src="./js/app.js"></script>'));
assert.doesNotMatch(shareHtml,/http-equiv="refresh"/i);

