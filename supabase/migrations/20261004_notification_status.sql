-- Minimal device status only. No prayer, Quran or adhkar activity is collected.
CREATE TABLE IF NOT EXISTS public.app_notification_status (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 tab_id uuid NOT NULL,
 session_id uuid NOT NULL,
 enabled boolean NOT NULL,
 permission text NOT NULL CHECK(permission IN ('granted','denied','default','unsupported')),
 browser_notifications boolean NOT NULL,
 push_device_id uuid,
 checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,tab_id)
);
ALTER TABLE public.app_notification_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_notification_status FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS app_notification_status_user_checked ON public.app_notification_status(user_id,checked_at DESC);
COMMENT ON TABLE public.app_notification_status IS 'Private reminder configuration from signed active SALAH sessions; no worship history.';
