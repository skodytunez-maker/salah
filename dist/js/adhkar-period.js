// Suggested collection changes at Fajr and Asr in the selected city.
// Both collections remain available at any time.
export function adhkarPeriod(now,times){
 const fajr=times?.Fajr,asr=times?.Asr;
 if(!Number.isFinite(now)||!Number.isFinite(fajr)||!Number.isFinite(asr)||asr<=fajr)return null;
 return now>=fajr&&now<asr?'morning':'evening';
}

 // Before today's Asr, yesterday's evening is still the most recent evening set.
 // This is a progress/resume boundary, not a restriction on when a dua is read.
export function canResumePreviousEvening(now,times){
 if(adhkarPeriod(now,times)===null)return null;
 return now<times.Asr;
}
