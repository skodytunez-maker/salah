// Verify the live Auth session without rotating its refresh token. The SDK alone
// renews expiring tokens; repeated UI checks must not compete with that renewal.
export function createSessionGuard({getAuth,now=Date.now,interval=30000}){
 let pending=null,checkedToken=null,checkedAt=0;
 const check=async function({force=false}={}){
  if(pending)return pending;
  const task=(async()=>{
   const auth=getAuth();let first;try{first=await auth.getSession();}catch{return{state:'unavailable'};}
   if(first.error)return{state:'unavailable'};
   const current=first.data?.session;if(!current){checkedToken=null;return{state:'signed_out',session:null};}
   if(!force&&current.access_token===checkedToken&&now()-checkedAt<interval)return{state:'valid',session:current};
   let verified;try{verified=await auth.getUser(current.access_token);}catch{return{state:'unavailable'};}
   if(verified.error){
    const error=verified.error,revoked=['refresh_token_not_found','refresh_token_already_used','session_not_found','user_not_found','user_banned','bad_jwt'].includes(error.code)||[401,403].includes(error.status)||/invalid refresh token|refresh token.*not found/i.test(error.message||'');
    if(!revoked)return{state:'unavailable'};
    // A stale refusal cannot clear a newly signed-in account or renewed session.
    let latest;try{latest=await auth.getSession();}catch{return{state:'unavailable'};}
    if(latest.error)return{state:'unavailable'};
    if(latest.data?.session&&latest.data.session.access_token!==current.access_token)return{state:'changed'};
    if(latest.data?.session){try{const result=await auth.signOut({scope:'local'});if(result.error)return{state:'unavailable'};}catch{return{state:'unavailable'};}}
    checkedToken=null;return{state:'revoked',session:null};
   }
   if(!verified.data?.user?.id||verified.data.user.id!==current.user?.id)return{state:'unavailable'};
   let latest;try{latest=await auth.getSession();}catch{return{state:'unavailable'};}
   if(latest.error)return{state:'unavailable'};
   const session=latest.data?.session;if(!session){checkedToken=null;return{state:'signed_out',session:null};}
   if(session.access_token!==current.access_token){
    if(session.user?.id===current.user.id&&session.access_token===checkedToken&&now()-checkedAt<interval)return{state:'valid',session};
    return{state:'changed'};
   }
   checkedToken=session.access_token;checkedAt=now();return{state:'valid',session:{...session,user:verified.data.user}};
  })();pending=task;try{return await task;}finally{if(pending===task)pending=null;}
 };
 // An SDK renewal already checked Auth. This only caches freshness; protected
 // functions still verify identity, the live session and current permissions.
 check.acceptRefresh=session=>{checkedToken=session?.access_token||null;checkedAt=now();};
 return check;
}
