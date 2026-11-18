import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {uiLeaf,uiAttribute} from '../dist/js/ui.js';
import {chatBubble,escapeStaff,staffIcon} from '../dist/js/staff-markup.js';
const source=await readFile(new URL('../dist/js/staff-cabinet.js',import.meta.url),'utf8');
const begin=source.indexOf(' async function support(area,current){'),end=source.indexOf(' async function audit(',begin);
assert(begin>0&&end>begin);
const T=randomUUID(),M=randomUUID(),U=randomUUID();
const flush=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
for(const role of ['owner','admin','moderator']){
 const w=new Window({url:'https://salah.invalid/#staff'}),d=w.document,area=d.createElement('section');d.body.append(area);
 let closed=true,fail=true;const calls=[];
 const context={actor:{id:U,owner:role==='owner',role},uiLeaf,uiAttribute,chatBubble,esc:escapeStaff,icon:staffIcon,crypto:{randomUUID},mountMessageEmojis:()=>()=>{},stopChatLayout:null,select:async()=>{},run:async(_button,task)=>{try{await task();}catch(error){assert.equal(error.message,'offline');}},call:async(action,args)=>{
  calls.push({action,args});
  if(action==='support.list')return[{id:T,subject:'Existing request',nickname:'Participant',status:'closed'}];
  if(action==='support.read')return{thread:{id:T,subject:'Existing request',status:closed?'closed':'open'},messages:[{id:M,body:'Existing reply',owner_reply:true,created_at:'2026-11-18T10:00:00Z'}],photos:[]};
  if(action==='support.reopen'){if(fail){fail=false;throw Error('offline');}closed=false;return{ok:true,threadId:T,operationId:args.operationId,status:'open'};}
  throw Error('Unexpected action '+action);
 }};
 const support=vm.runInNewContext('('+source.slice(begin,end).trim()+')',context);await support(area,()=>true);
 area.querySelector('[data-thread]').click();await flush();
 assert.equal(area.querySelectorAll('.staff-bubble').length,1,'The existing team Support bubble markup remains intact');
 const button=area.querySelector('[data-reopen-thread]');
 if(role==='moderator'){assert.equal(button,null,'The existing moderator role gets no new reopening control');}
 else{
  assert(button);button.click();await flush();assert.equal(area.querySelector('textarea'),null,'An offline error keeps the same closed conversation visible');
  button.click();await flush();const operations=calls.filter(c=>c.action==='support.reopen');assert.equal(operations.length,2);assert.equal(operations[0].args.operationId,operations[1].args.operationId,'Retries bind to their initiating operation');
  assert(area.querySelector('textarea'),'The administrator/owner continues inside the existing case after a fresh read');assert.equal(calls.at(-1).action,'support.read');assert.equal(calls.at(-1).args.id,T);assert.equal(area.querySelectorAll('.staff-bubble').length,1);
 }
 await w.happyDOM.close();
}
console.log('PASS actual staff Support view: owner/admin continuation, moderator exclusion, preserved bubble/history, stable offline retry and refreshed composer in the same case.');
