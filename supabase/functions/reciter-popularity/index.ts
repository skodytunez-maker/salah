import postgres from 'npm:postgres@3.4.9';
// Public aggregate reads; writes require a verified, confirmed Auth user and explicit consent.
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
const reciters=new Set(["ar.alafasy","ar.husary","ar.minshawi","ar.mahermuaiqly","ar.badralturki","ar.muhammadalluhaidan","ar.tariqmuhammad","ar.abdurrahmanalsudais","ar.saudalshuraim","ar.abdullahaljuhany","ar.bandarbalilah","ar.salahalbudair","ar.abdulmuhsinalqasim","ar.alialhuthaifi","ar.abdulbarialthubaity","ar.abdullahalbuayjan","ar.khalidalmuhanna","ar.ahmadalhuthaifi","ar.raadalkurdi","ar.hazzaalbalushi","ar.haithamaljadani","ar.haithamaldukhain","ar.abdelazizsheim","ar.ahmedkaseb","ar.obaidamuafaq","ar.abdulrahmanmossad","ar.siratulloraupov","ar.idrisabkar","ar.abubakrshatri","ar.nasseralqatami","ar.yasseraldossaricontinuous","ar.abdulbasitabdussamad","ar.mansouralsalimi"]);
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Cache-Control':'no-store'}});
async function rpc(name:string,body:any){if(name==='reciter_popularity_rank')return await sql`select * from public.reciter_popularity_rank()`;if(name==='reciter_popularity_add'){const rows=await sql`select public.reciter_popularity_add(${body.p_listener},${body.p_reciter},${body.p_event}::uuid) as counted`;return rows[0].counted;}throw Error('invalid_operation');}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
 if(req.method==='GET'){const rows=await rpc('reciter_popularity_rank',{});return reply({items:rows.map((r:{reciter:string})=>r.reciter).filter((id:string)=>reciters.has(id)),windowDays:30});}
 if(req.method!=='POST')return reply({error:'method'},405);
 const bearer=req.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer))return reply({error:'sign_in_required'},401);
 if(Number(req.headers.get('content-length')||0)>1024)return reply({error:'body'},413);
 const text=await req.text();if(text.length>1024)return reply({error:'body'},413);let body;try{body=JSON.parse(text);}catch{return reply({error:'body'},400);}
 if(!body||body.consent!==true||!reciters.has(body.reciter)||typeof body.eventId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.eventId)||Object.keys(body).some(k=>!['consent','reciter','eventId'].includes(k)))return reply({error:'invalid_input'},400);
 const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:bearer}});if(!auth.ok)return reply({error:'sign_in_required'},401);const user=await auth.json();if(!user.id||!user.email_confirmed_at||user.is_anonymous)return reply({error:'confirmed_account_required'},403);
 const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=await crypto.subtle.sign('HMAC',cryptoKey,new TextEncoder().encode('reciter-ranking-v1:'+user.id));const hash=Array.from(new Uint8Array(signature),v=>v.toString(16).padStart(2,'0')).join('');
 const counted=await rpc('reciter_popularity_add',{p_listener:hash,p_reciter:body.reciter,p_event:body.eventId});return reply({ok:true,counted});
 }catch{return reply({error:'temporarily_unavailable'},503);}
});
