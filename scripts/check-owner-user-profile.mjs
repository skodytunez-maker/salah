import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{createOwnerUserDetail}from '../dist/js/owner-user-detail.js';
import{ownerUserCard}from '../dist/js/owner-user-card.js';
import{PGlite}from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';
const source=await fs.readFile(new URL('../supabase/functions/owner-access/index.ts',import.meta.url),'utf8');
const {createOwnerHandler,readOwnerUserDetails}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const owner='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7',first='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222';
const user={id:owner,email_confirmed_at:'2026-10-16',factors:[{status:'verified',factor_type:'totp'}]},claims={sub:owner,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',aal:'aal2',session_id:first};
const sample={id:first,connected:true,hasAvatar:true,periods:{all:90600,day:120,week:600,month:900},reciters:[{id:'ar.alafasy',seconds:90600}],awards:[{kind:'hours25',count:1,earnedAt:'2026-10-16T00:00:00Z'}]};
let reads=0,photos=0;
const config={getUser:async()=>({data:{user}}),getClaims:async()=>({data:{claims}}),isSessionActive:async()=>true,readUser:async id=>{reads++;return id===first?{...sample,email:'PRIVATE',token:'PRIVATE',reciters:[...sample.reciters,{id:'javascript:evil',seconds:10}],awards:[...sample.awards,{kind:'evil',count:4}]}:null;},readAvatar:async id=>{photos++;assert.equal(id,first);return new Uint8Array([255,216,255,0]);}};
const request=(mode='user',id=first)=>new Request('https://fixture.invalid?mode='+mode+'&ids='+id,{headers:{Authorization:'Bearer verified-owner-token',Origin:'https://skodytunez-maker.github.io'}});
for(const mode of ['user','user-avatar']){
 for(const overrides of [{getUser:async()=>({data:{user:{...user,id:second,user_metadata:{owner:true}}}})},{getUser:async()=>({data:{user:{...user,is_anonymous:true}}})},{getClaims:async()=>({data:{claims:{...claims,aal:'aal1'}}})},{isSessionActive:async()=>false}]){
  const before=[reads,photos],response=await createOwnerHandler({...config,...overrides})(request(mode));assert.ok([401,403].includes(response.status));assert.deepEqual([reads,photos],before,'No private read before fresh owner, active session and MFA checks');
 }
}
const handler=createOwnerHandler(config),response=await handler(request());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store, private');const details=await response.json();assert.equal(details.id,first);assert.equal(details.periods.all,90600);assert.equal(details.reciters.length,1);assert.equal(details.awards.length,1);assert.ok(!JSON.stringify(details).includes('PRIVATE'));
assert.equal((await handler(request('user',first+','+second))).status,400);assert.equal((await handler(request('user',second))).status,404);
const image=await handler(request('user-avatar'));assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg');assert.equal(image.headers.get('cache-control'),'no-store, private');assert.equal((await image.arrayBuffer()).byteLength,4);
for(const bytes of [new TextEncoder().encode('<svg>bad</svg>'),new Uint8Array(200001)])assert.equal((await createOwnerHandler({...config,readAvatar:async()=>bytes})(request('user-avatar'))).status,404);
console.log('PASS: profile and avatar require fresh MFA owner; revoked, anonymous and forged roles denied; bounded JPEG; no public caching or private fields.');

// Execute the actual read-only query with two accounts and all four periods.
const db=new PGlite();await db.exec(`create schema auth;create schema storage;create schema salah_competition_private;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean);
 create table storage.objects(bucket_id text,name text);create table salah_competition_private.preferences(user_id uuid);
 create table salah_competition_private.totals(user_id uuid,updated_at timestamptz);
 create table salah_competition_private.awards(user_id uuid,kind text,earned_at timestamptz);
 create table fixture_scores(user_id uuid,period text,reciter text,seconds bigint);
 create function public.competition_scores(p_period text,p_day date)returns table(user_id uuid,reciter text,seconds bigint)language sql stable as 'select user_id,reciter,seconds from fixture_scores where period=p_period';
 insert into auth.users values('${first}',now(),false),('${second}',now(),false);
 insert into storage.objects values('profile-avatars','${first}/profile.jpg');insert into salah_competition_private.preferences values('${first}');
 insert into fixture_scores values('${first}','all','ar.alafasy',90000),('${first}','all','ar.badralturki',600),('${first}','day','ar.alafasy',120),('${first}','week','ar.alafasy',600),('${first}','month','ar.alafasy',900),('${second}','all','ar.alafasy',1000000);
 insert into salah_competition_private.awards values('${first}','hours25',now()),('${second}','hours100',now());`);
const statements=[];
const tag=client=>(parts,...args)=>{const text=parts.reduce((s,part,i)=>s+(i?'$'+i:'')+part,'');statements.push(text);return client.query(text,args).then(r=>r.rows);};
const sql=tag(db);sql.begin=fn=>db.transaction(tx=>fn(tag(tx)));
const stored=await readOwnerUserDetails(sql,first);assert.equal(stored.periods.all,90600);assert.equal(stored.hasAvatar,true);assert.deepEqual(stored.reciters.map(x=>x.id),['ar.alafasy','ar.badralturki']);assert.equal(stored.awards[0].kind,'hours25');assert.ok(statements[0].includes('set transaction read only'));assert.ok(!statements.some(s=>/\b(insert|update|delete|claim_founder|award_streak|award_hours)\b/i.test(s)),'Viewing a profile cannot award, update, or reset anything');
const empty=await readOwnerUserDetails(sql,'33333333-3333-4333-8333-333333333333');assert.equal(empty,null);await db.close();
console.log('PASS: real SQL keeps accounts separate, adds every reciter, returns stored awards only and uses a read-only transaction.');

const waits=new Map(),states=[],revoked=[];let next=0;
const controller=createOwnerUserDetail({load:id=>new Promise(resolve=>waits.set(id,resolve)),loadAvatar:async()=>new Blob([new Uint8Array([255,216,255])],{type:'image/jpeg'}),onChange:state=>states.push(state),createUrl:()=> 'blob:fixture-'+(++next),revokeUrl:url=>revoked.push(url)});
const firstLoad=controller.select(first),secondLoad=controller.select(second);waits.get(first)(sample);await firstLoad;assert.ok(!states.some(s=>s.details?.id===first),'Late first profile cannot replace selected second profile');waits.get(second)({...sample,id:second});await secondLoad;assert.equal(states.at(-1).details.id,second);assert.equal(states.at(-1).avatarUrl,'blob:fixture-1');controller.reset();assert.deepEqual(revoked,['blob:fixture-1']);
const stale=controller.select(first);const count=states.length;controller.dispose();waits.get(first)(sample);await stale;assert.equal(states.length,count);assert.equal(next,1,'Closing before response prevents a new private object URL');
const html=ownerUserCard({nickname:'<script>private</script>',id:first},{details:sample,avatarUrl:'blob:fixture-1'});assert.ok(!html.includes('<script>'));assert.match(html,/25 ч 10 мин/);assert.match(html,/Мишари/);assert.match(html,/25 часов с Кораном/);assert.match(html,/listening-25-v2.svg/);assert.match(html,/src="blob:fixture-1"/);assert.ok(!ownerUserCard({nickname:'No photo'},{avatarUrl:'https://untrusted.invalid/x'}).includes('https://untrusted'));assert.match(ownerUserCard({nickname:'Legacy'},{details:{connected:false}}),/ещё не сохранены/);
console.log('PASS: profile navigation discards stale results, clears private photos, escapes nicknames, displays actual earned award art and distinguishes missing data.');
