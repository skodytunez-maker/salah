BEGIN;
CREATE TABLE salah_support_private.native_devices(
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
 token text CHECK(token IS NULL OR length(token) BETWEEN 100 AND 4096),
 token_hash text UNIQUE,
 enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE salah_support_private.native_devices ENABLE ROW LEVEL SECURITY;
CREATE INDEX native_support_devices_user ON salah_support_private.native_devices(user_id) WHERE enabled;
REVOKE ALL ON salah_support_private.native_devices FROM PUBLIC,anon,authenticated;
CREATE TABLE salah_support_private.native_deliveries(
 device_id uuid REFERENCES salah_support_private.native_devices(id) ON DELETE CASCADE,
 message_id uuid REFERENCES public.support_messages(id) ON DELETE CASCADE,
 state text NOT NULL CHECK(state IN('sending','sent','retry','expired')),
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(device_id,message_id)
);
ALTER TABLE salah_support_private.native_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON salah_support_private.native_deliveries FROM PUBLIC,anon,authenticated;
COMMIT;
