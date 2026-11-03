import{ADHKAR_TARGETS,JUZ_PAGES}from './learning-awards-catalog.js';
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(x);
export const readingPage=x=>Number.isInteger(x)&&x>=1&&x<=604;
export const learningDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
export function completeAdhkarRound(group,progress){const targets=Object.hasOwn(ADHKAR_TARGETS,group)?ADHKAR_TARGETS[group]:null;if(!targets||!learningDay(progress?._day))return null;return Object.entries(targets).every(([id,n])=>progress.counts?.[id]===n)?{group,day:progress._day,counts:{...targets}}:null;}
export function completedJuz(pages){const set=new Set(pages.filter(readingPage));return JUZ_PAGES.filter(j=>Array.from({length:j.last-j.first+1},(_,i)=>j.first+i).every(p=>set.has(p))).map(j=>j.juz);}
// Only explicit, account-bound actions enter this queue. Bookmarks and viewing
// checkpoints never do. Confirmations are permanent and merge across devices.
export function createLearningProgress({storage}){
 const key=id=>'salah:learning-progress:v1:'+id;
 function load(id){if(!uuid(id))return null;try{const raw=storage.getItem(key(id)),v=raw?JSON.parse(raw):{version:1,pages:[],rounds:[],pendingPages:[],pendingRounds:[]};if(v?.version!==1||!['pages','rounds','pendingPages','pendingRounds'].every(k=>Array.isArray(v[k])))return null;return v;}catch{return null;}}
 const save=(id,v)=>{try{storage.setItem(key(id),JSON.stringify(v));return true;}catch{return false;}};
 return{
  hasPage(id,page){return load(id)?.pages.includes(page)===true;},
  markPage(id,page,day){const v=load(id);if(!v||!readingPage(page)||!learningDay(day))return false;if(v.pages.includes(page))return true;v.pages.push(page);v.pendingPages.push({page,day});return save(id,v);},
  markRound(id,round){const v=load(id),r=completeAdhkarRound(round?.group,{_day:round?.day,counts:round?.counts});if(!v||!r)return false;const k=r.day+':'+r.group;if(v.rounds.includes(k))return true;if(v.pendingRounds.length>=256)return false;v.rounds.push(k);v.pendingRounds.push(r);return save(id,v);},
  pending(id){const v=load(id);return{pages:(v?.pendingPages||[]).slice(0,32),rounds:(v?.pendingRounds||[]).slice(0,4)};},
  acknowledge(id,packet){const v=load(id);if(!v)return false;const pages=new Set(packet.pages.map(x=>x.page)),rounds=new Set(packet.rounds.map(x=>x.day+':'+x.group));v.pendingPages=v.pendingPages.filter(x=>!pages.has(x.page));v.pendingRounds=v.pendingRounds.filter(x=>!rounds.has(x.day+':'+x.group));return save(id,v);},
  merge(id,state){const v=load(id);if(!v||!Array.isArray(state?.pages)||state.pages.length>604||!state.pages.every(readingPage))return false;v.pages=[...new Set([...v.pages,...state.pages])].sort((a,b)=>a-b);return save(id,v);}
 };
}
