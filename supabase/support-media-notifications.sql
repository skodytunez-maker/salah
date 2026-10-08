BEGIN;
ALTER TABLE salah_support_private.photos ADD COLUMN photo_index smallint NOT NULL DEFAULT 0 CHECK(photo_index BETWEEN 0 AND 4);
ALTER TABLE salah_support_private.photos DROP CONSTRAINT photos_pkey;
ALTER TABLE salah_support_private.photos ADD PRIMARY KEY(message_id,photo_index);
CREATE FUNCTION public.support_photo_register_slot(p_message uuid,p_app text,p_path text,p_bytes integer,p_index integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(false);stored_size integer;expected text;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') OR p_message IS NULL OR p_index IS NULL OR p_index NOT BETWEEN 0 AND 4 OR p_bytes IS NULL OR p_bytes NOT BETWEEN 1 AND 614400 THEN RAISE EXCEPTION 'invalid_photo' USING ERRCODE='22023';END IF;
 expected:=p_app||'/'||uid::text||'/'||p_message::text||CASE WHEN p_index=0 THEN '' ELSE '.'||p_index::text END||'.jpg';
 IF p_path IS DISTINCT FROM expected THEN RAISE EXCEPTION 'invalid_photo' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.support_messages m JOIN public.support_threads t ON t.id=m.thread_id WHERE m.id=p_message AND t.app=p_app AND t.user_id=uid AND m.author_id=uid AND NOT m.owner_reply AND m.id=t.id) THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM salah_support_private.photos WHERE message_id=p_message AND photo_index=p_index AND uploader_id=uid AND object_path=p_path) THEN RETURN;END IF;
 SELECT (o.metadata->>'size')::integer INTO stored_size FROM storage.objects o WHERE o.bucket_id='support-photos' AND o.name=p_path AND o.metadata->>'mimetype'='image/jpeg';
 IF stored_size IS NULL OR stored_size IS DISTINCT FROM p_bytes THEN RAISE EXCEPTION 'invalid_photo' USING ERRCODE='22023';END IF;
 INSERT INTO salah_support_private.photos(message_id,photo_index,uploader_id,object_path,size_bytes) VALUES(p_message,p_index,uid,p_path,stored_size);
END;$$;
CREATE OR REPLACE FUNCTION public.support_photo_manifest(p_thread uuid,p_app text,p_owner boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(p_owner);result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.support_threads t WHERE t.id=p_thread AND t.app=p_app AND (p_owner OR t.user_id=uid)) THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('message_id',p.message_id,'path',p.object_path) ORDER BY p.created_at,p.photo_index),'[]'::jsonb) INTO result FROM salah_support_private.photos p JOIN public.support_messages m ON m.id=p.message_id WHERE m.thread_id=p_thread;
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.support_photo_register_slot(uuid,text,text,integer,integer) FROM PUBLIC,anon,authenticated;
COMMIT;

BEGIN;
CREATE TABLE salah_support_private.notification_events(
 message_id uuid PRIMARY KEY REFERENCES public.support_messages(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE salah_support_private.notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON salah_support_private.notification_events FROM PUBLIC,anon,authenticated;
CREATE FUNCTION salah_support_private.queue_notification() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE recipient uuid;
BEGIN
 SELECT CASE WHEN NEW.owner_reply THEN t.user_id ELSE 'dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid END INTO recipient FROM public.support_threads t WHERE t.id=NEW.thread_id AND t.app='salah';
 IF recipient IS NOT NULL AND recipient<>NEW.author_id THEN INSERT INTO salah_support_private.notification_events(message_id,recipient_id,thread_id) VALUES(NEW.id,recipient,NEW.thread_id) ON CONFLICT DO NOTHING;END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION salah_support_private.queue_notification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER support_message_notification AFTER INSERT ON public.support_messages FOR EACH ROW EXECUTE FUNCTION salah_support_private.queue_notification();
CREATE OR REPLACE FUNCTION public.support_owner_status(p_app text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(true);pending bigint;unanswered bigint;latest jsonb;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') THEN RAISE EXCEPTION 'invalid_app' USING ERRCODE='22023';END IF;
 SELECT count(*) FILTER(WHERE s.status='open'),count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=s.id AND NOT m.owner_reply AND m.created_at>s.owner_seen_at)) INTO unanswered,pending FROM public.support_threads s WHERE s.app=p_app;
 SELECT jsonb_build_object('id',m.id,'thread',m.thread_id) INTO latest FROM public.support_messages m JOIN public.support_threads t ON t.id=m.thread_id WHERE t.app=p_app AND NOT m.owner_reply AND m.created_at>t.owner_seen_at ORDER BY m.created_at DESC,m.id DESC LIMIT 1;
 RETURN jsonb_build_object('pending',pending,'unanswered',unanswered,'latest',latest);
END;$$;
CREATE OR REPLACE FUNCTION public.support_user_status(p_app text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(false);pending bigint;latest jsonb;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') THEN RAISE EXCEPTION 'invalid_app' USING ERRCODE='22023';END IF;
 SELECT count(*) INTO pending FROM public.support_threads t WHERE t.app=p_app AND t.user_id=uid AND EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=t.id AND m.owner_reply AND m.created_at>t.user_seen_at);
 SELECT jsonb_build_object('id',m.id,'thread',m.thread_id) INTO latest FROM public.support_messages m JOIN public.support_threads t ON t.id=m.thread_id WHERE t.app=p_app AND t.user_id=uid AND m.owner_reply AND m.created_at>t.user_seen_at ORDER BY m.created_at DESC,m.id DESC LIMIT 1;
 RETURN jsonb_build_object('pending',pending,'latest',latest);
END;$$;
COMMIT;
