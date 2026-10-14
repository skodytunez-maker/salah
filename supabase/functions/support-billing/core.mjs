const ORIGINS=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function subscriptionView(row){
 if(!row)return {status:'none',paymentEnabled:false};
 const status=['pending','active','cancelled'].includes(row.status)?row.status:'none';
 const date=v=>v&&Number.isFinite(Date.parse(String(v)))?new Date(v).toISOString():null;
 return {status,amount:Number.isSafeInteger(row.amount_rub)&&row.amount_rub>=150?row.amount_rub:null,startedAt:date(row.started_at),nextChargeAt:status==='active'?date(row.next_charge_at):null,cancelledAt:date(row.cancelled_at),method:status!=='cancelled'&&row.method_type?{type:['bank_card','sbp','sberbank','tinkoff_bank','yoo_money','alfabank'].includes(row.method_type)?row.method_type:'other',last4:/^[0-9]{4}$/.test(row.card_last4||'')?row.card_last4:null}:null,paymentEnabled:false};
}
export function createBillingHandler({verify,readOwn,unlinkOwn}){
 return async req=>{
  const origin=req.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!ORIGINS.has(origin))return reply(403,{error:'forbidden'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(req.method))return reply(405,{error:'method_not_allowed'});
  if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
  const bearer=req.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9_.-]{16,8192}$/.test(bearer))return reply(401,{error:'sign_in_required'});
  try{
   const user=await verify(bearer.slice(7));if(!user||!UUID.test(user.id))return reply(401,{error:'invalid_session'});
   if(req.method==='GET')return reply(200,subscriptionView(await readOwn(user.id)));
   if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return reply(415,{error:'json_required'});
   if(Number(req.headers.get('content-length')||0)>1024)return reply(413,{error:'body_too_large'});
   const text=await req.text();if(text.length>1024)return reply(413,{error:'body_too_large'});
   let body;try{body=JSON.parse(text);}catch{return reply(400,{error:'invalid_body'});}
   if(!body||body.action!=='unlink'||Object.keys(body).length!==1)return reply(400,{error:'invalid_action'});
   const row=await unlinkOwn(user.id);
   if(row&&row.status!=='cancelled')return reply(503,{error:'unlink_not_confirmed'});
   return reply(200,{...subscriptionView(row),unlinked:true});
  }catch{return reply(503,{error:'temporarily_unavailable'});}
 };
}
