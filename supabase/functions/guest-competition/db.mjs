import{guestRankHash}from './core.mjs';
import{applyGuestCreditControl}from './credit-control.mjs';
async function creditedSnapshot(tx,id){
 const totals=await tx`select reciter,seconds from salah_competition_private.guest_totals where guest_id=${id}::uuid`;
 const rows=await tx`select day::text,reciter,seconds from salah_competition_private.guest_days where guest_id=${id}::uuid`;
 const days={};for(const x of rows)(days[x.day]||={})[x.reciter]=Number(x.seconds);
 return{totals:Object.fromEntries(totals.map(x=>[x.reciter,Number(x.seconds)])),days};
}
export function createGuestRankDb(sql){return{async apply(packet,user=null){
 const deviceHash=await guestRankHash('salah-guest-rank-v1:',packet.device),secretHash=await guestRankHash('salah-guest-rank-secret-v1:',packet.secret),activityHash=packet.action==='register'?await guestRankHash('salah-guest-v1:',packet.activity):null;
 const fast=packet.action==='progress';
 if(fast){const [window]=await sql`select salah_competition_private.allow_progress_window()allowed`;if(!window.allowed)return{ok:false,retry:true};const [known]=await sql`select public_id,secret_hash from salah_competition_private.guest_players where device_hash=${deviceHash}`;if(!known||known.secret_hash!==secretHash)throw Error('forbidden');const [rate]=await sql`select salah_competition_private.allow_progress_request(null,${known.public_id}::uuid,${packet.device}::uuid,false)allowed`;if(!rate.allowed)return{ok:false,retry:true};}
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${deviceHash},479))`;
  if(!fast){
  const [budget]=await tx`insert into salah_visits_private.activity_budgets(bucket,hits) values(date_trunc('minute',clock_timestamp()),1) on conflict(bucket)do update set hits=activity_budgets.hits+1 where activity_budgets.hits<1200 returning hits`;
  const [daily]=await tx`insert into salah_visits_private.activity_daily_budgets(day,hits) values((now()at time zone 'UTC')::date,1) on conflict(day)do update set hits=activity_daily_budgets.hits+1 where activity_daily_budgets.hits<120000 returning hits`;
  if(!budget||!daily)return{ok:false,retry:true};
  }
  if(packet.action==='register')await tx`insert into salah_competition_private.guest_players(device_hash,secret_hash,activity_hash)values(${deviceHash},${secretHash},${activityHash})on conflict(device_hash)do nothing`;
  const [player]=await tx`select public_id,secret_hash,claimed_by,created_at from salah_competition_private.guest_players where device_hash=${deviceHash} for update`;
  if(!player||player.secret_hash!==secretHash)throw Error('forbidden');
  if(!fast){const [rate]=await tx`update salah_competition_private.guest_players set attempts=case when rate_minute=date_trunc('minute',clock_timestamp())then attempts+1 else 1 end,rate_minute=date_trunc('minute',clock_timestamp()) where public_id=${player.public_id}::uuid and (rate_minute<>date_trunc('minute',clock_timestamp())or attempts<30) returning attempts`;if(!rate)return{ok:false,retry:true};}
  const [alias]=fast?[{}]:await tx`select salah_competition_private.ensure_guest_alias(${player.public_id}::uuid) nickname`;
  const publicResult={ok:true,progressVersion:1,id:player.public_id,...(fast?{}:{nickname:alias.nickname}),claimed:!!player.claimed_by};
  const [control]=await tx`select * from salah_competition_private.guest_credit_controls where guest_id=${player.public_id}::uuid for update`;
  const changedControl=fast&&control&&(control.paused_at||packet.creditRevision!==Number(control.revision));
  const credited=control&&(!fast||changedControl)?await creditedSnapshot(tx,player.public_id):null;
  if(credited){publicResult.creditTotals=credited.totals;publicResult.creditDays=credited.days;publicResult.creditRevision=Number(control.revision);publicResult.creditPaused=!!control.paused_at;publicResult.creditPauseToken=control.paused_at?control.pause_token:null;}
  if(control?.paused_at){publicResult.creditPaused=true;publicResult.creditPauseToken=control.pause_token;}
  if(packet.action==='register')return publicResult;
  if(packet.action==='claim'){
   const [valid]=await tx`select u.id from auth.users u join auth.sessions s on s.user_id=u.id where u.id=${user.id}::uuid and s.id=${user.session}::uuid and (s.not_after is null or s.not_after>now()) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now())`;
   if(!valid)throw Error('sign_in_required');if(player.claimed_by&&player.claimed_by!==user.id)throw Error('claimed');
   await tx`update salah_competition_private.guest_players set claimed_by=${user.id}::uuid,claimed_at=coalesce(claimed_at,now())where public_id=${player.public_id}::uuid`;
   return{...publicResult,claimed:true};
  }
  if(player.claimed_by)throw Error('claimed');
  if(changedControl)return{...publicResult,accepted:false,needsFull:true,rawTotals:control.raw_totals,rawDays:control.raw_days};
  if(fast){const [baseline]=await tx`select 1 from salah_competition_private.sync_budgets where guest_id=${player.public_id}::uuid and device_id=${packet.device}::uuid`;if(!baseline)return{...publicResult,accepted:false,needsFull:true};}
  let snapshot=packet.snapshot;
  if(control){
   const next=applyGuestCreditControl(control,snapshot,credited||{totals:{},days:{}},packet.resumeCredit);
   if(!fast){publicResult.rawTotals=next.control.raw_totals;publicResult.rawDays=next.control.raw_days;}
   const [revision]=await tx`update salah_competition_private.guest_credit_controls set raw_totals=${tx.json(next.control.raw_totals)}::jsonb,raw_days=${tx.json(next.control.raw_days)}::jsonb,excluded_totals=${tx.json(next.control.excluded_totals)}::jsonb,excluded_days=${tx.json(next.control.excluded_days)}::jsonb,paused_at=case when ${next.resumed} then null else paused_at end,resumed_at=case when ${next.resumed} then clock_timestamp() else resumed_at end,updated_at=clock_timestamp(),revision=revision+1 where guest_id=${player.public_id}::uuid returning revision`;
   publicResult.creditRevision=Number(revision.revision);
   if(next.skip){
    const spent=Object.values(credited?.totals||{}).reduce((sum,n)=>sum+n,0);
    const [budget]=await tx`select salah_competition_private.consume_sync_budget(null,${player.public_id}::uuid,${packet.device}::uuid,0,true,${player.created_at}::timestamptz,${spent}::bigint)result`;
    if(!budget.result.ok)return{...publicResult,accepted:false,needsFull:true};
    return{...publicResult,accepted:true,needsFull:false,rawTotals:next.control.raw_totals,rawDays:next.control.raw_days,creditPaused:next.paused,...(next.paused?{creditPauseToken:control.pause_token}:{creditPauseToken:null})};
   }
   snapshot=next.snapshot;
  }
  const totals=Object.entries(snapshot.totals).map(([reciter,seconds])=>({reciter,seconds}));
  const [{old_seconds}]=await tx`select coalesce(sum(seconds),0)::bigint old_seconds from salah_competition_private.guest_totals where guest_id=${player.public_id}::uuid`;
  const [{elapsed}]=await tx`select greatest(0,floor(extract(epoch from(clock_timestamp()-created_at))))::bigint elapsed from salah_competition_private.guest_players where public_id=${player.public_id}::uuid`;
  const [growth]=await tx`select coalesce(sum(greatest(x.seconds-coalesce(t.seconds,0),0)),0)::bigint value from jsonb_to_recordset(${tx.json(totals)}::jsonb)x(reciter text,seconds bigint)left join salah_competition_private.guest_totals t on t.guest_id=${player.public_id}::uuid and t.reciter=x.reciter`;
  if(Number(old_seconds)+Number(growth.value)>Number(elapsed)+10)throw Error('invalid_growth');
  const [budget]=await tx`select salah_competition_private.consume_sync_budget(null,${player.public_id}::uuid,${packet.device}::uuid,${Number(growth.value)}::bigint,${!fast},${player.created_at}::timestamptz,${Number(old_seconds)}::bigint)result`;
  if(!budget.result.ok)return budget.result.retry?{ok:false,retry:true}:{...publicResult,accepted:false,needsFull:true};
  if(totals.length)await tx`insert into salah_competition_private.guest_totals(guest_id,reciter,seconds)select ${player.public_id}::uuid,x.reciter,x.seconds from jsonb_to_recordset(${tx.json(totals)}::jsonb)x(reciter text,seconds bigint)on conflict(guest_id,reciter)do update set seconds=greatest(guest_totals.seconds,excluded.seconds)`;
  const days=Object.entries(snapshot.days).flatMap(([day,rows])=>Object.entries(rows).map(([reciter,seconds])=>({day,reciter,seconds})));
  if(days.length){
   // Never accept independently growing day rows whose sum exceeds the lifetime ledger.
   const [invalid]=await tx`with incoming as(select * from jsonb_to_recordset(${tx.json(days)}::jsonb)x(day date,reciter text,seconds integer)), merged as(select coalesce(d.day,x.day) as day,coalesce(d.reciter,x.reciter)reciter,greatest(coalesce(d.seconds,0),coalesce(x.seconds,0))seconds from (select * from salah_competition_private.guest_days where guest_id=${player.public_id}::uuid)d full join incoming x using(day,reciter)), summed as(select reciter,sum(seconds)seconds from merged group by reciter)select 1 from summed s left join salah_competition_private.guest_totals t on t.guest_id=${player.public_id}::uuid and t.reciter=s.reciter where s.seconds>coalesce(t.seconds,0) union all select 1 from merged group by day having sum(seconds)>86400 limit 1`;
   if(invalid)throw Error('invalid_growth');
   await tx`insert into salah_competition_private.guest_days(guest_id,day,reciter,seconds)select ${player.public_id}::uuid,x.day,x.reciter,x.seconds from jsonb_to_recordset(${tx.json(days)}::jsonb)x(day date,reciter text,seconds integer)on conflict(guest_id,day,reciter)do update set seconds=greatest(guest_days.seconds,excluded.seconds)`;
  }
  if(control&&!fast){const accepted=await creditedSnapshot(tx,player.public_id);publicResult.creditTotals=accepted.totals;publicResult.creditDays=accepted.days;}
  if(fast)return{ok:true,progressVersion:1,accepted:true,needsFull:false,...(control?{creditRevision:publicResult.creditRevision,creditPaused:false}:{})};
  return{...publicResult,accepted:true,needsFull:false};
 });
}};}
