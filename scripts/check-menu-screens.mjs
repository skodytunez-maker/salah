import{readFile}from 'node:fs/promises';
import{runInNewContext}from 'node:vm';
import assert from 'node:assert/strict';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {staffMessengerMarkup,mountStaffMessenger} from '../dist/js/staff-messenger.js';
import {createOwnerCardHistory} from '../dist/js/owner-card-navigation.js';
import {mountSettingsScreens} from '../dist/js/settings-screens.js';
const w=new Window({url:'https://fixture.invalid/#admin'}),d=w.document;Object.defineProperty(w,'innerWidth',{value:390,writable:true});
const viewport=new w.EventTarget();viewport.height=640;viewport.offsetTop=0;Object.defineProperty(w,'visualViewport',{value:viewport});
const historyEntries=[{existing:'preserved'}];let index=0,queued=0;const h={get state(){return historyEntries[index]},pushState(s,_unused,url){assert.ok(url);historyEntries.splice(++index);historyEntries.push(s);if(url!==w.location.href)w.location.href=new URL(url,w.location.href).href;},replaceState(s){historyEntries[index]=s;},back(){queued++;}};Object.defineProperty(w,'history',{value:h});
const flush=()=>{if(queued){queued--;index=Math.max(0,index-1);w.dispatchEvent(new w.PopStateEvent('popstate',{state:h.state}));}};
const host=d.createElement('section');host.className='staff-cabinet';host.innerHTML=staffMessengerMarkup();d.body.append(host);const root=host.querySelector('.staff-messenger');root.getBoundingClientRect=()=>({width:358});
const rooms=[{id:'private-room-id',title:'Команда',kind:'team',unread:1}],contacts=[{id:'private-user-id',nickname:'<b>Имя</b>',role:'moderator'}];let opened=0;const messenger=mountStaffMessenger(root,{rooms,contacts,onRoom:r=>{opened++;messenger.showConversation(r);},onContact:()=>{}});
assert.equal(root.querySelectorAll('[data-contact]').length,0,'Default inbox does not duplicate contacts');
root.querySelector('[data-new-message]').click();assert.equal(root.querySelectorAll('[data-contact]').length,1);assert.ok(root.querySelector('[data-contact]').textContent.includes('<b>Имя</b>'));assert.equal(root.querySelector('[data-contact] b'),null,'Names remain escaped');
root.querySelector('[data-new-message]').click();root.querySelector('[data-room]').click();assert.equal(opened,1);assert.equal(root.querySelector('dialog').open,true);assert.equal(root.querySelector('dialog').classList.contains('is-mobile'),true);assert.equal(d.body.classList.contains('staff-messenger-open'),true);assert.equal(d.activeElement,root.querySelector('[data-messenger-back]'),'Opening a chat must not pop up the keyboard');
assert.equal(index,1);assert.equal(h.state.existing,'preserved');assert.ok(!JSON.stringify(historyEntries).includes('private-room-id'));assert.ok(!JSON.stringify(historyEntries).includes('private-user-id'));
const input=root.querySelector('textarea');input.value='Сохранённый черновик';input.focus();viewport.height=300;viewport.dispatchEvent(new w.Event('resize'));assert.equal(root.querySelector('dialog').style.getPropertyValue('--staff-chat-viewport-height'),'300px');assert.equal(d.activeElement,input);assert.equal(input.value,'Сохранённый черновик');messenger.renderRooms(rooms);assert.equal(root.querySelector('textarea'),input);assert.equal(index,1,'Polling cannot add Back entries');
root.querySelector('[data-messenger-back]').click();root.querySelector('[data-messenger-back]').click();assert.equal(queued,1,'Rapid Back cannot skip the cabinet');flush();assert.equal(root.dataset.messengerView,'list');assert.equal(root.querySelector('dialog').open,false);assert.equal(input.value,'Сохранённый черновик','Returning to the inbox does not discard a draft');
messenger.showConversation(rooms[0]);assert.equal(index,1);h.back();flush();assert.equal(root.dataset.messengerView,'list','Native Back closes the conversation before leaving the section');assert.equal(d.body.classList.contains('staff-messenger-open'),false);
messenger.showConversation(rooms[0]);messenger.dispose();assert.equal(root.querySelector('dialog').open,false);assert.equal(d.body.classList.contains('staff-messenger-open'),false);assert.ok(!h.state?.salahStaffChat,'Disposal removes only its private navigation marker');
// A profile history controller may be created before its user section is opened.
w.location.hash='#admin';let dismissed=0;const card=createOwnerCardHistory({win:w,isActive:()=>true,dismiss:()=>dismissed++});w.location.hash='#admin?view=users';card.open();card.back();assert.equal(dismissed,1);assert.equal(queued,1,'Profile Back uses the URL at opening, not the cabinet mount URL');flush();card.dispose();
const settings=d.createElement('main');settings.innerHTML='<div class="page-head"><h1>Настройки</h1></div><form id="settings-form"><div class="settings-grid">'+['Город','Оформление','Напоминания','Данные','Приложение'].map((name,i)=>'<details class="settings-group"><summary>'+name+'</summary><div class="settings-group-body"><input value="value-'+i+'"></div></details>').join('')+'</div><div class="settings-save"><button>Сохранить</button></div></form>';d.body.append(settings);w.location.hash='#settings';const stop=mountSettingsScreens(settings,{win:w}),groups=[...settings.querySelectorAll('.settings-group')],field=groups[1].querySelector('input');field.value='Черновик настройки';groups[1].querySelector('summary').click();assert.equal(w.location.hash,'#settings?section=appearance');assert.equal(groups[1].open,true);assert.equal(groups[0].hidden,true);assert.equal(settings.querySelector('h1').textContent,'Оформление');assert.equal(groups[1].querySelector('input'),field);assert.equal(field.value,'Черновик настройки');
const mainSource=await readFile(new URL('../dist/js/app.js',import.meta.url),'utf8'),handlerSource=mainSource.slice(mainSource.indexOf("window.addEventListener('hashchange'"),mainSource.indexOf(";window.addEventListener('online'",mainSource.indexOf("window.addEventListener('hashchange'")))+';';let nativeHashHandler=null,rebuilds=0;runInNewContext(handlerSource,{window:{addEventListener:(_type,fn)=>nativeHashHandler=fn,scrollTo(){}},location:w.location,history:h,committedRouteHash:w.location.hash,currentRoute:'settings',app:settings,staffCabinetBusy:()=>false,render:()=>rebuilds++});w.location.hash='#settings';nativeHashHandler();assert.equal(rebuilds,0,'Real application router must keep the settings document on internal Back');assert.equal(groups[1].querySelector('input'),field);assert.equal(field.value,'Черновик настройки');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.ok(groups.every(g=>!g.hidden&&!g.open));assert.equal(settings.querySelector('.settings-save').hidden,true);stop();

// The personal account shares a visual class with the owner sign-in form.
// Exercise the actual admin route branch; it must open on the first tap.
const adminBranch=mainSource.slice(mainSource.indexOf("else if(currentRoute==='admin'){")+5,mainSource.indexOf("else {location.hash='home'"));
assert.ok(adminBranch.startsWith("if(currentRoute==='admin')"));
const accountEntry=d.createElement('main');let mounts=0;
const enterOwner=verified=>runInNewContext(adminBranch,{currentRoute:'admin',app:accountEntry,ownerVerified:()=>verified,showAdmin:()=>mounts++});
accountEntry.innerHTML='<section class="panel section owner-login"><h1>Мой аккаунт</h1><a href="#admin">Кабинет владельца</a></section>';
enterOwner(true);assert.equal(mounts,1,'First tap must replace a personal account with the actual cabinet');
accountEntry.innerHTML='<section class="admin-intro"><div id="owner-panel-users"></div></section>';
enterOwner(true);assert.equal(mounts,1,'Refreshing the active cabinet keeps its list, profile and drafts');
enterOwner(false);assert.equal(mounts,2,'Expired authority still re-enters the protected server and MFA gate');
accountEntry.innerHTML='<section class="owner-login"><form id="owner-login"></form></section>';
enterOwner(true);assert.equal(mounts,3,'A newly verified owner leaves the sign-in screen immediately');
accountEntry.innerHTML='<section class="owner-login"><div id="owner-mfa-step"></div></section>';
enterOwner(true);assert.equal(mounts,4,'Successful MFA leaves the challenge screen immediately');
console.log('PASS: owner cabinet opens on the first tap from account, sign-in and MFA; active cabinet retained, expired access rechecked.');

await w.happyDOM.close();console.log('PASS: compact inbox, escaped names, modal phone chat, keyboard viewport, stable drafts, native and rapid Back, private history, profile after route changes, settings screen values and cleanup.');
