BEGIN;

CREATE TABLE salah_support_private.conversation_themes (
  contact_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL CHECK (theme IN ('default','ornament','medina','emerald','graphite','bronze','lake','amethyst','stars')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
ALTER TABLE salah_support_private.conversation_themes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE salah_support_private.conversation_themes FROM PUBLIC, anon, authenticated;

CREATE FUNCTION salah_support_private.conversation_theme(p_thread uuid, p_owner boolean, p_theme text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  actor_id uuid := public.support_actor(p_owner);
  contact uuid;
  selected_theme text;
  selected_version integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.sessions s
    WHERE s.id = (auth.jwt()->>'session_id')::uuid AND s.user_id = actor_id
      AND (s.not_after IS NULL OR s.not_after > now())
  ) THEN RAISE EXCEPTION 'invalid_session' USING ERRCODE = '42501'; END IF;

  SELECT t.user_id INTO contact
  FROM public.support_threads t
  WHERE t.id = p_thread AND t.app = 'salah' AND (p_owner OR t.user_id = actor_id);
  IF contact IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE = '42501'; END IF;

  IF p_theme IS NULL THEN
    SELECT c.theme, c.version INTO selected_theme, selected_version
    FROM salah_support_private.conversation_themes c WHERE c.contact_id = contact;
  ELSE
    IF p_theme NOT IN ('default','ornament','medina','emerald','graphite','bronze','lake','amethyst','stars') THEN
      RAISE EXCEPTION 'invalid_theme' USING ERRCODE = '22023';
    END IF;
    INSERT INTO salah_support_private.conversation_themes AS c (contact_id, theme)
    VALUES (contact, p_theme)
    ON CONFLICT (contact_id) DO UPDATE SET theme = EXCLUDED.theme, version = c.version + 1
    RETURNING c.theme, c.version INTO selected_theme, selected_version;
  END IF;

  RETURN jsonb_build_object('theme', selected_theme, 'version', coalesce(selected_version, 0));
END;
$$;
REVOKE ALL ON FUNCTION salah_support_private.conversation_theme(uuid, boolean, text) FROM PUBLIC, anon, authenticated;

COMMIT;
