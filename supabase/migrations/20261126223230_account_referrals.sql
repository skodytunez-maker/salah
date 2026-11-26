begin;

create schema salah_referrals_private;
revoke all on schema salah_referrals_private from public, anon, authenticated;

create table salah_referrals_private.codes (
  inviter_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^SALAH-[A-F0-9]{8}$')
);

create table salah_referrals_private.members (
  invitee_id uuid primary key references auth.users(id) on delete cascade,
  inviter_id uuid not null references salah_referrals_private.codes(inviter_id) on delete cascade,
  check (invitee_id <> inviter_id)
);
create index referrals_members_inviter on salah_referrals_private.members(inviter_id, invitee_id);

alter table salah_referrals_private.codes enable row level security;
alter table salah_referrals_private.members enable row level security;
revoke all on all tables in schema salah_referrals_private from public, anon, authenticated;

-- The code is optional signup input. Only an Auth INSERT may establish a referral.
-- Editing profile metadata, resending a code and signing in never reassign it.
create function salah_referrals_private.capture_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  supplied_code text := new.raw_user_meta_data ->> 'salah_invite_code';
begin
  if coalesce(new.is_anonymous, false) or supplied_code is null
      or length(supplied_code) <> 14 or supplied_code !~ '^SALAH-[A-F0-9]{8}$' then
    return new;
  end if;
  insert into salah_referrals_private.members(invitee_id, inviter_id)
    select new.id, c.inviter_id
    from salah_referrals_private.codes c
    join auth.users u on u.id = c.inviter_id
    where c.code = supplied_code and c.inviter_id <> new.id
      and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
    for key share of c
    on conflict (invitee_id) do nothing;
  return new;
end;
$$;
revoke all on function salah_referrals_private.capture_signup() from public, anon, authenticated;
create trigger salah_referral_signup after insert on auth.users
for each row execute function salah_referrals_private.capture_signup();

create function salah_referrals_private.own_code(uid uuid) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  result text;
begin
  for attempt in 1..8 loop
    select code into result from salah_referrals_private.codes where inviter_id = uid;
    if found then return result; end if;
    insert into salah_referrals_private.codes(inviter_id, code)
    values (uid, 'SALAH-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 8)))
    on conflict do nothing returning code into result;
    if found then return result; end if;
  end loop;
  raise exception 'invite_code_unavailable';
end;
$$;
revoke all on function salah_referrals_private.own_code(uuid) from public, anon, authenticated;

-- The canonical competition ledger includes imported guest seconds. Remove that
-- separately identified contribution, then sum only confirmed referred accounts.
create function salah_referrals_private.own_summary(uid uuid)
returns table(code text, seconds bigint)
language sql stable security invoker set search_path = '' as $$
  with members as materialized (
    select m.invitee_id from salah_referrals_private.members m
    join auth.users u on u.id = m.invitee_id
    join salah_competition_private.preferences p on p.user_id = m.invitee_id
    join public.reciter_listener_visibility v on v.user_id = m.invitee_id
    where m.inviter_id = uid and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous, false)
      and p.enabled and v.mode <> 'hidden'
  ), credited as (
    select s.user_id, sum(s.seconds)::bigint as total
    from public.competition_scores('all', current_date) s
    join members m on m.invitee_id = s.user_id group by s.user_id
  ), guest as (
    select g.claimed_by as user_id, sum(s.seconds)::bigint as total
    from salah_competition_private.guest_players g
    join members m on m.invitee_id = g.claimed_by
    join salah_competition_private.guest_scores('all', current_date) s on s.guest_id = g.public_id
    group by g.claimed_by
  )
  select c.code, coalesce((select sum(greatest(r.total - coalesce(g.total, 0), 0))::bigint
    from credited r left join guest g using(user_id)), 0)
  from salah_referrals_private.codes c where c.inviter_id = uid;
$$;
revoke all on function salah_referrals_private.own_summary(uuid) from public, anon, authenticated;

commit;
