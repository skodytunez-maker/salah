// Short excerpts; the hadith wording below is a Russian rendering of its meaning.
export const DHIKR_MESSAGES=[
 {text:'«Поминайте Меня, и Я буду помнить о вас». Коран, 2:152.',source:'https://quran.com/ru/al-baqarah/152'},
 {text:'Любимые для Аллаха слова: «Субханаллах, альхамдулиллях, ля иляха илляллах, Аллаху акбар». Муслим, 2137a.',source:'https://sunnah.com/muslim:2137a'}
];
export const DHIKR_ACTIVITY_KEY='salah:dhikr-last-use-v1';
const DHIKR_DAY=86400000;
export function dhikrTimestamp(value){return Number.isSafeInteger(value)&&value>0&&value<4102444800000?value:0;}
export function normalizeDhikrReminder(value){return {enabled:value?.enabled===true,days:value?.days===2?2:3,time:'20:00',since:dhikrTimestamp(value?.since)};}
export function readDhikrActivity(storage=globalThis.localStorage){try{return dhikrTimestamp(Number(storage.getItem(DHIKR_ACTIVITY_KEY)));}catch{return 0;}}
export function markDhikrActivity(now=Date.now(),storage=globalThis.localStorage,target=globalThis.window){
 if(!dhikrTimestamp(now))return false;
 try{storage.setItem(DHIKR_ACTIVITY_KEY,String(Math.max(now,readDhikrActivity(storage))));target?.dispatchEvent(new Event('salah:dhikr-activity'));return true;}catch{return false;}
}
// The time refers to use of SALAH, never to a claim about worship outside the app.
export function dhikrEventForDay(value,lastUse,day,zone,{localTimestamp,shiftDay,cityDay}){
 const row=normalizeDhikrReminder(value),baseline=Math.max(row.since,dhikrTimestamp(lastUse));
 if(!row.enabled||!baseline)return null;
 const threshold=baseline+row.days*DHIKR_DAY;
 let firstDay;try{firstDay=cityDay(threshold,zone);}catch{return null;}
 let firstAt=localTimestamp(firstDay,row.time,zone);
 if(!Number.isFinite(firstAt))return null;
 if(firstAt<threshold){firstDay=shiftDay(firstDay,1);firstAt=localTimestamp(firstDay,row.time,zone);}
 const dayGap=(Date.parse(day+'T12:00:00Z')-Date.parse(firstDay+'T12:00:00Z'))/DHIKR_DAY;
 if(!Number.isInteger(dayGap)||dayGap<0||dayGap%row.days!==0)return null;
 const at=localTimestamp(day,row.time,zone);
 if(!Number.isFinite(at)||at<threshold)return null;
 const slot=(dayGap/row.days)%DHIKR_MESSAGES.length;
 return {id:JSON.stringify(['dhikr',day,at]),day,kind:'dhikr',key:'return',phase:'at',at,adhan:false,message:DHIKR_MESSAGES[slot].text};
}
