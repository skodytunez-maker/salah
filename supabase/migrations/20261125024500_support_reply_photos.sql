BEGIN;

CREATE TABLE salah_support_private.reply_photo_batches (
  message_id uuid PRIMARY KEY REFERENCES public.support_messages(id) ON DELETE CASCADE,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  photo_count smallint NOT NULL CHECK (photo_count BETWEEN 1 AND 5)
);
ALTER TABLE salah_support_private.reply_photo_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE salah_support_private.reply_photo_batches FROM PUBLIC, anon, authenticated;

CREATE FUNCTION salah_support_private.begin_reply_photos(
  p_owner boolean, p_thread uuid, p_message uuid, p_body text, p_reply_to uuid,
  p_fingerprint text, p_count integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  actor_id uuid := public.support_actor(p_owner);
  existing salah_support_private.reply_photo_batches%ROWTYPE;
  result jsonb;
BEGIN
  IF p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$' OR p_count IS NULL OR p_count NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'invalid_photo' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.sessions s
    WHERE s.id = (auth.jwt()->>'session_id')::uuid AND s.user_id = actor_id
      AND (s.not_after IS NULL OR s.not_after > now())) THEN
    RAISE EXCEPTION 'invalid_session' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  IF NOT EXISTS (SELECT 1 FROM public.support_threads t
    WHERE t.id = p_thread AND t.app = 'salah' AND (p_owner OR t.user_id = actor_id)) THEN
    RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.support_messages WHERE id = p_message) THEN
    SELECT b.* INTO existing
    FROM salah_support_private.reply_photo_batches b
    JOIN public.support_messages m ON m.id = b.message_id
    WHERE b.message_id = p_message AND m.thread_id = p_thread AND m.author_id = actor_id
      AND m.owner_reply = p_owner;
    IF existing.fingerprint IS DISTINCT FROM p_fingerprint OR existing.photo_count IS DISTINCT FROM p_count THEN
      RAISE EXCEPTION 'operation_conflict' USING ERRCODE = '22023';
    END IF;
    PERFORM public.support_chat_request('salah', p_owner, 'reply', jsonb_build_object(
      'threadId', p_thread, 'messageId', p_message, 'body', p_body, 'replyTo', p_reply_to));
    RETURN jsonb_build_object('ok', true, 'threadId', p_thread, 'messageId', p_message, 'replay', true);
  END IF;
  result := public.support_chat_request('salah', p_owner, 'reply', jsonb_build_object(
    'threadId', p_thread, 'messageId', p_message, 'body', p_body, 'replyTo', p_reply_to));
  INSERT INTO salah_support_private.reply_photo_batches (message_id, fingerprint, photo_count)
  VALUES (p_message, p_fingerprint, p_count);
  RETURN result;
END;
$$;

CREATE FUNCTION salah_support_private.register_reply_photo(
  p_owner boolean, p_message uuid, p_path text, p_bytes integer, p_index integer
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  actor_id uuid := public.support_actor(p_owner);
  batch salah_support_private.reply_photo_batches%ROWTYPE;
  expected text;
  stored_size integer;
BEGIN
  SELECT b.* INTO batch FROM salah_support_private.reply_photo_batches b
  JOIN public.support_messages m ON m.id = b.message_id
  JOIN public.support_threads t ON t.id = m.thread_id
  WHERE b.message_id = p_message AND m.author_id = actor_id AND m.owner_reply = p_owner
    AND t.app = 'salah' AND (p_owner OR t.user_id = actor_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE = '42501'; END IF;
  IF p_bytes IS NULL OR p_bytes NOT BETWEEN 1 AND 614400 OR p_index IS NULL OR p_index < 0 OR p_index >= batch.photo_count THEN
    RAISE EXCEPTION 'invalid_photo' USING ERRCODE = '22023';
  END IF;
  expected := 'salah/' || actor_id || '/' || p_message || '.' || batch.fingerprint || '.' || p_index || '.jpg';
  IF p_path IS DISTINCT FROM expected THEN RAISE EXCEPTION 'invalid_photo' USING ERRCODE = '22023'; END IF;
  SELECT (o.metadata->>'size')::integer INTO stored_size FROM storage.objects o
  WHERE o.bucket_id = 'support-photos' AND o.name = p_path AND o.metadata->>'mimetype' = 'image/jpeg';
  IF stored_size IS DISTINCT FROM p_bytes THEN RAISE EXCEPTION 'invalid_photo' USING ERRCODE = '22023'; END IF;
  INSERT INTO salah_support_private.photos (message_id, photo_index, uploader_id, object_path, size_bytes)
  VALUES (p_message, p_index, actor_id, p_path, stored_size);
END;
$$;
REVOKE ALL ON FUNCTION salah_support_private.begin_reply_photos(boolean,uuid,uuid,text,uuid,text,integer),
  salah_support_private.register_reply_photo(boolean,uuid,text,integer,integer) FROM PUBLIC, anon, authenticated;

COMMIT;
