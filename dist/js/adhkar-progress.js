const GROUPS=new Set(['morning','evening','all','favorites']);
const KEY='salah:adhkar-progress-v2';
const cleanCount=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(Number(value)))):0;
const add=(a,b)=>Math.min(Number.MAX_SAFE_INTEGER,a+b);

// Daily progress and lifetime totals are committed together. Existing groups are
// independent sessions; an item has one lifetime total across all those sessions.
export function createAdhkarProgressStore({storage,day,locks=()=>null}){
  let targets=new Map();
  const empty=()=>({version:2,totals:{},days:{}});
  function normalizeProgress(value={}){
    const counts={};
    for(const [id,target] of targets)if(value?.counts&&Object.hasOwn(value.counts,id))
      counts[id]=Math.min(target,cleanCount(value.counts[id]));
    return {cursor:cleanCount(value?.cursor),counts};
  }
  function normalizeDocument(value){
    const doc=empty();
    for(const id of targets.keys())doc.totals[id]=cleanCount(value.totals?.[id]);
    for(const [date,groups] of Object.entries(value.days||{})){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!groups||typeof groups!=='object')continue;
      doc.days[date]={};
      for(const group of GROUPS)if(Object.hasOwn(groups,group))doc.days[date][group]=normalizeProgress(groups[group]);
    }
    return doc;
  }
  function load(){
    try{
      const backend=storage(),raw=backend.getItem(KEY);
      if(raw){
        const value=JSON.parse(raw);
        if(!value||value.version!==2||!value.totals||!value.days)return null;
        return {backend,doc:normalizeDocument(value),saved:true};
      }
      const doc=empty();
      for(let index=0;index<backend.length;index++){
        const key=backend.key(index),match=/^salah:adhkar:(\d{4}-\d{2}-\d{2}):(morning|evening|all|favorites)$/.exec(key||'');
        if(!match)continue;
        let value;try{value=JSON.parse(backend.getItem(key))}catch{continue}
        const progress=normalizeProgress(value),date=match[1],group=match[2];
        if(!doc.days[date])doc.days[date]={};
        doc.days[date][group]=progress;
        for(const [id,count] of Object.entries(progress.counts))doc.totals[id]=add(doc.totals[id]||0,count);
      }
      return {backend,doc,saved:false};
    }catch{return null}
  }
  function commit(loaded){
    try{loaded.backend.setItem(KEY,JSON.stringify(loaded.doc));return true}catch{return false}
  }
  function snapshot(doc,date,group){
    return {_day:date,...normalizeProgress(doc.days[date]?.[group])};
  }
  function valid(group){return GROUPS.has(group)}
  function mutate(group,id,delta){
    const date=day(),loaded=load();
    if(!loaded||!valid(group)||!targets.has(id))return {ok:false,changed:false};
    const {doc}=loaded,p=snapshot(doc,date,group),amount=p.counts[id]||0,target=targets.get(id);
    if(delta>0&&(amount>=target||(doc.totals[id]||0)>=Number.MAX_SAFE_INTEGER)||delta<0&&amount===0)
      return {ok:true,changed:false,progress:p,total:doc.totals[id]||0};
    p.counts[id]=amount+delta;
    if(!doc.days[date])doc.days[date]={};
    doc.days[date][group]=normalizeProgress(p);
    doc.totals[id]=delta>0?add(doc.totals[id]||0,1):Math.max(0,(doc.totals[id]||0)-1);
    if(!commit(loaded))return {ok:false,changed:false};
    return {ok:true,changed:true,progress:p,total:doc.totals[id]};
  }
  async function change(group,id,delta){
    let manager;try{manager=locks()}catch{}
    if(manager?.request){
      try{return await manager.request(KEY,()=>mutate(group,id,delta))}catch{return {ok:false,changed:false}}
    }
    return mutate(group,id,delta);
  }
  return {
    configure(items){
      targets=new Map(items.filter(i=>typeof i.id==='string'&&/^[\w-]+$/.test(i.id)&&Number.isSafeInteger(i.target)&&i.target>0).map(i=>[i.id,i.target]));
      const loaded=load();return !!loaded&&(loaded.saved||commit(loaded));
    },
    progress(group){const date=day(),loaded=load();return snapshot(loaded?.doc||empty(),date,group)},
    total(id){return load()?.doc.totals[id]||0},
    totals(){return load()?.doc.totals||{}},
    save(group,progress){
      const date=progress._day||day(),loaded=load();
      if(!loaded||!valid(group)||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
      if(!loaded.doc.days[date])loaded.doc.days[date]={};
      loaded.doc.days[date][group]=normalizeProgress(progress);return commit(loaded);
    },
    increment:(group,id)=>change(group,id,1),
    undo:(group,id)=>change(group,id,-1)
  };
}
