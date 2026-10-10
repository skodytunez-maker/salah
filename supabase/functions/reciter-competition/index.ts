import postgres from 'npm:postgres@3.4.9';
import{COMPETITION_PERIODS,validCompetitionId,competitionDay,competitionSnapshot,competitionSubscription}from './core.mjs';
import{publicListenerRows}from './listener-labels.mjs';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Content-Type':'application/json','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
async function verified(req:Request){
 const bearer=req.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer))return null;
 const response=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:bearer}});if(!response.ok)return null;const user=await response.json();if(!validCompetitionId(user.id)||!user.email_confirmed_at||user.is_anonymous)return null;
 let claim;try{claim=JSON.parse(atob(bearer.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{return null;}
 if(claim.sub!==user.id||!validCompetitionId(claim.session_id))return null;
 const sessions=await sql`select id from auth.sessions where id=${claim.session_id}::uuid and user_id=${user.id}::uuid and (not_after is null or not_after>now())`;
 return sessions.length?{id:user.id,session:claim.session_id}:null;
}
async function hashFor(id:string){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode('reciter-ranking-v1:'+id))),v=>v.toString(16).padStart(2,'0')).join('');}
async function ensure(user:any,initialEnabled=true){const hash=await hashFor(user.id);await sql.begin(async tx=>{
 await tx`insert into public.reciter_listener_visibility(user_id,listener_hash,mode)values(${user.id}::uuid,${hash},'initial')on conflict(user_id)do nothing`;
 await tx`insert into salah_competition_private.preferences(user_id,enabled)values(${user.id}::uuid,${initialEnabled})on conflict(user_id)do nothing`;
 await tx`insert into salah_competition_private.legacy(user_id,reciter,seconds,seed_seconds)select ${user.id}::uuid,reciter,sum(minutes::bigint*60+extra_seconds),case when exists(select 1 from salah_competition_private.totals t where t.user_id=${user.id}::uuid and t.reciter=m.reciter)then 0 else sum(minutes::bigint*60+extra_seconds)end from public.reciter_popularity_minutes m where listener_hash=${hash}group by reciter on conflict(user_id,reciter)do update set seconds=greatest(legacy.seconds,excluded.seconds)`;
 await tx`insert into salah_competition_private.legacy_days(user_id,day,reciter,seconds)select ${user.id}::uuid,m.day,m.reciter,case when exists(select 1 from salah_competition_private.days d where d.user_id=${user.id}::uuid and d.day=m.day and d.reciter=m.reciter)then 0 else m.minutes::bigint*60+m.extra_seconds end from public.reciter_popularity_minutes m where listener_hash=${hash}on conflict(user_id,day,reciter)do nothing`;
 await tx`select public.competition_refresh()`;
});}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
 const params=new URL(req.url).searchParams;
 if(req.method==='GET'&&params.has('avatar')){
  const id=params.get('avatar');if(!validCompetitionId(id))return reply({error:'not_found'},404);
  const rows=await sql`select v.user_id from public.reciter_listener_visibility v join salah_competition_private.preferences p using(user_id)join auth.users u on u.id=v.user_id where v.public_id=${id}::uuid and v.mode='profile' and p.enabled and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)`;
  if(!rows.length)return reply({error:'not_found'},404);
  const response=await fetch(url+'/storage/v1/object/authenticated/profile-avatars/'+rows[0].user_id+'/profile.jpg',{headers:{apikey:key,Authorization:'Bearer '+key}});
  if(!response.ok||!/^image\/jpeg(?:;|$)/i.test(response.headers.get('content-type')||''))return reply({error:'not_found'},404);const bytes=await response.arrayBuffer();if(bytes.byteLength>200000)return reply({error:'not_found'},404);
  return new Response(bytes,{headers:{...headers,'Content-Type':'image/jpeg'}});
 }
 if(req.method==='GET'&&params.get('own')!=='true'){
  const period=params.get('period')||'all';if(!COMPETITION_PERIODS.includes(period))return reply({error:'invalid_period'},400);const day=competitionDay(params.get('day')||new Date().toISOString().slice(0,10));
  const rows=await sql`select b.reciter,b.seconds,b.place,v.public_id as id,v.mode,
  upper(left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),1))initial,
  upper(left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),2))prefix,
  case when v.mode='profile' then left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),40)end nickname,
  case when v.mode='profile' then exists(select 1 from storage.objects o where o.bucket_id='profile-avatars'and o.name=v.user_id::text||'/profile.jpg')else false end has_photo
  from public.competition_board(${period},${day}::date)b join public.reciter_listener_visibility v using(user_id)join auth.users u on u.id=b.user_id order by b.place,v.public_id limit 1000`;
  const labels=publicListenerRows(rows);return reply({period,day,items:rows.map((r:any,i:number)=>({...labels[i],seconds:Number(r.seconds),rank:Number(r.place)})),limited:rows.length===1000});
 }
 const user=await verified(req);if(!user)return reply({error:'sign_in_required'},401);
 if(req.method==='GET'){
  await ensure(user,params.get('participation')!=='off');const pref=(await sql`select p.enabled,p.notify,p.period,v.public_id as id,v.mode from salah_competition_private.preferences p join public.reciter_listener_visibility v using(user_id)where p.user_id=${user.id}::uuid`)[0];
  const day=competitionDay(params.get('day')||new Date().toISOString().slice(0,10));const totals:any={};for(const period of COMPETITION_PERIODS){const rows=await sql`select reciter,seconds from public.competition_scores(${period},${day}::date)where user_id=${user.id}::uuid`;totals[period]=Object.fromEntries(rows.map(r=>[r.reciter,Number(r.seconds)]));}return reply({...pref,totals});
 }
 if(req.method!=='POST')return reply({error:'method'},405);
 if(Number(req.headers.get('content-length')||0)>200000)return reply({error:'body'},413);const text=await req.text();if(text.length>200000)return reply({error:'body'},413);let body;try{body=JSON.parse(text);}catch{return reply({error:'body'},400);}await ensure(user);
 if(body?.action==='snapshot'){
  let snapshot;try{snapshot=competitionSnapshot(body);}catch{return reply({error:'invalid_snapshot'},400);}
  await sql.begin(async tx=>{
   await tx`select pg_advisory_xact_lock(hashtextextended(${user.id},285))`;
   const pref=(await tx`select p.enabled,v.mode from salah_competition_private.preferences p join public.reciter_listener_visibility v using(user_id)where p.user_id=${user.id}::uuid`)[0];if(!pref.enabled||pref.mode==='hidden')throw Error('disabled');
   const devices=await tx`select distinct device_id from salah_competition_private.totals where user_id=${user.id}::uuid`;if(devices.length>=16&&!devices.some(r=>r.device_id===snapshot.device))throw Error('devices_limit');
   const previous=await tx`select reciter,seconds,extract(epoch from(now()-max(updated_at)over()))elapsed from salah_competition_private.totals where user_id=${user.id}::uuid and device_id=${snapshot.device}::uuid`;
   if(previous.length){const elapsed=Number(previous[0].elapsed);if(elapsed<10)throw Error('retry');const old=Object.fromEntries(previous.map(r=>[r.reciter,Number(r.seconds)]));const growth=Object.entries(snapshot.totals).reduce((sum,[id,n])=>sum+Math.max(0,Number(n)-(old[id]||0)),0);if(growth>elapsed+120)throw Error('invalid_growth');}
   const totalsRows=Object.entries(snapshot.totals).map(([reciter,seconds])=>({reciter,seconds}));if(totalsRows.length)await tx`insert into salah_competition_private.totals(user_id,device_id,reciter,seconds,initial_seconds)select ${user.id}::uuid,${snapshot.device}::uuid,x.reciter,x.seconds,x.seconds from jsonb_to_recordset(${tx.json(totalsRows)}::jsonb)as x(reciter text,seconds bigint)on conflict(user_id,device_id,reciter)do update set seconds=greatest(totals.seconds,excluded.seconds),updated_at=now()`;
   const dayRows=Object.entries(snapshot.days).flatMap(([day,rows])=>Object.entries(rows).map(([reciter,seconds])=>({day,reciter,seconds})));if(dayRows.length)await tx`insert into salah_competition_private.days(user_id,device_id,day,reciter,seconds,initial_seconds)select ${user.id}::uuid,${snapshot.device}::uuid,x.day,x.reciter,x.seconds,x.seconds from jsonb_to_recordset(${tx.json(dayRows)}::jsonb)as x(day date,reciter text,seconds integer)on conflict(user_id,device_id,day,reciter)do update set seconds=greatest(days.seconds,excluded.seconds)`;
   await tx`update salah_competition_private.preferences set time_zone=${snapshot.timeZone},updated_at=now()where user_id=${user.id}::uuid`;
   await tx`select public.competition_refresh()`;
  });return reply({ok:true});
 }
 if(body?.action==='device'&&Object.keys(body).every(k=>['action','device','subscription'].includes(k))&&validCompetitionId(body.device)){
  let sub;try{sub=competitionSubscription(body.subscription);}catch{return reply({error:'invalid_subscription'},400);}
  const devices=await sql`select count(*)::int n from salah_competition_private.devices where user_id=${user.id}::uuid and enabled`;if(devices[0].n>=16)return reply({error:'devices_limit'},400);
  const rows=await sql`insert into salah_competition_private.devices(id,user_id,session_id,subscription)values(${body.device}::uuid,${user.id}::uuid,${user.session}::uuid,${sql.json(sub)})on conflict(id)do update set session_id=excluded.session_id,subscription=excluded.subscription,enabled=true,updated_at=now()where devices.user_id=excluded.user_id returning id`;return reply({ok:rows.length===1});
 }
 if(body?.action==='settings'&&Object.keys(body).every(k=>['action','enabled','notify','period'].includes(k))){
  if(body.enabled!==undefined&&typeof body.enabled!=='boolean'||body.notify!==undefined&&typeof body.notify!=='boolean'||body.period!==undefined&&!COMPETITION_PERIODS.includes(body.period))return reply({error:'invalid_settings'},400);
  if(body.notify===true){const ready=await sql`select id from salah_competition_private.devices where user_id=${user.id}::uuid and session_id=${user.session}::uuid and enabled limit 1`;if(!ready.length)return reply({error:'connect_notifications_first'},400);}
  await sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(28520261011)`;await tx`update salah_competition_private.preferences set enabled=coalesce(${body.enabled??null},enabled),notify=coalesce(${body.notify??null},notify),period=coalesce(${body.period??null},period),updated_at=now()where user_id=${user.id}::uuid`;if(body.enabled===true)await tx`update public.reciter_listener_visibility set mode='initial',public_id=gen_random_uuid(),updated_at=now()where user_id=${user.id}::uuid and mode='hidden'`;await tx`delete from salah_competition_private.rank_state where user_id=${user.id}::uuid`;await tx`delete from salah_competition_private.events where user_id=${user.id}::uuid`;await tx`select public.competition_refresh()`;});return reply({ok:true});
 }
 return reply({error:'invalid_action'},400);
 }catch(e){const reason=String(e?.message||'');return reply({error:['disabled','devices_limit','invalid_growth'].includes(reason)?reason:reason==='retry'?'retry':'temporarily_unavailable'},reason==='retry'?429:['disabled','devices_limit','invalid_growth'].includes(reason)?400:503);}
});
