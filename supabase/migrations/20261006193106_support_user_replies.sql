BEGIN;
ALTER TABLE public.support_threads ADD COLUMN user_seen_at timestamptz NOT NULL DEFAULT '-infinity'::timestamptz;
CREATE INDEX support_messages_owner_replies ON public.support_messages(thread_id,created_at DESC) WHERE owner_reply;

CREATE OR REPLACE FUNCTION public.support_list(p_app text,p_owner boolean DEFAULT false,p_before timestamptz DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(p_owner);result jsonb;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') THEN RAISE EXCEPTION 'invalid_app' USING ERRCODE='22023';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO result FROM (
  SELECT s.id,s.app,s.subject,s.version,s.status,s.created_at,s.updated_at,
   CASE WHEN p_owner THEN left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) ELSE null END AS nickname,
   CASE WHEN p_owner THEN EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=s.id AND NOT m.owner_reply AND m.created_at>s.owner_seen_at) ELSE false END AS owner_unread,
   CASE WHEN NOT p_owner THEN EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=s.id AND m.owner_reply AND m.created_at>s.user_seen_at) ELSE false END AS user_unread,
   CASE WHEN NOT p_owner THEN (SELECT left(m.body,140) FROM public.support_messages m WHERE m.thread_id=s.id AND m.owner_reply ORDER BY m.created_at DESC,m.id DESC LIMIT 1) ELSE null END AS last_reply
  FROM public.support_threads s JOIN auth.users u ON u.id=s.user_id
  WHERE (p_owner OR s.user_id=uid) AND s.app=p_app AND (p_before IS NULL OR s.updated_at<p_before)
  ORDER BY s.updated_at DESC,s.id LIMIT 50
 ) t;
 RETURN result;
END;$$;

CREATE OR REPLACE FUNCTION public.support_read(p_id uuid,p_app text,p_owner boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(p_owner);thread jsonb;messages jsonb;seen_reply timestamptz;
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
 IF NOT p_owner THEN
  -- A concurrent reply not included in this message snapshot must remain unread.
  SELECT max((e.value->>'created_at')::timestamptz) INTO seen_reply FROM jsonb_array_elements(messages) e(value) WHERE e.value->>'owner_reply'='true';
  UPDATE public.support_threads s SET user_seen_at=greatest(s.user_seen_at,coalesce(seen_reply,s.user_seen_at)) WHERE s.id=p_id AND s.user_id=uid;
 END IF;
 RETURN jsonb_build_object('thread',thread,'messages',messages);
END;$$;

CREATE FUNCTION public.support_user_status(p_app text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(false);pending bigint;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') THEN RAISE EXCEPTION 'invalid_app' USING ERRCODE='22023';END IF;
 SELECT count(*) INTO pending FROM public.support_threads s WHERE s.user_id=uid AND s.app=p_app AND EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=s.id AND m.owner_reply AND m.created_at>s.user_seen_at);
 RETURN jsonb_build_object('pending',pending);
END;$$;
REVOKE ALL ON FUNCTION public.support_user_status(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.support_list(text,boolean,timestamptz),public.support_read(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_list(text,boolean,timestamptz),public.support_read(uuid,text,boolean) TO authenticated;
COMMIT;
