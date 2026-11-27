import {readCommunityListeningByReciter} from '../reciter-competition/listening-totals.mjs';

export const SALAH_OWNER_ID='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';

export async function readAccountAdjr(sql,uid){
 const [referrals]=await sql`select code,seconds from salah_referrals_private.own_summary(${uid}::uuid)`;
 const code=referrals?.code??null;
 if(uid===SALAH_OWNER_ID){
  const totals=await readCommunityListeningByReciter(sql);
  const seconds=Array.from(totals.values()).reduce((sum,value)=>sum+value,0);
  return {code,seconds,scope:'community'};
 }
 const assigned=await sql`select reciter from salah_referrals_private.reciter_recommendations
  where recommender_id=${uid}::uuid order by reciter`;
 if(!assigned.length)return referrals;
 const reciters=assigned.map(row=>row.reciter);
 const totals=await readCommunityListeningByReciter(sql,reciters);
 return {code,seconds:referrals?.seconds??0,recommendations:reciters.map(reciter=>({reciter,seconds:totals.get(reciter)??0}))};
}
