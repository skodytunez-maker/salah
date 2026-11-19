import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {themePreferenceKey} from '../dist/js/conversation-themes.js';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const paths=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.\/([^\"]+)"[^>]*>/g)].map(m=>m[1]);
const css=(await Promise.all(paths.map(p=>readFile(new URL('../dist/'+p,import.meta.url),'utf8')))).join('\n').replaceAll('@media(','@media (');
const A='11111111-1111-4111-8111-111111111111',U='22222222-2222-4222-8222-222222222222';
for(const [width,height,dir] of [[320,667,'ltr'],[393,852,'ltr'],[852,393,'ltr'],[1440,900,'ltr'],[393,852,'rtl']]){
 for(const themed of [false,true]){
 const w=new Window({width,height,url:'https://fixture.invalid/#support?owner=1'}),doc=w.document;
 Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,Event:w.Event});doc.documentElement.dir=dir;
 if(themed){w.Image=function(){const img=doc.createElement('img');Object.defineProperties(img,{complete:{get:()=>true},naturalWidth:{get:()=>1024},naturalHeight:{get:()=>1536}});img.decode=async()=>{};return img;};w.localStorage.setItem(themePreferenceKey(A,'support:'+U),JSON.stringify({theme:'stars'}));}
 const style=doc.createElement('style');style.textContent=css;doc.head.append(style);
 const host=doc.createElement('main');host.innerHTML='<button data-avatar>Profile</button><div class="support-messages">Retained chat</div><textarea>Unsent reply</textarea>';doc.body.append(host);
 const {createSupportUserProfile}=await import('../dist/js/support-user-profile.js');
 const profile=createSupportUserProfile({host,actorId:A,getActor:()=>A,loadUser:async id=>({id,nickname:'A participant with a longer display name',joinedAt:'2026-10-01T10:00:00Z',appVersion:473,versionCheckedAt:'2026-11-14T09:49:00Z'}),loadDetails:async id=>({id,hasAvatar:false,connected:true,periods:{all:2378,day:0,week:0,month:2326},reciters:[{id:'ar.nufais',seconds:1726},{id:'ar.dosari',seconds:328}],awards:[{kind:'founder',count:1,earnedAt:'2026-10-01T10:00:00Z'}],adhkar:{day:'2026-11-19',active:false},context:{city:'Saved prayer city',reading:{page:604,edition:'madani',savedAt:'2026-11-14T09:49:00Z'}}})});
 assert(profile.open({id:U},host.querySelector('button')));for(let i=0;i<15;i++)await new Promise(r=>setImmediate(r));
 const dialog=host.querySelector('dialog.support-user-profile'),computed=n=>w.getComputedStyle(dialog.querySelector(n));
 // This was the phone defect: normal card CSS existed but did not match its Support host.
 assert.equal(computed('.owner-profile-panel h2').fontSize,width<760?'16px':'17px','Support card headings use the established compact owner-card type');
 assert.equal(computed('.owner-profile-panel').borderTopStyle,'solid');assert.equal(computed('.owner-profile-panel').borderRadius,'20px');
 assert.equal(computed('.owner-profile-panel').paddingTop,width<360?'15px':'18px');
 assert.equal(computed('.owner-profile-hero').flexDirection,'column');assert.equal(computed('.owner-profile-hero').alignItems,'center');
 assert.equal(computed('#owner-user-name').fontSize,width<760?'24px':'26px');assert.equal(computed('#owner-user-name').overflowWrap,'anywhere');
 assert.equal(computed('.owner-profile-total').flexDirection,'column');assert.equal(computed('.owner-profile-periods').display,'grid');
 assert.equal(computed('.owner-profile-reciters').listStyle,'none');assert.equal(computed('.owner-profile-reciters img').width,'40px');
 assert.equal(computed('.owner-award-grid').display,'grid');assert.equal(computed('.owner-award-button').borderRadius,'16px');
 assert.equal(computed('.owner-profile-reading dl>div').borderBottomWidth,'0px');assert.equal(computed('.owner-profile-account dd').textAlign,'end');
 assert.equal(computed('[data-support-profile-back]').borderRadius,'14px');assert.equal(computed('[data-support-profile-back]').minHeight,'44px');
 assert.equal(computed('[data-support-profile-refresh]').minHeight,'44px');assert.equal(parseFloat(computed('.support-profile-body').minHeight),0);
 assert.equal(parseFloat(computed('[data-support-profile-card]').minHeight),0,'No nested viewport-height spacer pushes content apart');
 if(themed){assert.equal(dialog.dataset.conversationTheme,'stars');for(const surface of ['.support-profile-header','.owner-profile-identity']){assert.match(computed(surface).backgroundColor,/^(?:transparent|rgba\(0, 0, 0, 0\))$/,'The selected wallpaper is continuous behind profile toolbar and identity; no rectangular panels');assert.equal(computed(surface).boxShadow,'none');}assert.notEqual(computed('.owner-profile-panel').backgroundColor,'transparent','Rounded statistics remain readable');assert.equal(computed('.owner-profile-panel').borderRadius,'20px');}
 assert.equal(doc.activeElement,dialog,'Opening a modal focuses its labelled container rather than highlighting the Back button');
 assert.equal(host.querySelector('textarea').value,'Unsent reply');assert.equal(host.querySelector('.support-messages').textContent,'Retained chat');
 const firstHeading=dialog.querySelector('.owner-profile-panel h2');profile.dispose();assert(!host.contains(firstHeading));await w.happyDOM.close();
 }
}
console.log('PASS Support profile uses the real stylesheet cascade across narrow phone, iPhone, landscape, desktop and RTL: compact section typography, cards, metric grid, reciters, awards, readable account rows, focus-safe toolbar and retained conversation. Not physical Safari rendering.');
