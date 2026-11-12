const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const origins=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
export const guestActivityOrigin=origin=>origins.has(origin);
export function guestActivityPacket(body){
 if(!body||Array.isArray(body)||Object.keys(body).some(k=>!['action','device','kind','tab','sequence','active'].includes(k))||body.action!=='guest-activity'||!uuid.test(body.device||'')||!uuid.test(body.tab||'')||!['listening','reading','dhikr'].includes(body.kind)||!Number.isSafeInteger(body.sequence)||body.sequence<0||body.sequence>2147483647||typeof body.active!=='boolean')throw Error('invalid_guest_activity');
 return{device:body.device.toLowerCase(),kind:body.kind,tab:body.tab,sequence:body.sequence,active:body.active};
}
export async function guestActivityHash(device){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('salah-guest-v1:'+device));
 return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
}
export function createGuestActivityDb(sql){return{async update(packet){
 const hash=await guestActivityHash(packet.device);
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${hash},478))`;
  const[budget]=await tx`insert into salah_visits_private.activity_budgets(bucket,hits) values(date_trunc('minute',clock_timestamp()),1) on conflict(bucket)do update set hits=activity_budgets.hits+1 where activity_budgets.hits<1200 returning hits`;if(!budget)return{ok:false,retry:true};
  const[daily]=await tx`insert into salah_visits_private.activity_daily_budgets(day,hits) values((clock_timestamp()at time zone 'UTC')::date,1) on conflict(day)do update set hits=activity_daily_budgets.hits+1 where activity_daily_budgets.hits<120000 returning hits`;if(!daily)return{ok:false,retry:true};
  const[rate]=await tx`insert into salah_visits_private.activity_limits(device_hash,minute,attempts) values(${hash},floor(extract(epoch from now())/60)::bigint,1) on conflict(device_hash)do update set minute=excluded.minute,attempts=case when activity_limits.minute=excluded.minute then least(activity_limits.attempts+1,121)else 1 end returning attempts`;if(rate.attempts>120)return{ok:false,retry:true};
  if(budget.hits===1){
   await tx`delete from salah_visits_private.guest_activity_presence where(device_hash,kind,tab_id)in(select device_hash,kind,tab_id from salah_visits_private.guest_activity_presence where reported_at<now()-interval '10 minutes' order by reported_at limit 1000 for update skip locked)`;
   await tx`delete from salah_visits_private.activity_limits where minute<floor(extract(epoch from now())/60)::bigint-10`;
   await tx`delete from salah_visits_private.activity_budgets where bucket<now()-interval '1 day'`;
   await tx`delete from salah_visits_private.activity_daily_budgets where day<(now()at time zone 'UTC')::date-1`;
  }
  const[prior]=await tx`select sequence from salah_visits_private.guest_activity_presence where device_hash=${hash} and kind=${packet.kind} and tab_id=${packet.tab}::uuid`;
  if(!prior){const[n]=await tx`select count(*)::int n from salah_visits_private.guest_activity_presence where device_hash=${hash}`;if(n.n>=32)return{ok:false,retry:true};}
  const rows=await tx`insert into salah_visits_private.guest_activity_presence(device_hash,kind,tab_id,sequence,active) values(${hash},${packet.kind},${packet.tab}::uuid,${packet.sequence},${packet.active})on conflict(device_hash,kind,tab_id)do update set sequence=excluded.sequence,active=excluded.active,reported_at=clock_timestamp()where guest_activity_presence.sequence<excluded.sequence returning active`;
  return{ok:true,accepted:rows.length===1,active:rows[0]?.active===true};
 });
}};}
