-- Explicit complete-juz confirmations and fully completed morning/evening rounds.
-- No bookmarks/activity-bit backfill, no changes to listening scores or Top titles.
alter table salah_competition_private.awards drop constraint awards_kind_check;
alter table salah_competition_private.awards add constraint awards_kind_check check(kind in('week','month','streak7','streak30','streak100','streak200','streak365','founder','hours25','hours50','hours100','hours250','hours500','hours1000','hours5000','reading1','reading10','khatm','adhkar7','adhkar30'));
create unique index learning_award_once on salah_competition_private.awards(user_id,kind)where kind in('reading1','reading10','khatm','adhkar7','adhkar30');
create table salah_competition_private.read_juz(user_id uuid not null references auth.users(id)on delete cascade,juz smallint not null check(juz between 1 and 30),day date not null,primary key(user_id,juz));
create table salah_competition_private.adhkar_rounds(user_id uuid not null references auth.users(id)on delete cascade,day date not null,period text not null check(period in('morning','evening')),primary key(user_id,day,period));
alter table salah_competition_private.read_juz enable row level security;
alter table salah_competition_private.adhkar_rounds enable row level security;
revoke all on salah_competition_private.read_juz,salah_competition_private.adhkar_rounds from public,anon,authenticated;
grant select,insert on salah_competition_private.read_juz,salah_competition_private.adhkar_rounds to service_role;

create function salah_competition_private.claim_learning_awards(p_user uuid,p_today date)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare done_juz jsonb;round_days integer;first_read date;first_round date;milestone integer;
begin
 if not exists(select 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)and(u.banned_until is null or u.banned_until<=now()))then return '{}'::jsonb;end if;
 select coalesce(jsonb_agg(r.juz order by r.juz),'[]'::jsonb),min(r.day)into done_juz,first_read from salah_competition_private.read_juz r where r.user_id=p_user;
 foreach milestone in array array[1,10,30]loop
  if jsonb_array_length(done_juz)>=milestone then
   insert into salah_competition_private.awards(user_id,kind,starts_on,ends_on,seconds)values(p_user,case when milestone=30 then 'khatm'else 'reading'||milestone end,first_read,greatest(first_read,p_today),0)on conflict do nothing;
  end if;
 end loop;
 select count(*)::int,min(d.day)into round_days,first_round from(select r.day from salah_competition_private.adhkar_rounds r where r.user_id=p_user group by r.day having count(*)=2)d;
 foreach milestone in array array[7,30]loop
  if round_days>=milestone then
   insert into salah_competition_private.awards(user_id,kind,starts_on,ends_on,seconds)values(p_user,'adhkar'||milestone,first_round,greatest(first_round,p_today),0)on conflict do nothing;
  end if;
 end loop;
 return jsonb_build_object('juz',done_juz,'adhkarDays',round_days);
end;$$;
revoke all on function salah_competition_private.claim_learning_awards(uuid,date)from public,anon,authenticated;
grant execute on function salah_competition_private.claim_learning_awards(uuid,date)to service_role;

-- The protected Edge handler validates every round against the fixed catalogue.
-- Session is checked again in the same transaction as the writes.
create function salah_competition_private.record_learning_progress(p_user uuid,p_session uuid,p_juz jsonb,p_rounds jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb;d date;
begin
 perform 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.id=p_session and s.user_id=p_user and(s.not_after is null or s.not_after>now())and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)and(u.banned_until is null or u.banned_until<=now())for key share of s;
 if not found then raise exception 'sign_in_required';end if;
 if jsonb_typeof(p_juz) is distinct from 'array'or jsonb_typeof(p_rounds)is distinct from 'array'then raise exception 'invalid_progress';end if;
 if jsonb_array_length(p_juz)>30 or jsonb_array_length(p_rounds)>4 then raise exception 'invalid_progress';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,458));
 for item in select value from jsonb_array_elements(p_juz)loop
  d=(item->>'day')::date;
  if d is null or d<'2026-11-01'::date or d>current_date+1 or jsonb_typeof(item->'number')is distinct from 'number'or(item->>'number')!~'^[0-9]+$'or(item->>'number')::integer not between 1 and 30 then raise exception 'invalid_progress';end if;
  insert into salah_competition_private.read_juz(user_id,juz,day)values(p_user,(item->>'number')::smallint,d)on conflict do nothing;
 end loop;
 for item in select value from jsonb_array_elements(p_rounds)loop
  d=(item->>'day')::date;
  if d is null or d<'2026-11-01'::date or d>current_date+1 or coalesce(item->>'group','')not in('morning','evening')then raise exception 'invalid_progress';end if;
  insert into salah_competition_private.adhkar_rounds(user_id,day,period)values(p_user,d,item->>'group')on conflict do nothing;
 end loop;
 return salah_competition_private.claim_learning_awards(p_user,current_date);
end;$$;
revoke all on function salah_competition_private.record_learning_progress(uuid,uuid,jsonb,jsonb)from public,anon,authenticated;
grant execute on function salah_competition_private.record_learning_progress(uuid,uuid,jsonb,jsonb)to service_role;
