import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const w=new Window({url:'https://fixture.invalid/#account'});
Object.assign(globalThis,{window:w,document:w.document,location:w.location,localStorage:w.localStorage});
const{mountAccountLessonLink}=await import('../dist/js/account-lesson-link.js');
const uid='11111111-1111-4111-8111-111111111111',session={access_token:'fixture-confirmed-session',user:{id:uid,email_confirmed_at:'2026-01-01',is_anonymous:false,user_metadata:{role:'teacher'}}};
const root=w.document.createElement('section');w.document.body.append(root);let requests=0;
const reset=()=>{root.innerHTML='<div class="account-awards"></div><details class="account-details"><summary>Данные аккаунта</summary></details>';};
async function mount(data,options={}){await mountAccountLessonLink(root,{userId:uid,checkSession:async()=>({state:'valid',session}),fetcher:async(_url,init)=>{requests++;assert.equal(JSON.parse(init.body).action,'portal');assert.equal(init.credentials,'omit');return new Response(JSON.stringify(data));},...options});}
reset();await mount({lessons:[],canTeach:false,canManageTeachers:true});assert.equal(root.querySelector('nav'),null,'A metadata/management flag alone does not create teaching access');
reset();await mount({lessons:[{id:'fixture'}],canTeach:false});assert.equal(root.querySelectorAll('.account-learning-links').length,1);assert.equal(root.querySelectorAll('.account-learning-row').length,1);assert.equal(root.querySelector('[data-account-lessons]').getAttribute('href'),'#lesson');assert.equal(root.querySelector('[data-teacher-cabinet]'),null);
reset();await mount({lessons:[],canTeach:true,canManageTeachers:false});assert.equal(root.querySelectorAll('.account-learning-row').length,2);assert.equal(root.querySelector('[data-teacher-cabinet]').getAttribute('href'),'#lesson?view=teacher');assert.equal(root.querySelector('[data-teacher-admin]'),null);
reset();await mount({lessons:[],canTeach:true,canManageTeachers:true});assert.equal(root.querySelectorAll('.account-learning-row').length,3);assert.equal(root.querySelector('[data-teacher-admin]').getAttribute('href'),'#admin?view=teachers');assert.equal(root.querySelector('.account-details').previousElementSibling,root.querySelector('.account-learning-links'));assert.equal(root.querySelector('.account-learning-links .button'),null,'Full-size button margins are not inherited by compact rows');
await mount({lessons:[],canTeach:true,canManageTeachers:true});assert.equal(root.querySelectorAll('.account-learning-links').length,1,'Repeated mounting does not duplicate entries');
reset();const before=requests;await mount({lessons:[{}],canTeach:true},{checkSession:async()=>({state:'valid',session:{...session,user:{...session.user,id:'22222222-2222-4222-8222-222222222222'}}})});assert.equal(requests,before);assert.equal(root.querySelector('nav'),null,'A switched account cannot mount links from the old request');
await mount({lessons:[{}],canTeach:true},{isActive:()=>false});assert.equal(root.querySelector('nav'),null);
const account=await fs.readFile(new URL('../dist/js/counter-account.js',import.meta.url),'utf8'),app=await fs.readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');assert.ok(!account.includes('account-support-link'));assert.ok(!account.includes('<span>Моя поддержка</span>'));assert.ok(app.includes('Поддержать SALAH'));assert.ok(app.includes('#support-salah'));
await w.happyDOM.close();console.log('PASS: compact grouped links, server-approved role/identity gates, no duplicate/stale mount, account-only My Support removed and Main Menu support preserved.');
