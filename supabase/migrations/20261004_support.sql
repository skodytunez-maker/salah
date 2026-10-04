-- Private conversations shared by SALAH and SAHABA. No email or password is copied.
BEGIN;
CREATE TABLE IF NOT EXISTS public.support_threads (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 app text NOT NULL CHECK(app IN ('salah','sahaba')),
 subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 120),
 version text NOT NULL CHECK(length(version)<=40),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','answered','closed')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.support_messages (
 id uuid PRIMARY KEY,
 thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 owner_reply boolean NOT NULL,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 3000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_threads,public.support_messages FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS support_threads_by_user ON public.support_threads(user_id,app,updated_at DESC,id);
CREATE INDEX IF NOT EXISTS support_threads_latest ON public.support_threads(updated_at DESC,id);
CREATE INDEX IF NOT EXISTS support_messages_by_thread ON public.support_messages(thread_id,created_at,id);
CREATE INDEX IF NOT EXISTS support_messages_rate ON public.support_messages(author_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.support_actor(p_owner boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid();sid uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'sign_in_required' USING ERRCODE='42501';END IF;
 BEGIN sid:=(auth.jwt()->>'session_id')::uuid;EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'invalid_session' USING ERRCODE='42501';END;
 IF sid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id WHERE s.id=sid AND s.user_id=uid AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous,false)) THEN RAISE EXCEPTION 'invalid_session' USING ERRCODE='42501';END IF;
 IF p_owner IS NULL THEN RAISE EXCEPTION 'invalid_access' USING ERRCODE='22023';END IF;
 IF p_owner AND (uid IS DISTINCT FROM 'dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' OR NOT EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=uid AND f.factor_type='totp' AND f.status='verified')) THEN RAISE EXCEPTION 'owner_mfa_required' USING ERRCODE='42501';END IF;
 RETURN uid;
END;$$;
REVOKE ALL ON FUNCTION public.support_actor(boolean) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.support_list(p_app text,p_owner boolean DEFAULT false,p_before timestamptz DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(p_owner);result jsonb;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') THEN RAISE EXCEPTION 'invalid_app' USING ERRCODE='22023';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO result FROM (
  SELECT s.id,s.app,s.subject,s.version,s.status,s.created_at,s.updated_at,
   CASE WHEN p_owner THEN left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) ELSE null END AS nickname
  FROM public.support_threads s JOIN auth.users u ON u.id=s.user_id
  WHERE (p_owner OR s.user_id=uid) AND s.app=p_app AND (p_before IS NULL OR s.updated_at<p_before)
  ORDER BY s.updated_at DESC,s.id LIMIT 50
 ) t;
 RETURN result;
END;$$;

CREATE OR REPLACE FUNCTION public.support_read(p_id uuid,p_app text,p_owner boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(p_owner);thread jsonb;messages jsonb;
BEGIN
 SELECT to_jsonb(t) INTO thread FROM (
  SELECT s.id,s.app,s.subject,s.version,s.status,s.created_at,s.updated_at,
   CASE WHEN p_owner THEN left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) ELSE null END AS nickname
  FROM public.support_threads s JOIN auth.users u ON u.id=s.user_id WHERE s.id=p_id AND s.app=p_app AND (p_owner OR s.user_id=uid)
 ) t;
 IF thread IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO messages FROM (
  SELECT m.id,m.owner_reply,m.body,m.created_at FROM public.support_messages m WHERE m.thread_id=p_id ORDER BY m.created_at,m.id LIMIT 100
 ) t;
 RETURN jsonb_build_object('thread',thread,'messages',messages);
END;$$;

CREATE OR REPLACE FUNCTION public.support_create(p_id uuid,p_app text,p_subject text,p_body text,p_version text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(false);subject text:=btrim(p_subject);body text:=btrim(p_body);
BEGIN
 IF p_id IS NULL OR p_app IS NULL OR p_app NOT IN ('salah','sahaba') OR subject IS NULL OR length(subject) NOT BETWEEN 1 AND 120 OR body IS NULL OR length(body) NOT BETWEEN 1 AND 3000 OR p_version IS NULL OR length(p_version)>40 THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
 IF EXISTS(SELECT 1 FROM public.support_threads WHERE id=p_id AND user_id=uid AND app=p_app) THEN RETURN p_id;END IF;
 IF (SELECT count(*) FROM public.support_threads WHERE user_id=uid AND created_at>clock_timestamp()-interval '1 day')>=10 OR (SELECT count(*) FROM public.support_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=3 THEN RAISE EXCEPTION 'support_rate_limit' USING ERRCODE='P0001';END IF;
 INSERT INTO public.support_threads(id,user_id,app,subject,version) VALUES(p_id,uid,p_app,subject,p_version);
 INSERT INTO public.support_messages(id,thread_id,author_id,owner_reply,body) VALUES(p_id,p_id,uid,false,body);
 RETURN p_id;
END;$$;

CREATE OR REPLACE FUNCTION public.support_reply(p_thread uuid,p_app text,p_id uuid,p_body text,p_owner boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(p_owner);body text:=btrim(p_body);thread public.support_threads%ROWTYPE;
BEGIN
 IF p_id IS NULL OR p_thread IS NULL OR body IS NULL OR length(body) NOT BETWEEN 1 AND 3000 THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
 SELECT * INTO thread FROM public.support_threads WHERE id=p_thread AND app=p_app AND (p_owner OR user_id=uid) FOR UPDATE;
 IF thread.id IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM public.support_messages WHERE id=p_id AND thread_id=p_thread AND author_id=uid) THEN RETURN;END IF;
 IF thread.status='closed' THEN RAISE EXCEPTION 'conversation_closed' USING ERRCODE='P0001';END IF;
 IF (SELECT count(*) FROM public.support_messages WHERE thread_id=p_thread)>=100 THEN RAISE EXCEPTION 'conversation_full' USING ERRCODE='P0001';END IF;
 IF (SELECT count(*) FROM public.support_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=3 OR (SELECT count(*) FROM public.support_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 day')>=100 THEN RAISE EXCEPTION 'support_rate_limit' USING ERRCODE='P0001';END IF;
 INSERT INTO public.support_messages(id,thread_id,author_id,owner_reply,body) VALUES(p_id,p_thread,uid,p_owner,body);
 UPDATE public.support_threads SET status=CASE WHEN p_owner THEN 'answered' ELSE 'open' END,updated_at=clock_timestamp() WHERE id=p_thread;
END;$$;

CREATE OR REPLACE FUNCTION public.support_close(p_id uuid,p_app text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(true);
BEGIN
 UPDATE public.support_threads SET status='closed',updated_at=clock_timestamp() WHERE id=p_id AND app=p_app;
 IF NOT FOUND THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
END;$$;
REVOKE ALL ON FUNCTION public.support_list(text,boolean,timestamptz),public.support_read(uuid,text,boolean),public.support_create(uuid,text,text,text,text),public.support_reply(uuid,text,uuid,text,boolean),public.support_close(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_list(text,boolean,timestamptz),public.support_read(uuid,text,boolean),public.support_create(uuid,text,text,text,text),public.support_reply(uuid,text,uuid,text,boolean),public.support_close(uuid,text) TO authenticated;
COMMIT;
