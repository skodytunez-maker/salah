import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import{Window}from 'happy-dom';
import{writeFile}from 'node:fs/promises';
const win=new Window({url:'https://fixture.invalid/#staff'});
for(const key of ['window','document','location','history','navigator','FormData','File','Blob','Event','InputEvent','HTMLElement'])Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:key==='window'?win:win[key]});
win.confirm=()=>true;
const timers=[];const nativeInterval=globalThis.setInterval;globalThis.setInterval=fn=>{timers.push(fn);return timers.length;};globalThis.clearInterval=()=>{};
const {showStaffCabinet,stopStaffCabinet}=await import('../../dist/js/staff-cabinet.js');
const uid=crypto.randomUUID(),mid=crypto.randomUUID(),room=crypto.randomUUID(),contact=crypto.randomUUID(),dm=crypto.randomUUID(),draft=crypto.randomUUID();
const members=[{id:contact,nickname:'Тестовый сотрудник',role:'moderator',active:true}],calls=[],messages=[];let role='owner',heldUpload=null,revision=1;
const draftRow={id:draft,kind:'reciter',entity_id:'ar.alafasy',payload:{name:'Мишари аль-Афаси',format:'verse',comment:''},status:'draft',revision:1};
async function request(action,args){calls.push([action,args]);if(action==='gate')return{id:uid,owner:role==='owner',role,permissions:role==='moderator'?['support']:['support','reciters','wallpapers'],mfaRequired:false};
 if(action==='member.list'||action==='member.search')return members;
 if(action==='member.set')return{ok:true};
 if(action==='chat.rooms')return[{id:room,kind:'team',title:'Команда SALAH'}];
 if(action==='chat.contacts')return members;
 if(action==='chat.open')return{id:dm,kind:'direct',title:'Тестовый сотрудник'};
 if(action==='chat.read')return{messages:messages.filter(x=>x.room_id===args.roomId),files:[]};
 if(action==='chat.send'){messages.push({id:args.messageId,room_id:args.roomId,author_id:uid,author_name:'Тест',body:args.body,created_at:new Date().toISOString()});return{ok:true};}
 if(action==='chat.file.upload'){if(heldUpload)await heldUpload;return{id:mid,filename:args.filename,bytes:5};}
 if(action==='draft.list')return args.kind==='reciter'?[draftRow]:[];
 if(action==='asset.list')return[];
 if(action==='draft.save'){Object.assign(draftRow,{payload:args.payload,revision:++revision});return structuredClone(draftRow);}
 if(action==='draft.submit'){draftRow.status='submitted';return draftRow;}
 if(action==='review.list'||action==='support.list'||action==='audit.list')return[];
 throw Error('Unexpected local action '+action);
}
const host=document.createElement('main');document.body.append(host);let checks=0;
const yes=x=>{assert.ok(x);checks++;};
async function settle(){for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));}
async function click(selector){const element=host.querySelector(selector);assert.ok(element,selector);element.click();await settle();}
await showStaffCabinet(host,{request,demo:true});yes(host.textContent.includes('Кабинет команды'));yes(host.querySelector('[data-staff-tab="team"]'));
await click('[data-staff-tab="chat"]');const textarea=host.querySelector('textarea');textarea.value='Черновик сообщения';textarea.dispatchEvent(new win.Event('input'));await click('[data-smile]');await click('[data-emoji="🤍"]');yes(textarea.value.includes('🤍'));
await click('.staff-send');yes(calls.filter(x=>x[0]==='chat.send').length===1);yes(host.querySelector('[role="log"]').textContent.includes('Черновик сообщения'));
const log=host.querySelector('[role="log"]'),bubble=log.querySelector('[data-message]');textarea.value='Не теряй набранное';textarea.dispatchEvent(new win.Event('input'));
await timers.at(-1)();await settle();yes(host.querySelector('textarea')===textarea&&textarea.value==='Не теряй набранное');yes(log.querySelector('[data-message]')===bubble);
await click('[data-contact]');yes(host.querySelector('[data-chat-title]').textContent==='Тестовый сотрудник');yes(host.querySelector('textarea').value==='');yes(!host.querySelector('[role="log"]').textContent.includes('Черновик сообщения'));
const input=host.querySelector('[data-chat-file]');const file=new win.File(['hello'],'test.txt',{type:'text/plain'});Object.defineProperty(input,'files',{value:[file],configurable:true});let release;heldUpload=new Promise(r=>release=r);input.dispatchEvent(new win.Event('change'));await settle();yes(host.querySelector('.staff-send').disabled);release();await settle();heldUpload=null;yes(!host.querySelector('.staff-send').disabled);yes(host.querySelector('.staff-pending-files').textContent.includes('test.txt'));await click('.staff-send');yes(calls.at(-2)[0]==='chat.send'||calls.some(([a,b])=>a==='chat.send'&&b.files.includes(mid)));
await click('[data-staff-tab="reciter"]');await click('[data-draft]');const name=host.querySelector('[name="name"]');name.value='Мишари (тестовый черновик)';name.dispatchEvent(new win.Event('input'));await click('button[data-submit]');yes(calls.some(([a,b])=>a==='draft.save'&&b.payload.name.includes('тестовый')));yes(calls.some(([a,b])=>a==='draft.submit'&&b.revision===2));yes(host.textContent.includes('На проверке'));
role='moderator';await showStaffCabinet(host,{request,demo:true});yes(!host.querySelector('[data-staff-tab="team"]'));yes(!host.querySelector('[data-staff-tab="reciter"]'));yes(host.querySelector('[data-staff-tab="chat"]'));
stopStaffCabinet();globalThis.setInterval=nativeInterval;await win.happyDOM.abort();await writeFile(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'salah-staff-interface-checks.json'),JSON.stringify({passed:true,checks,localOnly:true,engine:'happy-dom 20.14.6',date:new Date().toISOString()},null,2));console.log('Local DOM checks passed: '+checks);
