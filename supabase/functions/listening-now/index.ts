import postgres from 'npm:postgres@3.4.9';
import{createListeningNowHandler}from './core.mjs';
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
Deno.serve(createListeningNowHandler(sql));
