export const RECITER_FAVORITES_KEY='quran-reciter-favorites';
export function normalizeReciterFavorites(value,reciters){
 const allowed=new Set(reciters.map(r=>r.id));
 return Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&allowed.has(id)))]:[];
}
export function toggleReciterFavorite(value,id,reciters){
 if(!reciters.some(r=>r.id===id))return null;
 const current=normalizeReciterFavorites(value,reciters);
 return current.includes(id)?current.filter(item=>item!==id):[...current,id];
}
