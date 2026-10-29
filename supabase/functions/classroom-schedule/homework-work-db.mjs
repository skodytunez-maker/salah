export function createHomeworkDb({sql}){
 const workRow=r=>r?{...r.details,userId:r.user_id,homeworkRevision:r.homework_revision,version:r.version}:null;
 const fileRow=r=>r?{id:r.id,lessonId:r.lesson_id,userId:r.user_id,homeworkRevision:r.homework_revision,path:r.object_path,mime:r.mime,kind:r.kind,bytes:r.bytes,state:r.state,createdAt:r.created_at.getTime()}:null;
 const current=(lesson,row)=>lesson&&lesson.state!=='cancelled'&&Number(lesson.details.homeworkRevision)===Number(row.homeworkRevision)&&Boolean(lesson.details.homework?.text);
 return{
  async getWork(id,uid,revision){return workRow((await sql`select * from salah_classroom_private.homework_submissions where lesson_id=${id} and user_id=${uid}::uuid and homework_revision=${revision}`)[0]);},
  async listWorks(id){return(await sql`select * from salah_classroom_private.homework_submissions where lesson_id=${id} order by updated_at desc limit 300`).map(workRow);},
  async getWorkFile(id){return fileRow((await sql`select * from salah_classroom_private.homework_files where id=${id}`)[0]);},
  async reserveWorkFile(row,file){return sql.begin(async tx=>{
   await tx`select pg_advisory_xact_lock(hashtextextended(${file.userId},404))`;
   const[l]=await tx`select * from salah_classroom_private.lessons where id=${row.id} for update`;
   if(!current(l,row))return false;
   const[e]=await tx`select user_id from salah_classroom_private.enrollments where lesson_id=${row.id} and user_id=${file.userId}::uuid`;if(!e||file.userId===l.owner_id)return false;
   const[q]=await tx`select count(*)::int as count,coalesce(sum(bytes),0)::bigint as bytes from salah_classroom_private.homework_files where user_id=${file.userId}::uuid and created_at>now()-interval '24 hours'`;
   if(q.count>=30||Number(q.bytes)+file.bytes>60*1024*1024)return false;
   await tx`insert into salah_classroom_private.homework_files(id,lesson_id,user_id,homework_revision,object_path,mime,kind,bytes,state,created_at)values(${file.id},${row.id},${file.userId}::uuid,${file.homeworkRevision},${file.path},${file.mime},${file.kind},${file.bytes},'pending',to_timestamp(${file.createdAt}/1000.0))`;return true;
  });},
  async changeWorkFile(file,state){const rows=await sql`update salah_classroom_private.homework_files set state=${state} where id=${file.id} and user_id=${file.userId}::uuid and lesson_id=${file.lessonId} and state=${file.state} returning id`;return rows.length===1;},
  async submitWork(row,uid,expected,work){return sql.begin(async tx=>{
   const[l]=await tx`select * from salah_classroom_private.lessons where id=${row.id} for update`;if(!current(l,row))return null;
   const[e]=await tx`select user_id from salah_classroom_private.enrollments where lesson_id=${row.id} and user_id=${uid}::uuid`;if(!e||uid===l.owner_id)return null;
   const[p]=await tx`select * from salah_classroom_private.homework_submissions where lesson_id=${row.id} and user_id=${uid}::uuid and homework_revision=${work.homeworkRevision} for update`;
   if((p?.version||0)!==expected||(p?.details.attempts||0)>=20)return null;
   const files=await tx`select * from salah_classroom_private.homework_files where id in(select jsonb_array_elements_text(${tx.json(work.fileIds)}::jsonb)) for update`;
   if(files.length!==work.fileIds.length||files.some(f=>f.lesson_id!==row.id||f.user_id!==uid||f.homework_revision!==work.homeworkRevision||!['ready','submitted'].includes(f.state))||files.filter(f=>f.kind==='photo').length>5||files.filter(f=>f.kind==='audio').length>1)return null;
   const history=p?[...(p.details.history||[]),{...p.details,history:undefined,version:p.version}].slice(-10):[];
   const next={...work,files:work.fileIds.map(id=>fileRow(files.find(f=>f.id===id))).map(({id,mime,kind,bytes})=>({id,mime,kind,bytes})),attempts:(p?.details.attempts||0)+1,history};
   const[r]=await tx`insert into salah_classroom_private.homework_submissions(lesson_id,user_id,homework_revision,version,details,updated_at)values(${row.id},${uid}::uuid,${work.homeworkRevision},${expected+1},${tx.json(next)},to_timestamp(${work.submittedAt}/1000.0))on conflict(lesson_id,user_id,homework_revision)do update set version=excluded.version,details=excluded.details,updated_at=excluded.updated_at returning *`;
   await tx`update salah_classroom_private.homework_files set state='submitted' where id in(select jsonb_array_elements_text(${tx.json(work.fileIds)}::jsonb))`;return workRow(r);
  });},
  async reviewWork(row,owner,input){return sql.begin(async tx=>{
   const[l]=await tx`select owner_id,state from salah_classroom_private.lessons where id=${row.id} for update`;if(!l||l.owner_id!==owner||l.state==='cancelled')return null;
   const[p]=await tx`select * from salah_classroom_private.homework_submissions where lesson_id=${row.id} and user_id=${input.userId}::uuid and homework_revision=${input.homeworkRevision} for update`;if(!p||p.version!==input.expectedVersion)return null;
   const details={...p.details,state:input.state,feedback:input.feedback,reviewedAt:input.now,readingReview:input.readingReview||null};
   return workRow((await tx`update salah_classroom_private.homework_submissions set details=${tx.json(details)},version=version+1,updated_at=to_timestamp(${input.now}/1000.0) where lesson_id=${row.id} and user_id=${input.userId}::uuid and homework_revision=${input.homeworkRevision} and version=${input.expectedVersion} returning *`)[0]);
  });},
  async orphanWorkFiles(){return await sql`select o.name as path from storage.objects o left join salah_classroom_private.homework_files f on f.object_path=o.name where o.bucket_id='salah-homework-private' and o.created_at<now()-interval '48 hours' and (f.id is null or f.state in('pending','ready','invalid','deleted')) order by o.created_at limit 5`;},
  async claimOrphanWorkFile(path){return sql.begin(async tx=>{const[f]=await tx`select * from salah_classroom_private.homework_files where object_path=${path} for update`;if(!f)return true;if(f.state==='submitted'||Date.now()-f.created_at.getTime()<48*3600000)return false;await tx`update salah_classroom_private.homework_files set state='deleted' where id=${f.id} and state<>'submitted'`;return true;});}
 };
}
