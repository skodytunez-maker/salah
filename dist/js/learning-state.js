export const prayerCourses={fajr:{name:'Фаджр',rakats:2},dhuhr:{name:'Зухр',rakats:4},asr:{name:'Аср',rakats:4},maghrib:{name:'Магриб',rakats:3},isha:{name:'Иша',rakats:4}};
export function courseLength(kind){
 if(kind==='basic')return 17;if(kind==='wudu')return 10;
 const course=prayerCourses[kind];if(!course)return 0;
 let count=3+4;
 for(let r=1;r<=course.rakats;r++)count+=(r<=2?8:7)+(r>1?1:0)+(r===2&&r<course.rakats?1:0);
 return count;
}
export function validPosition(value){return !!value&&Object.hasOwn({basic:1,wudu:1,...prayerCourses},value.kind)&&Number.isInteger(value.index)&&value.index>=0&&value.index<courseLength(value.kind)}
export function savedLesson(value){
 if(!validPosition(value)||value.complete!==false)return null;
 const result={kind:value.kind,index:value.index,complete:false};
 if(value.kind==='wudu'&&validPosition(value.returnTo)&&value.returnTo.kind!=='wudu')result.returnTo={kind:value.returnTo.kind,index:value.returnTo.index};
 return result;
}
export function courseName(kind){return kind==='basic'?'Основы намаза':kind==='wudu'?'Омовение':prayerCourses[kind]?.name||''}
