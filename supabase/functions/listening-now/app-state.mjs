import{guestActivityHash,selectedContext}from './guest-activity.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const sections=new Set(['home','knowledge','quran','reciters','qibla','adhkar','more','settings','account','support','staff','lesson','radio','admin','other']);
const players=new Set(['playing','paused','stopped','unknown']);
const integer=(value,max=2147483647)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
export function appStatePacket(body){
 const guest=body?.action==='guest-state';
 const fields=['action','tab','sequence','visible','section','playerState','actionSequence','actionAgeMs','creditPaused','appVersion','selectedCity',...(guest?['device']:[])];
 if(!body||Array.isArray(body)||!['app-state','guest-state'].includes(body.action)||Object.keys(body).some(k=>!fields.includes(k))||!uuid.test(body.tab||'')||guest&&!uuid.test(body.device||'')||!integer(body.sequence)||typeof body.visible!=='boolean'||!sections.has(body.section)||!players.has(body.playerState)||!integer(body.actionSequence)||body.actionAgeMs!==null&&!integer(body.actionAgeMs,86400000)||body.creditPaused!==null&&typeof body.creditPaused!=='boolean'||!integer(body.appVersion,100000)||body.appVersion<1||body.actionSequence===0&&body.actionAgeMs!==null||body.actionSequence>0&&body.actionAgeMs===null)throw Error('invalid_app_state');
 let context;try{if(Object.hasOwn(body,'selectedCity'))context=selectedContext(body.selectedCity);}catch{throw Error('invalid_app_state');}
 return{guest,device:guest?body.device.toLowerCase():null,tab:body.tab.toLowerCase(),sequence:body.sequence,visible:body.visible,section:body.section,playerState:body.playerState,actionSequence:body.actionSequence,actionAgeMs:body.actionAgeMs,creditPaused:body.creditPaused,appVersion:body.appVersion,...(Object.hasOwn(body,'selectedCity')?{selectedCity:context}:{})};
}
export function createAppStateDb(sql){return{async update(packet,user=null){
 const deviceHash=packet.guest?await guestActivityHash(packet.device):null;
 if(!packet.guest&&(!user||!uuid.test(user.id||'')||!uuid.test(user.session||'')))throw Object.assign(Error('sign_in_required'),{status:401});
 const actor=packet.guest?'guest:'+deviceHash:'account:'+user.id.toLowerCase();
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${actor},500))`;
  if(!packet.guest){
   const[valid]=await tx`select s.id from auth.sessions s join auth.users u on u.id=s.user_id where s.id=${user.session}::uuid and s.user_id=${user.id}::uuid and(s.not_after is null or s.not_after>now()) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and(u.banned_until is null or u.banned_until<=now())`;
   if(!valid)throw Object.assign(Error('sign_in_required'),{status:401});
  }else{
   const[budget]=await tx`insert into salah_visits_private.activity_budgets(bucket,hits)values(date_trunc('minute',clock_timestamp()),1)on conflict(bucket)do update set hits=activity_budgets.hits+1 where activity_budgets.hits<1200 returning hits`;
   const[daily]=await tx`insert into salah_visits_private.activity_daily_budgets(day,hits)values((clock_timestamp()at time zone 'UTC')::date,1)on conflict(day)do update set hits=activity_daily_budgets.hits+1 where activity_daily_budgets.hits<120000 returning hits`;
   if(!budget||!daily)return{ok:false,retry:true};
  }
  const[rate]=await tx`insert into salah_visits_private.app_state_limits(actor,minute,attempts)values(${actor},floor(extract(epoch from now())/60)::bigint,1)on conflict(actor)do update set minute=excluded.minute,attempts=case when app_state_limits.minute=excluded.minute then least(app_state_limits.attempts+1,91)else 1 end returning attempts`;
  if(rate.attempts>90)return{ok:false,retry:true};
  if(rate.attempts===1){
   await tx`delete from salah_visits_private.app_state_presence where(actor,tab_id)in(select actor,tab_id from salah_visits_private.app_state_presence where reported_at<now()-interval '24 hours'order by reported_at limit 100 for update skip locked)`;
   await tx`delete from salah_visits_private.app_state_limits where minute<floor(extract(epoch from now())/60)::bigint-10`;
  }
  const[prior]=await tx`select sequence from salah_visits_private.app_state_presence where actor=${actor} and tab_id=${packet.tab}::uuid`;
  if(!prior){
   const[count]=await tx`select count(*)::int n from salah_visits_private.app_state_presence where actor=${actor}`;
   if(count.n>=32){
    // Reloads/upgrades create a new tab lease. Recycle only an expired lease
    // under the existing actor transaction lock; live tabs keep their slot.
    const removed=await tx`delete from salah_visits_private.app_state_presence where actor=${actor} and tab_id=(select tab_id from salah_visits_private.app_state_presence where actor=${actor} and reported_at<clock_timestamp()-interval '45 seconds' order by reported_at,tab_id limit 1) returning tab_id`;
    if(!removed.length)return{ok:false,retry:true};
   }
  }
  const contextProvided=Object.hasOwn(packet,'selectedCity');
  const rows=await tx`insert into salah_visits_private.app_state_presence(actor,tab_id,user_id,device_hash,session_id,sequence,visible,section,player_state,action_sequence,last_action_at,credit_paused,app_version,selected_city,selected_country,selected_context_at)values(${actor},${packet.tab}::uuid,${user?.id||null}::uuid,${deviceHash},${user?.session||null}::uuid,${packet.sequence},${packet.visible},${packet.section},${packet.playerState},${packet.actionSequence},case when ${packet.actionSequence}>0 then clock_timestamp()-(${packet.actionAgeMs||0}::double precision*interval '1 millisecond')else null end,${packet.creditPaused},${packet.appVersion},${packet.selectedCity?.city||null},${packet.selectedCity?.country||null},case when ${contextProvided} then clock_timestamp()else null end)on conflict(actor,tab_id)do update set session_id=excluded.session_id,sequence=excluded.sequence,visible=excluded.visible,section=excluded.section,player_state=excluded.player_state,action_sequence=case when app_state_presence.session_id is distinct from excluded.session_id then excluded.action_sequence else greatest(app_state_presence.action_sequence,excluded.action_sequence)end,last_action_at=case when app_state_presence.session_id is distinct from excluded.session_id then excluded.last_action_at when excluded.action_sequence>app_state_presence.action_sequence then greatest(app_state_presence.last_action_at,excluded.last_action_at)else app_state_presence.last_action_at end,credit_paused=excluded.credit_paused,app_version=excluded.app_version,selected_city=case when ${contextProvided} then excluded.selected_city else app_state_presence.selected_city end,selected_country=case when ${contextProvided} then excluded.selected_country else app_state_presence.selected_country end,selected_context_at=case when ${contextProvided} then excluded.selected_context_at else app_state_presence.selected_context_at end,reported_at=clock_timestamp()where app_state_presence.session_id is distinct from excluded.session_id or app_state_presence.sequence<excluded.sequence returning sequence`;
  return{ok:true,accepted:rows.length===1};
 });
}};}
