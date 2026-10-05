-- Add technical diagnostics without changing RLS, grants or existing counter values.
ALTER TABLE public.app_presence ADD COLUMN IF NOT EXISTS app_version integer;
ALTER TABLE public.app_presence ADD COLUMN IF NOT EXISTS version_checked_at timestamptz;
ALTER TABLE public.app_presence ADD CONSTRAINT app_presence_version_range CHECK(app_version IS NULL OR app_version BETWEEN 1 AND 1000000);
ALTER TABLE salah_counter_private.components ADD COLUMN IF NOT EXISTS saved_at timestamptz;
COMMENT ON COLUMN public.app_presence.app_version IS 'Client-reported SALAH version, diagnostic only; never grants authority.';
COMMENT ON COLUMN public.app_presence.version_checked_at IS 'Server timestamp of the most recent version report; legacy clients do not refresh it.';
COMMENT ON COLUMN salah_counter_private.components.saved_at IS 'Server timestamp of a successful counter save transaction; existing unknown times stay null.';
