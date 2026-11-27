export async function readReferralInvitees(sql,uid,{owner=false}={}){
 const [row]=await sql`
  with linked as materialized (
   select nullif(btrim(u.raw_user_meta_data->>'nickname'),'') as nickname, v.mode, u.created_at, u.id
   from salah_referrals_private.members m join auth.users u on u.id=m.invitee_id
   left join public.reciter_listener_visibility v on v.user_id=u.id
   where m.inviter_id=${uid}::uuid and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
  ), visible as (
   select case when ${owner}::boolean or mode='profile' then left(nickname,40)
     when mode='initial' then upper(left(nickname,1)) else null end as label, created_at,id
   from linked order by created_at,id limit 100
  )
  select (select count(*)::int from linked) as count,
   coalesce((select jsonb_agg(label order by created_at,id) from visible),'[]'::jsonb) as invitees`;
 return safeReferralInvitees(row);
}

export function safeReferralInvitees(row){
 if(!Number.isSafeInteger(row?.count)||row.count<0||!Array.isArray(row.invitees)||
    row.invitees.length!==Math.min(row.count,100))return null;
 return {count:row.count,invitees:row.invitees.map(label=>typeof label==='string'?
  label.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,40)||null:null)};
}
