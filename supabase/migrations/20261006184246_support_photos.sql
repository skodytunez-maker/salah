BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('support-photos','support-photos',false,614400,ARRAY['image/jpeg'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=614400,allowed_mime_types=ARRAY['image/jpeg'];

CREATE SCHEMA salah_support_private;
REVOKE ALL ON SCHEMA salah_support_private FROM PUBLIC,anon,authenticated;
CREATE TABLE salah_support_private.photos(
 message_id uuid PRIMARY KEY REFERENCES public.support_messages(id) ON DELETE CASCADE,
 uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 object_path text NOT NULL UNIQUE,
 size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 614400),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX support_photos_uploader ON salah_support_private.photos(uploader_id);
ALTER TABLE salah_support_private.photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON salah_support_private.photos FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.support_photo_register(p_message uuid,p_app text,p_path text,p_bytes integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(false);stored_size integer;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') OR p_message IS NULL OR p_path IS DISTINCT FROM p_app||'/'||uid::text||'/'||p_message::text||'.jpg' OR p_bytes IS NULL OR p_bytes NOT BETWEEN 1 AND 614400 THEN RAISE EXCEPTION 'invalid_photo' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.support_messages m JOIN public.support_threads t ON t.id=m.thread_id WHERE m.id=p_message AND t.app=p_app AND t.user_id=uid AND m.author_id=uid AND NOT m.owner_reply AND m.id=t.id) THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM salah_support_private.photos WHERE message_id=p_message AND uploader_id=uid AND object_path=p_path) THEN RETURN;END IF;
 SELECT (o.metadata->>'size')::integer INTO stored_size FROM storage.objects o WHERE o.bucket_id='support-photos' AND o.name=p_path AND o.metadata->>'mimetype'='image/jpeg';
 IF stored_size IS NULL OR stored_size NOT BETWEEN 1 AND 614400 THEN RAISE EXCEPTION 'invalid_photo' USING ERRCODE='22023';END IF;
 INSERT INTO salah_support_private.photos(message_id,uploader_id,object_path,size_bytes) VALUES(p_message,uid,p_path,stored_size);
END;$$;

CREATE FUNCTION public.support_photo_manifest(p_thread uuid,p_app text,p_owner boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(p_owner);result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.support_threads t WHERE t.id=p_thread AND t.app=p_app AND (p_owner OR t.user_id=uid)) THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('message_id',p.message_id,'path',p.object_path)),'[]'::jsonb) INTO result FROM salah_support_private.photos p JOIN public.support_messages m ON m.id=p.message_id WHERE m.thread_id=p_thread;
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.support_photo_register(uuid,text,text,integer),public.support_photo_manifest(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
COMMIT;
