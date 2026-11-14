import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{PGlite}from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';
import{guestSelectedContext}from '../dist/js/guest-context.js';
import{guestActivityId}from '../dist/js/activity-presence-core.js';
import{guestActivityPacket,createGuestActivityDb,guestActivityHash}from '../supabase/functions/listening-now/guest-activity.mjs';
import{readListeningNow,createListeningNowHandler}from '../supabase/functions/listening-now/core.mjs';

const chosen={name:' Тюмень ',country:'Россия',latitude:57.1,longitude:65.5,timezone:'Asia/Yekaterinburg',ip:'PRIVATE-IP'};
assert.deepEqual(guestSelectedContext(chosen),{city:'Тюмень',country:'Россия'});
assert.equal(guestSelectedContext(null),null);assert.equal(guestSelectedContext({name:'\u0000city'}),null);assert.equal(guestSelectedContext({name:'x'.repeat(161)}),null);
assert.deepEqual(guestSelectedContext({name:'City'}),{city:'City',country:null});
assert.ok(!/latitude|longitude|timezone|PRIVATE-IP/.test(JSON.stringify(guestSelectedContext(chosen))));
const device='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',tab='cccccccc-cccc-4ccc-8ccc-cccccccccccc',rankId='e1a3f859-1111-4111-8111-111111111111';
const body=(sequence,extra={})=>({action:'guest-activity',device,kind:'listening',tab,sequence,active:true,...extra});
assert.deepEqual(guestActivityPacket(body(1,{selectedCity:guestSelectedContext(chosen)})).selectedCity,{city:'Тюмень',country:'Россия'});
assert.ok(!Object.hasOwn(guestActivityPacket(body(1)),'selectedCity'),'Legacy packet omission stays distinct from clearing');
assert.equal(guestActivityPacket(body(1,{selectedCity:null})).selectedCity,null);
for(const selectedCity of [{city:'',country:'Россия'},{city:'City',country:2},{city:'C\nity'},{city:'x'.repeat(161)},{city:'City',latitude:57},{city:'City',timezone:'UTC'},{country:'Россия'},[]])assert.throws(()=>guestActivityPacket(body(1,{selectedCity})));

const pg=new PGlite();
await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema salah_competition_private;create schema salah_visits_private;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb,email_confirmed_at timestamptz,is_anonymous bool,banned_until timestamptz);
create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
create table salah_competition_private.preferences(user_id uuid,enabled bool);
create table reciter_listener_visibility(user_id uuid,public_id uuid,mode text);
create table salah_competition_private.listener_presence(user_id uuid,session_id uuid,playing bool,reported_at timestamptz);
create table salah_competition_private.listener_presence_limits(user_id uuid primary key,minute bigint,attempts int);
create table salah_competition_private.guest_players(public_id uuid primary key,activity_hash text,claimed_by uuid,created_at timestamptz default now());`);
await pg.exec(await fs.readFile(new URL('../supabase/activity-presence.sql',import.meta.url),'utf8'));
await pg.exec(await fs.readFile(new URL('../supabase/migrations/20261114225043_guest_selected_city_context.sql',import.meta.url),'utf8'));
await pg.exec(await fs.readFile(new URL('../supabase/migrations/20261114230126_guest_stone_aliases.sql',import.meta.url),'utf8'));
function tag(conn){const sql=(strings,...args)=>{let query=strings[0];args.forEach((_,i)=>query+='$'+(i+1)+strings[i+1]);return{then(resolve,reject){return(query.includes('pg_advisory_xact_lock')?Promise.resolve([]):conn.query(query,args).then(r=>r.rows)).then(resolve,reject);}};};sql.begin=fn=>conn.transaction(tx=>fn(tag(tx)));return sql;}
const sql=tag(pg),db=createGuestActivityDb(sql),hash=await guestActivityHash(device),packet=(sequence,extra)=>guestActivityPacket(body(sequence,extra));
await db.update(packet(1,{selectedCity:{city:'Тюмень',country:'Россия'}}));
const first=(await pg.query('select selected_city,selected_country,selected_context_at from salah_visits_private.guest_activity_presence')).rows[0];
assert.equal(first.selected_city,'Тюмень');assert.equal(first.selected_country,'Россия');
await db.update(packet(2));const preserved=(await pg.query('select selected_city,selected_context_at from salah_visits_private.guest_activity_presence')).rows[0];
assert.equal(preserved.selected_city,'Тюмень');assert.equal(String(preserved.selected_context_at),String(first.selected_context_at),'A legacy heartbeat preserves the context report timestamp');
assert.equal((await db.update(packet(1,{selectedCity:{city:'Late city',country:null}}))).accepted,false);
await pg.query('insert into salah_competition_private.guest_players(public_id,activity_hash,created_at)values($1,$2,now())',[rankId,hash]);
const nickname=(await pg.query('select salah_competition_private.ensure_guest_alias($1) as nickname',[rankId])).rows[0].nickname;
const ownerSource=await fs.readFile(new URL('../supabase/functions/owner-access/index.ts',import.meta.url),'utf8');
const{readOwnerLiveActivity}=await import('data:text/javascript;base64,'+Buffer.from(ownerSource).toString('base64'));
let list=await readOwnerLiveActivity(sql,'listening');assert.equal(list.total,1);assert.equal(list.users[0].code,'e1a3f8','The owner activity link uses the same enrolled guest public ID as Top');assert.equal(list.users[0].nickname,nickname,'The owner sees the persisted Top stone name');assert.equal(list.users[0].selectedCity.city,'Тюмень');assert.equal(list.users[0].selectedCity.country,'Россия');assert.ok(Number.isFinite(Date.parse(list.users[0].selectedCity.reportedAt)));
await db.update(packet(1,{kind:'reading',tab:other,selectedCity:{city:'Казань',country:'Россия'}}));
list=await readOwnerLiveActivity(sql,'listening');assert.equal(list.users[0].selectedCity.city,'Казань','Use the latest explicit selected-city report across this installation’s tabs and activity kinds');
await db.update(packet(3,{selectedCity:null}));list=await readOwnerLiveActivity(sql,'listening');assert.equal(list.users[0].selectedCity,undefined,'Explicit clearing wins over older context from another activity kind');
await db.update(packet(1,{device:other,selectedCity:{city:'Москва',country:'Россия'}}));list=await readOwnerLiveActivity(sql,'listening');assert.equal(list.total,2);const otherCode=(await guestActivityHash(other)).slice(0,6);assert.ok(list.users.some(row=>row.code===otherCode&&row.nickname==='Гость'),'An unenrolled guest receives a generic label without a new identity');
const handler=createListeningNowHandler(sql),publicResponse=await handler(new Request('https://fixture.invalid'));
assert.deepEqual(await publicResponse.json(),{count:2,readers:1,dhikr:0});const publicText=await(await handler(new Request('https://fixture.invalid'))).text();assert.ok(!/Тюмень|Казань|Москва|Россия|selected|city|country|e1a3f8/.test(publicText),'Public reads contain only aggregate counts');
const longContext=JSON.stringify(body(4,{selectedCity:{city:'市'.repeat(160),country:'国'.repeat(160)}}));assert.ok(Buffer.byteLength(longContext)>1024&&Buffer.byteLength(longContext)<2048,'The bounded Unicode fields can exceed the legacy body cap');
assert.equal((await handler(new Request('https://fixture.invalid',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://skodytunez-maker.github.io'},body:longContext}))).status,200,'A valid bounded Unicode city/country fits the new body cap');
await pg.query('update salah_competition_private.guest_players set claimed_by=$1 where public_id=$2',[other,rankId]);list=await readOwnerLiveActivity(sql,'listening');assert.ok(!list.users.some(row=>row.code==='e1a3f8'),'A claimed account ledger is not reused as an unregistered guest alias');
for(const role of ['anon','authenticated']){await pg.exec('set role '+role);await assert.rejects(pg.query('select selected_city,selected_country,selected_context_at from salah_visits_private.guest_activity_presence'),/permission denied/);await pg.exec('reset role');}
await pg.close();

// Exercise the real client sender with mocked identity/auth/network, not an account or server.
const w=new Window({url:'https://fixture.invalid/#home'}),doc=w.document;doc.body.innerHTML='<main id="app"></main>';
const state={identityKnown:true,signedIn:false,userId:null},settings={city:chosen},sent=[],activityOptions=[],playbackOptions=[];
const ctx=vm.createContext({guestSelectedContext,guestActivityId,settings,counterSyncStatus:()=>state,personalDataAllowed:()=>true,OWNER_PROJECT_URL:'https://fixture.invalid',OWNER_PUBLIC_KEY:'public-fixture',competitionOwn:()=>null,popularityEnabled:()=>false,
 accountAuthClient:()=>({auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}})}}),createActivityReporter:options=>{activityOptions.push(options);return{sample(){},stop(){},counted(){}};},createPlaybackPresenceReporter:options=>{playbackOptions.push(options);return{sample(){},stop(){},dispose(){}};},
 window:w,document:doc,location:w.location,localStorage:w.localStorage,navigator:{onLine:true},crypto:{randomUUID:()=>device},MutationObserver:class{observe(){}},setInterval:()=>1,setTimeout:fn=>{queueMicrotask(fn);return 1;},fetch:async(_url,options)=>{sent.push(JSON.parse(options.body));return{ok:true};}});
const client=await fs.readFile(new URL('../dist/js/activity-presence.js',import.meta.url),'utf8');
const init=vm.runInContext(client.replace(/^import.*$/gm,'').replaceAll('export ','')+';initActivityPresence;',ctx);init({playback:{state:{status:'paused'},subscribe(){}}});
await new Promise(resolve=>setImmediate(resolve));const person=activityOptions[0].getIdentity();
await activityOptions[0].send({action:'activity',kind:'reading',tab,sequence:1,active:true},{identity:person});
assert.deepEqual(JSON.parse(JSON.stringify(sent.at(-1).selectedCity)),{city:'Тюмень',country:'Россия'});assert.ok(!/latitude|longitude|timezone|PRIVATE-IP/.test(JSON.stringify(sent)));
settings.city={name:'Казань',country:'Россия'};w.dispatchEvent(new w.Event('salah:settings-changed'));
await playbackOptions[0].send({tab,sequence:2,playing:true},{});assert.equal(sent.at(-1).selectedCity.city,'Казань');
state.signedIn=true;state.userId=other;settings.city={name:'New account private city',country:'PRIVATE'};w.dispatchEvent(new w.Event('salah:counter-status'));
await playbackOptions[0].send({tab,sequence:3,playing:false},{});assert.equal(sent.at(-1).selectedCity.city,'Казань','A guest stop after sign-in retains the last guest snapshot, not the new account’s selected city');
await w.happyDOM.close();
console.log('PASS: selected-settings-only guest context, bounded/legacy/clear validation, real private schema and RLS, sequence protection, latest context and Top alias linking, public aggregate isolation, real client packet privacy and guest/account transition capture. No production writes.');
