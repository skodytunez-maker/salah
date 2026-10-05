-- Review draft. Not applied. Generate a CLI migration after provider setup.
-- Preserve existing definitions, function ownership and grants; stop on drift.
BEGIN;
DO $review$
DECLARE item record; before text; after text;
BEGIN
 FOR item IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('record_app_presence','support_actor') LOOP
  before:=pg_get_functiondef(item.oid);
  IF position('u.email_confirmed_at IS NOT NULL' in before)=0 OR position('auth.sessions' in before)=0 THEN RAISE EXCEPTION 'Phone rollout: function drift; review required'; END IF;
  after:=replace(before,'u.email_confirmed_at IS NOT NULL','(u.email_confirmed_at IS NOT NULL OR (u.phone_confirmed_at IS NOT NULL AND u.phone ~ ''^(79[0-9]{9}|992[0-9]{9})$''))');
  IF item.proname='support_actor' THEN
   IF position('IF p_owner AND (' in after)=0 THEN RAISE EXCEPTION 'Phone rollout: owner guard drift'; END IF;
   after:=replace(after,'IF p_owner AND (','IF p_owner AND (NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=uid AND u.email_confirmed_at IS NOT NULL) OR ');
  END IF;
  EXECUTE after;
 END LOOP;
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('record_app_presence','support_actor'))<>2 THEN RAISE EXCEPTION 'Phone rollout: missing function'; END IF;
END;$review$;
COMMIT;
