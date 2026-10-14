const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{PGlite}=require('../staff/node_modules/@electric-sql/pglite');
(async()=>{
 const db=await PGlite.create();await db.exec('create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);');
 const root=path.resolve(__dirname,'../..');await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261014142902_support_subscription_unlink.sql'),'utf8'));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',none='33333333-3333-4333-8333-333333333333';
 await db.query('insert into auth.users values($1),($2),($3)',[a,b,none]);
 await db.query("insert into salah_billing_private.subscriptions(user_id,status,amount_rub,method_id,method_type,card_last4,started_at,next_charge_at)values($1,'active',150,'synthetic-a','bank_card','1234',now(),now()+interval '1 month'),($2,'active',500,'synthetic-b','bank_card','9876',now(),now()+interval '1 month')",[a,b]);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>db.query('select * from salah_billing_private.subscriptions'),e=>e.code==='42501');await assert.rejects(()=>db.query('select salah_billing_private.unlink($1)',[a]),e=>e.code==='42501');await db.exec('reset role');}
 await db.exec('set role service_role');await db.query('select salah_billing_private.unlink($1)',[a]);
 const own=async id=>(await db.query('select * from salah_billing_private.subscriptions where user_id=$1',[id])).rows[0];
 const cancelled=await own(a);assert.equal(cancelled.status,'cancelled');for(const field of ['method_id','method_type','card_last4','next_charge_at'])assert.equal(cancelled[field],null,field);assert.equal(cancelled.revision,2);assert.ok(cancelled.cancelled_at);
 const other=await own(b);assert.equal(other.status,'active');assert.equal(other.method_id,'synthetic-b');
 await db.query('select salah_billing_private.unlink($1)',[a]);assert.deepEqual(await own(a),cancelled,'Repeated cancellation is idempotent');
 await db.query('select salah_billing_private.unlink($1)',[none]);assert.equal(await own(none),undefined,'Cancellation cannot create fake support or a charge');
 await assert.rejects(()=>db.query("update salah_billing_private.subscriptions set method_id='synthetic-return' where user_id=$1",[a]),e=>e.code==='23514');
 await db.exec('reset role');const row=(await db.query("select prosecdef from pg_proc where oid='salah_billing_private.unlink(uuid)'::regprocedure")).rows[0];assert.equal(row.prosecdef,false);
 await db.close();console.log('PASS PostgreSQL: own-user unlink, tokens/dates cleared, idempotence, no-record handling, other-user preservation, cancelled-state constraints and revoked client access.');
})().catch(e=>{console.error(e);process.exitCode=1;});
