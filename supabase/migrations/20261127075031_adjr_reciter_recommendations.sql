begin;

create table salah_referrals_private.reciter_recommendations (
  reciter text primary key check (reciter ~ '^ar\.[a-z0-9_-]{1,80}$'),
  recommender_id uuid not null references auth.users(id) on delete cascade
);

create index reciter_recommendations_recommender_idx
  on salah_referrals_private.reciter_recommendations(recommender_id);

alter table salah_referrals_private.reciter_recommendations enable row level security;
revoke all on table salah_referrals_private.reciter_recommendations from public, anon, authenticated;
grant select on table salah_referrals_private.reciter_recommendations to service_role;

commit;
