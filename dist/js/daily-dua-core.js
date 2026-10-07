import{matchesDuaSituation}from './dua-search.js';
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
  if('variants' in item){
   if(!Array.isArray(item.variants)||item.variants.length<2||item.variants.length>8)throw Error('Invalid dua variants');
   const variants=new Set();
   for(const variant of item.variants){
    if(!slug.test(variant.id)||variants.has(variant.id)||['label','arabic','transliteration','translation'].some(key=>!text(variant[key]))||'target' in variant||'count' in variant)throw Error('Invalid dua variant');
    if(!text(variant.source?.label)||!safeDuaSource(variant.source?.url))throw Error('Invalid dua variant source');
    variants.add(variant.id);
   }
  }
  ids.add(item.id);
 }
 return value;
}
export function safeDuaSource(value){
 try{const url=new URL(value),allowed=['sunnah.com','quran.com'].includes(url.hostname)||(url.hostname==='islamqa.org'&&url.pathname==='/hanafi/qibla-hanafi/42476/qunut-in-witr-prayer-5/');return url.protocol==='https:'&&!url.username&&!url.password&&allowed&&!url.search&&!url.hash?url.href:null}catch{return null}
}
export function duaPassage(item,variant){return item.variants?.find(value=>value.id===variant)||item.variants?.[0]||item}
export function cleanDuaFavorites(value,catalogue){const valid=new Set(catalogue.items.map(item=>item.id));return Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&valid.has(id)))]:[]}
const normalize=value=>String(value||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').normalize('NFKC');
export function filterDuas(catalogue,{category='',query='',favoritesOnly=false}={},favorites=[]){
 const words=normalize(query).trim().split(/\s+/).filter(Boolean),saved=new Set(favorites);
 const eligible=catalogue.items.filter(item=>(!category||item.category===category)&&(!favoritesOnly||saved.has(item.id)));
 const content=item=>[item.title,item.occasion,item.keywords,item.translation,item.transliteration,...(item.variants||[]).flatMap(value=>[value.label,value.translation,value.transliteration]),catalogue.categories.find(c=>c.id===item.category)?.name].join(' ');
 const exact=eligible.filter(item=>words.every(word=>normalize(content(item)).includes(word)));
 return exact.length?exact:eligible.filter(item=>matchesDuaSituation(query,[item.title,item.occasion,item.keywords].join(' ')));

}
export function duaRoute(hash,catalogue){
 const params=new URLSearchParams(String(hash).split('?')[1]||'');
 const category=catalogue.categories.some(c=>c.id===params.get('category'))?params.get('category'):'';
 const item=catalogue.items.some(i=>i.id===params.get('item'))?params.get('item'):null;
 const variant=catalogue.items.find(i=>i.id===item)?.variants?.find(v=>v.id===params.get('variant'))?.id;
 return {category,query:(params.get('q')||'').slice(0,120),favoritesOnly:params.get('favorites')==='1',item,...(variant?{variant}:{})};
}
