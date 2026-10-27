// Authority comes from this private table, never from editable profile metadata.
export function createTeacherRolesDb({sql,ownerId}){
 const profile=row=>row?{id:row.id,emailHint:typeof row.email==='string'?row.email.slice(0,1)+'•••@'+row.email.split('@').at(-1):'',nickname:typeof row.nickname==='string'&&row.nickname.trim()?row.nickname.trim().slice(0,40):'Участник SALAH',active:row.active===true,revision:row.revision||0,updatedAt:row.updated_at?Number(new Date(row.updated_at)):null}:null;
 return{
  async teacherRole(uid){if(uid===ownerId)return{active:true,revision:0};const[r]=await sql`select t.active,t.revision from salah_classroom_private.teachers t join auth.users u on u.id=t.user_id where t.user_id=${uid}::uuid and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now())`;return r?{active:r.active,revision:r.revision}:{active:false,revision:0};},
  async teacherLookup(nickname){return(await sql`select u.id,u.email,u.raw_user_meta_data->>'nickname' as nickname,t.active,t.revision,t.updated_at from auth.users u left join salah_classroom_private.teachers t on t.user_id=u.id where u.id<>${ownerId}::uuid and strpos(lower(trim(u.raw_user_meta_data->>'nickname')),${nickname})>0 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now()) order by (lower(trim(u.raw_user_meta_data->>'nickname'))=${nickname}) desc,u.id limit 9`).map(profile);},
  async teacherList(){return(await sql`select u.id,u.email,u.raw_user_meta_data->>'nickname' as nickname,t.active,t.revision,t.updated_at from salah_classroom_private.teachers t join auth.users u on u.id=t.user_id order by t.active desc,t.updated_at desc limit 100`).map(profile);},
  async teacherSet(actorId,targetId,active,expectedRevision){return sql.begin(async tx=>{
   if(actorId!==ownerId||targetId===ownerId)return null;
   // One bounded roster, serialized with concurrent owner tabs. Grant and audit commit together.
   await tx`select pg_advisory_xact_lock(hashtextextended(${ownerId},404))`;
   const[u]=await tx`select id from auth.users where id=${targetId}::uuid and (${!active} or (email_confirmed_at is not null and not coalesce(is_anonymous,false) and (banned_until is null or banned_until<=now()))) for share`;if(!u)return null;
   const[prior]=await tx`select revision,active from salah_classroom_private.teachers where user_id=${targetId}::uuid for update`;
   if((prior?.revision||0)!==expectedRevision||prior?.active===active||!prior&&!active)return null;
   if(active&&!prior?.active){const[n]=await tx`select count(*)::int as n from salah_classroom_private.teachers where active`;if(n.n>=50)return null;}
   const revision=expectedRevision+1;
   await tx`insert into salah_classroom_private.teachers(user_id,active,revision,appointed_by)values(${targetId}::uuid,${active},${revision},${actorId}::uuid)on conflict(user_id)do update set active=excluded.active,revision=excluded.revision,appointed_by=excluded.appointed_by,updated_at=now()`;
   await tx`insert into salah_classroom_private.teacher_role_audit(user_id,actor_id,active,revision)values(${targetId}::uuid,${actorId}::uuid,${active},${revision})`;
   return{active,revision};
  });}
 };
}
