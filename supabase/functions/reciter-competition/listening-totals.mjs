// Only aggregate already reconciled scores; never expose user IDs or raw snapshots.
export async function readListeningTotals(sql,day){
 const rows=await sql`select periods.period,coalesce(sum(s.seconds)filter(where p.enabled and v.mode<>'hidden' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)),0)::text as seconds
 from(values('day'),('week'),('month'),('all'))periods(period)
 left join lateral public.competition_scores(periods.period,${day}::date)s on true
 left join salah_competition_private.preferences p using(user_id)
 left join public.reciter_listener_visibility v using(user_id)
 left join auth.users u on u.id=s.user_id group by periods.period`;
 const totals={};for(const row of rows){const n=Number(row.seconds);if(!['day','week','month','all'].includes(row.period)||!Number.isSafeInteger(n)||n<0)throw Error('invalid_total');totals[row.period]=n;}
 if(Object.keys(totals).length!==4)throw Error('incomplete_totals');return totals;
}
export function createListeningTotalsLoader({now=Date.now,ttl=10000}={}){
 const cached=new Map(),pending=new Map();
 return async(sql,day)=>{const saved=cached.get(day);if(saved&&now()-saved.at<ttl)return {...saved.value};if(pending.has(day))return {...await pending.get(day)};
  const task=readListeningTotals(sql,day);pending.set(day,task);
  try{const value=await task;cached.set(day,{at:now(),value});while(cached.size>3)cached.delete(cached.keys().next().value);return {...value};}finally{if(pending.get(day)===task)pending.delete(day);}
 };
}
