-- Activate only after the public handler's device capability + cron checks pass.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('salah-background-reminders','* * * * *', $job$
 select net.http_post(
  url:='https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/background-reminders/dispatch',
  headers:=jsonb_build_object('Content-Type','application/json','X-Salah-Cron',
   (select cron_secret from salah_push_private.config where id=1)),
  body:='{}'::jsonb, timeout_milliseconds:=120000
 );
$job$);
