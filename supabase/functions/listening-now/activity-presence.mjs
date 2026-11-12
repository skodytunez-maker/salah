const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function activityPresencePacket(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['action','kind','tab','sequence','active'].includes(k))||body.action!=='activity'||!['reading','dhikr'].includes(body.kind)||!uuid.test(body.tab||'')||!Number.isSafeInteger(body.sequence)||body.sequence<0||body.sequence>2147483647||typeof body.active!=='boolean')throw Error('invalid_presence');
 return{tab:body.tab,sequence:body.sequence,active:body.active,kind:body.kind};
}
export function createActivityPresenceDb(sql){return{
 async update(user,packet){return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${user.id},410))`;
  const[session]=await tx`select s.id from auth.sessions s join auth.users u on u.id=s.user_id where s.id=${user.session}::uuid and s.user_id=${user.id}::uuid and (s.not_after is null or s.not_after>now()) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now())`;
  if(!session)throw Object.assign(Error('sign_in_required'),{status:401});
  const[rate]=await tx`insert into salah_competition_private.listener_presence_limits(user_id,minute,attempts) values(${user.id}::uuid,floor(extract(epoch from now())/60)::bigint,1) on conflict(user_id) do update set minute=excluded.minute,attempts=case when listener_presence_limits.minute=excluded.minute then least(listener_presence_limits.attempts+1,121) else 1 end returning attempts`;
  if(rate.attempts>120)return{ok:false,retry:true};
  await tx`delete from salah_competition_private.activity_presence where (user_id,kind,tab_id) in(select user_id,kind,tab_id from salah_competition_private.activity_presence where reported_at<now()-interval '10 minutes' order by reported_at limit 100 for update skip locked)`;
  const[pref]=await tx`select p.enabled,v.mode from salah_competition_private.preferences p join public.reciter_listener_visibility v using(user_id) where p.user_id=${user.id}::uuid`;
  const eligible=pref?.enabled===true&&['initial','profile'].includes(pref.mode);
  const[prior]=await tx`select sequence from salah_competition_private.activity_presence where user_id=${user.id}::uuid and kind=${packet.kind} and tab_id=${packet.tab}::uuid`;
  if(!eligible&&!prior)return{ok:true,active:false};
  if(!prior){const[n]=await tx`select count(*)::int as n from salah_competition_private.activity_presence where user_id=${user.id}::uuid`;if(n.n>=32)return{ok:false,retry:true};}
  const rows=await tx`insert into salah_competition_private.activity_presence(user_id,kind,tab_id,session_id,sequence,active) values(${user.id}::uuid,${packet.kind},${packet.tab}::uuid,${user.session}::uuid,${packet.sequence},${eligible&&packet.active}) on conflict(user_id,kind,tab_id) do update set sequence=excluded.sequence,active=excluded.active,reported_at=clock_timestamp() where activity_presence.session_id=excluded.session_id and activity_presence.sequence<excluded.sequence returning active`;
  return{ok:true,accepted:rows.length===1,active:rows[0]?.active===true};
 });}
};}
