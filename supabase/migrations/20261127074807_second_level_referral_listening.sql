begin;

create or replace function salah_referrals_private.own_summary(uid uuid)
returns table(code text, seconds bigint)
language sql stable security invoker set search_path = '' as $$
  with direct as (
    select m.invitee_id from salah_referrals_private.members m where m.inviter_id = uid
  ), network as (
    select d.invitee_id from direct d
    union
    select m.invitee_id from salah_referrals_private.members m
    join direct d on m.inviter_id = d.invitee_id
  ), members as materialized (
    select m.invitee_id from network m
    join auth.users u on u.id = m.invitee_id
    join salah_competition_private.preferences p on p.user_id = m.invitee_id
    join public.reciter_listener_visibility v on v.user_id = m.invitee_id
    where m.invitee_id <> uid and u.email_confirmed_at is not null
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
