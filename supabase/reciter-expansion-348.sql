-- Release 348: extend the reciter allowlist only; preserve existing permissions and limits.
create or replace function public.reciter_popularity_add(p_listener text,p_reciter text,p_event uuid) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if p_listener !~ '^[a-f0-9]{64}$' or p_reciter <> all(ARRAY['ar.alafasy','ar.husary','ar.minshawi','ar.mahermuaiqly','ar.badralturki','ar.muhammadalluhaidan','ar.tariqmuhammad','ar.abdurrahmanalsudais','ar.saudalshuraim','ar.abdullahaljuhany','ar.bandarbalilah','ar.salahalbudair','ar.abdulmuhsinalqasim','ar.alialhuthaifi','ar.abdulbarialthubaity','ar.abdullahalbuayjan','ar.khalidalmuhanna','ar.ahmadalhuthaifi','ar.raadalkurdi','ar.hazzaalbalushi','ar.haithamaljadani','ar.haithamaldukhain','ar.abdelazizsheim','ar.ahmedkaseb','ar.obaidamuafaq','ar.abdulrahmanmossad','ar.siratulloraupov','ar.idrisabkar','ar.abubakrshatri','ar.nasseralqatami','ar.yasseraldossaricontinuous','ar.abdulbasitabdussamad','ar.mansouralsalimi','ar.islamsobhi','ar.abdulrahmanalawsi','ar.saadalghamdi','ar.ahmadalajmi','ar.faresabbad','ar.ahmadalnufais','ar.khalidaljalil','ar.wadeealyamani','ar.abdullahkamel','ar.haniarrifai','ar.alijaber','ar.muhammadayyub','ar.salahbukhatir']) then raise exception 'invalid_input'; end if;
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
