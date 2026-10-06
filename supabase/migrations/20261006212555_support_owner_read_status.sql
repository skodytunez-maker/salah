BEGIN;
CREATE OR REPLACE FUNCTION public.support_owner_status(p_app text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(true);pending bigint;unanswered bigint;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') THEN RAISE EXCEPTION 'invalid_app' USING ERRCODE='22023';END IF;
 SELECT count(*) FILTER (WHERE s.status='open'),
  count(*) FILTER (WHERE EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=s.id AND NOT m.owner_reply AND m.created_at>s.owner_seen_at))
 INTO unanswered,pending FROM public.support_threads s WHERE s.app=p_app;
 -- Keep "pending" for installed clients: it now counts unread conversations.
 RETURN jsonb_build_object('pending',pending,'unanswered',unanswered);
END;$$;

CREATE OR REPLACE FUNCTION public.support_read(p_id uuid, p_app text, p_owner boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=public.support_actor(p_owner);thread jsonb;messages jsonb;seen_reply timestamptz;
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
 IF p_owner THEN
  -- Acknowledge only user messages included in this returned snapshot.
  -- Concurrent or later messages remain unread; older reads cannot move it back.
  SELECT max((e.value->>'created_at')::timestamptz) INTO seen_reply FROM jsonb_array_elements(messages) e(value) WHERE e.value->>'owner_reply'='false';
  UPDATE public.support_threads s SET owner_seen_at=greatest(s.owner_seen_at,coalesce(seen_reply,s.owner_seen_at)) WHERE s.id=p_id;
 ELSE
  -- A concurrent reply not included in this message snapshot must remain unread.
  SELECT max((e.value->>'created_at')::timestamptz) INTO seen_reply FROM jsonb_array_elements(messages) e(value) WHERE e.value->>'owner_reply'='true';
  UPDATE public.support_threads s SET user_seen_at=greatest(s.user_seen_at,coalesce(seen_reply,s.user_seen_at)) WHERE s.id=p_id AND s.user_id=uid;
 END IF;
 RETURN jsonb_build_object('thread',thread,'messages',messages);
END;$function$;
REVOKE ALL ON FUNCTION public.support_owner_status(text) FROM PUBLIC,anon,authenticated;
COMMIT;
