export const scheduleSources={mecca:'https://prh.gov.sa/ar/almasjed_alharam/imem-muadhen-makka',madinah:'https://prh.gov.sa/ar/almasjed_alnabawi/imem-muadhen-madina'};
export const schedulePrayers={fajr:'Фаджр',dhuhr:'Зухр',asr:'Аср',maghrib:'Магриб',isha:'Иша'};
const knownImams=[
 [['عبد الرحمن','السديس'],'Абдуррахман ас-Судайс'],[['عبدالله','الجهني'],'Абдуллах аль-Джухани'],[['ياسر','الدوسري'],'Ясир ад-Даусари'],[['ماهر','المعيقلي'],'Махер аль-Мувайкли'],[['بدر','التركي'],'Бадр ат-Турки'],[['بندر','بليلة'],'Бандар Балила'],
 [['صلاح','البدير'],'Салах аль-Будайр'],[['عبدالمحسن','القاسم'],'Абдуль-Мухсин аль-Касим'],[['أحمد','الحذيفي'],'Ахмад аль-Хузайфи'],[['علي','الحذيفي'],'Али аль-Хузайфи'],[['عبدالباري','الثبيتي'],'Абдуль-Бари ас-Субайти'],[['عبدالله','البعيجان'],'Абдуллах аль-Буайджан'],[['خالد','المهنا'],'Халид аль-Муханна'],
 [['الوليد','الشمسان'],'Валид аш-Шамсан'],[['أسامة','خياط'],'Усама аль-Хайят'],[['صالح','حميد'],'Салих ибн Хумайд'],[['فيصل','غزاوي'],'Фейсал Газзави'],[['حسين','ال الشيخ'],'Хусейн Аль аш-Шейх'],[['محمد','برهجي'],'Мухаммад Бархаджи'],[['صالح','المغامسي'],'Салих аль-Магамси'],[['عبدالله','القرافي'],'Абдуллах аль-Карафи']
];
export const imamLabel=name=>knownImams.find(([parts])=>parts.every(part=>name.replace(/\s/g,'').includes(part.replace(/\s/g,''))))?.[1]||name;
export const saudiDay=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export const scheduleTime=value=>new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
export function validScheduleMonth(value){return typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&Number(value.slice(0,4))>=2020&&Number(value.slice(0,4))<=2100}
export function validScheduleDay(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value}
export function validateHaramainSchedule(value){
 if(!value||value.edition!==1||typeof value.fetchedAt!=='string'||!Number.isFinite(Date.parse(value.fetchedAt))||!Array.isArray(value.rows)||value.rows.length>6000)throw Error('Некорректное расписание');
 const seen=new Set();
 for(const row of value.rows){
  if(!row||!Object.hasOwn(scheduleSources,row.mosque)||!Object.hasOwn(schedulePrayers,row.prayer)||!validScheduleDay(row.day)||typeof row.at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(row.at)||!Number.isFinite(Date.parse(row.at))||saudiDay(row.at)!==row.day||typeof row.imam!=='string'||!row.imam.trim()||row.imam.length>160)throw Error('Некорректная запись расписания');
  const key=[row.mosque,row.day,row.prayer].join(':');if(seen.has(key))throw Error('Повторная запись расписания');seen.add(key);
 }
 return value;
}
export function scheduleForDay(data,mosque,day){return data.rows.filter(row=>row.mosque===mosque&&row.day===day).sort((a,b)=>Object.keys(schedulePrayers).indexOf(a.prayer)-Object.keys(schedulePrayers).indexOf(b.prayer))}
export function scheduleDays(data,mosque,month){return [...new Set(data.rows.filter(row=>row.mosque===mosque&&row.day.startsWith(month+'-')).map(row=>row.day))].sort()}
