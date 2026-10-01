const minute=60000;
export function personalTime(value){return typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)?value:''}
// Timestamps carry the city's offset: no device timezone or fixed 24-hour night.
export function lastThirdNight(maghrib,fajr){
  if(!Number.isFinite(maghrib)||!Number.isFinite(fajr))return null;
  const duration=fajr-maghrib;
  if(duration<=0||duration>=24*60*minute)return null;
  // Round forward so the displayed minute is already within the last third.
  const time=Math.ceil((maghrib+duration*2/3)/minute)*minute;
  return time<fajr?time:null;
}
export function tahajjudFor(now,{previous,today,next}={},chosenTime=''){
  const text=personalTime(chosenTime);
  if(text)return {kind:'manual',text,label:'Личное время'};
  if(!Number.isFinite(now)||!Number.isFinite(today?.Fajr))return null;
  const beforeFajr=now<today.Fajr;
  const nightStart=beforeFajr?previous?.Maghrib:today?.Maghrib;
  const nightEnd=beforeFajr?today.Fajr:next?.Fajr;
  const time=lastThirdNight(nightStart,nightEnd);
  return time===null?null:{kind:'last-third',time,nightStart,nightEnd,label:'Начало последней трети ночи'};
}
