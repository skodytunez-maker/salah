const PROJECT='salah-8b73f';
const TOKEN_URL='https://oauth2.googleapis.com/token';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const base64url=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const json64=value=>base64url(new TextEncoder().encode(JSON.stringify(value)));
export function firebaseSupportPayload(device,event,now){
 const at=Number(event?.at);
 if(!UUID.test(device?.user_id||'')||typeof device.token!=='string'||device.token.length<100||device.token.length>4096||!/^[-\w:.]+$/.test(device.token)||!UUID.test(event?.messageId||'')||!UUID.test(event.thread||'')||!Number.isFinite(at)||at>now||now-at>=86400000)throw Error('invalid_firebase_support_event');
 const expires=Math.floor(at+86400000);
 return {message:{token:device.token,data:{kind:'support',thread:event.thread,message:event.messageId,user:device.user_id,expires:String(expires)},android:{priority:'high',ttl:Math.max(1,Math.floor((expires-now)/1000))+'s'}}};
}
export function createFirebaseSupportSender({credential,fetcher=fetch,clock=Date.now}){
 if(credential?.type!=='service_account'||credential.project_id!==PROJECT||!new RegExp('^[\\w-]+@'+PROJECT+'\\.iam\\.gserviceaccount\\.com$').test(credential.client_email||'')||credential.token_uri!==TOKEN_URL||typeof credential.private_key!=='string'||credential.private_key.length>12000||!credential.private_key.startsWith('-----BEGIN PRIVATE KEY-----'))throw Error('invalid_firebase_sender_configuration');
 let cached=null,pending=null;
 async function access(){
  if(cached&&cached.until>clock())return cached.token;
  if(pending)return pending;
  pending=(async()=>{
   const raw=atob(credential.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,''));
   const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(raw,c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
   const now=Math.floor(clock()/1000),head=json64({alg:'RS256',typ:'JWT'}),claims=json64({iss:credential.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:TOKEN_URL,iat:now,exp:now+3600});
   const unsigned=head+'.'+claims,signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned));
   const response=await fetcher(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+base64url(signature)}),redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('firebase_sender_auth_unavailable');
   const value=await response.json();if(typeof value.access_token!=='string'||value.access_token.length>8192||!Number.isFinite(value.expires_in)||value.expires_in<120)throw Error('firebase_sender_auth_unavailable');
   cached={token:value.access_token,until:clock()+(Math.min(value.expires_in,3600)-60)*1000};return cached.token;
  })();try{return await pending}finally{pending=null}
 }
 return async(device,event)=>{
  try{
   const payload=firebaseSupportPayload(device,event,clock()),token=await access();
   const response=await fetcher('https://fcm.googleapis.com/v1/projects/'+PROJECT+'/messages:send',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(8000)});
   if(response.ok)return 'sent';if(response.status===401)cached=null;
   const value=await response.json().catch(()=>null);
   if(value?.error?.details?.some(detail=>detail.errorCode==='UNREGISTERED'))return 'expired';
   return 'retry';
  }catch{return 'retry';}
 };
}
