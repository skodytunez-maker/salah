-- Payment acceptance stays disabled. Only the authenticated own-account read/unlink API is introduced.
create schema if not exists salah_billing_private;
revoke all on schema salah_billing_private from public,anon,authenticated;
grant usage on schema salah_billing_private to service_role;
create table salah_billing_private.subscriptions(
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'cancelled' check(status in('pending','active','cancelled')),
 amount_rub integer not null check(amount_rub>=150),
 method_id text,
 method_type text check(method_type in('bank_card','sbp','sberbank','tinkoff_bank','yoo_money','alfabank')),
 card_last4 text check(card_last4 ~ '^[0-9]{4}$'),
 started_at timestamptz,
 next_charge_at timestamptz,
 cancelled_at timestamptz,
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 check(status<>'active' or (method_id is not null and next_charge_at is not null and cancelled_at is null)),
 check(status<>'cancelled' or (method_id is null and method_type is null and card_last4 is null and next_charge_at is null))
);
alter table salah_billing_private.subscriptions enable row level security;
revoke all on salah_billing_private.subscriptions from public,anon,authenticated;
grant select,insert,update,delete on salah_billing_private.subscriptions to service_role;
create policy billing_server_only on salah_billing_private.subscriptions to service_role using(true) with check(true);
create function salah_billing_private.unlink(p_user uuid) returns void
language sql security invoker set search_path='' as $$
 update salah_billing_private.subscriptions
 set status='cancelled',method_id=null,method_type=null,card_last4=null,next_charge_at=null,
 cancelled_at=coalesce(cancelled_at,now()),revision=revision+1,updated_at=now()
 where user_id=p_user and status<>'cancelled';
$$;
revoke all on function salah_billing_private.unlink(uuid) from public,anon,authenticated;
grant execute on function salah_billing_private.unlink(uuid) to service_role;
comment on table salah_billing_private.subscriptions is 'No charges are enabled by this migration. Future checkout/webhook/renewal implementations must lock this row and check revision, active status, method_id and cancellation before using a saved method. No card PAN/CVC is stored.';
