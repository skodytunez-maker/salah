const KEY='salah:guest-device-v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// A random installation ID, never a fingerprint or an anonymous Auth account.
export function createGuestPresence({storage,randomUUID,identity,visible,online,send,now=Date.now}){
 let busy=false,lastSuccess=-Infinity,nextAttempt=0,disposed=false;
 const eligible=()=>{const s=identity();return !disposed&&visible()&&online()&&s.identityKnown===true&&!s.signedIn&&!s.userId&&s.reason!=='auth_unavailable';};
 const tick=async()=>{
  if(busy||!eligible()||now()<nextAttempt||now()-lastSuccess<30*60000)return false;
  busy=true;
  try{
   let id=storage.getItem(KEY);
   if(!UUID.test(id||'')){id=randomUUID();if(!UUID.test(id))return false;storage.setItem(KEY,id);id=storage.getItem(KEY);if(!UUID.test(id||''))return false;}
   if(!eligible())return false;
   nextAttempt=now()+60000;
   if(await send(id)===true){lastSuccess=now();return true;}
  }catch{}finally{busy=false;}
  return false;
 };
 return{tick,dispose(){disposed=true;}};
}
