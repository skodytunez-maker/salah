let sequence=0;
const key='salahPlayerWindow';
// A native Back gesture consumes the player layer before the originating route.
export function createPlayerWindowHistory({dismiss,restore=()=>null,onRestoreFailure=()=>{},win,onChange=()=>{}}){
 const history=win?.history;
 let active=false,suspended=false,pending=false,disposed=false,token=null,url=null,previous=null,destination=null;
 const owns=()=>!!token&&history?.state?.[key]===token&&win.location?.href===url;
 const strip=()=>{if(history?.state?.[key]){const state={...history.state};delete state[key];try{history.replaceState(state,'');}catch{}}};
 strip();
 const push=()=>{
  url=win?.location?.href;previous=history?.state;token='player-'+(++sequence);
  if(!history?.pushState||!url)return;
  try{history.pushState({...previous,[key]:token},'',url);}catch{token=null;}
  onChange();
 };
 const pop=()=>{
  if(disposed)return;
  if(pending){
   pending=false;
   if(destination){
    const next=destination;destination=null;
    if(active){active=false;dismiss();}
    try{history.pushState(next.state,'',next.url);}catch{try{history.replaceState(next.state,'',next.url);}catch{}}
   }else if(active){if(win.location?.href===url)push();else{active=false;dismiss();}}
  }else if(suspended&&owns()){
   suspended=false;
   active=true;
   const result=restore();
   if(result!==true){
    active=false;
    strip();
    if(result===false)onRestoreFailure();
   }
  }else if(active&&!owns()){active=false;dismiss();}
  else if(!active)strip();
  onChange();
 };
 const route=()=>{
  if(disposed)return;
  if(pending&&win.location?.href!==url)destination={url:win.location.href,state:history?.state};
  else if(active&&!owns()){active=false;dismiss();}
 };
 win?.addEventListener?.('popstate',pop);
 win?.addEventListener?.('hashchange',route);win?.addEventListener?.('salah:route-history',route);
 return{
  open(){if(disposed||active)return;suspended=false;active=true;if(!pending)push();},
  openReciterList(hash){
   if(disposed||!active||!owns())return false;
   // Retain the player entry as the list's immediate Back destination.
   suspended=true;
   active=false;
   try{
    if(win.location.hash===hash)history.pushState({},'',url);
    else win.location.hash=hash;
   }catch{suspended=false;active=true;return false;}
   dismiss();
   onChange();
   return true;
  },
  close(){
   if(disposed||!active)return;active=false;
   if(owns()&&!pending){pending=true;destination=null;try{history.back();}catch{pending=false;strip();}}
   onChange();
  },
  destroy(){if(disposed)return;disposed=true;active=false;win?.removeEventListener?.('popstate',pop);win?.removeEventListener?.('hashchange',route);win?.removeEventListener?.('salah:route-history',route);if(owns())strip();}
 };
}
