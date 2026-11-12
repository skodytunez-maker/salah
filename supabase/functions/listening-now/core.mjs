// Aggregate only: no identities, locations, session IDs or listening history leave this handler.
export async function readListeningNow(sql){
 const rows=await sql`select count(distinct lp.user_id)::int as count
 from salah_competition_private.listener_presence lp
 join auth.sessions s on s.id=lp.session_id and s.user_id=lp.user_id
 join auth.users u on u.id=lp.user_id
 join salah_competition_private.preferences p on p.user_id=lp.user_id
 join public.reciter_listener_visibility v on v.user_id=lp.user_id
 where lp.playing and lp.reported_at>statement_timestamp()-interval '45 seconds'
 and (s.not_after is null or s.not_after>statement_timestamp())
 and p.enabled and v.mode in ('initial','profile')
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 and (u.banned_until is null or u.banned_until<=statement_timestamp())`;
 const count=Number(rows[0]?.count);if(!Number.isSafeInteger(count)||count<0)throw Error('invalid_count');
 return {count};
}
export function createListeningNowHandler(sql){
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,content-type,x-client-info','Access-Control-Allow-Methods':'GET,OPTIONS','Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 return async req=>{if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='GET')return reply({error:'method'},405);
  try{return reply(await readListeningNow(sql));}catch{return reply({error:'unavailable'},503);}
 };
}
