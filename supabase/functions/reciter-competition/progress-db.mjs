// Canonical cumulative ledger writes for both compact progress and full recovery.
// Fast requests never initialize identities, claim awards or rebuild rank events.
export function createAccountProgressDb(sql){return{async apply(user,snapshot,{full=false}={}){
 if(!full){
  const [known]=await sql`select 1 from salah_competition_private.totals where user_id=${user.id}::uuid and device_id=${snapshot.device}::uuid limit 1`;
  const meterDevice=known?snapshot.device:'00000000-0000-0000-0000-000000000000';
  const [rate]=await sql`select salah_competition_private.allow_progress_request(${user.id}::uuid,null,${meterDevice}::uuid)allowed`;
  if(!rate.allowed)return{ok:false,retry:true};
  if(!known)return{ok:true,progressVersion:1,accepted:false,needsFull:true};
 }
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${user.id},285))`;
  const [pref]=await tx`select p.enabled,v.mode from salah_competition_private.preferences p join public.reciter_listener_visibility v using(user_id)where p.user_id=${user.id}::uuid`;
  if(!pref||!pref.enabled||pref.mode==='hidden')throw Error('disabled');
  const devices=await tx`select distinct device_id from salah_competition_private.totals where user_id=${user.id}::uuid`;
  if(devices.length>=16&&!devices.some(row=>row.device_id===snapshot.device))throw Error('devices_limit');
  const previous=await tx`select reciter,seconds,max(updated_at)over()seed_at from salah_competition_private.totals where user_id=${user.id}::uuid and device_id=${snapshot.device}::uuid`;
  if(!full&&!previous.length)return{ok:true,progressVersion:1,accepted:false,needsFull:true};
  if(!Object.keys(snapshot.totals).length)return{ok:true,progressVersion:1,accepted:false,needsFull:true};
  const [existingBudget]=await tx`select 1 from salah_competition_private.sync_budgets where user_id=${user.id}::uuid and device_id=${snapshot.device}::uuid`;
  const old=Object.fromEntries(previous.map(row=>[row.reciter,Number(row.seconds)]));
  const growth=Object.entries(snapshot.totals).reduce((sum,[id,n])=>sum+Math.max(0,n-(old[id]||0)),0);
  // The first legacy full baseline retains existing import semantics. It never
  // qualifies as a fast baseline until this transaction has actually committed.
  const [budget]=await tx`select salah_competition_private.consume_sync_budget(${user.id}::uuid,null,${snapshot.device}::uuid,${full&&!previous.length&&!existingBudget?0:growth}::bigint,${full},${previous[0]?.seed_at||null}::timestamptz,0)result`;
  if(!budget.result.ok)return budget.result.retry?{ok:false,retry:true}:{ok:true,progressVersion:1,accepted:false,needsFull:true};
  const totals=Object.entries(snapshot.totals).map(([reciter,seconds])=>({reciter,seconds}));
  if(totals.length)await tx`insert into salah_competition_private.totals(user_id,device_id,reciter,seconds,initial_seconds)select ${user.id}::uuid,${snapshot.device}::uuid,x.reciter,x.seconds,x.seconds from jsonb_to_recordset(${tx.json(totals)}::jsonb)x(reciter text,seconds bigint)on conflict(user_id,device_id,reciter)do update set seconds=greatest(totals.seconds,excluded.seconds),updated_at=now()where totals.seconds<excluded.seconds`;
  const days=Object.entries(snapshot.days).flatMap(([day,rows])=>Object.entries(rows).map(([reciter,seconds])=>({day,reciter,seconds})));
  if(days.length){
   const [invalid]=await tx`with incoming as(select * from jsonb_to_recordset(${tx.json(days)}::jsonb)x(day date,reciter text,seconds integer)),merged as(select coalesce(d.day,x.day)as "day",coalesce(d.reciter,x.reciter)reciter,greatest(coalesce(d.seconds,0),coalesce(x.seconds,0))seconds from(select * from salah_competition_private.days where user_id=${user.id}::uuid and device_id=${snapshot.device}::uuid)d full join incoming x using(day,reciter)),summed as(select reciter,sum(seconds)seconds from merged group by reciter)select 1 from summed s left join salah_competition_private.totals t on t.user_id=${user.id}::uuid and t.device_id=${snapshot.device}::uuid and t.reciter=s.reciter where s.seconds>coalesce(t.seconds,0)union all select 1 from merged group by day having sum(seconds)>86400 limit 1`;
   if(invalid)throw Error('invalid_growth');
   await tx`insert into salah_competition_private.days(user_id,device_id,day,reciter,seconds,initial_seconds)select ${user.id}::uuid,${snapshot.device}::uuid,x.day,x.reciter,x.seconds,x.seconds from jsonb_to_recordset(${tx.json(days)}::jsonb)x(day date,reciter text,seconds integer)on conflict(user_id,device_id,day,reciter)do update set seconds=greatest(days.seconds,excluded.seconds)where days.seconds<excluded.seconds`;
  }
  if(full){await tx`update salah_competition_private.preferences set time_zone=${snapshot.timeZone},updated_at=now()where user_id=${user.id}::uuid`;await tx`select public.competition_refresh()`;}
  return{ok:true,progressVersion:1,accepted:true,needsFull:false};
 });
}};}
