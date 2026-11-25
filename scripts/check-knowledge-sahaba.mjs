
import assert from 'node:assert/strict';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';

const win = new Window({url:'https://example.invalid/salah/#knowledge'});
const doc = win.document;
Object.assign(globalThis,{window:win,document:doc,location:win.location,localStorage:win.localStorage});
const navigatorFixture = {standalone:true};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:navigatorFixture});

const userId = '11111111-1111-4111-8111-111111111111';
const user = {id:userId,email_confirmed_at:'2026-11-25',is_anonymous:false};
let session = {access_token:'fixture-token',user};
let actor = {id:userId,owner:true,role:'owner',mfaRequired:false};
win.supabase = {createClient:()=>({auth:{
 onAuthStateChange(){},
 async getSession(){return{data:{session},error:null};},
 async getUser(){return{data:{user},error:null};}
}})};
globalThis.fetch=async (url,options)=>{
 assert.ok(String(url).endsWith('/functions/v1/staff-cabinet'));
 assert.deepEqual(JSON.parse(options.body),{action:'gate',args:{}});
 return Response.json({data:actor});
};

const {showKnowledge}=await import('../dist/js/knowledge.js');
const {verifyTeamPreviewAccess,teamPreviewActor}=await import('../dist/js/team-preview-access.js');
doc.body.innerHTML='<main></main>';
const host=doc.querySelector('main');
const render=()=>showKnowledge(host,{hash:'#knowledge',onStart(){}});
const sahaba=()=>host.querySelector('a[href="https://sahaba-learning.skodytunez.chatgpt.site"]');

render();
assert.equal(sahaba()?.target,'_blank','Unverified installed users keep the public card');
assert.equal(await verifyTeamPreviewAccess({force:true}),true);
assert.equal(teamPreviewActor()?.owner,true);
render();
assert.equal(sahaba()?.target,'_blank','The verified owner gets the external card back in installed SALAH');
assert.equal(sahaba()?.rel,'noopener noreferrer');
assert.ok(host.querySelector('a[href="#knowledge?view=alphabet"]'));
assert.ok(host.querySelector('a[href="#knowledge?view=names"]'));
const unchanged=host.querySelector('.knowledge-page');
render();
assert.equal(host.querySelector('.knowledge-page'),unchanged,'Repeated renders preserve the catalog');
navigatorFixture.standalone=false;
render();
assert.equal(sahaba()?.target,'_blank','Ordinary Safari remains an unmodified comparison for the owner');

navigatorFixture.standalone=true;
actor={...actor,owner:false,role:'admin'};
assert.equal(await verifyTeamPreviewAccess({force:true}),true);
render();
assert.ok(sahaba(),'A team administrator keeps the card');
actor={...actor,owner:true,role:'owner'};
assert.equal(await verifyTeamPreviewAccess({force:true}),true);
render();
assert.ok(sahaba(),'The owner retains the card after role changes');
session=null;
assert.equal(await verifyTeamPreviewAccess({force:true}),false);
render();
assert.ok(sahaba(),'Sign-out keeps the same public card');
await win.happyDOM.close();
console.log('PASS: the SAHABA link is visible in Knowledge for the verified iOS owner, Safari, admins and other users.');
