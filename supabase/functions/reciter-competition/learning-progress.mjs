import{ADHKAR_TARGETS}from './learning-catalog.mjs';
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function learningPacket(body,now=Date.now()){
 const max=new Date(now+86400000).toISOString().slice(0,10),day=x=>date(x)&&x>='2026-11-01'&&x<=max;
 if(!object(body)||Object.keys(body).some(k=>!['action','pages','rounds'].includes(k))||body.action!=='learning-progress'||!Array.isArray(body.pages)||body.pages.length>32||!Array.isArray(body.rounds)||body.rounds.length>4||!body.pages.length&&!body.rounds.length)throw Error('invalid_progress');
 const pages=body.pages.map(x=>{if(!object(x)||Object.keys(x).some(k=>!['page','day'].includes(k))||!Number.isInteger(x.page)||x.page<1||x.page>604||!day(x.day))throw Error('invalid_progress');return{page:x.page,day:x.day};});
 const rounds=body.rounds.map(x=>{const targets=typeof x?.group==='string'&&Object.hasOwn(ADHKAR_TARGETS,x.group)?ADHKAR_TARGETS[x.group]:null;if(!object(x)||Object.keys(x).some(k=>!['group','day','counts'].includes(k))||!targets||!day(x.day)||!object(x.counts)||Object.keys(x.counts).length!==Object.keys(targets).length||!Object.entries(targets).every(([id,n])=>x.counts[id]===n))throw Error('invalid_progress');return{group:x.group,day:x.day};});
 return{pages,rounds};
}
