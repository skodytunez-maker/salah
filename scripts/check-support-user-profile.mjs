import assert from 'node:assert/strict';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const w=new Window({url:'https://fixture.invalid/#support?owner=1'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,Event:w.Event});
const{createSupportUserProfile}=await import('../dist/js/support-user-profile.js');
const{setInterfaceLanguage}=await import('../dist/js/i18n.js');setInterfaceLanguage('ru');
const A='11111111-1111-4111-8111-111111111111',U='22222222-2222-4222-8222-222222222222';
const host=doc.createElement('main');host.innerHTML='<section class="support-chat-shell"><button data-avatar>SA</button><div class="support-messages">Retained conversation</div><textarea>Unsent reply</textarea></section>';doc.body.append(host);
const opener=host.querySelector('[data-avatar]'),log=host.querySelector('.support-messages'),draft=host.querySelector('textarea');log.scrollTop=147;
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r));};
let actor=A,loads=0,wait=null;
const profile=createSupportUserProfile({host,actorId:A,getActor:()=>actor,loadUser:async id=>{loads++;if(wait)return wait;return{id,nickname:'Sarvinoz',online:true};},loadDetails:async id=>({id,hasAvatar:false,connected:true,periods:{all:920,day:20,week:120,month:920},reciters:[],awards:[],context:{city:'Private city'}})});
assert.equal(profile.open({id:'invalid'},opener),false);assert.equal(loads,0);
assert.equal(profile.open({id:U},opener),true);await flush();let dialog=host.querySelector('dialog.support-user-profile');assert(dialog.open);assert.equal(dialog.querySelector('#owner-user-name').textContent,'Sarvinoz');assert(dialog.textContent.includes('Private city'));
assert.equal(host.querySelector('.support-messages'),log);assert.equal(log.scrollTop,147);assert.equal(draft.value,'Unsent reply');assert(!w.location.href.includes(U),'Private participant identity stays out of URLs');
// Execute the production horizontal pointer gesture, then its real history Back.
const surface=dialog.querySelector('.support-profile-body');dialog.getBoundingClientRect=()=>({left:0,top:0,width:393,height:852});
surface.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:12,clientY:350}));
surface.dispatchEvent(new w.PointerEvent('pointermove',{bubbles:true,pointerId:1,pointerType:'touch',isPrimary:true,clientX:185,clientY:351}));
surface.dispatchEvent(new w.PointerEvent('pointerup',{bubbles:true,pointerId:1,pointerType:'touch',isPrimary:true,clientX:185,clientY:351}));
await new Promise(r=>setTimeout(r,400));await flush();assert.equal(!!host.querySelector('dialog.support-user-profile'),false,'Swipe Back closes only the card');assert.equal(host.querySelector('.support-messages'),log);assert.equal(log.scrollTop,147);assert.equal(draft.value,'Unsent reply');
assert.equal(profile.open({id:U},opener),true);await flush();dialog=host.querySelector('dialog.support-user-profile');dialog.querySelector('[data-support-profile-back]').click();await new Promise(r=>setTimeout(r,30));await flush();assert(!host.querySelector('.support-user-profile'));
// An obsolete lookup must not paint after the role/actor changes or disposal.
let resolve;wait=new Promise(r=>resolve=r);assert.equal(profile.open({id:U},opener),true);actor=U;profile.dispose();resolve({id:U,nickname:'Late private result'});await flush();assert(!host.textContent.includes('Late private result'));assert(!host.textContent.includes('Private city'));assert.equal(profile.open({id:U},opener),false);
await w.happyDOM.close();console.log('PASS Support profile: verified actor only, server-loaded existing card, real swipe/history Back retains original conversation DOM/scroll/draft, repeat open/close, private identity off URL, and late-result disposal.');
