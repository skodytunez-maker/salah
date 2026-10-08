-- Device-reported scheduling receipt, not proof of delivery or an authorization claim.
ALTER TABLE public.app_notification_status ADD COLUMN IF NOT EXISTS native_until timestamptz;
ALTER TABLE public.app_notification_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_notification_status FROM PUBLIC,anon,authenticated;
COMMENT ON COLUMN public.app_notification_status.native_until IS 'Last queued native prayer reminder; bounded by the server, expires automatically; no worship history.';
