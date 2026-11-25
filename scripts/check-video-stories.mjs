import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {PGlite} from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {t,getLocale} from '../dist/js/i18n.js';
import {esc,uiLeaf} from '../dist/js/ui.js';
import {createPlayerWindowHistory} from '../dist/js/quran-player-navigation.js';
import * as storyCore from '../supabase/functions/video-stories/core.mjs';

const db=new PGlite();
await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");
await db.exec(await readFile(new URL('../supabase/migrations/20261122213000_video_stories.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20261125143000_video_story_engagement.sql',import.meta.url),'utf8'));
const sql=async(parts,...args)=>(await db.query(parts.reduce((query,part,index)=>query+(index?'$'+index:'')+part,''),args)).rows;
sql.json=JSON.stringify;
const storyTestActors=new Map();
let handler,failedUpload=false,uploads=0,lastLifetime=null;
const origin='https://skodytunez-maker.github.io';
const base='https://test.invalid/functions/v1/video-stories';
const verified='Bearer verified-owner-session',unverified='Bearer signed-without-mfa';
const bucket=new Map();
const storage={
 async upload(name,bytes){uploads++;if(failedUpload){failedUpload=false;return {error:true};}bucket.set(name,bytes);return {error:null};},
 async createSignedUrl(name,lifetime){lastLifetime=lifetime;return bucket.has(name)?{data:{signedUrl:'https://test.invalid/storage/v1/object/sign/salah-video-stories/'+name}}:{error:true};},
 async remove(names){for(const name of names)bucket.delete(name);return {error:null};},
};
const source=await readFile(new URL('../supabase/functions/video-stories/index.ts',import.meta.url),'utf8');
vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*\n/gm,'')),{
 ...storyCore,Deno:{env:{get:()=> 'https://test.invalid'},serve:fn=>{handler=fn;}},postgres:()=>sql,
 createClient:()=>({storage:{from:()=>storage},auth:{getUser:async jwt=>({data:{user:storyTestActors.get(jwt)}})}}),Request,Response,URL,Date,TextDecoder,AbortSignal,Uint8Array,crypto,
 fetch:async(url,options)=>{
  assert.equal(new URL(url).pathname,'/functions/v1/owner-access');
  return Response.json({owner:options.headers.Authorization===verified});
 },
});
const video=new Uint8Array(24);video.set([0,0,0,24,102,116,121,112]);
const first='00000000-0000-4000-8000-000000000001',second='00000000-0000-4000-8000-000000000002';
const request=async(query,{method='GET',token,body,type='video/mp4',from=origin,poll}={})=>{
 const response=await handler(new Request(base+query,{method,body,headers:{Origin:from,...(token?{Authorization:token}:{}),...(body?{'Content-Type':type}:{}),...(poll?{'X-Salah-Story-Poll':encodeURIComponent(JSON.stringify(poll))}:{})}}));
 return {status:response.status,data:await response.json().catch(()=>null)};
};
const post=(id,hours,token=verified,bytes=video,highlight=0)=>request(`?id=${id}&hours=${hours}&highlight=${highlight}`,{method:'POST',token,body:bytes});
const patch=(id,change,token=verified)=>request('?id='+id,{method:'PATCH',token,body:JSON.stringify(change),type:'application/json'});

assert.equal((await request('',{from:'https://elsewhere.invalid'})).status,403);
assert.equal((await post(first,24,unverified)).status,403);
assert.equal((await request('?archive=1',{token:unverified})).status,403);
assert.equal((await post(first,12)).status,400);
assert.equal((await post(first,24,verified,new Uint8Array(24))).status,400);
assert.equal(uploads,0);
failedUpload=true;
assert.equal((await post(first,24)).status,503);
assert.equal((await request('?id='+first)).status,404,'A failed upload must never be visible');
assert.equal((await request('')).data.items.length,0);
const publication=await post(first,24);
assert.equal(publication.status,200);
assert.equal(Date.parse(publication.data.item.expiresAt)-Date.parse(publication.data.item.publishedAt),24*3600000);
assert.deepEqual((await post(first,24)).data,publication.data);
assert.equal(uploads,2,'Retrying a committed publication never uploads a second copy');
const different=video.slice();different[12]=1;
assert.equal((await post(first,24,verified,different)).status,409);
assert.equal((await request('?id='+first)).status,200);
assert.equal(lastLifetime,300);
await sql`update salah_video_stories_private.stories set published_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' where id=${first}::uuid`;
assert.equal((await request('')).data.items.length,0);
assert.equal((await request('?id='+first)).status,404);
assert.equal((await request('?archive=1',{token:verified})).data.items.length,1);
assert.equal((await request('?id='+first+'&archive=1',{token:verified})).status,200);
assert.equal((await patch(first,{highlighted:true},unverified)).status,403);
assert.equal((await patch(first,{highlighted:true})).status,200);
assert.equal((await request('')).data.items[0].highlighted,true);
assert.equal((await request('?id='+first)).status,200);
assert.equal((await patch(first,{highlighted:false})).status,200);
assert.equal((await request('?id='+first)).status,404);
const secondPublication=(await post(second,48,verified,video,1)).data.item;
assert.equal(Date.parse(secondPublication.expiresAt)-Date.parse(secondPublication.publishedAt),48*3600000);
assert.equal(secondPublication.highlighted,true);
assert.equal((await patch(second,{remove:true})).status,200);
assert.equal((await request('?id='+second)).status,404);
assert.equal((await post(second,48,verified,video,1)).status,409);
const [settings]=await sql`select public, file_size_limit::int, allowed_mime_types from storage.buckets where id='salah-video-stories'`;
assert.deepEqual(settings,{public:false,file_size_limit:storyCore.VIDEO_STORY_MAX_BYTES,allowed_mime_types:['video/mp4','video/quicktime']});
assert.equal(storyCore.storyUrlLifetime({published_at:new Date(1000),expires_at:new Date(10000)},false,7100),2);

const engagementRequest=(id,{token,change,archive=false}={})=>request('?engagement=1&id='+id+(archive?'&archive=1':''),{
 method:change?'POST':'GET',token,body:change?JSON.stringify(change):undefined,type:'application/json',
});
const viewerA='Bearer valid-story-viewer-a',viewerB='Bearer valid-story-viewer-b';
const [personA,personB]=['00000000-0000-4000-8000-000000000121','00000000-0000-4000-8000-000000000122'];
for(const [token,id] of [[viewerA,personA],[viewerB,personB]]){
 storyTestActors.set(token.slice(7),{id,email_confirmed_at:'2026-11-25T00:00:00Z'});
 await sql`insert into auth.users(id) values(${id}::uuid)`;
}
storyTestActors.set('valid-unconfirmed-viewer',{id:personA});
const poll={question:'Когда смотреть?',choices:['Утром','Вечером','И то и другое']};
const third='00000000-0000-4000-8000-000000000003';
const commentId='00000000-0000-4000-8000-000000000004';
assert.equal((await request('?id='+third+'&hours=24&highlight=0',{method:'POST',token:verified,body:video,poll:{question:'Broken',choices:['Same','Same']}})).status,400);
assert.equal((await request('?id='+third+'&hours=24&highlight=0',{method:'POST',token:verified,body:video,poll})).status,200);
assert.equal((await post(third,24)).status,409,'Publication retry cannot change poll');
assert.deepEqual((await engagementRequest(third)).data.poll,poll);
assert.equal((await engagementRequest(third,{change:{action:'like',value:true}})).status,401);
assert.equal((await engagementRequest(third,{token:'Bearer valid-unconfirmed-viewer',change:{action:'like',value:true}})).status,401);
assert.equal((await engagementRequest(third,{token:viewerA,change:{action:'vote',value:3}})).status,400);
assert.equal((await engagementRequest(third,{token:viewerA,change:{action:'vote',value:1}})).data.vote,1);
assert.equal((await engagementRequest(third,{token:viewerA,change:{action:'vote',value:0}})).data.vote,1,'Committed ballot is retained across retries');
assert.equal((await engagementRequest(third,{token:viewerB,change:{action:'vote',value:0}})).data.vote,0);
assert.deepEqual((await engagementRequest(third)).data.counts,[1,1,0]);
for(let attempt=0;attempt<2;attempt++){
 assert.equal((await engagementRequest(third,{token:viewerA,change:{action:'like',value:true}})).data.likes,1);
 assert.equal((await engagementRequest(third,{token:viewerA,change:{action:'react',value:'🤲'}})).data.reaction,'🤲');
}
assert.equal((await engagementRequest(third,{token:viewerA,change:{action:'react',value:null}})).data.reaction,null);
assert.equal((await engagementRequest(third,{token:viewerB})).data.liked,false);
const comment={action:'comment',text:'Ас-саляму алейкум!',id:commentId,userId:personB};
for(let attempt=0;attempt<2;attempt++){
 const response=await engagementRequest(third,{token:viewerA,change:comment});
 assert.equal(response.status,200);
 assert.equal(response.data.comments.length,1,'One comment across retries');
 assert.equal(response.data.comments[0].body,comment.text);
 assert.equal(response.data.comments[0].user_id,undefined);
}
assert.equal((await engagementRequest(third,{token:viewerB})).data.comments.length,0);
assert.equal((await engagementRequest(third)).data.comments.length,0);
assert.equal((await engagementRequest(third,{archive:true,token:viewerB})).status,403);
assert.equal((await engagementRequest(third,{archive:true,token:verified})).data.comments.length,1);
await sql`update salah_video_stories_private.stories
 set published_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' where id=${third}::uuid`;
assert.equal((await engagementRequest(third,{token:viewerA})).status,404);
assert.equal((await engagementRequest(third,{token:viewerA,change:comment})).status,404);
assert.equal((await engagementRequest(third,{archive:true,token:verified})).status,200);
await db.exec('set role authenticated');
await assert.rejects(db.query("select salah_video_stories_private.interact(null,null,false,'read','{}')"),/permission denied/);
await db.exec('reset role');
console.log('PASS: verified account binding, private comments, stored like/reaction, one vote per account, results, expiration, and restricted database access.');

await db.close();
console.log('PASS: owner MFA gate, bounded storage, upload retry, expiration at 24/48 hours, private archive, highlights and unpublishing.');

const window=new Window({url:'https://test.invalid/#more'}),document=window.document;
let playbackClaims=0;
const viewSource=await readFile(new URL('../dist/js/video-stories.js',import.meta.url),'utf8');
const view=vm.runInNewContext(viewSource.replace(/^import .*\n/gm,'').replace(/^export /gm,'')+'\n({videoStoriesMarkup,mountVideoStories,mountHomeVideoStories})',{
 window,document,MutationObserver:window.MutationObserver,AbortController,AbortSignal,crypto,URL,URLSearchParams,Date,Intl,setInterval,clearInterval,
 fetch:async()=>Response.json({items:shared}),esc,uiLeaf,t,getLocale,translateUi:()=>{},subscribeLanguage:()=>()=>{},OWNER_PROJECT_URL:'https://test.invalid',OWNER_PUBLIC_KEY:'local fixture',
 registerPlayback:()=>()=>{},claimPlayback:()=>{playbackClaims++;},setForegroundAudio:()=>{},createPlayerWindowHistory,
});
document.body.innerHTML=view.videoStoriesMarkup();
const root=document.body.firstElementChild,camera=root.querySelector('[capture]'),form=root.querySelector('form');
assert.equal(camera.getAttribute('capture'),'user');
assert.deepEqual([...form.querySelectorAll('option')].map(option=>option.value),['24','48']);
for(const media of root.querySelectorAll('video')){media.pause=()=>{};media.load=()=>{};media.play=async()=>{};}

let onActorChange,failNextComment=false,commentIds=[];
function newStorySocial(){
 return {likes:0,liked:false,reaction:null,reactionCounts:{},poll,counts:[0,0,0],vote:null,comments:[]};
}
let viewSocial=newStorySocial();

let shared=[],attempts=[];
const unmount=view.mountVideoStories(root,{watchActor:fn=>{onActorChange=actor=>{viewSocial=newStorySocial();fn(actor);};onActorChange('test-account');return ()=>{};},ownerAccess:()=>true,confirmAccess:async()=>true,observeAccess:()=>()=>{},resolveMedia:value=>value,request:async(params,options)=>{

 if(params.engagement){
  if(options.method==='POST'){
   const change=JSON.parse(options.body);
   if(change.action==='like')Object.assign(viewSocial,{likes:1,liked:change.value});
   if(change.action==='react')viewSocial.reaction=change.value;
   if(change.action==='vote')Object.assign(viewSocial,{vote:change.value,counts:[0,1,0]});
   if(change.action==='comment'){
    commentIds.push(change.id);
    if(failNextComment){failNextComment=false;throw Error('offline');}
    viewSocial.comments=[{body:change.text}];
   }
  }
  return structuredClone(viewSocial);
 }
 if(options.method!=='POST')return params.id?{url:'https://test.invalid/'+params.id+'.mp4'}:{items:shared};
 attempts.push(params.id);
 if(attempts.length===1)throw Error('offline');
 assert.equal(JSON.stringify(options.poll),JSON.stringify(poll));
 assert.equal(params.hours,'48');assert.equal(params.highlight,'1');
 const item={id:params.id,publishedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+48*3600000).toISOString(),highlighted:true};
 shared=[item,{...item,id:second}];return {item};
}});
const preview=form.querySelector('video'),submit=form.querySelector('[type="submit"]');
Object.defineProperty(camera,'files',{value:[new File([video],'sample.mp4',{type:'video/mp4'})]});
Object.defineProperty(preview,'duration',{value:30});
camera.onchange();preview.onloadedmetadata();
assert.equal(form.hidden,false);assert.equal(submit.disabled,false);assert.equal(attempts.length,0,'Selecting or recording does not publish');
form.elements.hours.value='48';form.elements.highlight.checked=true;
form.elements.pollQuestion.value=poll.question;form.elements.pollChoice1.value=poll.choices[0];
await form.onsubmit({preventDefault(){}});assert.equal(attempts.length,0);
form.elements.pollChoice2.value=poll.choices[1];form.elements.pollChoice3.value=poll.choices[2];
await form.onsubmit({preventDefault(){}});
assert.equal(submit.disabled,false);assert.match(root.querySelector('[data-story-editor-status]').textContent,/Попробуйте ещё раз/);
await form.onsubmit({preventDefault(){}});
assert.equal(attempts[0],attempts[1]);assert.equal(form.hidden,true);assert.match(root.querySelector('[data-story-editor-status]').textContent,/Видео опубликовано/);
await Promise.resolve();
const viewer=root.querySelector('[data-story-player]'),list=root.querySelector('[data-story-list]'),player=viewer.querySelector('video');
const route=window.location.href;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const homeSlot=document.body.appendChild(document.createElement('span')),unmountHome=view.mountHomeVideoStories(homeSlot);
await settle();
assert.equal(homeSlot.hidden,false);assert.equal(homeSlot.firstElementChild.classList.contains('is-unseen'),true);
const original=root.querySelector('[data-story-collection="active"] [data-story-play]');
original.click();await settle();
assert.equal(viewer.hidden,false);assert.equal(list.hidden,true);assert.equal(window.location.href,route);
assert.ok(window.history.state.salahStoryViewer);
assert.equal(player.getAttribute('src'),'https://test.invalid/'+attempts[0]+'.mp4');

const socialPanel=viewer.querySelector('[data-story-engagement]');
const responsePanel=viewer.querySelector('[data-story-responses]');
assert.equal(socialPanel.hidden,false);
const action=name=>socialPanel.querySelector('[data-story-action="'+name+'"]');
action('like').click();await settle();
assert.equal(action('like').getAttribute('aria-pressed'),'true');
action('react').click();
responsePanel.querySelector('[data-story-reaction="🤲"]').click();await settle();
assert.equal(action('react').textContent,'🤲');
action('poll').click();
responsePanel.querySelector('[data-story-vote="1"]').click();await settle();
assert.equal(responsePanel.querySelector('[data-story-vote="1"]').getAttribute('aria-pressed'),'true');
assert.equal(responsePanel.querySelector('[data-story-vote="0"]').disabled,true);
action('comment').click();
let textarea=responsePanel.querySelector('textarea');
textarea.value='<em>Мой комментарий</em>';
textarea.dispatchEvent(new window.Event('input',{bubbles:true}));
textarea.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
assert.equal(player.getAttribute('src'),'https://test.invalid/'+attempts[0]+'.mp4','Editing a comment must not navigate between stories');
const sendComment=()=>responsePanel.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
failNextComment=true;
sendComment();await settle();assert.equal(responsePanel.querySelector('textarea').value,textarea.value);
sendComment();await settle();assert.equal(commentIds.length,2);assert.equal(commentIds[0],commentIds[1]);
assert.equal(responsePanel.querySelector('li').textContent,'<em>Мой комментарий</em>');
assert.equal(responsePanel.querySelector('li em'),null);
assert.equal(responsePanel.querySelector('textarea').value,'');
onActorChange('another-account');
await settle();
assert.equal(responsePanel.hidden,true);assert.equal(action('like').getAttribute('aria-pressed'),'false');
action('comment').click();assert.equal(responsePanel.querySelector('li'),null);
responsePanel.querySelector('[data-story-response-close]').click();
assert.equal(responsePanel.hidden,true);

assert.equal(window.localStorage.getItem('salah:video-stories-seen'),null);
player.dispatchEvent(new window.Event('playing'));
assert.deepEqual(JSON.parse(window.localStorage.getItem('salah:video-stories-seen')),[attempts[0]]);
assert.equal(homeSlot.firstElementChild.classList.contains('is-unseen'),true);
Object.defineProperties(player,{duration:{value:30},currentTime:{value:12},paused:{value:false}});
player.dispatchEvent(new window.Event('play'));
assert.equal(player.muted,true);assert.equal(playbackClaims,0,'Muted stories leave ongoing audio alone');
viewer.querySelector('[data-story-sound]').click();player.dispatchEvent(new window.Event('volumechange'));
assert.equal(player.muted,false);assert.ok(playbackClaims>0);
const speed=viewer.querySelector('[data-story-speed]');speed.value='1.5';speed.dispatchEvent(new window.Event('change'));
assert.equal(player.playbackRate,1.5);
player.dispatchEvent(new window.Event('timeupdate'));
assert.deepEqual([...viewer.querySelectorAll('progress')].map(bar=>bar.value),[0.4,0]);
player.dispatchEvent(new window.Event('ended'));await settle();
assert.equal(player.getAttribute('src'),'https://test.invalid/'+second+'.mp4');
assert.deepEqual([...viewer.querySelectorAll('progress')].map(bar=>bar.value),[1,0]);
player.dispatchEvent(new window.Event('playing'));
assert.equal(homeSlot.firstElementChild.classList.contains('is-unseen'),false);
window.history.replaceState({},'',route);window.dispatchEvent(new window.PopStateEvent('popstate'));
assert.equal(viewer.hidden,true);assert.equal(list.hidden,false);
assert.equal(document.activeElement?.getAttribute('data-story-play'),attempts[0],'Back restores focus to the initiating story');
assert.equal(player.hasAttribute('src'),false);assert.equal(window.location.href,route);
unmountHome();unmount();await window.happyDOM.close();
console.log('PASS: interaction controls, text escaping, preserved comment retry, poll editor, no account crossover.');
console.log('PASS: camera draft, 48-hour publishing and retry, muted opening, speed, playback progress, automatic advance, in-app unread indicator and Back.');
