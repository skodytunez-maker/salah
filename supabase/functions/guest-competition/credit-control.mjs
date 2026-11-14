const copy=value=>JSON.parse(JSON.stringify(value||{}));
const maxRows=(left,right)=>{const out=copy(left);for(const[id,n]of Object.entries(right||{}))out[id]=Math.max(out[id]||0,n);return out;};
const maxDays=(left,right)=>{const out=copy(left);for(const[day,rows]of Object.entries(right||{}))out[day]=maxRows(out[day],rows);return out;};
const differences=(raw,credit,previous)=>{const out=copy(previous);for(const[id,n]of Object.entries(raw))out[id]=Math.max(out[id]||0,n-(credit[id]||0),0);return out;};
export function applyGuestCreditControl(control,snapshot,credited,resumeCredit){
 const rawTotals=maxRows(control.raw_totals,snapshot.totals),rawDays=maxDays(control.raw_days,snapshot.days);
 let excludedTotals=copy(control.excluded_totals),excludedDays=copy(control.excluded_days);
 const held=!!control.paused_at,resumed=held&&resumeCredit===control.pause_token;
 if(held){
  excludedTotals=differences(rawTotals,credited.totals,excludedTotals);
  for(const[day,rows]of Object.entries(rawDays))excludedDays[day]=differences(rows,credited.days[day]||{},excludedDays[day]);
 }
 const totals={},days={};
 for(const[id,n]of Object.entries(snapshot.totals))totals[id]=Math.max(0,n-(excludedTotals[id]||0));
 for(const[day,rows]of Object.entries(snapshot.days)){days[day]={};for(const[id,n]of Object.entries(rows))days[day][id]=Math.max(0,n-(excludedDays[day]?.[id]||0));}
 return{control:{raw_totals:rawTotals,raw_days:rawDays,excluded_totals:excludedTotals,excluded_days:excludedDays},snapshot:{...snapshot,totals,days},skip:held,paused:held&&!resumed,resumed};
}
