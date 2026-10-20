import{UUID}from './engine.mjs';
const ORIGINS=new Set(['https://skodytunez-maker.github.io']);
async function boundedJson(req){
 if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))throw Error('invalid_body');
 const reader=req.body?.getReader();if(!reader)throw Error('invalid_body');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192)throw Error('invalid_body');chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function sameSecret(a,b){
 if(!b||b.length<32||!a)return false;
 const hash=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)));
 const [x,y]=await Promise.all([hash(a),hash(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
}
export function createTestHandler({engine,verify,allowUsers=[],runnerSecret,findOperation}){
 return async req=>{
  const origin=req.headers.get('origin'),path=new URL(req.url).pathname.split('/').at(-1);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});
  const reply=(code,data)=>new Response(JSON.stringify(data),{status:code,headers});
  if(origin&&!ORIGINS.has(origin))return reply(403,{error:'forbidden'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!engine)return reply(503,{error:'test_configuration_required',paymentEnabled:false,testPaymentEnabled:false});
  try{
   if(path==='webhook'){
    if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
    const body=await boundedJson(req);
    if(body?.type!=='notification'||!['payment.succeeded','payment.canceled','payment.waiting_for_capture'].includes(body.event)||!UUID.test(body.object?.id||'')||!UUID.test(body.object?.metadata?.salah_test_operation||''))return reply(400,{error:'invalid_body'});
    const operation=body.object.metadata.salah_test_operation,user=await findOperation(operation);
    if(user&&allowUsers.includes(user))await engine.webhook(user,operation,body.object.id);
    return reply(200,{received:true});
   }
   if(path==='renew'){
    if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
    if(!await sameSecret(req.headers.get('authorization')?.replace(/^Bearer /,''),runnerSecret))return reply(401,{error:'unauthorized'});
    const results=[];for(const id of allowUsers){try{await engine.renew(id);results.push({ok:true});}catch{results.push({ok:false});}}
    return reply(200,{environment:'test',results});
   }
   if(!['GET','POST'].includes(req.method))return reply(405,{error:'method_not_allowed'});
   if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
   const token=req.headers.get('authorization')||'';
   if(!/^Bearer [A-Za-z0-9_.-]{16,8192}$/.test(token))return reply(401,{error:'sign_in_required'});
   const user=await verify(token.slice(7));
   if(!user||!UUID.test(user.id)||!allowUsers.includes(user.id))return reply(403,{error:'test_account_required'});
   if(req.method==='GET')return reply(200,await engine.read(user.id));
   const body=await boundedJson(req);
   if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'invalid_body'});
   if(body.action==='checkout'&&Object.keys(body).sort().join(',')==='action,amount,consent,termsVersion')return reply(200,await engine.checkout(user.id,body));
   if(Object.keys(body).length!==1||!['unlink','reconcile'].includes(body.action))return reply(400,{error:'invalid_action'});
   return reply(200,await engine[body.action](user.id));
  }catch(error){
   const inputErrors=['invalid_body','invalid_amount','consent_required','invalid_action'];
   const conflicts=['already_active','payment_in_progress','sandbox_ledger_limit'];
   const code=inputErrors.includes(error.message)?400:conflicts.includes(error.message)?409:503;
   return reply(code,{error:code===503?'temporarily_unavailable':error.message});
  }
 };
}
