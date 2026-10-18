// A small ready-page window. The original verified layout and Arabic sources are unchanged.
export function createMushafPages(load,{limit=5,ready=()=>true}={}){
 const pages=new Map(),pending=new Map();let disposed=false;
 const key=(page,edition)=>edition+':'+page;
 const valid=page=>Number.isInteger(page)&&page>=1&&page<=604;
 function peek(page,edition){const k=key(page,edition),value=pages.get(k);if(!value||!ready(value,page,edition)){pages.delete(k);return null;}pages.delete(k);pages.set(k,value);return value;}
 function prepare(page,edition){
  if(disposed||!valid(page))return Promise.reject(Error('Такой страницы нет'));
  const cached=peek(page,edition);if(cached)return Promise.resolve(cached);
  const k=key(page,edition);if(pending.has(k))return pending.get(k);
  const task=Promise.resolve().then(()=>load(page,edition)).then(value=>{if(!disposed){pages.set(k,value);while(pages.size>limit)pages.delete(pages.keys().next().value);}return value;}).finally(()=>pending.delete(k));pending.set(k,task);return task;
 }
 async function neighbors(page,edition,current=()=>true){for(const offset of [1,-1,2,-2]){if(disposed||!current())return;const target=page+offset;if(valid(target))try{await prepare(target,edition);}catch{/* A failed speculative load must not interrupt reading. */}}}
 return{peek,prepare,neighbors,dispose(){disposed=true;pages.clear();},get size(){return pages.size;}};
}
