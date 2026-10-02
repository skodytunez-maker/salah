const slug=/^[a-z][a-z0-9-]{0,63}$/;
const text=value=>typeof value==='string'&&value.trim().length>0;
export function validateDuaCatalogue(value){
 if(!value||value.version!==1||!Array.isArray(value.categories)||!Array.isArray(value.items)||!value.items.length)throw Error('Invalid dua catalogue');
 const categories=new Set(),ids=new Set();
 for(const category of value.categories){if(!slug.test(category.id)||!text(category.name)||categories.has(category.id))throw Error('Invalid dua category');categories.add(category.id)}
 for(const item of value.items){
  if(!slug.test(item.id)||ids.has(item.id)||!categories.has(item.category)||['title','occasion','arabic','transliteration','translation'].some(key=>!text(item[key])))throw Error('Invalid dua');
  if('target' in item||'count' in item)throw Error('Everyday duas have no repetition counter');
  if(!text(item.source?.label)||!safeDuaSource(item.source?.url))throw Error('Invalid dua source');
  ids.add(item.id);
 }
 return value;
}
export function safeDuaSource(value){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&['sunnah.com','quran.com'].includes(url.hostname)&&!url.search&&!url.hash?url.href:null}catch{return null}
}
export function cleanDuaFavorites(value,catalogue){const valid=new Set(catalogue.items.map(item=>item.id));return Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&valid.has(id)))]:[]}
const normalize=value=>String(value||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').normalize('NFKC');
export function filterDuas(catalogue,{category='',query='',favoritesOnly=false}={},favorites=[]){
 const words=normalize(query).trim().split(/\s+/).filter(Boolean),saved=new Set(favorites);
 return catalogue.items.filter(item=>(!category||item.category===category)&&(!favoritesOnly||saved.has(item.id))&&words.every(word=>normalize([item.title,item.occasion,item.keywords,item.translation,item.transliteration,catalogue.categories.find(c=>c.id===item.category)?.name].join(' ')).includes(word)));
}
export function duaRoute(hash,catalogue){
 const params=new URLSearchParams(String(hash).split('?')[1]||'');
 const category=catalogue.categories.some(c=>c.id===params.get('category'))?params.get('category'):'';
 const item=catalogue.items.some(i=>i.id===params.get('item'))?params.get('item'):null;
 return {category,query:(params.get('q')||'').slice(0,120),favoritesOnly:params.get('favorites')==='1',item};
}
