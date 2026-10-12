import{createClient}from 'npm:@supabase/supabase-js@2.117.2';
import postgres from 'npm:postgres@3.4.9';
import{createStaffHandler,PROJECT}from './core.mjs';
import{createPublisher}from './publish.mjs';
import seeds from './seeds.json' with {type:'json'};
const KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
const auth=createClient(PROJECT,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
let adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!adminKey){try{adminKey=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;}catch{}}
if(!adminKey)throw Error('Storage server key is not configured');
const bucket=createClient(PROJECT,adminKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(15000)})}}).storage;
const rpc=async(action:string,args:object,claims:object)=>sql.begin(async tx=>{
 await tx`select pg_catalog.set_config('request.jwt.claims',${JSON.stringify(claims)},true)`;
 const rows=action.startsWith('chat.push.')?await tx`select salah_staff_private.chat_push_request(${action},${tx.json(args)}::jsonb) AS data`:action.startsWith('chat.')?await tx`select salah_staff_private.chat_request(${action},${tx.json(args)}::jsonb) AS data`:await tx`select salah_staff_private.request(${action},${tx.json(args)}::jsonb) AS data`;
 return rows[0].data;
});
const storage={
 async upload(name:string,path:string,bytes:Uint8Array,options:object){const {error}=await bucket.from(name).upload(path,bytes,{upsert:false,cacheControl:'0',...options});if(error)throw Error('storage_unavailable');},
 async remove(name:string,paths:string[]){const {error}=await bucket.from(name).remove(paths);if(error)throw Error('storage_unavailable');},
 async sign(name:string,path:string,expires:number,options?:object){const {data,error}=await bucket.from(name).createSignedUrl(path,expires,options);if(error)throw Error('storage_unavailable');return data.signedUrl;},
 async download(name:string,path:string){const {data,error}=await bucket.from(name).download(path);if(error||!data)throw Error('storage_unavailable');return new Uint8Array(await data.arrayBuffer());},
 async catalog(kind:string,id:string){return(await sql`SELECT payload FROM salah_staff_private.catalog WHERE kind=${kind} AND entity_id=${id}`)[0]?.payload||null;}
};
const sha256=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(createStaffHandler({getUser:token=>auth.auth.getUser(token),getClaims:token=>auth.auth.getClaims(token),rpc,storage,sha256,publishDraft:createPublisher({rpc,storage,seeds}),nativeSenderReady:()=>Boolean(Deno.env.get('FIREBASE_SUPPORT_SERVICE_ACCOUNT'))}));
