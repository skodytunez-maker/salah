const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function listenerPresencePacket(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['action','tab','sequence','playing'].includes(k))||body.action!=='presence'||!uuid.test(body.tab||'')||!Number.isSafeInteger(body.sequence)||body.sequence<0||body.sequence>2147483647||typeof body.playing!=='boolean')throw Error('invalid_presence');
 return{tab:body.tab,sequence:body.sequence,playing:body.playing};
}
export function createListenerPresenceDb(sql){return{
 async update(user,packet){return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${user.id},410))`;
  const[session]=await tx`select s.id from auth.sessions s join auth.users u on u.id=s.user_id where s.id=${user.session}::uuid and s.user_id=${user.id}::uuid and (s.not_after is null or s.not_after>now()) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now())`;
  if(!session)throw Object.assign(Error('sign_in_required'),{status:401});
  const[rate]=await tx`insert into salah_competition_private.listener_presence_limits(user_id,minute,attempts) values(${user.id}::uuid,floor(extract(epoch from now())/60)::bigint,1) on conflict(user_id) do update set minute=excluded.minute,attempts=case when listener_presence_limits.minute=excluded.minute then least(listener_presence_limits.attempts+1,121) else 1 end returning attempts`;
  if(rate.attempts>120)return{ok:false,retry:true};
  await tx`delete from salah_competition_private.listener_presence where (user_id,tab_id) in(select user_id,tab_id from salah_competition_private.listener_presence where reported_at<now()-interval '10 minutes' order by reported_at limit 100 for update skip locked)`;
  const[pref]=await tx`select p.enabled,v.mode from salah_competition_private.preferences p join public.reciter_listener_visibility v using(user_id) where p.user_id=${user.id}::uuid`;
  const eligible=pref?.enabled===true&&pref.mode==='profile';
  const[prior]=await tx`select sequence from salah_competition_private.listener_presence where user_id=${user.id}::uuid and tab_id=${packet.tab}::uuid`;
  if(!eligible&&!prior)return{ok:true,playing:false};
  if(!prior){const[n]=await tx`select count(*)::int as n from salah_competition_private.listener_presence where user_id=${user.id}::uuid`;if(n.n>=32)return{ok:false,retry:true};}
  const rows=await tx`insert into salah_competition_private.listener_presence(user_id,tab_id,session_id,sequence,playing) values(${user.id}::uuid,${packet.tab}::uuid,${user.session}::uuid,${packet.sequence},${eligible&&packet.playing}) on conflict(user_id,tab_id) do update set sequence=excluded.sequence,playing=excluded.playing,reported_at=clock_timestamp() where listener_presence.session_id=excluded.session_id and listener_presence.sequence<excluded.sequence returning playing`;
  return{ok:true,accepted:rows.length===1,playing:rows[0]?.playing===true};
 });}
};}
