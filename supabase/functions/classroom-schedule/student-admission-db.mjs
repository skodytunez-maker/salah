export function createStudentAdmissionDb({sql,ownerId}){
 return{
  async hasLearningAccess(uid){const[r]=await sql`select exists(select 1 from salah_classroom_private.enrollments e join salah_classroom_private.lessons l on l.id=e.lesson_id where e.user_id=${uid}::uuid and l.state<>'cancelled' and (l.owner_id=${ownerId}::uuid or exists(select 1 from salah_classroom_private.teachers t where t.user_id=l.owner_id and t.active))) as allowed`;return r?.allowed===true;},
  async studentLookup(nickname,teacherId){return(await sql`select id,raw_user_meta_data->>'nickname' as nickname from auth.users where id<>${teacherId}::uuid and email_confirmed_at is not null and not coalesce(is_anonymous,false) and (banned_until is null or banned_until<=now()) and strpos(lower(trim(raw_user_meta_data->>'nickname')),${nickname})>0 order by (lower(trim(raw_user_meta_data->>'nickname'))=${nickname}) desc,id limit 8`).map(row=>({id:row.id,nickname:String(row.nickname).trim().slice(0,40)}));},
  async studentSet(row,actorId,targetId,add){return sql.begin(async tx=>{
   const[l]=await tx`select owner_id,state,ends_at,details from salah_classroom_private.lessons where id=${row.id} for update`;
   if(!l||l.state==='cancelled'||targetId===l.owner_id||actorId!==ownerId&&actorId!==l.owner_id)return false;
   if(actorId!==ownerId){const[t]=await tx`select active from salah_classroom_private.teachers where user_id=${actorId}::uuid for share`;if(t?.active!==true)return false;}
   if(!add){await tx`delete from salah_classroom_private.enrollments where lesson_id=${row.id} and user_id=${targetId}::uuid`;return true;}
   if(!['planned','live'].includes(l.state)||l.ends_at.getTime()<=Date.now())return false;
   const[u]=await tx`select id,raw_user_meta_data->>'nickname' as nickname from auth.users where id=${targetId}::uuid and email_confirmed_at is not null and not coalesce(is_anonymous,false) and (banned_until is null or banned_until<=now()) for share`;if(!u)return false;
   const[prior]=await tx`select user_id from salah_classroom_private.enrollments where lesson_id=${row.id} and user_id=${targetId}::uuid`;if(prior)return true;
   const[n]=await tx`select count(*)::int as n from salah_classroom_private.enrollments where lesson_id=${row.id} and user_id<>${l.owner_id}::uuid`;if(n.n>=l.details.maxParticipants-1)return false;
   const nickname=typeof u.nickname==='string'&&u.nickname.trim()?u.nickname.trim().slice(0,40):'Ученик';
   await tx`insert into salah_classroom_private.enrollments(lesson_id,user_id,nickname,reminders_enabled)values(${row.id},${targetId}::uuid,${nickname},false)on conflict(lesson_id,user_id)do nothing`;return true;
  });}
 };
}
