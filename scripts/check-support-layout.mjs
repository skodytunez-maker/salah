import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';

const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const paths=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.\/([^\"]+)"[^>]*>/g)].map(m=>m[1]);
assert(paths.includes('css/support.css')&&paths.includes('css/staff-messenger.css'));
const css=(await Promise.all(paths.map(p=>readFile(new URL('../dist/'+p,import.meta.url),'utf8')))).join('\n').replaceAll('@media(','@media (');
for(const [width,height,insets] of [[375,667,{top:20,bottom:0,left:0,right:0}],[393,852,{top:59,bottom:34,left:0,right:0}],[852,393,{top:0,bottom:21,left:59,right:59}],[1440,900,{top:0,bottom:0,left:0,right:0}],[393,460,{top:59,bottom:0,left:0,right:0}],[402,874,{top:62,bottom:34,left:0,right:0}]]){
 for(const themed of [false,true]){
 const w=new Window({width,height,url:'https://salah.invalid/#support?owner=1'}),d=w.document;
 // Explicit fixture of env() values: HappyDOM is not a phone safe-area engine.
 const style=d.createElement('style');style.textContent=css.replace(/env\(safe-area-inset-(top|bottom|left|right)(?:,\s*0px)?\)/g,(_,key)=>insets[key]+'px').replace(/var\(--support-toolbar-inset\)/g,insets.top+'px').replace(/calc\(([\d.]+)px\s*\+\s*([\d.]+)px\)/g,(_,a,b)=>(Number(a)+Number(b))+'px').replace(/max\(([\d.]+)px,\s*([\d.]+)px\)/g,(_,a,b)=>Math.max(Number(a),Number(b))+'px');d.head.append(style);
 d.body.className='support-conversation-open';d.body.innerHTML='<div class="workspace"><header>Outside header</header><main class="support-route-chat"><section id="support-root" class="panel section support-chat-shell staff-cabinet" data-support-grouped="true" style="--support-chat-height:'+height+'px;--support-chat-top:0px"><div class="support-panel staff-messenger"><div class="support-actions support-chat-header"><button class="text-button support-chat-back">‹</button><div class="support-chat-person"><strong>Long participant name</strong><span data-support-thread-status>Closed</span></div></div><div class="support-history-toolbar" hidden><button hidden>Earlier</button></div><div class="support-messages"><article class="support-chat-message staff-message"><div class="staff-bubble"><p>Incoming message</p></div></article><article class="support-chat-message staff-message is-mine"><div class="staff-bubble"><p>Operator message</p></div></article></div><div class="support-chat-footer"><p data-support-status></p><div class="support-case-closed"><p>Closed</p><div class="support-actions"><button class="button" data-support-reopen>Continue conversation</button></div></div></div></div></section></main><footer>SALAH</footer></div><nav id="mobile-nav">Outside navigation</nav>';
 const root=d.querySelector('#support-root');
 if(themed){root.dataset.conversationTheme='stars';root.style.setProperty('--conversation-theme-base','#070f20');root.style.setProperty('--conversation-theme-image','url("./themes/stars.webp")');}
 const surface=w.getComputedStyle(root);
 assert.equal(surface.position,'fixed');assert.equal(surface.boxSizing,'border-box');
 assert.match(surface.backgroundColor,/^(?:rgb\(|#[\da-f]{6}$)/i,'The real CSS cascade keeps an opaque chat surface, hiding the underlying SALAH footer');
 assert.notEqual(surface.backgroundColor,'rgba(0, 0, 0, 0)');assert.notEqual(surface.padding,'0px','The generic .panel reset cannot erase safe padding');
 assert.equal(surface.height,height+'px');assert.equal(parseFloat(surface.paddingTop),Math.max(8,4+insets.top),'The header follows the actual safe area without a second40px status allowance; zero-inset desktop/landscape retains8px');
 assert.equal(w.getComputedStyle(d.querySelector('.support-panel')).display,'flex');
 assert.equal(w.getComputedStyle(d.querySelector('.support-panel')).flexDirection,'column');
 assert.equal(parseFloat(w.getComputedStyle(d.querySelector('.support-messages')).minHeight),0,'The history can shrink for a visible keyboard/footer');
 assert.equal(w.getComputedStyle(d.querySelector('.support-history-toolbar')).display,'none','An empty history toolbar consumes no space');
 for(const node of d.querySelectorAll('.workspace>header,.workspace>footer,#mobile-nav'))assert.equal(w.getComputedStyle(node).visibility,'hidden','Outside chrome never bleeds into the conversation');
 assert.equal(parseFloat(w.getComputedStyle(d.querySelector('.support-case-closed')).marginTop),0);
 assert.equal(w.getComputedStyle(d.querySelector('.support-chat-footer')).flexShrink,'0');
 const edge=d.querySelector('.support-messages'),edgeHeight=w.getComputedStyle(edge).minHeight;edge.setAttribute('data-support-scrolled','');assert.match(w.getComputedStyle(edge).getPropertyValue('mask-image'),/linear-gradient/,'A scrolled history has a static top fade in the actual CSS cascade');assert.equal(w.getComputedStyle(edge).minHeight,edgeHeight,'The fade does not resize the message log');assert(!/linear-gradient/.test(w.getComputedStyle(d.querySelector('.support-chat-header')).getPropertyValue('mask-image')),'Fixed participant controls are never masked');edge.removeAttribute('data-support-scrolled');
 if(themed){
 const panel=d.querySelector('.support-panel'),header=d.querySelector('.support-chat-header'),footer=d.querySelector('.support-chat-footer'),reopen=d.querySelector('[data-support-reopen]');
 assert.match(surface.backgroundImage,/stars\.webp/,'Wallpaper is on the full fixed viewport');
 for(const node of [panel,header,footer])assert.match(w.getComputedStyle(node).backgroundColor,/^(?:transparent|rgba\(0, 0, 0, 0\))$/,'No opaque rectangular seam in themed Support chrome');
 assert.equal(w.getComputedStyle(header).borderBottomWidth,'0px');assert.equal(w.getComputedStyle(footer).borderTopWidth,'0px');
 assert.equal(w.getComputedStyle(reopen).maxWidth,'280px');assert.equal(w.getComputedStyle(reopen).minHeight,'44px','Compact continuation still has a touch-size target');
 assert.equal(surface.getPropertyValue('--conversation-theme-outgoing').trim(),'#253e4cf2','Stars Support uses a restrained petrol bubble, not the old lavender slab');
 }else assert.equal(w.getComputedStyle(d.querySelector('[data-support-reopen]')).maxWidth,'360px','Default Support presentation is unchanged');
 await w.happyDOM.close();
 }
}
console.log('PASS Support layout: actual full stylesheet order, opaque viewport, retained safe padding, compact fixed header, shrinkable history, bottom case actions and hidden outside chrome across phone/landscape/desktop fixtures. Themed full-viewport background, transparent chrome and compact continuation also checked. Compact safe-area header also checked at keyboard height and newer iPhone insets. Not physical Safari rendering.');
