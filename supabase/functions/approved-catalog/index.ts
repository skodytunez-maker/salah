import postgres from 'npm:postgres@3.4.9';
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
const headers={'Content-Type':'application/json','Cache-Control':'public, max-age=60','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'};
// This endpoint returns owner-published content only, with no staff/account metadata.
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'apikey','Access-Control-Allow-Methods':'GET, OPTIONS'}});
 if(req.method!=='GET'||new URL(req.url).search)return new Response('{}',{status:400,headers});
 try{const rows=await sql`SELECT kind,entity_id,payload,revision,published_at FROM salah_staff_private.catalog ORDER BY kind,entity_id LIMIT 200`;
  return new Response(JSON.stringify({version:1,entries:rows.map(x=>({kind:x.kind,id:x.entity_id,payload:x.payload,revision:x.revision,publishedAt:x.published_at}))}),{headers});
 }catch{return new Response(JSON.stringify({error:'catalog_unavailable'}),{status:503,headers:{...headers,'Cache-Control':'no-store'}});}
});
