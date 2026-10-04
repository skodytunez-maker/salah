const definitions=[
 {id:'ramadan',name:'Начало Рамадана',month:9,day:1,uncertaintyDays:1},
 {id:'fitr',name:'Ураза-байрам',month:10,day:1},
 {id:'arafah',name:'День Арафа',month:12,day:9},
 {id:'adha',name:'Курбан-байрам',month:12,day:10},
 {id:'new-year',name:'Начало года Хиджры',month:1,day:1},
 {id:'ashura',name:'День Ашура',month:1,day:10}
];
const dayMs=86400000;
export function upcomingIslamicDates(today,offset=0){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today))return [];
 const start=Date.parse(today+'T12:00:00Z');
 if(!Number.isFinite(start)||new Date(start).toISOString().slice(0,10)!==today)return [];
 const adjustment=[-1,0,1].includes(Number(offset))?Number(offset):0;
 try{
  const formatter=new Intl.DateTimeFormat('en-US-u-ca-islamic-civil',{timeZone:'UTC',day:'numeric',month:'numeric'});
  if(formatter.resolvedOptions().calendar!=='islamic-civil')return [];
  const found=new Set(),events=[];
  for(let daysLeft=-1;daysLeft<=366&&found.size<definitions.length;daysLeft++){
   const parts=formatter.formatToParts(new Date(start+(daysLeft+adjustment)*dayMs));
   const month=Number(parts.find(p=>p.type==='month')?.value),day=Number(parts.find(p=>p.type==='day')?.value);
   const item=definitions.find(d=>d.month===month&&d.day===day&&!found.has(d.id)&&(daysLeft>=0||d.uncertaintyDays>=-daysLeft));
   if(item){found.add(item.id);events.push({...item,date:new Date(start+daysLeft*dayMs).toISOString().slice(0,10),daysLeft});}
  }
  return events;
 }catch{return [];}
}
export function remainingDaysLabel(days,uncertaintyDays=0){
 if(uncertaintyDays>0){if(days<=1)return 'В эти дни';return 'Примерно '+remainingDaysLabel(days).toLocaleLowerCase('ru-RU');}
 if(days===0)return 'Сегодня';if(days===1)return 'Завтра';
 const plural=new Intl.PluralRules('ru').select(days),word=plural==='one'?'день':plural==='few'?'дня':'дней';
 return 'Через '+days+' '+word;
}
