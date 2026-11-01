// A title belongs to one winner of the latest finalized period, never to all
// historical winners. Existing award records remain immutable history.
export async function currentTitleHolders(sql){
 const rows=await sql`with recent as(select kind,max(ends_on)ends_on from salah_competition_private.award_periods where kind in('week','month') group by kind)
 select distinct on(a.kind) a.kind,a.user_id from salah_competition_private.awards a join recent r on r.kind=a.kind and r.ends_on=a.ends_on
 order by a.kind,a.seconds desc,a.earned_at,a.user_id,a.id`;
 const result={week:null,month:null};for(const row of rows)if(Object.hasOwn(result,row.kind))result[row.kind]=row.user_id;return result;
}
