-- Legacy environments bootstrap this private table separately. Fresh
-- installations already get the expanded constraint from error-summary-schema.sql.
begin;
set local lock_timeout = '3s';
alter table if exists salah_errors_private.counts
 drop constraint if exists counts_module_check,
 add constraint counts_module_check check (
  module in ('app','quran','quran-navigation','adhkar','qibla','support','settings','qr-login','account-devices','weather','other')
  and (module <> 'quran-navigation' or (route = 'quran' and kind = 'promise'))
 );
commit;
