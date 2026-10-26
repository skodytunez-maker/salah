import{NATIVE_BOOK_ID,NATIVE_UNIT_IDS}from './owner-native-progress.js';
const key='salah:owner-native-course-cache-v1',stamp='muallim-native-402';
const str=(v,max=2000)=>typeof v==='string'&&v.length>0&&v.length<=max;
const keys=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const strings=(v,count,max=2000)=>Array.isArray(v)&&v.length<=count&&v.every(x=>str(x,max));
const ids=new Set(NATIVE_UNIT_IDS);
export function validNativeCurriculum(v){
 if(!keys(v,['bookId','units','blocks'])||v.bookId!==NATIVE_BOOK_ID||!Array.isArray(v.units)||v.units.map(u=>u?.id).join()!==NATIVE_UNIT_IDS.join()||!Array.isArray(v.blocks)||v.blocks.length>8)return false;
 for(let index=0;index<v.units.length;index++){
  const u=v.units[index];
  if(!keys(u,['id','index','title','goal','page','block','glyph','forms','explanation','examples','practice','questions','rows'])||u.index!==index||!str(u.title,160)||!str(u.goal,500)||!Number.isInteger(u.page)||u.page<1||u.page>88||!['letters','rules'].includes(u.block)||!strings(u.explanation,16)||!strings(u.practice,16))return false;
  if(u.glyph!==undefined&&!str(u.glyph,16)||u.forms!==undefined&&!strings(u.forms,6,80)||u.examples!==undefined&&!strings(u.examples,64,500))return false;
  if(!Array.isArray(u.rows)||!u.rows.length||u.rows.length>32||u.rows.some(r=>!keys(r,['title','instruction','tokens'])||!str(r.title,160)||!str(r.instruction)||!strings(r.tokens,40,800)||!r.tokens.length))return false;
  if(!Array.isArray(u.questions)||u.questions.length<6||u.questions.length>48)return false;
  for(const q of u.questions)if(!keys(q,['id','prompt','choices','answer','why','kind'])||!str(q.id,120)||!/^[a-z0-9-]+$/.test(q.id)||!str(q.prompt,1000)||!strings(q.choices,3,1000)||q.choices.length!==3||new Set(q.choices).size!==3||!Number.isInteger(q.answer)||q.answer<0||q.answer>2||!str(q.why)||q.kind!==undefined&&!['theory','reading'].includes(q.kind))return false;
 }
 const all=[];for(const b of v.blocks){if(!keys(b,['id','title','detail','ids'])||!str(b.id,64)||!str(b.title,160)||!str(b.detail,500)||!Array.isArray(b.ids)||!b.ids.length||b.ids.some(id=>!ids.has(id)))return false;all.push(...b.ids);}
 return all.length===NATIVE_UNIT_IDS.length&&new Set(all).size===NATIVE_UNIT_IDS.length;
}
export function createOwnerCourseCache({storage=()=>localStorage,ownerId,now=Date.now}){
 const clear=()=>{try{storage().removeItem(key);}catch{}};
 return{clear,read(){const owner=ownerId();if(!owner)return null;try{const raw=storage().getItem(key);if(!raw)return null;if(raw.length>800000){clear();return null;}const c=JSON.parse(raw);if(!keys(c,['version','stamp','owner','savedAt','data'])||c.version!==1||c.stamp!==stamp||c.owner!==owner||!Number.isSafeInteger(c.savedAt)||c.savedAt>now()+60000||now()-c.savedAt>7*86400000||!validNativeCurriculum(c.data)){clear();return null;}return c.data;}catch{clear();return null;}},
 write(data){const owner=ownerId();if(!owner||!validNativeCurriculum(data))return false;try{const value=JSON.stringify({version:1,stamp,owner,savedAt:now(),data});if(value.length>800000)return false;storage().setItem(key,value);return true;}catch{return false;}}};
}
