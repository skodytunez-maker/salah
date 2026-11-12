import{guestActivityPacket,guestActivityOrigin,createGuestActivityDb}from './guest-activity.mjs';
// Public responses contain aggregates only. Account writes require a verified session; guest writes use bounded anonymous packets.
import{activityPresencePacket,createActivityPresenceDb}from './activity-presence.mjs';
export async function readListeningNow(sql){
 const rows=await sql`with live as (
 select user_id,session_id,'listening'::text kind from salah_competition_private.listener_presence where playing and reported_at>statement_timestamp()-interval '45 seconds'
 union all
 select user_id,session_id,kind from salah_competition_private.activity_presence where active and reported_at>statement_timestamp()-interval '45 seconds'
 ), eligible as(
 select 'account:'||live.user_id::text entity,live.kind
 from live join auth.sessions s on s.id=live.session_id and s.user_id=live.user_id
 join auth.users u on u.id=live.user_id join salah_competition_private.preferences p on p.user_id=live.user_id
 join public.reciter_listener_visibility v on v.user_id=live.user_id
 where (s.not_after is null or s.not_after>statement_timestamp()) and p.enabled and v.mode in('initial','profile')
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=statement_timestamp())
 union all select 'guest:'||device_hash,kind from salah_visits_private.guest_activity_presence where active and reported_at>statement_timestamp()-interval '45 seconds'
 )
 select count(distinct eligible.entity)filter(where eligible.kind='listening')::int as count,
 count(distinct eligible.entity)filter(where eligible.kind='reading')::int as readers,
 count(distinct eligible.entity)filter(where eligible.kind='dhikr')::int as dhikr
 from eligible`;
 const result=Object.fromEntries(['count','readers','dhikr'].map(k=>[k,Number(rows[0]?.[k])]));
 if(Object.values(result).some(n=>!Number.isSafeInteger(n)||n<0))throw Error('invalid_count');
 return result;
}
export function createListeningNowHandler(sql,{verified=async()=>null}={}){
 const db=createActivityPresenceDb(sql),guestDb=createGuestActivityDb(sql);
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 return async req=>{if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method==='GET')try{return reply(await readListeningNow(sql));}catch{return reply({error:'unavailable'},503);}
  if(req.method!=='POST')return reply({error:'method'},405);
  try{
   if(!/^application\/json(?:;|$)/i.test(req.headers.get('Content-Type')||''))return reply({error:'json_required'},415);
   if(Number(req.headers.get('Content-Length'))>1024)return reply({error:'body'},413);
   const reader=req.body?.getReader();if(!reader)return reply({error:'body'},400);const parts=[];let size=0;
   try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return reply({error:'body'},413);}parts.push(value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'body'},400);}
   if(body?.action==='guest-activity'){
    if(!guestActivityOrigin(req.headers.get('Origin')))return reply({error:'forbidden'},403);
    let packet;try{packet=guestActivityPacket(body);}catch{return reply({error:'invalid_guest_activity'},400);}
    const result=await guestDb.update(packet);return reply(result,result.retry?429:200);
   }
   const user=await verified(req);if(!user)return reply({error:'sign_in_required'},401);
   let packet;try{packet=activityPresencePacket(body);}catch{return reply({error:'invalid_activity'},400);}
   const result=await db.update(user,packet);return reply(result,result.retry?429:200);
  }catch(error){return reply({error:'unavailable'},error.status===401?401:503);}
 };
}
