-- The owner may start a private conversation with a registered recipient.
-- Existing per-app threads, reply badges and read markers are reused.
BEGIN;
CREATE FUNCTION public.support_owner_recipient(p_user uuid,p_app text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(true);recipient jsonb;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') OR p_user IS NULL THEN RAISE EXCEPTION 'invalid_recipient' USING ERRCODE='22023';END IF;
 SELECT jsonb_build_object('id',u.id,'nickname',left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Без ника'),40))
 INTO recipient FROM auth.users u WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous,false);
 IF recipient IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
 RETURN recipient;
END;$$;
CREATE FUNCTION public.support_owner_create(p_id uuid,p_user uuid,p_app text,p_subject text,p_body text,p_version text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(true);subject text:=btrim(p_subject);body text:=btrim(p_body);
BEGIN
 IF p_id IS NULL OR subject IS NULL OR length(subject) NOT BETWEEN 1 AND 120 OR body IS NULL OR length(body) NOT BETWEEN 1 AND 3000 OR p_version IS NULL OR length(p_version)>40 THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE='22023';END IF;
 PERFORM public.support_owner_recipient(p_user,p_app);
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
 IF EXISTS(SELECT 1 FROM public.support_threads t JOIN public.support_messages m ON m.thread_id=t.id WHERE t.id=p_id AND t.user_id=p_user AND t.app=p_app AND m.id=p_id AND m.author_id=uid AND m.owner_reply) THEN RETURN p_id;END IF;
 IF EXISTS(SELECT 1 FROM public.support_threads WHERE id=p_id) THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE='22023';END IF;
 IF (SELECT count(*) FROM public.support_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=3 OR (SELECT count(*) FROM public.support_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 day')>=100 THEN RAISE EXCEPTION 'support_rate_limit' USING ERRCODE='P0001';END IF;
 INSERT INTO public.support_threads(id,user_id,app,subject,version,status) VALUES(p_id,p_user,p_app,subject,p_version,'answered');
 INSERT INTO public.support_messages(id,thread_id,author_id,owner_reply,body) VALUES(p_id,p_id,uid,true,body);
 RETURN p_id;
END;$$;
-- Private tables require a guarded definer API; direct table access stays revoked.
REVOKE ALL ON FUNCTION public.support_owner_recipient(uuid,text),public.support_owner_create(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_owner_recipient(uuid,text),public.support_owner_create(uuid,uuid,text,text,text,text) TO authenticated;
COMMIT;
