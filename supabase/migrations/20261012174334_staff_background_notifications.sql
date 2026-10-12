BEGIN;
CREATE TABLE salah_staff_private.push_devices(
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
 platform text NOT NULL CHECK(platform IN('web','android')),
 subscription jsonb,
 native_token text,
 endpoint_hash text NOT NULL CHECK(length(endpoint_hash)=64),
 enabled boolean NOT NULL DEFAULT true,
 disabled_reason text NOT NULL DEFAULT '' CHECK(disabled_reason IN('','user','expired')),
 enabled_since timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((platform='web' AND subscription IS NOT NULL AND native_token IS NULL) OR (platform='android' AND subscription IS NULL AND native_token IS NOT NULL))
);
CREATE INDEX staff_push_devices_user ON salah_staff_private.push_devices(user_id,updated_at DESC);
CREATE UNIQUE INDEX staff_push_endpoint ON salah_staff_private.push_devices(endpoint_hash) WHERE enabled;
CREATE TABLE salah_staff_private.push_deliveries(
 device_id uuid NOT NULL REFERENCES salah_staff_private.push_devices(id) ON DELETE CASCADE,
 message_id uuid NOT NULL REFERENCES salah_staff_private.chat_messages(id) ON DELETE CASCADE,
 state text NOT NULL CHECK(state IN('sending','sent','retry','expired')),
 claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(device_id,message_id)
);
ALTER TABLE salah_staff_private.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_staff_private.push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON salah_staff_private.push_devices,salah_staff_private.push_deliveries FROM PUBLIC,anon,authenticated;

CREATE FUNCTION salah_staff_private.chat_push_request(p_action text,p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a jsonb:=salah_staff_private.actor();uid uuid:=(a->>'id')::uuid;sid uuid:=(auth.jwt()->>'session_id')::uuid;did uuid:=(p_args->>'device')::uuid;existing salah_staff_private.push_devices%ROWTYPE;hash text;channel text;
BEGIN
 IF p_action='chat.push.status' THEN
  SELECT * INTO existing FROM salah_staff_private.push_devices WHERE id=did AND user_id=uid;
  RETURN jsonb_build_object('enabled',coalesce(existing.enabled AND existing.session_id=sid,false),'platform',existing.platform,'reason',existing.disabled_reason);
 END IF;
 IF (p_args->>'account')::uuid IS DISTINCT FROM uid THEN RAISE EXCEPTION 'account_changed' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,211));
 IF p_action='chat.push.remove' THEN
  UPDATE salah_staff_private.push_devices SET enabled=false,disabled_reason='user',updated_at=clock_timestamp() WHERE id=did AND user_id=uid;
  RETURN jsonb_build_object('enabled',false);
 END IF;
 IF p_action<>'chat.push.register' THEN RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023';END IF;
 SELECT * INTO existing FROM salah_staff_private.push_devices WHERE id=did FOR UPDATE;
 IF existing.id IS NOT NULL AND existing.user_id<>uid THEN RAISE EXCEPTION 'device_unavailable' USING ERRCODE='42501';END IF;
 IF coalesce((p_args->>'renew')::boolean,false) AND (existing.id IS NULL OR NOT existing.enabled AND existing.disabled_reason<>'expired' OR existing.session_id<>sid) THEN RETURN jsonb_build_object('enabled',false);END IF;
 IF existing.id IS NULL AND (SELECT count(*) FROM salah_staff_private.push_devices WHERE user_id=uid)>=20 THEN RAISE EXCEPTION 'device_limit' USING ERRCODE='P0001';END IF;
 channel:=p_args->>'platform';
 IF channel='web' THEN
  IF jsonb_typeof(p_args->'subscription')<>'object' OR length(p_args->'subscription'->>'endpoint')>4096 THEN RAISE EXCEPTION 'invalid_subscription' USING ERRCODE='22023';END IF;
  hash:=encode(sha256(convert_to(p_args->'subscription'->>'endpoint','UTF8')),'hex');
 ELSIF channel='android' THEN
  IF length(p_args->>'token') NOT BETWEEN 100 AND 4096 OR (p_args->>'token') !~ '^[-a-zA-Z0-9_:.]+$' THEN RAISE EXCEPTION 'invalid_token' USING ERRCODE='22023';END IF;
  hash:=encode(sha256(convert_to(p_args->>'token','UTF8')),'hex');
 ELSE RAISE EXCEPTION 'invalid_platform' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(hash,212));
 UPDATE salah_staff_private.push_devices SET enabled=false,disabled_reason='user' WHERE endpoint_hash=hash AND id<>did;
 INSERT INTO salah_staff_private.push_devices(id,user_id,session_id,platform,subscription,native_token,endpoint_hash,enabled,enabled_since,updated_at)
 VALUES(did,uid,sid,channel,CASE WHEN channel='web' THEN p_args->'subscription' ELSE NULL END,CASE WHEN channel='android' THEN p_args->>'token' ELSE NULL END,hash,true,
 CASE WHEN (existing.enabled OR existing.disabled_reason='expired') AND existing.session_id=sid THEN existing.enabled_since ELSE clock_timestamp() END,clock_timestamp())
 ON CONFLICT(id) DO UPDATE SET session_id=excluded.session_id,platform=excluded.platform,subscription=excluded.subscription,native_token=excluded.native_token,endpoint_hash=excluded.endpoint_hash,enabled=true,disabled_reason='',enabled_since=excluded.enabled_since,updated_at=excluded.updated_at;
 RETURN jsonb_build_object('enabled',true,'platform',channel);
END;$$;

-- Called only by the authenticated server dispatcher. Never returns message text.
CREATE FUNCTION salah_staff_private.push_candidates(p_device uuid DEFAULT null,p_message uuid DEFAULT null)
RETURNS TABLE(id uuid,user_id uuid,platform text,subscription jsonb,token text,message_id uuid,room_id uuid,"at" numeric)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT d.id,d.user_id,d.platform,d.subscription,d.native_token,m.id,r.id,extract(epoch FROM m.created_at)*1000
 FROM salah_staff_private.push_devices d
 JOIN auth.users u ON u.id=d.user_id AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous,false)
 JOIN auth.sessions s ON s.id=d.session_id AND s.user_id=d.user_id AND (s.not_after IS NULL OR s.not_after>now())
 LEFT JOIN salah_staff_private.members member ON member.user_id=d.user_id
 JOIN salah_staff_private.chat_rooms r ON r.kind='team' OR d.user_id IN(r.participant_a,r.participant_b)
 JOIN salah_staff_private.chat_messages m ON m.room_id=r.id
 LEFT JOIN salah_staff_private.chat_reads rd ON rd.room_id=r.id AND rd.user_id=d.user_id
 WHERE d.enabled AND d.updated_at>now()-interval '90 days'
 AND (d.user_id='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid OR member.active)
 AND EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=d.user_id AND f.factor_type='totp' AND f.status='verified')
 AND NOT m.redacted AND m.author_id IS DISTINCT FROM d.user_id
 AND m.created_at>greatest(d.enabled_since,coalesce(rd.seen_at,'-infinity'::timestamptz))
 AND m.created_at>now()-interval '24 hours' AND m.created_at<=now()
 AND (p_device IS NULL OR d.id=p_device) AND (p_message IS NULL OR m.id=p_message)
 AND NOT EXISTS(SELECT 1 FROM salah_staff_private.push_deliveries x WHERE x.device_id=d.id AND x.message_id=m.id AND x.state IN('sent','expired'))
 ORDER BY m.created_at,m.id,d.id LIMIT 100;
$$;
REVOKE ALL ON FUNCTION salah_staff_private.chat_push_request(text,jsonb),salah_staff_private.push_candidates(uuid,uuid) FROM PUBLIC,anon,authenticated;
COMMIT;
