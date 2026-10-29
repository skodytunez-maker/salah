export function createLearningPortalDb({sql}){
 return{
  async portalSummary(uid,teaching,ids){
   if(!ids.length)return[];
   if(teaching)return(await sql`select l.id as lesson_id,
    (select count(*)::int from salah_classroom_private.enrollments e where e.lesson_id=l.id and e.user_id<>l.owner_id) as pupil_count,
    (select count(*)::int from salah_classroom_private.homework_submissions w where w.lesson_id=l.id and w.homework_revision=coalesce((l.details->>'homeworkRevision')::int,0) and w.details->>'state'='submitted') as pending_count
    from salah_classroom_private.lessons l where l.owner_id=${uid}::uuid and l.state<>'cancelled' and l.id in(select jsonb_array_elements_text(${sql.json(ids)}::jsonb))`).map(r=>({lessonId:r.lesson_id,pupilCount:r.pupil_count,pendingCount:r.pending_count}));
   return(await sql`select w.lesson_id,w.version,w.details from salah_classroom_private.homework_submissions w join salah_classroom_private.lessons l on l.id=w.lesson_id join salah_classroom_private.enrollments e on e.lesson_id=w.lesson_id and e.user_id=w.user_id
    where w.user_id=${uid}::uuid and l.state<>'cancelled' and w.homework_revision=coalesce((l.details->>'homeworkRevision')::int,0) and l.id in(select jsonb_array_elements_text(${sql.json(ids)}::jsonb))`).map(r=>({lessonId:r.lesson_id,work:{state:r.details.state,version:r.version,feedback:r.details.feedback||'',submittedAt:r.details.submittedAt,reviewedAt:r.details.reviewedAt||null,readingReview:r.details.readingReview||null}}));
  },
  async portalPupils(id,uid){return(await sql`select e.user_id,e.nickname,e.created_at,w.version,w.details->>'state' as work_state,w.details->'readingReview' as reading_review,w.details->'readingCheck' as reading_check from salah_classroom_private.enrollments e join salah_classroom_private.lessons l on l.id=e.lesson_id left join salah_classroom_private.homework_submissions w on w.lesson_id=e.lesson_id and w.user_id=e.user_id and w.homework_revision=coalesce((l.details->>'homeworkRevision')::int,0)
   where e.lesson_id=${id} and l.owner_id=${uid}::uuid and l.state<>'cancelled' and e.user_id<>l.owner_id order by e.created_at,e.user_id limit 100`).map(r=>({id:r.user_id,nickname:r.nickname,enrolledAt:r.created_at.getTime(),workState:r.work_state||null,workVersion:r.version||null,readingReview:r.reading_review||null,readingCheck:r.reading_check?{letterId:r.reading_check.letterId,count:r.reading_check.count}:null}));}
 };
}
