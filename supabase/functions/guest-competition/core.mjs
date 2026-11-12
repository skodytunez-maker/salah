import{competitionSnapshot}from './competition-core.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const guestRankOrigin=value=>['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost'].includes(value);
export async function guestRankHash(domain,value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(domain+value));return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');}
export function guestRankPacket(body,now=Date.now()){
 if(!body||Array.isArray(body)||!['register','snapshot','claim'].includes(body.action)||!uuid.test(body.device||'')||!/^[a-f0-9]{64}$/.test(body.secret||''))throw Error('invalid');
 const fields=body.action==='snapshot'?['action','device','secret','totals','days','timeZone']:body.action==='register'?['action','device','secret','activity']:['action','device','secret'];
 if(Object.keys(body).some(k=>!fields.includes(k)))throw Error('invalid');
 if(body.action==='register'&&!uuid.test(body.activity||''))throw Error('invalid');
 return{activity:body.activity?.toLowerCase(),action:body.action,device:body.device.toLowerCase(),secret:body.secret,...(body.action==='snapshot'?{snapshot:competitionSnapshot({action:'snapshot',device:body.device,totals:body.totals,days:body.days,timeZone:body.timeZone},now)}:{})};
}
export function createGuestRankHandler(db,{verified=async()=>null}={}){
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 return async req=>{if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply({error:'method'},405);
 if(!guestRankOrigin(req.headers.get('Origin')))return reply({error:'forbidden'},403);
 try{if(!/^application\/json(?:;|$)/i.test(req.headers.get('Content-Type')||''))return reply({error:'json_required'},415);
 const reader=req.body?.getReader();if(!reader)return reply({error:'invalid'},400);const parts=[];let size=0;
 try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>200000){await reader.cancel();return reply({error:'body'},413);}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 let packet;try{packet=guestRankPacket(JSON.parse(new TextDecoder().decode(bytes)));}catch{return reply({error:'invalid'},400);}
 const user=packet.action==='claim'?await verified(req):null;if(packet.action==='claim'&&!user)return reply({error:'sign_in_required'},401);
 const result=await db.apply(packet,user);return reply(result,result.retry?429:200);
 }catch(error){const code=error?.message;return reply({error:['forbidden','claimed','invalid_growth','sign_in_required'].includes(code)?code:'unavailable'},code==='forbidden'?403:code==='claimed'?409:code==='invalid_growth'?400:code==='sign_in_required'?401:503);}
 };
}
