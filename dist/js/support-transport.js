const ENDPOINT='https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/support-messages';
const KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
export function createSupportRpc(auth,{fetcher=(...args)=>fetch(...args)}={}){
 return(name,args)=>({abortSignal:async signal=>{
  const session=await auth.auth.getSession();if(signal.aborted)throw signal.reason;if(session.error||!session.data?.session?.access_token)return{data:null,error:{code:'42501'}};
  const response=await fetcher(ENDPOINT,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({name,args}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal});
  const value=await response.json();if(!response.ok)return{data:null,error:{code:value.error,message:value.error}};
  return{data:value.data,error:null};
 }});
}
