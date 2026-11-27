import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {createReferralHandler} from '../supabase/functions/account-referrals/core.mjs';
import {readAccountAdjr,SALAH_OWNER_ID} from '../supabase/functions/account-referrals/ajr-summary.mjs';
import {combinedPublicBoard} from '../supabase/functions/reciter-competition/guest-board.mjs';
import {mountAccountReferrals,normalizeReferralCode} from '../dist/js/account-referrals.js';
import {t,setInterfaceLanguage} from '../dist/js/i18n.js';

const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const listener='33333333-3333-4333-8333-333333333333';
const pending='44444444-4444-4444-8444-444444444444';
const unknown='55555555-5555-4555-8555-555555555555';
const anonymous='66666666-6666-4666-8666-666666666666';
const plain='77777777-7777-4777-8777-777777777777';
const device='88888888-8888-4888-8888-888888888888';
const guest='99999999-9999-4999-8999-999999999999';
const origin='https://skodytunez-maker.github.io',issuer='https://fixture.invalid/auth/v1';
const session='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',exampleCode='SALAH-12AB34CD';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const db=new PGlite();
try{
 await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage; create schema salah_visits_private;
  create table auth.users(id uuid primary key,raw_user_meta_data jsonb,email_confirmed_at timestamptz,is_anonymous boolean,banned_until timestamptz);
  create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
  create table storage.objects(bucket_id text,name text);
  create table salah_visits_private.guest_activity_presence(device_hash text,kind text,active boolean,reported_at timestamptz);
  create table public.reciter_popularity_minutes(listener_hash text,reciter text,day date,minutes integer,extra_seconds integer);
  create table public.reciter_listener_visibility(user_id uuid primary key,listener_hash text,mode text not null,public_id uuid default gen_random_uuid());
 `);
 const competition=await read('supabase/reciter-competition.sql');
 await db.exec(competition.split('-- Automatic participation is initialized')[0]);
 await db.exec(await read('supabase/guest-competition.sql'));
 await db.exec(`create table salah_competition_private.listener_presence(user_id uuid,session_id uuid,playing boolean,reported_at timestamptz);
 create table salah_competition_private.guest_aliases(guest_id uuid primary key,nickname text);`);
 await db.exec(await read('supabase/migrations/20261126223230_account_referrals.sql'));
 await db.exec(await read('supabase/migrations/20261127074807_second_level_referral_listening.sql'));
 await db.exec(await read('supabase/migrations/20261127075031_adjr_reciter_recommendations.sql'));
 const user=(id,code,{confirmed=true,anonymous=false}={})=>db.query(
  'insert into auth.users(id,raw_user_meta_data,email_confirmed_at,is_anonymous) values($1,$2::jsonb,case when $3::boolean then now() end,$4)',
  [id,JSON.stringify(code?{salah_invite_code:code}:{}),confirmed,anonymous]
 );
 const score=async(id,reciter,seconds)=>{
  await db.query('insert into salah_competition_private.preferences(user_id) values($1) on conflict do nothing',[id]);
  await db.query("insert into public.reciter_listener_visibility(user_id,mode) values($1,'initial') on conflict do nothing",[id]);
  await db.query('insert into salah_competition_private.totals(user_id,device_id,reciter,seconds,initial_seconds) values($1,$2,$3,$4,0)',[id,device,reciter,seconds]);
 };
 const codeFor=async id=>(await db.query('select salah_referrals_private.own_code($1) as code',[id])).rows[0].code;
 const summary=async id=>(await db.query('select code,seconds::integer from salah_referrals_private.own_summary($1)',[id])).rows[0];
 await user(owner);
 await user(other);
 assert.equal(await summary(owner),undefined);
 const [code,duplicate]=await Promise.all([codeFor(owner),codeFor(owner)]);
 assert.match(code,/^SALAH-[A-F0-9]{8}$/);
 assert.equal(duplicate,code);
 const otherCode=await codeFor(other);
 assert.notEqual(otherCode,code);
 await user(listener,code);
 await user(pending,code,{confirmed:false});
 const unused=['SALAH-00000000','SALAH-00000001','SALAH-00000002'].find(value=>value!==code&&value!==otherCode);
 await user(unknown,unused);
 await user(anonymous,code,{anonymous:true});
 await user(plain);
 await db.query("update auth.users set raw_user_meta_data=jsonb_build_object('salah_invite_code',$1::text) where id in($2,$3)",[otherCode,listener,plain]);
 const members=await db.query('select invitee_id,inviter_id from salah_referrals_private.members order by invitee_id');
 assert.deepEqual(members.rows,[{invitee_id:listener,inviter_id:owner},{invitee_id:pending,inviter_id:owner}]);
 await score(listener,'reciter-one',4800);
 await score(listener,'reciter-two',2400);
 await score(pending,'reciter-two',1800);
 await score(unknown,'reciter-two',900);
 await score(anonymous,'reciter-two',850);
 await score(plain,'reciter-one',840);
 await score(owner,'reciter-one',9000);
 await db.query("insert into salah_competition_private.guest_players(public_id,device_hash,secret_hash,activity_hash,claimed_by) values($1,repeat('a',64),repeat('b',64),repeat('c',64),$2)",[guest,listener]);
 await db.query("insert into salah_competition_private.guest_totals values($1,'reciter-two',1800)",[guest]);
 const canonical=await db.query("select sum(seconds)::integer as seconds from public.competition_scores('all',current_date) where user_id=$1",[listener]);
 assert.equal(canonical.rows[0].seconds,9000);
 assert.deepEqual(await summary(owner),{code,seconds:7200});
 assert.deepEqual(await summary(other),{code:otherCode,seconds:0});
 const accountHandler=createReferralHandler({
  issuer,
  getUser:async()=>({data:{user:{id:owner,email_confirmed_at:'confirmed',is_anonymous:false}}}),
  getClaims:async()=>({data:{claims:{sub:owner,iss:issuer,session_id:session}}}),
  isSessionActive:async(uid,sid)=>uid===owner&&sid===session,
  readSummary:summary,
  ensureCode:codeFor
 });
 const profileWindow=new Window({url:'https://fixture.invalid/#account'});
 globalThis.document=profileWindow.document;
 try{
  setInterfaceLanguage('ru');
  const area=profileWindow.document.body;
  mountAccountReferrals(area,{userId:owner,isActive:()=>true,request:async action=>{
   const response=await accountHandler(new Request('https://fixture.invalid/referrals',{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer fixture.access.token'},
    body:JSON.stringify({action})
   }));
   assert.equal(response.status,200);
   return response.json();
  }});
  await area.querySelector('[data-referral-refresh]').onclick();
  const total=area.querySelector('[data-referral-total]');
  assert.equal(total.hidden,false);
  assert.equal(total.querySelector('h3').textContent,'Аджр');
  assert.equal(total.querySelector('p').textContent,'По твоим приглашениям прослушали 2 ч');
  assert.equal(area.querySelector('#account-referral-code').value,code);
 }finally{await profileWindow.happyDOM.close();delete globalThis.document;}
 await db.query('update auth.users set email_confirmed_at=now() where id=$1',[pending]);
 assert.deepEqual(await summary(owner),{code,seconds:9000});
 await db.query("update public.reciter_listener_visibility set mode='hidden' where user_id=$1",[pending]);
 assert.deepEqual(await summary(owner),{code,seconds:7200});
 await db.query('update salah_competition_private.preferences set enabled=false where user_id=$1',[listener]);
 assert.deepEqual(await summary(owner),{code,seconds:0});
 await db.query('update salah_competition_private.preferences set enabled=true where user_id=$1',[listener]);
 assert.deepEqual(await summary(owner),{code,seconds:7200});
 for(const role of ['anon','authenticated']){
  const {rows:[permissions]}=await db.query(`select
   has_schema_privilege($1,'salah_referrals_private','usage') as schema,
   has_table_privilege($1,'salah_referrals_private.members','select') as members,
   has_function_privilege($1,'salah_referrals_private.own_summary(uuid)','execute') as summary`,[role]);
  assert.deepEqual(permissions,{schema:false,members:false,summary:false});
  const {rows:[{allowed}]}=await db.query("select has_table_privilege($1,'salah_referrals_private.reciter_recommendations','select') as allowed",[role]);
  assert.equal(allowed,false);
 }
 await db.query('delete from auth.users where id=$1',[listener]);
 assert.deepEqual(await summary(owner),{code,seconds:0});
 await db.query('delete from auth.users where id=$1',[owner]);
 assert.equal(await summary(owner),undefined);
 assert.equal((await db.query('select count(*)::integer as count from salah_referrals_private.members')).rows[0].count,0);

 const luhaidan='ar.muhammadalluhaidan',talib='ar.ahmadtalib';
 await user(owner,otherCode);
 const firstCode=await codeFor(owner);
 await user(listener,firstCode);
 const secondCode=await codeFor(listener);
 await user(SALAH_OWNER_ID);
 await score(owner,luhaidan,180);
 await score(listener,luhaidan,120);
 assert.deepEqual(await summary(other),{code:otherCode,seconds:300});
 assert.deepEqual(await summary(owner),{code:firstCode,seconds:120});
 assert.deepEqual(await summary(listener),{code:secondCode,seconds:0});
 assert.equal((await db.query("select sum(seconds)::int as seconds from public.competition_scores('all',current_date) where user_id=$1",[listener])).rows[0].seconds,120);
 const fourth='afaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 await user(fourth,secondCode);
 await score(fourth,talib,60);
 assert.deepEqual(await summary(other),{code:otherCode,seconds:300});
 assert.deepEqual(await summary(owner),{code:firstCode,seconds:180});
 assert.deepEqual(await summary(listener),{code:secondCode,seconds:60});

 const sql=async(parts,...params)=>(await db.query(parts.reduce((query,part,index)=>query+(index?'$'+index:'')+part,''),params)).rows;
 await db.query('insert into salah_referrals_private.reciter_recommendations(reciter,recommender_id) values($1,$2),($3,$4)',[luhaidan,owner,talib,plain]);
 await db.query("update auth.users set raw_user_meta_data=raw_user_meta_data||jsonb_build_object('nickname','Renamed profile') where id=$1",[plain]);
 await db.query("update auth.users set raw_user_meta_data=raw_user_meta_data||'{\"nickname\":\"Gulshan\"}'::jsonb where id=$1",[listener]);
 await db.query("insert into salah_competition_private.guest_players(public_id,device_hash,secret_hash,activity_hash,claimed_by) values($1,repeat('e',64),repeat('f',64),repeat('1',64),$2)",[fourth,listener]);
 await db.query("insert into salah_competition_private.guest_totals values($1,$2,20)",[fourth,luhaidan]);
 const unclaimed='bbaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 await db.query("insert into salah_competition_private.guest_players(public_id,device_hash,secret_hash,activity_hash) values($1,repeat('2',64),repeat('3',64),repeat('4',64))",[unclaimed]);
 await db.query("insert into salah_competition_private.guest_totals values($1,$2,30)",[unclaimed,talib]);
 await score(pending,luhaidan,361);
 assert.deepEqual(await readAccountAdjr(sql,owner),{code:firstCode,seconds:180,
  recommendations:[{reciter:luhaidan,seconds:320}]});
 assert.deepEqual(await readAccountAdjr(sql,plain),{code:null,seconds:0,
  recommendations:[{reciter:talib,seconds:90}]});
 assert.deepEqual(await readAccountAdjr(sql,listener),{code:secondCode,seconds:60});
 assert.deepEqual(await readAccountAdjr(sql,SALAH_OWNER_ID),{code:null,seconds:2150,scope:'community'});

 const makeSummaryRequest=id=>createReferralHandler({
  issuer,getUser:async()=>({data:{user:{id,email_confirmed_at:'confirmed'}}}),
  getClaims:async()=>({data:{claims:{sub:id,iss:issuer,session_id:session}}}),isSessionActive:async()=>true,
  readSummary:uid=>readAccountAdjr(sql,uid),ensureCode:codeFor
 })(new Request('https://fixture.invalid/referrals',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer fixture.access.token'},
  body:JSON.stringify({action:'summary'})
 }));
 const community=await makeSummaryRequest(SALAH_OWNER_ID);
 assert.equal(community.status,200);
 assert.deepEqual(await community.json(),{code:null,seconds:2150,scope:'community'});
 const recommended=await makeSummaryRequest(plain);
 assert.equal(recommended.status,200);
 assert.deepEqual(await recommended.json(),{code:null,seconds:0,recommendations:[{reciter:talib,seconds:90}]});

 const day='2026-11-27';
 await db.query('update public.reciter_listener_visibility set listener_hash=$1 where user_id=$2',['9'.repeat(64),owner]);
 await db.query('insert into public.reciter_popularity_minutes values($1,$2,$3,36,0)',['9'.repeat(64),luhaidan,day]);
 await db.query('insert into salah_competition_private.days values($1,$2,$3,$4,180,0)',[owner,device,day,luhaidan]);
 const publicDay=()=>combinedPublicBoard(sql,'day',day,{},true,{thin:true});
 const publicAll=()=>combinedPublicBoard(sql,'all',day,{},true,{thin:true});
 const ownerAdjr=()=>readAccountAdjr(sql,SALAH_OWNER_ID);
 assert.equal((await publicDay()).listeningTotal,2160);
 const before=await ownerAdjr();
 assert.equal(before.seconds,(await publicAll()).listeningTotal);
 const recommendedBefore=await readAccountAdjr(sql,owner);
 const publishedDailySource=await read('supabase/migrations/20261127081627_prefer_measured_daily_listening.sql');
 await db.exec(publishedDailySource);
 assert.equal((await publicDay()).listeningTotal,180);
 assert.deepEqual(await ownerAdjr(),before);
 assert.equal((await ownerAdjr()).seconds,(await publicAll()).listeningTotal);
 assert.deepEqual(await readAccountAdjr(sql,owner),recommendedBefore);
}finally{await db.close();}
console.log('PASS: two referral levels, pinned attribution after a rename, and owner lifetime total matches the public board with the daily fix.');

const code=exampleCode;
let active=true,confirmed=true,verified=true,claimsActor=owner,ensured=0,reads=0;
let storedCode=null;
const handle=createReferralHandler({
 issuer,
 getUser:async()=>({data:{user:{id:owner,email_confirmed_at:confirmed?'now':null,is_anonymous:false}}}),
 getClaims:async()=>verified?{data:{claims:{sub:claimsActor,iss:issuer,session_id:session}}}:{error:true},
 isSessionActive:async(id,sid)=>{assert.equal(id,owner);assert.equal(sid,session);return active;},
 ensureCode:async id=>{assert.equal(id,owner);ensured++;storedCode=code;},
 readSummary:async id=>{assert.equal(id,owner);reads++;return storedCode?{code:storedCode,seconds:'7200',inviterId:id}:null;}
});
const call=(input,options={})=>handle(new Request('https://fixture.invalid/referrals',{
 method:'POST',
 headers:{Origin:options.origin||origin,'Content-Type':'application/json',Authorization:options.authorization??'Bearer fixture.access.token'},
 body:JSON.stringify(input)
}));
assert.deepEqual(await (await call({action:'summary'})).json(),{code:null,seconds:0});
assert.equal(ensured,0);
let response=await call({action:'create'});
assert.equal(response.status,200);
assert.equal(response.headers.get('Cache-Control'),'no-store, private');
assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
assert.deepEqual(await response.json(),{code,seconds:7200});
assert.equal(ensured,1);
assert.equal((await call({action:'summary',userId:other})).status,400);
assert.equal((await call({action:'create'},{authorization:''})).status,401);
assert.equal((await call({action:'create'},{origin:'https://other.invalid'})).status,403);
verified=false;
assert.equal((await call({action:'create'})).status,401);
verified=true;
claimsActor=other;
assert.equal((await call({action:'summary'})).status,401);
claimsActor=owner;
confirmed=false;
assert.equal((await call({action:'summary'})).status,401);
confirmed=true;
active=false;
assert.equal((await call({action:'summary'})).status,401);
assert.equal(reads,2);
assert.equal(ensured,1);
console.log('PASS: Edge verifies confirmed user and active session, rejects browser-supplied actor IDs and exposes only the private aggregate.');

const win=new Window({url:'https://fixture.invalid/#account'});
globalThis.document=win.document;
try{
 setInterfaceLanguage('ru');
 const area=win.document.body;
 area.innerHTML='<button id="counter-account-out"></button>';
 let live=true,requestArgs=[];
 mountAccountReferrals(area,{userId:owner,isActive:()=>live,request:async(action,userId)=>{
  requestArgs.push([action,userId]);
  if(action==='summary'&&requestArgs.length===1)throw Error('offline');
  return action==='create'?{code,seconds:7200}:{code:null,seconds:0};
 }});
 const panel=area.querySelector('details');
 const status=panel.querySelector('[role=status]');
 const create=panel.querySelector('[data-referral-create]');
 const refresh=panel.querySelector('[data-referral-refresh]');
 assert.equal(panel.querySelector('summary').textContent,t('referralUi.title'));
 assert.deepEqual(requestArgs,[]);
 await refresh.onclick();
 assert.equal(status.textContent,t('referralUi.unavailable'));
 assert.equal(refresh.hidden,false);
 await refresh.onclick();
 assert.equal(status.textContent,t('referralUi.intro'));
 assert.equal(create.hidden,false);
 await create.onclick();
 assert.match(panel.querySelector('[data-referral-duration]').textContent,/По твоим приглашениям прослушали 2/);
 assert.equal(panel.querySelector('#account-referral-code').value,code);
 assert.equal(create.hidden,true);
 assert.equal(panel.querySelector('[data-referral-copy]').hidden,false);
 assert.deepEqual(requestArgs,[['summary',owner],['summary',owner],['create',owner]]);
 live=false;
 await refresh.onclick();
 assert.equal(requestArgs.length,3);
 assert.equal(normalizeReferralCode(' salah-12ab34cd '),code);
 assert.equal(normalizeReferralCode(' '),'');
 assert.equal(normalizeReferralCode('SALAH-12AB34CЯ'),null);

 for(const summary of [{code:null,seconds:2150,scope:'community'},
  {code:null,seconds:0,recommendations:[{reciter:'ar.ahmadtalib',seconds:90}]}]){
  area.replaceChildren();
  mountAccountReferrals(area,{userId:owner,isActive:()=>true,request:async()=>summary});
  await area.querySelector('[data-referral-refresh]').onclick();
  assert.equal(area.querySelector('[data-referral-total]').hidden,false);
  assert.equal(area.querySelector('[data-referral-create]').hidden,false);
  assert.equal(area.querySelector('[data-referral-duration]').hidden,!summary.scope);
  if(summary.scope)assert.match(area.querySelector('[data-referral-duration]').textContent,/В SALAH за всё время прослушали 35 мин 50 с/);
  else assert.match(area.querySelector('[data-referral-recommendations]').textContent,/Ахмад Талиб бин Хумайд.*1 мин 30 с/);
 }
}finally{await win.happyDOM.close();delete globalThis.document;}
console.log('PASS: account panel is lazy, retries temporary failure, creates and displays two hours for the signed-in inviter.');
