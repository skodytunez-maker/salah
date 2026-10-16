import{ownerUserDetails,ownerUserAvatar}from './owner-auth.js';

// Keep a single private profile in memory. Late results cannot cross profiles
// or survive closing the cabinet. Blob URLs are revoked on every replacement.
export function createOwnerUserDetail({load=ownerUserDetails,loadAvatar=ownerUserAvatar,onChange=()=>{},isActive=()=>true,createUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url)}={}){
 let id=null,generation=0,details=null,avatarUrl=null,loading=false,error='',disposed=false;
 const emit=()=>{if(!disposed&&isActive())onChange({details,avatarUrl,loading,error});};
 const clearAvatar=()=>{if(avatarUrl)revokeUrl(avatarUrl);avatarUrl=null;};
 const current=(version,selected)=>!disposed&&isActive()&&version===generation&&id===selected;
 const refresh=async()=>{
  if(!id||disposed||!isActive())return;
  const selected=id,version=++generation;loading=true;error='';emit();
  try{
   const value=await load(selected);if(!current(version,selected))return;
   if(value?.id!==selected)throw Error('Профиль недоступен.');
   details=value;if(!value.hasAvatar)clearAvatar();emit();
   if(value.hasAvatar){try{const blob=await loadAvatar(selected);if(!current(version,selected))return;const next=createUrl(blob);clearAvatar();avatarUrl=next;}catch{if(current(version,selected)){clearAvatar();error='Фото временно недоступно.';}}}
  }catch{if(current(version,selected))error='Не удалось загрузить статистику и награды. Нажмите «Обновить».';}
  finally{if(current(version,selected)){loading=false;emit();}}
 };
 return{select(userId){generation++;clearAvatar();id=userId;details=null;error='';return refresh();},refresh,reset(){generation++;id=null;details=null;loading=false;error='';clearAvatar();},dispose(){this.reset();disposed=true;}};
}
