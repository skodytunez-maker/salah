// Refresh the session against Auth so revoked refresh tokens cannot keep the UI signed in.
export function createSessionGuard({getAuth,now=Date.now,interval=30000}){
 let pending=null,checkedToken=null,checkedAt=0,refreshRevision=0;
 const check=async function({force=false}={}){
  if(pending)return pending;
  const task=(async()=>{
   const auth=getAuth();let first;try{first=await auth.getSession();}catch{return{state:'unavailable'};}
   if(first.error)return{state:'unavailable'};
   const current=first.data?.session;if(!current){checkedToken=null;return{state:'signed_out',session:null};}
   if(!force&&current.access_token===checkedToken&&now()-checkedAt<interval)return{state:'valid',session:current};
   const started=refreshRevision;
   let refreshed;try{refreshed=await auth.refreshSession();}catch{return{state:'unavailable'};}
   if(refreshed.error){
    const error=refreshed.error,revoked=['refresh_token_not_found','refresh_token_already_used','session_not_found','user_not_found','user_banned','bad_jwt'].includes(error.code)||[401,403].includes(error.status)||/invalid refresh token|refresh token.*not found/i.test(error.message||'');
    if(!revoked)return{state:'unavailable'};
    // A stale failure must never clear a newly signed-in account or refreshed session.
    let latest;try{latest=await auth.getSession();}catch{return{state:'unavailable'};}
    if(latest.error)return{state:'unavailable'};
    if(latest.data?.session&&latest.data.session.access_token!==current.access_token)return{state:'changed'};
    if(latest.data?.session){try{const result=await auth.signOut({scope:'local'});if(result.error)return{state:'unavailable'};}catch{return{state:'unavailable'};}}
    checkedToken=null;return{state:'revoked',session:null};
   }
   const session=refreshed.data?.session;if(!session){checkedToken=null;return{state:'signed_out',session:null};}
   if(started!==refreshRevision&&checkedToken!==session.access_token){
    // A newer SDK renewal must not be overwritten by an older response.
    let latest;try{latest=await auth.getSession();}catch{return{state:'unavailable'};}
    if(latest.error)return{state:'unavailable'};
    if(latest.data?.session?.access_token===checkedToken&&now()-checkedAt<interval)return{state:'valid',session:latest.data.session};
    return{state:'changed'};
   }
   checkedToken=session.access_token;checkedAt=now();return{state:'valid',session};
  })();pending=task;try{return await task;}finally{if(pending===task)pending=null;}
 };
 // TOKEN_REFRESHED also arrives from other tabs. It already represents an SDK
 // refresh; rotating that fresh token again would broadcast another event and
 // cause every tab to repeat the cycle. This caches freshness only, never access.
 check.acceptRefresh=session=>{refreshRevision++;checkedToken=session?.access_token||null;checkedAt=now();};
 return check;
}
