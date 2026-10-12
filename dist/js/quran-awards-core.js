import{safeListener,rankTime}from './reciter-ranking-core.js';
export const QURAN_AWARDS=[
 {kind:'week',title:'Лидер недели',icon:'medal',artwork:'assets/awards/leader-week-v2.png',color:'#c2cbd8',rule:'Первое место по времени любимого чтеца за календарную неделю.'},
 {kind:'month',title:'Лидер месяца',icon:'trophy',artwork:'assets/awards/leader-month-v2.png',color:'#d8be88',rule:'Первое место по времени любимого чтеца за календарный месяц.'},
 {kind:'streak7',title:'Неделя с Кораном',icon:'seedling',color:'#bf926c',days:7,artwork:'assets/awards/streak-7-v1.png',rule:'7 дней прослушивания в одной серии. Для всех слушателей, независимо от места в рейтинге.'},
 {kind:'streak30',title:'Месяц с Кораном',icon:'book-open',color:'#d8be88',days:30,artwork:'assets/awards/streak-30-v1.png',rule:'30 дней прослушивания в одной серии. Для всех слушателей, независимо от места в рейтинге.'},
 {kind:'streak100',title:'100 дней с Кораном',icon:'gem',color:'#c2cbd8',days:100,artwork:'assets/awards/streak-100-v1.png',rule:'100 дней прослушивания в одной серии. Награда остаётся в коллекции.'},
 {kind:'streak200',title:'200 дней с Кораном',icon:'gem',color:'#e7d4a8',days:200,artwork:'assets/awards/streak-200-v1.png',rule:'200 дней прослушивания в одной серии. Награда остаётся в коллекции.'},
 {kind:'streak365',title:'Год с Кораном',icon:'award',color:'#dfe5eb',days:365,artwork:'assets/awards/streak-365-v1.png',rule:'365 дней прослушивания в одной серии. Награда остаётся в коллекции.'},
 {kind:'founder',title:'Первопроходец SALAH',icon:'award',artwork:'assets/awards/founder-v1.png',color:'#d8be88',rule:'Для первых 100 подтверждённых пользователей SALAH. Награда остаётся в вашем аккаунте.'}
];
export const awardInfo=kind=>QURAN_AWARDS.find(a=>a.kind===kind);
export const calendarAward=kind=>kind==='week'||kind==='month';
export function validAwardDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function safeAward(row){
 if(!row||!awardInfo(row.kind)||!/^[-a-f0-9]{36}$/i.test(row.id||'')||!validAwardDate(row.start)||!validAwardDate(row.end)||row.end<row.start||!Number.isSafeInteger(row.seconds)||row.seconds<0||calendarAward(row.kind)&&(!row.reciter||row.seconds===0))return null;
 return {id:row.id,kind:row.kind,start:row.start,end:row.end,reciter:typeof row.reciter==='string'?row.reciter:null,seconds:row.seconds,earnedAt:typeof row.earnedAt==='string'?row.earnedAt:'',...(row.listener?{listener:safeListener(row.listener)}:{})};
}
export function awardPeriod(row){const last=new Date(row.end+'T12:00:00Z');if(calendarAward(row.kind))last.setUTCDate(last.getUTCDate()-1);const first=new Date(row.start+'T12:00:00Z'),fmt=new Intl.DateTimeFormat('ru',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});return row.kind==='founder'?fmt.format(first):fmt.format(first)+' — '+fmt.format(last);}
export function awardShareIdentity(person){const p=safeListener(person);return p?{label:p.mode==='profile'?p.nickname:p.initial,photo:p.mode==='profile'&&p.hasPhoto,id:p.id}: {label:'Ник скрыт',photo:false,id:null};}
export function safeAwardState(data){
 if(!data||!validAwardDate(data.day)||!Array.isArray(data.items)||!data.streak)throw Error('invalid_awards');
 const items=data.items.map(safeAward).filter(Boolean),n=x=>Number.isSafeInteger(x)&&x>=0?x:0;
 return {day:data.day,items,counts:Object.fromEntries(QURAN_AWARDS.map(a=>[a.kind,Math.max(items.filter(x=>x.kind===a.kind).length,n(data.counts?.[a.kind]))])),listener:safeListener(data.listener),streak:{current:n(data.streak.current),best:n(data.streak.best),today:data.streak.today===true,freezes:Math.min(3,n(data.streak.freezes??3)),refillDays:Math.min(6,n(data.streak.refillDays)),protectedDays:Array.isArray(data.streak.protectedDays)?data.streak.protectedDays.filter(validAwardDate):[],days:Array.isArray(data.streak.days)?data.streak.days.filter(validAwardDate):[]}};
}
export function awardCaption(row){return calendarAward(row.kind)?rankTime(row.seconds):awardPeriod(row);}
export function weekDays(today,heard,protectedDays=[]){const anchor=new Date(today+'T12:00:00Z'),monday=new Date(anchor);monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);const set=new Set(heard),protectedSet=new Set(protectedDays);return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setUTCDate(d.getUTCDate()+i);const day=d.toISOString().slice(0,10);return{day,number:d.getUTCDate(),label:['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i],heard:set.has(day),protected:protectedSet.has(day),today:day===today,future:day>today};});}

export function dayCountLabel(n){return n%100>=11&&n%100<=14?'дней':n%10===1?'день':n%10>=2&&n%10<=4?'дня':'дней';}

export function awardArtwork(kind){const a=awardInfo(kind);if(!a)throw Error('Unknown award');return './'+(a.artwork||'assets/icons/'+a.icon+'.svg');}

export function awardMetric(row){const a=awardInfo(row.kind);return calendarAward(row.kind)?rankTime(row.seconds):a.days?a.days+' дней с Кораном':'Первопроходец SALAH';}
