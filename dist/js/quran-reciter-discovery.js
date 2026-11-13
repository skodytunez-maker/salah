// Dates are the actual first public deliveries; later app updates do not reset them.
export const RECITER_ADDED_AT={
  "ar.islamsobhi": "2026-10-17T10:52:50.953Z",
  "ar.abdulrahmanalawsi": "2026-10-17T10:52:50.953Z",
  "ar.saadalghamdi": "2026-10-17T10:52:50.953Z",
  "ar.ahmadalajmi": "2026-10-17T10:52:50.953Z",
  "ar.faresabbad": "2026-10-17T10:52:50.953Z",
  "ar.ahmadalnufais": "2026-10-17T12:25:43.953Z",
  "ar.khalidaljalil": "2026-10-17T12:25:43.953Z",
  "ar.wadeealyamani": "2026-10-17T12:25:43.953Z",
  "ar.abdullahkamel": "2026-10-17T12:25:43.953Z",
  "ar.haniarrifai": "2026-10-17T12:25:43.953Z",
  "ar.alijaber": "2026-10-17T12:25:43.953Z",
  "ar.muhammadayyub": "2026-10-17T12:25:43.953Z",
  "ar.salahbukhatir": "2026-10-17T12:25:43.953Z"
,"ar.peshawaalkurdi": "2026-10-29T00:00:00.000Z",
"ar.muhammadalfaqih": "2026-10-29T00:00:00.000Z",
"ar.fahadalkandari": "2026-10-29T00:00:00.000Z",
"ar.noreensiddiq": "2026-10-29T00:00:00.000Z",
"ar.muhammadjibreel": "2026-10-29T00:00:00.000Z",
"ar.mustafaismail": "2026-10-29T00:00:00.000Z",
"ar.mahmoudalbanna": "2026-10-29T00:00:00.000Z",
"ar.muhammadaltablawi": "2026-10-29T00:00:00.000Z",
"ar.ahmadtalib":"2026-11-05T00:00:00.000Z",
"ar.muhammaddibirov":"2026-11-05T00:00:00.000Z",
"ar.kamilsamigullin":"2026-11-05T00:00:00.000Z",
"ar.alijonqori":"2026-11-05T00:00:00.000Z",
"ar.jahongirnematov":"2026-11-05T00:00:00.000Z"
};
export const RECITER_PROMOTION_MS=7*86400000;
export const RECITER_RECENT_MS=7*86400000;
function addedAt(reciter){
 const value=RECITER_ADDED_AT[reciter?.id]??reciter?.addedAt;
 if(typeof value!=='string')return null;
 const time=Date.parse(value);return Number.isFinite(time)&&new Date(time).toISOString()===value?time:null;
}
function within(reciter,now,window){const time=addedAt(reciter);return !reciter?.variantOf&&Number.isFinite(now)&&time!==null&&time<=now&&now-time<window;}
export const reciterIsPromoted=(reciter,now=Date.now())=>within(reciter,now,RECITER_PROMOTION_MS);
export function recentReciters(reciters,now=Date.now()){return reciters.filter(r=>within(r,now,RECITER_RECENT_MS)).sort((a,b)=>addedAt(b)-addedAt(a));}
export function orderReciterCatalog(reciters,favorites=[],now=Date.now()){
 const listed=reciters.filter(r=>!r.variantOf),byId=new Map(listed.map(r=>[r.id,r])),saved=[...new Set(favorites)].filter(id=>byId.has(id)),selected=new Set(saved),others=listed.filter(r=>!selected.has(r.id));
 return [...saved.map(id=>byId.get(id)),...others.filter(r=>reciterIsPromoted(r,now)).sort((a,b)=>addedAt(b)-addedAt(a)),...others.filter(r=>!reciterIsPromoted(r,now))];
}
export function reciterFilterTabs(active,favoriteCount,reciters,now=Date.now()){
 const all=reciters.filter(r=>!r.variantOf).length,saved=Number.isSafeInteger(favoriteCount)&&favoriteCount>=0?Math.min(favoriteCount,all):0;
 const fresh=recentReciters(reciters,now).length,current=active==='new'&&!fresh?'all':active;
 const links=[['all','#quran?view=reciters','Все '+all],...(fresh?[['new','#quran?view=reciters&filter=new','Новые '+fresh]]:[]),['favorites','#quran?view=reciters&filter=favorites','Избранные '+saved],['ruqyah','#quran?view=reciters&filter=ruqyah','Рукъя']];
 return '<nav class="reciter-filter-tabs reciter-catalog-filter-tabs" data-has-new="'+Boolean(fresh)+'" aria-label="Каталог чтецов">'+links.map(([key,href,label])=>'<a href="'+href+'" aria-current="'+(current===key?'page':'false')+'">'+label+'</a>').join('')+'</nav>';
}
