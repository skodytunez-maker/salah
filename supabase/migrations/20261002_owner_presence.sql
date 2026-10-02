-- Foreground presence only. No reading or prayer history is collected.
CREATE TABLE IF NOT EXISTS public.app_presence (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 app text NOT NULL CHECK(app='salah'),
 tab_id uuid NOT NULL,
 active boolean NOT NULL DEFAULT false,
 sequence bigint NOT NULL CHECK(sequence>0 AND sequence<=9007199254740991),
 last_seen timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,app,tab_id)
);
ALTER TABLE public.app_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_presence FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS app_presence_active_seen ON public.app_presence(app,last_seen) WHERE active;
CREATE OR REPLACE FUNCTION public.record_app_presence(p_app text,p_tab uuid,p_active boolean,p_sequence bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); sid uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'sign_in_required' USING ERRCODE='42501'; END IF;
 IF p_app IS DISTINCT FROM 'salah' OR p_tab IS NULL OR p_active IS NULL OR p_sequence IS NULL OR p_sequence<1 OR p_sequence>9007199254740991 THEN RAISE EXCEPTION 'invalid_presence' USING ERRCODE='22023'; END IF;
 BEGIN sid:=(auth.jwt()->>'session_id')::uuid;EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'invalid_session' USING ERRCODE='42501';END;
 IF sid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id WHERE s.id=sid AND s.user_id=uid AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous,false)) THEN RAISE EXCEPTION 'invalid_session' USING ERRCODE='42501';END IF;
 INSERT INTO public.app_presence(user_id,app,tab_id,active,sequence,last_seen) VALUES(uid,p_app,p_tab,p_active,p_sequence,clock_timestamp())
 ON CONFLICT(user_id,app,tab_id) DO UPDATE SET active=excluded.active,sequence=excluded.sequence,last_seen=excluded.last_seen WHERE excluded.sequence>app_presence.sequence;
END;$$;
REVOKE ALL ON FUNCTION public.record_app_presence(text,uuid,boolean,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_app_presence(text,uuid,boolean,bigint) TO authenticated;
