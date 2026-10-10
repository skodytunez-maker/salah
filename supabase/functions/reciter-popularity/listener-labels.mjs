
export function publicListenerRows(rows){
 const eligible=rows.filter(p=>p&&['initial','profile'].includes(p.mode)),letterUsers=new Map();
 for(const row of eligible)if(row.mode==='initial'||!row.has_photo){const first=String(row.initial||'С');if(!letterUsers.has(first))letterUsers.set(first,new Set());letterUsers.get(first).add(row.id);}
 return eligible.map(p=>{
  const first=String(p.initial||'С'),duplicate=(letterUsers.get(first)?.size||0)>1;
  const label=p.mode==='initial'&&duplicate?Array.from(String(p.prefix||first)).slice(0,2).join(''):first;
  return {reciter:p.reciter,id:p.id,mode:p.mode,initial:label,...(p.mode==='profile'?{nickname:p.nickname,hasPhoto:p.has_photo===true}:{})};
 });
}
