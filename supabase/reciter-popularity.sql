create table public.reciter_popularity_minutes(listener_hash text not null check(listener_hash ~ '^[a-f0-9]{64}$'), day date not null default current_date, reciter text not null, minutes integer not null default 1 check(minutes between 1 and 120), primary key(listener_hash,day,reciter));
create table public.reciter_popularity_events(event_id uuid primary key,listener_hash text not null,day date not null default current_date,created_at timestamptz not null default now());
create index reciter_popularity_events_listener_time on public.reciter_popularity_events(listener_hash,created_at desc);
create index reciter_popularity_minutes_day on public.reciter_popularity_minutes(day,reciter);
alter table public.reciter_popularity_minutes enable row level security;
alter table public.reciter_popularity_events enable row level security;
revoke all on public.reciter_popularity_minutes,public.reciter_popularity_events from public,anon,authenticated;
grant all on public.reciter_popularity_minutes,public.reciter_popularity_events to service_role;
create function public.reciter_popularity_add(p_listener text,p_reciter text,p_event uuid) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if p_listener !~ '^[a-f0-9]{64}$' or p_reciter <> all(ARRAY['ar.alafasy','ar.husary','ar.minshawi','ar.mahermuaiqly','ar.badralturki','ar.muhammadalluhaidan','ar.tariqmuhammad','ar.abdurrahmanalsudais','ar.saudalshuraim','ar.abdullahaljuhany','ar.bandarbalilah','ar.salahalbudair','ar.abdulmuhsinalqasim','ar.alialhuthaifi','ar.abdulbarialthubaity','ar.abdullahalbuayjan','ar.khalidalmuhanna','ar.ahmadalhuthaifi','ar.raadalkurdi','ar.hazzaalbalushi','ar.haithamaljadani','ar.haithamaldukhain','ar.abdelazizsheim','ar.ahmedkaseb','ar.obaidamuafaq','ar.abdulrahmanmossad','ar.siratulloraupov','ar.idrisabkar','ar.abubakrshatri','ar.nasseralqatami','ar.yasseraldossaricontinuous','ar.abdulbasitabdussamad','ar.mansouralsalimi']) then raise exception 'invalid_input'; end if;
 perform pg_advisory_xact_lock(hashtext(p_listener));
 if exists(select 1 from public.reciter_popularity_events where event_id=p_event) then return true; end if;
 if exists(select 1 from public.reciter_popularity_events where listener_hash=p_listener and created_at>now()-interval '55 seconds') then return false;end if;
 if (select coalesce(sum(minutes),0) from public.reciter_popularity_minutes where listener_hash=p_listener and day=current_date)>=120 then return false;end if;
 insert into public.reciter_popularity_events(event_id,listener_hash) values(p_event,p_listener) on conflict do nothing;
 if not found then return false;end if;
 insert into public.reciter_popularity_minutes(listener_hash,day,reciter,minutes) values(p_listener,current_date,p_reciter,1) on conflict(listener_hash,day,reciter) do update set minutes=reciter_popularity_minutes.minutes+1;
 delete from public.reciter_popularity_minutes where day<current_date-29;
 delete from public.reciter_popularity_events where day<current_date-29;
 return true;
end $$;
create function public.reciter_popularity_rank() returns table(reciter text) language sql stable security invoker set search_path=public,pg_temp as $$
 select m.reciter from public.reciter_popularity_minutes m where m.day>=current_date-29 group by m.reciter having count(distinct m.listener_hash)>=3 and sum(m.minutes)>=10 order by sum(m.minutes) desc,m.reciter limit 12;
$$;
revoke all on function public.reciter_popularity_add(text,text,uuid),public.reciter_popularity_rank() from public,anon,authenticated;
grant execute on function public.reciter_popularity_add(text,text,uuid),public.reciter_popularity_rank() to service_role;

select cron.schedule('reciter-popularity-retention','17 3 * * *',$$delete from public.reciter_popularity_minutes where day<current_date-29; delete from public.reciter_popularity_events where day<current_date-29;$$);
