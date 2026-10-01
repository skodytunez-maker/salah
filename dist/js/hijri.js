const months = ['Мухаррам','Сафар','Раби аль-авваль','Раби аль-ахир','Джумада аль-уля','Джумада аль-ахира','Раджаб','Шаабан','Рамадан','Шавваль','Зуль-када','Зуль-хиджа'];
export function hijriForDay(day, days = {}, offset = 0) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
 const date = new Date(day + 'T12:00:00Z');
 if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) return null;
 const adjustment = [-1,0,1].includes(Number(offset)) ? Number(offset) : 0;
 date.setUTCDate(date.getUTCDate() + adjustment);
 const adjustedDay = date.toISOString().slice(0, 10), base = days[day]?.hijri, supplied = days[adjustedDay]?.hijri;
 if (supplied && Number(supplied.day) >= 1 && Number(supplied.day) <= 30 && months[Number(supplied.month?.number)-1] && Number(supplied.year) > 0) {
  return {text:Number(supplied.day)+' '+months[Number(supplied.month.number)-1]+' '+Number(supplied.year),source:'Aladhan'};
 }
 if(base && Number(base.day)>=1 && Number(base.day)<=30 && months[Number(base.month?.number)-1] && Number(base.year)>0){
  const shifted=Number(base.day)+adjustment;
  const safe=shifted>=1&&shifted<=29;
  return {text:(safe?shifted:Number(base.day))+' '+months[Number(base.month.number)-1]+' '+Number(base.year),source:safe?'Aladhan':'Aladhan · поправка недоступна без соседней даты',adjustmentUnavailable:!safe};
 }
 try {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-civil',{timeZone:'UTC',day:'numeric',month:'numeric',year:'numeric'});
  if (formatter.resolvedOptions().calendar !== 'islamic-civil') return null;
  const parts = formatter.formatToParts(date);
  const part = type => Number(parts.find(value => value.type === type)?.value), month = part('month');
  if (!months[month-1]) return null;
  return {text:part('day')+' '+months[month-1]+' '+part('year'),source:'Расчётный исламский календарь'};
 } catch { return null; }
}
