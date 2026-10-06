-- Mark owner inbox messages as unread until the owner opens the conversation.
-- Existing threads start as seen; new user messages are marked unread.
BEGIN;
ALTER TABLE public.support_threads ADD COLUMN IF NOT EXISTS owner_seen_at timestamptz;
UPDATE public.support_threads SET owner_seen_at=updated_at WHERE owner_seen_at IS NULL;
ALTER TABLE public.support_threads ALTER COLUMN owner_seen_at SET DEFAULT clock_timestamp();
ALTER TABLE public.support_threads ALTER COLUMN owner_seen_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.support_list(p_app text,p_owner boolean DEFAULT false,p_before timestamptz DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(p_owner);result jsonb;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') THEN RAISE EXCEPTION 'invalid_app' USING ERRCODE='22023';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO result FROM (
  SELECT s.id,s.app,s.subject,s.version,s.status,s.created_at,s.updated_at,
   CASE WHEN p_owner THEN left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) ELSE null END AS nickname,
   CASE WHEN p_owner THEN EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=s.id AND NOT m.owner_reply AND m.created_at>coalesce(s.owner_seen_at,'-infinity'::timestamptz)) ELSE false END AS owner_unread
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
 IF p_owner THEN UPDATE public.support_threads s SET owner_seen_at=coalesce((SELECT max(m.created_at) FROM public.support_messages m WHERE m.thread_id=s.id AND NOT m.owner_reply),s.owner_seen_at) WHERE s.id=p_id;END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO messages FROM (
  SELECT m.id,m.owner_reply,m.body,m.created_at FROM public.support_messages m WHERE m.thread_id=p_id ORDER BY m.created_at,m.id LIMIT 100
 ) t;
 RETURN jsonb_build_object('thread',thread,'messages',messages);
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
 IF p_owner THEN UPDATE public.support_threads s SET owner_seen_at=coalesce((SELECT max(m.created_at) FROM public.support_messages m WHERE m.thread_id=s.id AND NOT m.owner_reply),s.owner_seen_at) WHERE s.id=p_thread;END IF;
END;$$;

REVOKE ALL ON FUNCTION public.support_list(text,boolean,timestamptz),public.support_read(uuid,text,boolean),public.support_reply(uuid,text,uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_list(text,boolean,timestamptz),public.support_read(uuid,text,boolean),public.support_reply(uuid,text,uuid,text,boolean) TO authenticated;
COMMIT;
