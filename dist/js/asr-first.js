// The first Asr supplements the published Hanafi time; it never replaces it.
export const firstAsrSourceUrl='https://aladhan.com/prayer-times-api';
export function firstAsrValid(day,row,time){
  if(typeof time!=='string'||!time.startsWith(day+'T')||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+05:00$/.test(time))return false;
  const stamp=Date.parse(time),noon=Date.parse(row?.timings?.Dhuhr),sunset=Date.parse(row?.timings?.Maghrib);
  return Number.isFinite(stamp)&&Number.isFinite(noon)&&Number.isFinite(sunset)&&stamp>noon&&stamp<sunset;
}
export function parseFirstAsrCalendar(json,month){
  if(json?.code!==200||!Array.isArray(json.data))throw Error('Некорректный ответ расчёта Асра');
  const result={};
  for(const row of json.data){
    const date=row.date?.gregorian?.date;
    if(!/^\d{2}-\d{2}-\d{4}$/.test(date||''))continue;
    const day=date.split('-').reverse().join('-'),meta=row.meta;
    if(day.slice(0,7)!==month||meta?.school!=='STANDARD'||meta.timezone!=='Asia/Yekaterinburg'||Number(meta.method?.id)!==3||Math.abs(Number(meta.latitude)-57.1522)>0.0001||Math.abs(Number(meta.longitude)-65.5272)>0.0001||!Number.isFinite(Number(meta.latitude))||!Number.isFinite(Number(meta.longitude)))continue;
    if(firstAsrValid(day,row,row.timings?.Asr))result[day]={time:row.timings.Asr,source:'Aladhan · расчёт',sourceUrl:firstAsrSourceUrl,kind:'calculated'};
  }
  return result;
}
export function mergeFirstAsr(days,supplement){
  const result={...days};
  for(const [day,row]of Object.entries(days)){
    if(row.source!=='al-hakk'||firstAsrValid(day,row,row.asrFirst))continue;
    const first=supplement?.[day];
    if(first?.kind==='calculated'&&firstAsrValid(day,row,first.time))result[day]={...row,asrFirst:first.time,asrFirstSource:first.source,asrFirstSourceUrl:first.sourceUrl,asrFirstKind:'calculated'};
  }
  return result;
}
