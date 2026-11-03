import {RETURN_DAYS,RETURN_UUID,returnText} from '../../../dist/js/owner-return-core.js';
const OWNER='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7',PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const ORIGINS=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
const count=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):0;
export function safeReturnCampaign(row){
 if(!row||!RETURN_UUID.test(row.id||'')||!['draft','queued','complete','cancelled','expired'].includes(row.state))throw Error('invalid_campaign');
 return{id:row.id,state:row.state,days:RETURN_DAYS.includes(row.days)?row.days:7,body:returnText(row.body)||'',inactive:count(row.inactive),reachable:count(row.reachable),queued:count(row.queued),sent:count(row.sent),skipped:count(row.skipped),failed:count(row.failed),quiet:count(row.quiet),expiresAt:Number.isFinite(Date.parse(row.expiresAt))?new Date(row.expiresAt).toISOString():null};
}
export function createOwnerReminderHandler({getUser,getClaims,isSessionActive,request}){return async req=>{
 const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Pragma':'no-cache','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
 const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!ORIGINS.has(origin))return reply(403,{error:'forbidden'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST'||new URL(req.url).search)return reply(405,{error:'method_not_allowed'});
 const bearer=req.headers.get('Authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(bearer))return reply(401,{error:'sign_in_required'});
 if(!req.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,{error:'json_required'});
 let input;
 try{const reader=req.body?.getReader();if(!reader)throw Error();let size=0,parts=[];while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2400){await reader.cancel();return reply(413,{error:'too_large'});}parts.push(part.value);}const raw=new Uint8Array(size);let offset=0;for(const part of parts){raw.set(part,offset);offset+=part.length;}input=JSON.parse(new TextDecoder().decode(raw));}catch{return reply(400,{error:'invalid_input'});}
 const keys=input?.action==='preview'?['action','id','body','days']:['queue','status','cancel'].includes(input?.action)?['action','id']:null;
 if(!input||typeof input!=='object'||Array.isArray(input)||!keys||Object.keys(input).some(k=>!keys.includes(k))||!RETURN_UUID.test(input.id||'')||input.action==='preview'&&(!RETURN_DAYS.includes(input.days)||!returnText(input.body)))return reply(400,{error:'invalid_input'});
 let user,claims;
 try{const u=await getUser(bearer.slice(7)),c=await getClaims(bearer.slice(7));if(u.error||c.error)return reply(401,{error:'invalid_session'});user=u.data?.user;claims=c.data?.claims;}catch{return reply(503,{error:'auth_unavailable'});}
 if(user?.id!==OWNER||!user.email_confirmed_at||user.is_anonymous)return reply(403,{error:'owner_only'});
 if(claims?.sub!==OWNER||claims.iss!==PROJECT+'/auth/v1'||!RETURN_UUID.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
 try{if(!await isSessionActive(OWNER,claims.session_id))return reply(401,{error:'invalid_session'});}catch{return reply(503,{error:'auth_unavailable'});}
 if(claims.aal!=='aal2'||!user.factors?.some(f=>f.factor_type==='totp'&&f.status==='verified'))return reply(403,{error:'mfa_required'});
 try{const data={id:input.id,...input.action==='preview'?{body:returnText(input.body),days:input.days}:{}};return reply(200,safeReturnCampaign(await request(OWNER,claims.session_id,input.action,data)));}
 catch(error){return reply(error?.code==='40001'?409:error?.code==='42501'?403:error?.code==='P0429'?429:503,{error:error?.code==='40001'?'preview_expired':error?.code==='42501'?'forbidden':error?.code==='P0429'?'try_later':'campaign_unavailable'});}
};}
