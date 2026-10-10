begin;
do $$
declare h text:=repeat('a',64);e uuid:='11111111-1111-4111-8111-111111111111';n integer;
begin
 if not public.reciter_popularity_add(h,'ar.alafasy',e) then raise exception 'first minute rejected';end if;
 if not public.reciter_popularity_add(h,'ar.alafasy',e) then raise exception 'retry not idempotent';end if;
 select minutes into n from public.reciter_popularity_minutes where listener_hash=h and reciter='ar.alafasy';
 if n<>1 then raise exception 'duplicate counted';end if;
 if public.reciter_popularity_add(h,'ar.alafasy','22222222-2222-4222-8222-222222222222') then raise exception 'rate limit bypass';end if;
 if exists(select 1 from public.reciter_popularity_rank()) then raise exception 'single listener exposed';end if;
 insert into public.reciter_popularity_minutes values(repeat('b',64),current_date,'ar.alafasy',5),(repeat('c',64),current_date,'ar.alafasy',5);
 if not exists(select 1 from public.reciter_popularity_rank() where reciter='ar.alafasy') then raise exception 'eligible aggregate missing';end if;
 if has_function_privilege('anon','public.reciter_popularity_add(text,text,uuid)','execute') or has_function_privilege('authenticated','public.reciter_popularity_rank()','execute') then raise exception 'direct RPC exposed';end if;
 if has_table_privilege('anon','public.reciter_popularity_minutes','select') or has_table_privilege('authenticated','public.reciter_popularity_events','insert') then raise exception 'raw data exposed';end if;
end $$;
rollback;