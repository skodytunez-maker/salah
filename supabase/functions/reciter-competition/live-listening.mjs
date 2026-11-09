const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isLiveListeningDay(day,now=Date.now()){
 const current=new Date(now).toISOString().slice(0,10);
 return /^\d{4}-\d{2}-\d{2}$/.test(day||'')&&Number.isFinite(Date.parse(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day&&Math.abs(Date.parse(day+'T00:00:00Z')-Date.parse(current+'T00:00:00Z'))<=86400000;
}
export function liveListeningPacket(body,now=Date.now()){
 const day=body?.day,validDay=isLiveListeningDay(day,now);
 if(!body||Object.keys(body).some(k=>!['action','device','day','rows'].includes(k))||body.action!=='live-sample'||!uuid.test(body.device||'')||!validDay||!Array.isArray(body.rows)||!body.rows.length||body.rows.length>4)throw Error('invalid_live_sample');
 const seen=new Set();for(const row of body.rows){if(!row||Object.keys(row).some(k=>!['reciter','total','dayTotal'].includes(k))||typeof row.reciter!=='string'||row.reciter.length>80||seen.has(row.reciter)||!Number.isSafeInteger(row.total)||row.total<0||row.total>315360000||!Number.isSafeInteger(row.dayTotal)||row.dayTotal<0||row.dayTotal>86400||row.dayTotal>row.total)throw Error('invalid_live_sample');seen.add(row.reciter);}
 return{device:body.device,day:body.day,rows:body.rows};
}
export function createLiveListeningDb(sql){
 const query=(connection,text,values=[])=>connection.unsafe(text,values);
 const frame=row=>row?{day:String(row.day).slice(0,10),revision:Number(row.revision),at:Number(row.sampled_ms),totals:row.totals}:null;
 async function read(day){
  return sql.begin(async tx=>{
   await query(tx,"select pg_advisory_xact_lock(46520261108)");
   const [cached]=await query(tx,"select day::text,revision,extract(epoch from sampled_at)*1000 as sampled_ms,totals from public.salah_shared_listening where day=$1::date and sampled_at>clock_timestamp()-interval '1 second'",[day]);
   if(cached)return frame(cached);
   const rows=await query(tx,"select periods.period,coalesce(sum(s.seconds)filter(where p.enabled and v.mode<>'hidden' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)),0)::text as seconds from(values('day'),('week'),('month'),('all'))periods(period) left join lateral salah_competition_private.live_competition_scores(periods.period,$1::date)s on true left join salah_competition_private.preferences p using(user_id) left join public.reciter_listener_visibility v using(user_id) left join auth.users u on u.id=s.user_id group by periods.period",[day]);
   const totals={};for(const row of rows){const n=Number(row.seconds);if(!['day','week','month','all'].includes(row.period)||!Number.isSafeInteger(n)||n<0)throw Error('invalid_total');totals[row.period]=n;}
   if(Object.keys(totals).length!==4)throw Error('incomplete_totals');
   const [saved]=await query(tx,"insert into public.salah_shared_listening(day,revision,totals)values($1::date,nextval('salah_competition_private.shared_listening_revision'),$2::jsonb) on conflict(day)do update set revision=excluded.revision,totals=excluded.totals,sampled_at=clock_timestamp() returning day::text,revision,extract(epoch from sampled_at)*1000 as sampled_ms,totals",[day,JSON.stringify(totals)]);
   await query(tx,"delete from public.salah_shared_listening where day<(now() at time zone 'UTC')::date-1 or day>(now() at time zone 'UTC')::date+1");
   await query(tx,"delete from salah_competition_private.live_listening_samples where (user_id,device_id,reciter,day) in (select user_id,device_id,reciter,day from salah_competition_private.live_listening_samples where reported_at<now()-interval '2 days' order by reported_at limit 100)");
   return frame(saved);
  });
 }
 async function update(user,packet){
  return sql.begin(async tx=>{
   await query(tx,"select pg_advisory_xact_lock(hashtextextended($1,465))",[user.id+':'+packet.device]);
   const [eligible]=await query(tx,"select s.id from auth.sessions s join auth.users u on u.id=s.user_id join salah_competition_private.preferences p on p.user_id=u.id join public.reciter_listener_visibility v on v.user_id=u.id where s.id=$1::uuid and s.user_id=$2::uuid and(s.not_after is null or s.not_after>now())and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)and(u.banned_until is null or u.banned_until<=now())and p.enabled and v.mode in('initial','profile')",[user.session,user.id]);
   if(!eligible)throw Object.assign(Error('sign_in_required'),{status:401});
   const [clock]=await query(tx,"select max(reported_at) stamp from salah_competition_private.live_listening_samples where user_id=$1::uuid and device_id=$2::uuid",[user.id,packet.device]);
   const now=Date.now(),priorAt=clock?.stamp?new Date(clock.stamp).getTime():null;if(priorAt!==null&&now-priorAt<750)return{ok:true,retry:true};
   const rows=await query(tx,"select t.reciter,t.seconds total,d.seconds day_total,extract(epoch from(now()-t.updated_at))elapsed,l.total_seconds prior_total,l.day_seconds prior_day from salah_competition_private.totals t join salah_competition_private.days d on d.user_id=t.user_id and d.device_id=t.device_id and d.reciter=t.reciter and d.day=$1::date left join salah_competition_private.live_listening_samples l on l.user_id=t.user_id and l.device_id=t.device_id and l.reciter=t.reciter and l.day=d.day where t.user_id=$2::uuid and t.device_id=$3::uuid",[packet.day,user.id,packet.device]);
   let growth=0,needsSnapshot=false;const accepted=[];for(const value of packet.rows){const baseline=rows.find(r=>r.reciter===value.reciter);if(!baseline){needsSnapshot=true;continue;}
    const priorTotal=Math.max(Number(baseline.total),Number(baseline.prior_total)||0),priorDay=Math.max(Number(baseline.day_total),Number(baseline.prior_day)||0),increment=Math.max(0,value.total-priorTotal),dayIncrement=Math.max(0,value.dayTotal-priorDay);
    if(value.total<priorTotal||value.dayTotal<priorDay||increment===0&&dayIncrement===0)continue;
    if(dayIncrement>increment+1||increment>Math.min(30,Math.max(0,Math.ceil(Number(baseline.elapsed)))+1))throw Error('invalid_live_growth');
    growth+=increment;accepted.push(value);
   }
   if(!accepted.length)return{ok:true,updated:false,needsSnapshot};
   if(priorAt===null&&growth>Math.min(30,Math.max(0,Math.ceil(Number(rows[0]?.elapsed)||0))+1))throw Error('invalid_live_growth');
   if(priorAt!==null&&growth>Math.min(30,Math.max(0,Math.ceil((now-priorAt)/1000))+1))throw Error('invalid_live_growth');
   for(const row of accepted)await query(tx,"insert into salah_competition_private.live_listening_samples(user_id,device_id,reciter,day,session_id,total_seconds,day_seconds) values($1::uuid,$2::uuid,$3,$4::date,$5::uuid,$6,$7) on conflict(user_id,device_id,reciter,day)do update set session_id=excluded.session_id,total_seconds=greatest(live_listening_samples.total_seconds,excluded.total_seconds),day_seconds=greatest(live_listening_samples.day_seconds,excluded.day_seconds),reported_at=clock_timestamp()",[user.id,packet.device,row.reciter,packet.day,user.session,row.total,row.dayTotal]);
   return{ok:true,updated:true,needsSnapshot};
  });
 }
 return{read,update};
}

