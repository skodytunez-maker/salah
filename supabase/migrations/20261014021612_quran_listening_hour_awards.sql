-- One permanent milestone per verified account, across every reciter and device.
alter table salah_competition_private.awards drop constraint awards_kind_check;
alter table salah_competition_private.awards add constraint awards_kind_check check(kind in('week','month','streak7','streak30','streak100','streak200','streak365','founder','hours25','hours50','hours100','hours250','hours500','hours1000','hours5000'));
create unique index quran_listening_hour_award_once on salah_competition_private.awards(user_id,kind)where kind in('hours25','hours50','hours100','hours250','hours500','hours1000','hours5000');
create function salah_competition_private.award_hours(p_user uuid,p_today date)
returns bigint language plpgsql security invoker set search_path='' as $$
declare total_seconds bigint;milestone integer;
begin
 if not exists(select 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false))then return 0;end if;
 -- Reuse the existing reconciliation of device snapshots and imported history.
 -- Sum every reciter, rather than the favorite-reciter leaderboard or daily streak.
 select coalesce(sum(s.seconds),0)::bigint into total_seconds from public.competition_scores('all',p_today)s where s.user_id=p_user;
 foreach milestone in array array[25,50,100,250,500,1000,5000]loop
  if total_seconds>=milestone::bigint*3600 then
   insert into salah_competition_private.awards(user_id,kind,starts_on,ends_on,seconds)
   values(p_user,'hours'||milestone,p_today,p_today,total_seconds)on conflict do nothing;
  end if;
 end loop;
 return total_seconds;
end;$$;
revoke all on function salah_competition_private.award_hours(uuid,date)from public,anon,authenticated;
grant execute on function salah_competition_private.award_hours(uuid,date)to service_role;
