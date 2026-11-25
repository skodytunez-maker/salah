BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('support-chat-media','support-chat-media',false,20971520,ARRAY['video/mp4','video/quicktime','audio/mp4','audio/webm']);

CREATE TABLE salah_support_private.reply_media (
  draft_id uuid PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_reply boolean NOT NULL,
  object_path text NOT NULL UNIQUE,
  mime text NOT NULL CHECK (mime IN ('video/mp4','video/quicktime','audio/mp4','audio/webm')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 16 AND 20971520),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_id uuid UNIQUE REFERENCES public.support_messages(id) ON DELETE CASCADE,
  CHECK (published_id IS NULL OR published_id = draft_id)
);
ALTER TABLE salah_support_private.reply_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE salah_support_private.reply_media FROM PUBLIC, anon, authenticated;
CREATE INDEX support_reply_media_author_pending
  ON salah_support_private.reply_media(author_id, created_at) WHERE published_id IS NULL;

CREATE FUNCTION salah_support_private.reply_media_request(p_owner boolean, p_thread uuid, p_draft uuid, p_phase text, p_args jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  uid uuid := public.support_actor(p_owner);
  item salah_support_private.reply_media%ROWTYPE;
  body_text text;
  quote_id uuid;
  pending_mime text;
  pending_size integer;
  recorded boolean;
  result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.sessions s WHERE s.user_id = uid
    AND s.id = (auth.jwt()->>'session_id')::uuid AND (s.not_after IS NULL OR s.not_after > now())) THEN
    RAISE EXCEPTION 'invalid_session' USING ERRCODE = '42501';
  END IF;
  IF p_draft IS NULL OR p_phase IS NULL OR p_phase NOT IN ('reserve','inspect','publish') OR jsonb_typeof(p_args) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'invalid_parameters' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
  IF NOT EXISTS (SELECT 1 FROM public.support_threads t
    WHERE t.id = p_thread AND t.app = 'salah' AND (p_owner OR t.user_id = uid)) THEN
    RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO item FROM salah_support_private.reply_media v WHERE v.draft_id = p_draft;
  IF p_phase = 'reserve' THEN
    pending_mime := p_args->>'mime'; pending_size := (p_args->>'bytes')::integer;
    IF pending_mime IS NULL OR pending_mime NOT IN ('video/mp4','video/quicktime','audio/mp4','audio/webm') OR pending_size IS NULL OR pending_size NOT BETWEEN 16 AND (CASE WHEN pending_mime LIKE 'audio/%' THEN 6291456 ELSE 20971520 END) THEN
      RAISE EXCEPTION 'invalid_video' USING ERRCODE = '22023';
    END IF;
    IF item.draft_id IS NULL THEN
      IF EXISTS (SELECT 1 FROM public.support_threads WHERE id=p_thread AND status='closed') THEN
        RAISE EXCEPTION 'conversation_closed' USING ERRCODE = 'P0001';
      END IF;
      IF (SELECT count(*) FROM salah_support_private.reply_media WHERE author_id=uid AND published_id IS NULL AND created_at>now()-interval '1 day') >= 5 THEN
        RAISE EXCEPTION 'support_rate_limit' USING ERRCODE = 'P0001';
      END IF;
      IF EXISTS (SELECT 1 FROM public.support_messages WHERE id=p_draft) THEN
        RAISE EXCEPTION 'operation_conflict' USING ERRCODE = '22023';
      END IF;
      INSERT INTO salah_support_private.reply_media(draft_id,thread_id,author_id,owner_reply,object_path,mime,size_bytes)
      VALUES (p_draft,p_thread,uid,p_owner,'salah/'||uid||'/'||p_draft||'/'||pg_catalog.gen_random_uuid()||
        CASE pending_mime WHEN 'video/quicktime' THEN '.mov' WHEN 'audio/mp4' THEN '.m4a' WHEN 'audio/webm' THEN '.webm' ELSE '.mp4' END,pending_mime,pending_size)
      RETURNING * INTO item;
    END IF;
  END IF;
  IF item.draft_id IS NULL OR item.thread_id IS DISTINCT FROM p_thread OR item.author_id IS DISTINCT FROM uid OR item.owner_reply IS DISTINCT FROM p_owner THEN
    RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE = '42501';
  END IF;
  IF p_phase = 'reserve' AND (item.mime <> pending_mime OR item.size_bytes <> pending_size) THEN
    RAISE EXCEPTION 'operation_conflict' USING ERRCODE = '22023';
  END IF;
  IF item.published_id IS NULL AND item.created_at <= now()-interval '1 day' THEN
    RAISE EXCEPTION 'upload_expired' USING ERRCODE = '22023';
  END IF;
  SELECT EXISTS (SELECT 1 FROM storage.objects s WHERE s.bucket_id='support-chat-media' AND s.name=item.object_path
    AND s.metadata->>'mimetype'=item.mime AND s.metadata->>'size'=item.size_bytes::text) INTO recorded;
  IF p_phase <> 'publish' THEN
    RETURN jsonb_build_object('path',item.object_path,'mime',item.mime,'uploaded',recorded,'published',item.published_id IS NOT NULL);
  END IF;

  body_text := coalesce(nullif(btrim(p_args->>'body'),''),'📎');
  quote_id := (p_args->>'replyTo')::uuid;
  IF item.published_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.support_messages m WHERE m.id=p_draft AND m.thread_id=p_thread
      AND m.author_id=uid AND m.body=body_text AND m.reply_to IS NOT DISTINCT FROM quote_id) THEN
      RAISE EXCEPTION 'operation_conflict' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('ok',true,'messageId',p_draft,'threadId',p_thread);
  END IF;
  IF NOT recorded OR p_args->>'verified' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'upload_incomplete' USING ERRCODE = '22023';
  END IF;
  result := public.support_chat_request('salah',p_owner,'reply',jsonb_build_object(
    'threadId',p_thread,'messageId',p_draft,'body',body_text,'replyTo',quote_id));
  UPDATE salah_support_private.reply_media SET published_id=p_draft WHERE draft_id=p_draft;
  RETURN result;
END;
$$;

CREATE FUNCTION salah_support_private.reply_media_manifest(p_thread uuid,p_owner boolean,p_messages uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE uid uuid:=public.support_actor(p_owner); contact uuid;
BEGIN
  SELECT t.user_id INTO contact FROM public.support_threads t WHERE t.id=p_thread AND t.app='salah' AND(p_owner OR t.user_id=uid);
  IF contact IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE = '42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('message_id',v.published_id,'path',v.object_path,'mime',v.mime))
    FROM salah_support_private.reply_media v JOIN public.support_threads t ON t.id=v.thread_id
    WHERE t.app='salah' AND t.user_id=contact AND v.published_id=ANY(p_messages)
      AND salah_support_private.chat_visible(v.published_id,uid)),'[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION salah_support_private.reply_media_request(boolean,uuid,uuid,text,jsonb),
  salah_support_private.reply_media_manifest(uuid,boolean,uuid[]) FROM PUBLIC,anon,authenticated;
COMMIT;
