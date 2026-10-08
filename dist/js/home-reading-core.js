// Reads existing progress only; never creates, resets or changes a session.
export function readingLinks({position,index,catalog,progress,day,previousDay,resumeEvening=false,selected}){
 const links=[];
 const meta=index?.surahs?.[position?.surah-1];
 if(Number.isInteger(position?.surah)&&position.surah>=1&&position.surah<=114&&Number.isInteger(position.ayah)&&position.ayah>=1&&position.ayah<=meta?.ayahs)
  links.push({kind:'quran',title:'Коран · '+meta.name,detail:'Аят '+position.ayah,href:'#quran?surah='+position.surah+'&ayah='+position.ayah});
 const order=selected==='evening'?['evening','morning']:['morning','evening'];
 for(const group of order){
  const ids=catalog?.groups?.[group]?.ids,items=catalog?.items;
  if(!Array.isArray(ids)||!ids.length||!Array.isArray(items))continue;
  let date=day,p=progress?.days?.[date]?.[group];
  const started=value=>ids.some(id=>Number.isSafeInteger(value?.counts?.[id])&&value.counts[id]>0);
  if(group==='evening'&&resumeEvening&&!started(p)){date=previousDay;p=progress?.days?.[date]?.[group];}
  if(!started(p))continue;
  const targets=ids.map(id=>items.find(item=>item.id===id));
  if(targets.some(item=>!item||!Number.isSafeInteger(item.target)||item.target<1))continue;
  const count=i=>Number.isSafeInteger(p.counts?.[ids[i]])?Math.max(0,p.counts[ids[i]]):0;
  if(targets.every((item,i)=>count(i)>=item.target))continue;
  let cursor=Number.isSafeInteger(p.cursor)&&p.cursor>=0&&p.cursor<ids.length?p.cursor:0;
  if(count(cursor)>=targets[cursor].target)cursor=targets.findIndex((item,i)=>count(i)<item.target);
  const params=new URLSearchParams({group,view:'card',item:ids[cursor]});
  if(date!==day)params.set('day',date);
  links.push({kind:'adhkar',title:group==='morning'?'Утренние азкары':'Вечерние азкары',detail:'Зикр '+(cursor+1)+' из '+ids.length+' · '+Math.min(count(cursor),targets[cursor].target)+' из '+targets[cursor].target,href:'#adhkar?'+params});
 }
 return links;
}
