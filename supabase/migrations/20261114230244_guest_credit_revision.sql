-- A monotonic acknowledgement prevents stale responses in another tab from
-- restoring a completed pause or rolling back an accepted guest credit view.
alter table salah_competition_private.guest_credit_controls add column revision bigint not null default 0 check(revision>=0 and revision<=9007199254740991);
create function salah_competition_private.advance_guest_credit_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if (new.paused_at is distinct from old.paused_at or new.pause_token is distinct from old.pause_token) and new.revision<=old.revision then new.revision=old.revision+1; end if;
 return new;
end $$;
revoke all on function salah_competition_private.advance_guest_credit_revision() from public,anon,authenticated;
create trigger guest_credit_control_revision before update on salah_competition_private.guest_credit_controls for each row execute function salah_competition_private.advance_guest_credit_revision();
