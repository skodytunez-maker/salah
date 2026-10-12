-- First100 confirmed SALAH users; immutable occupied seats are not recycled on deletion.
alter table salah_competition_private.awards drop constraint awards_kind_check;
alter table salah_competition_private.awards add constraint awards_kind_check check(kind in('week','month','streak7','streak30','streak100','streak200','streak365','founder'));
create unique index salah_founder_award_once on salah_competition_private.awards(user_id)where kind='founder';
create table salah_competition_private.founder_members(
 ordinal smallint primary key check(ordinal between 1 and 100),
 user_id uuid unique references auth.users(id)on delete set null,
 joined_at timestamptz not null default now()
);
alter table salah_competition_private.founder_members enable row level security;
revoke all on salah_competition_private.founder_members from public,anon,authenticated;
grant all on salah_competition_private.founder_members to service_role;
insert into salah_competition_private.founder_members(ordinal,user_id,joined_at)
select row_number()over(order by u.created_at,u.id)::smallint,u.id,u.created_at from auth.users u
where u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
and(exists(select 1 from public.app_presence p where p.user_id=u.id and p.app='salah')or exists(select 1 from salah_competition_private.preferences p where p.user_id=u.id))
order by u.created_at,u.id limit 100;
insert into salah_competition_private.awards(user_id,kind,starts_on,ends_on)
select f.user_id,'founder',(f.joined_at at time zone'Europe/Moscow')::date,(f.joined_at at time zone'Europe/Moscow')::date from salah_competition_private.founder_members f on conflict do nothing;
create function salah_competition_private.claim_founder(p_user uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
 declare seat smallint;joined timestamptz;
 begin
 perform pg_advisory_xact_lock(31620261013);
 if not exists(select 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false))then return false;end if;
 if not exists(select 1 from salah_competition_private.preferences p where p.user_id=p_user)and not exists(select 1 from public.app_presence p where p.user_id=p_user and p.app='salah')then return false;end if;
 select ordinal,joined_at into seat,joined from salah_competition_private.founder_members where user_id=p_user;
 if seat is null then
 select coalesce(max(ordinal),0)+1 into seat from salah_competition_private.founder_members;
 if seat>100 then return false;end if;
 joined:=now();insert into salah_competition_private.founder_members(ordinal,user_id,joined_at)values(seat,p_user,joined);
 end if;
 insert into salah_competition_private.awards(user_id,kind,starts_on,ends_on)values(p_user,'founder',(joined at time zone'Europe/Moscow')::date,(joined at time zone'Europe/Moscow')::date)on conflict do nothing;
 return true;end;$$;
revoke all on function salah_competition_private.claim_founder(uuid)from public,anon,authenticated;
grant execute on function salah_competition_private.claim_founder(uuid)to service_role;
