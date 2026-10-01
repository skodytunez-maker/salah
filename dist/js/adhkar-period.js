// Suggested collection changes at Fajr and Asr in the selected city.
// Both collections remain available at any time.
export function adhkarPeriod(now,times){
 const fajr=times?.Fajr,asr=times?.Asr;
 if(!Number.isFinite(now)||!Number.isFinite(fajr)||!Number.isFinite(asr)||asr<=fajr)return null;
 return now>=fajr&&now<asr?'morning':'evening';
}
