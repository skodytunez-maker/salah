-- Manual owner-only reminders through existing connected notification devices.
-- No extra subscriber opt-in, new enrolment, public user list or silent push.
create schema if not exists salah_return_private;
revoke all on schema salah_return_private from public,anon,authenticated;
grant usage on schema salah_return_private to service_role;
alter table salah_support_private.native_devices add column if not exists time_zone text check(time_zone is null or length(time_zone) between 1 and 80);

create table salah_return_private.campaigns(
 id uuid primary key,created_by uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(btrim(body)) between 5 and 180),
 days smallint not null check(days in(7,14,30)),
 state text not null default 'draft'check(state in('draft','queued','complete','cancelled','expired')),
 inactive integer not null default 0 check(inactive>=0),
 created_at timestamptz not null default now(),expires_at timestamptz not null
);
create table salah_return_private.recipients(
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references salah_return_private.campaigns(id)on delete cascade,
 user_id uuid not null references auth.users(id)on delete cascade,
 channel text not null check(channel in('web','native')),source_id uuid not null,
 time_zone text not null check(length(time_zone) between 1 and 80),
 activity_at timestamptz not null,
 state text not null default 'pending'check(state in('pending','sending','sent','skipped','expired','retry')),
 claim_token uuid,claimed_at timestamptz,attempts smallint not null default 0 check(attempts between 0 and 3),next_attempt_at timestamptz,unique(campaign_id,user_id)
);
create index owner_return_pending on salah_return_private.recipients(campaign_id,state)where state in('pending','retry','sending');
create table salah_return_private.receipts(
 user_id uuid primary key references auth.users(id)on delete cascade,
 last_sent_at timestamptz,claim_job uuid references salah_return_private.recipients(id)on delete set null,
 claim_token uuid,claim_until timestamptz
);
create table salah_return_private.limits(
 user_id uuid not null references auth.users(id)on delete cascade,
 minute bigint not null,hits integer not null check(hits between 1 and 30),primary key(user_id,minute)
);
alter table salah_return_private.campaigns enable row level security;
alter table salah_return_private.recipients enable row level security;
alter table salah_return_private.receipts enable row level security;
alter table salah_return_private.limits enable row level security;
revoke all on all tables in schema salah_return_private from public,anon,authenticated;
grant select,insert,update,delete on all tables in schema salah_return_private to service_role;
alter default privileges in schema salah_return_private revoke execute on functions from public;

create function salah_return_private.audience(p_days integer,p_now timestamptz,p_user uuid default null)
returns setof jsonb language sql stable security invoker set search_path='' as $$
 with visits as(select user_id,max(last_seen)seen from public.app_presence where app='salah'group by user_id),
 inactive as(select u.id,greatest(coalesce(v.seen,u.created_at),coalesce(u.last_sign_in_at,u.created_at))last_visit
  from auth.users u left join visits v on v.user_id=u.id
  where u.id<>'dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid and(p_user is null or u.id=p_user)
  and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)and(u.banned_until is null or u.banned_until<=p_now)
  and greatest(coalesce(v.seen,u.created_at),coalesce(u.last_sign_in_at,u.created_at))<=p_now-make_interval(days=>p_days)),
 channels as(
  select i.id user_id,i.last_visit,d.id device,'web'::text channel,d.preferences->'city'->>'timezone'time_zone,greatest(n.checked_at,d.updated_at)updated_at,d.subscription,null::text token
  from inactive i join public.app_notification_status n on n.user_id=i.id and n.permission='granted'
  join auth.sessions s on s.id=n.session_id and s.user_id=i.id
  join salah_push_private.devices d on d.id=n.push_device_id
  where d.enabled and d.subscription is not null and d.preferences->'reminders'->>'enabled'='true'
  and d.updated_at>p_now-interval'90 days'and n.checked_at>p_now-interval'90 days'and(s.not_after is null or s.not_after>p_now)
  and not exists(select 1 from public.app_notification_status newer where newer.push_device_id=d.id and newer.user_id<>i.id and newer.checked_at>=n.checked_at)
  and not exists(select 1 from public.app_notification_status newer where newer.user_id=i.id and newer.permission='denied'and newer.checked_at>n.checked_at)
  union all
  select i.id,i.last_visit,d.id,'native',d.time_zone,d.updated_at,null::jsonb,d.token
  from inactive i join salah_support_private.native_devices d on d.user_id=i.id
  join auth.sessions s on s.id=d.session_id and s.user_id=i.id
  where d.enabled and d.token is not null and d.updated_at>p_now-interval'90 days'and(s.not_after is null or s.not_after>p_now)
 ),chosen as(select distinct on(c.user_id)c.*,r.last_sent_at from channels c left join salah_return_private.receipts r on r.user_id=c.user_id
  where exists(select 1 from pg_catalog.pg_timezone_names where name=c.time_zone)and(r.last_sent_at is null or r.last_sent_at<=p_now-interval'7 days')
  order by c.user_id,c.updated_at desc,c.device)
 select jsonb_build_object('user',user_id,'device',device,'channel',channel,'timeZone',time_zone,'lastVisit',last_visit,'lastSent',last_sent_at,
  'confirmed',true,'anonymous',false,'banned',false,'sessionActive',true,'deviceEnabled',true,'subscription',subscription,'nativeToken',token)
 from chosen order by user_id;
$$;

create function salah_return_private.report(p_id uuid,p_now timestamptz default clock_timestamp())
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',c.id,'state',c.state,'days',c.days,'body',c.body,'inactive',c.inactive,'reachable',count(r.id),
  'queued',count(r.id)filter(where r.state in('pending','retry','sending')),'sent',count(r.id)filter(where r.state='sent'),
  'skipped',count(r.id)filter(where r.state='skipped'),'failed',count(r.id)filter(where r.state='expired'),
  'quiet',count(r.id)filter(where r.state='pending'and((p_now at time zone r.time_zone)::time<time'08:00'or(p_now at time zone r.time_zone)::time>=time'22:00')),'expiresAt',c.expires_at)
 from salah_return_private.campaigns c left join salah_return_private.recipients r on r.campaign_id=c.id where c.id=p_id group by c.id;
$$;

create function salah_return_private.request(p_owner uuid,p_session uuid,p_action text,p_input jsonb,p_now timestamptz default clock_timestamp())
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cid uuid;item salah_return_private.campaigns%rowtype;n integer;total integer;
begin
 if p_owner<>'dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid or not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.id=p_session and s.user_id=p_owner and(s.not_after is null or s.not_after>p_now)and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)and(u.banned_until is null or u.banned_until<=p_now))or not exists(select 1 from auth.mfa_factors where user_id=p_owner and factor_type='totp'and status='verified')then raise exception'owner_only'using errcode='42501';end if;
 if p_action not in('preview','queue','status','cancel')then raise exception'invalid_action'using errcode='22023';end if;
 insert into salah_return_private.limits values(p_owner,floor(extract(epoch from p_now)/60)::bigint,1)on conflict(user_id,minute)do update set hits=limits.hits+1 where limits.hits<30 returning hits into n;
 if n is null then raise exception'try_later'using errcode='P0429';end if;
 cid=(p_input->>'id')::uuid;perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(cid::text,442));
 select * into item from salah_return_private.campaigns where id=cid for update;
 if p_action='preview'then
  if item.id is not null then if item.body is distinct from btrim(p_input->>'body')or item.days is distinct from(p_input->>'days')::smallint then raise exception'preview_changed'using errcode='40001';end if;return salah_return_private.report(cid,p_now);end if;
  if(p_input->>'days')::integer not in(7,14,30)or length(btrim(p_input->>'body'))not between 5 and 180 then raise exception'invalid_input'using errcode='22023';end if;
  select count(*)into total from auth.users u where u.id<>p_owner and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)and(u.banned_until is null or u.banned_until<=p_now)and greatest(coalesce((select max(a.last_seen)from public.app_presence a where a.user_id=u.id and a.app='salah'),u.created_at),coalesce(u.last_sign_in_at,u.created_at))<=p_now-make_interval(days=>(p_input->>'days')::integer);
  insert into salah_return_private.campaigns(id,created_by,body,days,inactive,created_at,expires_at)values(cid,p_owner,btrim(p_input->>'body'),(p_input->>'days')::smallint,total,p_now,p_now+interval'10 minutes');
  insert into salah_return_private.recipients(campaign_id,user_id,channel,source_id,time_zone,activity_at)
  select cid,(a->>'user')::uuid,a->>'channel',(a->>'device')::uuid,a->>'timeZone',(a->>'lastVisit')::timestamptz from salah_return_private.audience((p_input->>'days')::integer,p_now)a;
  return salah_return_private.report(cid,p_now);
 end if;
 if item.id is null or item.created_by<>p_owner then raise exception'unknown_campaign'using errcode='42501';end if;
 if p_action='queue'and item.state='draft'then
  if item.expires_at<=p_now then raise exception'preview_expired'using errcode='40001';end if;
  update salah_return_private.campaigns set state=case when exists(select 1 from salah_return_private.recipients where campaign_id=cid)then'queued'else'complete'end,expires_at=p_now+interval'24 hours'where id=cid;
 elsif p_action='cancel'and item.state in('draft','queued')then
  update salah_return_private.campaigns set state='cancelled'where id=cid;
  update salah_return_private.recipients set state='skipped'where campaign_id=cid and state in('pending','retry');
 end if;
 return salah_return_private.report(cid,p_now);
end;
$$;

create function salah_return_private.job_details(p_job uuid,p_token uuid,p_now timestamptz)
returns jsonb language sql stable security invoker set search_path='' as $$
 select a||jsonb_build_object('id',j.id,'body',c.body,'days',c.days,'activityAt',j.activity_at,'campaignExpires',c.expires_at)
 from salah_return_private.recipients j join salah_return_private.campaigns c on c.id=j.campaign_id
 join salah_return_private.receipts r on r.user_id=j.user_id and r.claim_job=j.id and r.claim_token=p_token and r.claim_until>p_now
 join lateral salah_return_private.audience(c.days,p_now,j.user_id)a on(a->>'device')::uuid=j.source_id and a->>'channel'=j.channel
 where j.id=p_job and j.claim_token=p_token and j.state='sending'and c.state='queued'and c.expires_at>p_now and(a->>'lastVisit')::timestamptz<=j.activity_at;
$$;

create function salah_return_private.claim(p_job uuid,p_now timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j salah_return_private.recipients%rowtype;r salah_return_private.receipts%rowtype;ticket uuid:=gen_random_uuid();
begin
 select x.*into j from salah_return_private.recipients x join salah_return_private.campaigns c on c.id=x.campaign_id where x.id=p_job and c.state='queued'and c.expires_at>p_now and(x.state in('pending','retry')or(x.state='sending'and x.claimed_at<p_now-interval'2 minutes'))and(x.next_attempt_at is null or x.next_attempt_at<=p_now)for update of x;
 if j.id is null then return null;end if;
 if j.attempts>=3 then update salah_return_private.recipients set state='expired'where id=j.id;return null;end if;
 if(p_now at time zone j.time_zone)::time<time'08:00'or(p_now at time zone j.time_zone)::time>=time'22:00'then return null;end if;
 insert into salah_return_private.receipts(user_id)values(j.user_id)on conflict do nothing;
 select *into r from salah_return_private.receipts where user_id=j.user_id for update;
 if r.last_sent_at>p_now-interval'7 days'then update salah_return_private.recipients set state='skipped'where id=j.id;return null;end if;
 if r.claim_until>p_now then return null;end if;
 update salah_return_private.receipts set claim_job=j.id,claim_token=ticket,claim_until=p_now+interval'2 minutes'where user_id=j.user_id;
 update salah_return_private.recipients set state='sending',claim_token=ticket,claimed_at=p_now,attempts=attempts+1 where id=j.id;
 return jsonb_build_object('token',ticket);
end;
$$;

create function salah_return_private.complete(p_job uuid,p_token uuid,p_state text,p_now timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
declare j salah_return_private.recipients%rowtype;
begin
 if p_state not in('sent','retry','skipped','expired')then raise exception'invalid_state'using errcode='22023';end if;
 update salah_return_private.recipients set state=case when p_state='retry'and attempts>=3 then'expired'else p_state end,next_attempt_at=case when p_state='retry'then p_now+interval'10 minutes'else null end where id=p_job and claim_token=p_token and state='sending'returning *into j;
 if j.id is null then return;end if;
 update salah_return_private.receipts set last_sent_at=case when p_state='sent'then greatest(coalesce(last_sent_at,p_now),p_now)else last_sent_at end,claim_job=null,claim_token=null,claim_until=null where user_id=j.user_id and claim_job=j.id and claim_token=p_token;
 if p_state='expired'and j.channel='web'then update salah_push_private.devices set enabled=false,subscription=null,preferences=null where id=j.source_id and updated_at<=j.claimed_at;
 elsif p_state='expired'and j.channel='native'then update salah_support_private.native_devices set enabled=false,token=null,token_hash=null where id=j.source_id and updated_at<=j.claimed_at;end if;
 update salah_return_private.campaigns c set state='complete'where c.id=j.campaign_id and c.state='queued'and not exists(select 1 from salah_return_private.recipients x where x.campaign_id=c.id and x.state in('pending','sending','retry'));
end;
$$;
revoke all on all functions in schema salah_return_private from public,anon,authenticated;
grant execute on all functions in schema salah_return_private to service_role;
