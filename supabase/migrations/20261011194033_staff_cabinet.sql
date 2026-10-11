BEGIN;
-- Server-only staff workspace. No staff account is granted by this migration.
CREATE SCHEMA IF NOT EXISTS salah_staff_private;
REVOKE ALL ON SCHEMA salah_staff_private FROM PUBLIC,anon,authenticated;
CREATE TABLE salah_staff_private.members(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL DEFAULT 'moderator' CHECK(role IN('admin','moderator')),
 permissions text[] NOT NULL CHECK(cardinality(permissions) BETWEEN 1 AND 3 AND permissions <@ ARRAY['support','reciters','wallpapers']::text[]),
 active boolean NOT NULL DEFAULT true,
 updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(user_id<>'dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid)
);
CREATE TABLE salah_staff_private.drafts(
 id uuid PRIMARY KEY,
 author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN('reciter','wallpaper')),
 entity_id text NOT NULL CHECK(entity_id~'^[a-z0-9][a-z0-9.-]{0,79}$'),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=65536),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','submitted','changes_requested','rejected','published')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 base_revision integer NOT NULL DEFAULT 0,
 review_note text NOT NULL DEFAULT '' CHECK(length(review_note)<=1000),
 reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE salah_staff_private.assets(
 id uuid PRIMARY KEY,
 draft_id uuid NOT NULL REFERENCES salah_staff_private.drafts(id) ON DELETE CASCADE,
 uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 object_path text NOT NULL UNIQUE,
 bytes integer NOT NULL CHECK(bytes BETWEEN 20 AND 2097152),
 width integer NOT NULL CHECK(width BETWEEN 64 AND 4096),
 height integer NOT NULL CHECK(height BETWEEN 64 AND 4096),
 sha256 text NOT NULL CHECK(sha256~'^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE salah_staff_private.catalog(
 kind text NOT NULL CHECK(kind IN('reciter','wallpaper')),
 entity_id text NOT NULL,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=65536),
 revision integer NOT NULL CHECK(revision>0),
 draft_id uuid REFERENCES salah_staff_private.drafts(id) ON DELETE SET NULL,
 approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(kind,entity_id)
);
CREATE TABLE salah_staff_private.audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 action text NOT NULL CHECK(length(action)<=60),
 target text NOT NULL CHECK(length(target)<=100),
 detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(octet_length(detail::text)<=2048),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE salah_staff_private.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_staff_private.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_staff_private.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_staff_private.catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_staff_private.audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA salah_staff_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA salah_staff_private FROM PUBLIC,anon,authenticated;
CREATE INDEX staff_drafts_author ON salah_staff_private.drafts(author_id,updated_at DESC,id);
CREATE INDEX staff_drafts_review ON salah_staff_private.drafts(status,updated_at DESC,id);
CREATE INDEX staff_assets_draft ON salah_staff_private.assets(draft_id,id);
CREATE INDEX staff_audit_actor ON salah_staff_private.audit(actor_id,created_at DESC,id);
CREATE INDEX staff_audit_latest ON salah_staff_private.audit(created_at DESC,id);

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('salah-staff-drafts','salah-staff-drafts',false,2097152,ARRAY['image/jpeg']),
 ('salah-curated','salah-curated',true,2097152,ARRAY['image/jpeg','image/svg+xml'])
ON CONFLICT(id) DO NOTHING;
-- Uploads/signing go through the authenticated Edge handler; no direct client
-- Storage policies are introduced for either bucket.

CREATE FUNCTION salah_staff_private.actor(p_permission text DEFAULT null,p_owner boolean DEFAULT false,p_gate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid();sid uuid;u auth.users%ROWTYPE;scopes text[];owner boolean:=false;mfa boolean:=false;member_role text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'sign_in_required' USING ERRCODE='42501';END IF;
 BEGIN sid:=(auth.jwt()->>'session_id')::uuid;EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'invalid_session' USING ERRCODE='42501';END;
 SELECT * INTO u FROM auth.users WHERE id=uid;
 IF u.id IS NULL OR u.email_confirmed_at IS NULL OR coalesce(u.is_anonymous,false) OR sid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.sessions WHERE id=sid AND user_id=uid AND (not_after IS NULL OR not_after>clock_timestamp())) THEN RAISE EXCEPTION 'invalid_session' USING ERRCODE='42501';END IF;
 owner:=uid='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid;
 IF owner THEN scopes:=ARRAY['support','reciters','wallpapers'];
 ELSE SELECT permissions,role INTO scopes,member_role FROM salah_staff_private.members WHERE user_id=uid AND active;END IF;
 IF scopes IS NULL OR (p_owner AND NOT owner) OR (p_permission IS NOT NULL AND NOT p_permission=ANY(scopes)) THEN RAISE EXCEPTION 'staff_only' USING ERRCODE='42501';END IF;
 mfa:=auth.jwt()->>'aal'='aal2' AND EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id=uid AND factor_type='totp' AND status='verified');
 IF NOT p_gate AND NOT coalesce(mfa,false) THEN RAISE EXCEPTION 'mfa_required' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('id',uid,'owner',owner,'role',CASE WHEN owner THEN 'owner' ELSE member_role END,'permissions',scopes,'mfaRequired',NOT coalesce(mfa,false),'nickname',left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Сотрудник'),40));
END;$$;

CREATE FUNCTION salah_staff_private.request(p_action text,p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a jsonb;uid uuid;owner boolean;perm text;draft_row salah_staff_private.drafts%ROWTYPE;support_row public.support_threads%ROWTYPE;result jsonb;messages jsonb;seen timestamptz;identifier uuid;v_kind text;v_entity text;body text;rev integer;scopes text[];target_user uuid;
BEGIN
 IF jsonb_typeof(p_args)<>'object' OR octet_length(p_args::text)>100000 THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
 IF p_action='gate' THEN RETURN salah_staff_private.actor(null,false,true);END IF;
 perm:=CASE WHEN p_action LIKE 'support.%' THEN 'support' WHEN p_action IN('draft.save','draft.submit','draft.get','draft.list','asset.register','asset.list') THEN CASE WHEN p_args->>'kind'='reciter' THEN 'reciters' WHEN p_args->>'kind'='wallpaper' THEN 'wallpapers' ELSE null END ELSE null END;
 a:=salah_staff_private.actor(perm,p_action IN('member.list','member.search','member.set','review.list','review.return','review.reject','catalog.publish','audit.list'));
 uid:=(a->>'id')::uuid;owner:=(a->>'owner')::boolean;
 IF p_action='member.list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT m.user_id AS id,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) AS nickname,m.role,m.permissions,m.active,m.updated_at FROM salah_staff_private.members m JOIN auth.users u ON u.id=m.user_id ORDER BY m.updated_at DESC LIMIT 100)x;RETURN result;
 ELSIF p_action='member.search' THEN
  body:=btrim(p_args->>'query');IF body IS NULL OR length(body) NOT BETWEEN 2 AND 40 THEN RAISE EXCEPTION 'invalid_query' USING ERRCODE='22023';END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT id,left(coalesce(nullif(raw_user_meta_data->>'nickname',''),'Без ника'),40) AS nickname FROM auth.users WHERE email_confirmed_at IS NOT NULL AND NOT coalesce(is_anonymous,false) AND id<>uid AND (id::text=body OR position(lower(body) IN lower(coalesce(raw_user_meta_data->>'nickname','')))>0) ORDER BY created_at DESC LIMIT 20)x;RETURN result;
 ELSIF p_action='member.set' THEN
  target_user:=(p_args->>'userId')::uuid;scopes:=CASE WHEN p_args->>'role'='admin' THEN ARRAY['support','reciters','wallpapers'] WHEN p_args->>'role'='moderator' THEN ARRAY['support'] ELSE null END;
  IF target_user=uid OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target_user AND email_confirmed_at IS NOT NULL AND NOT coalesce(is_anonymous,false)) OR scopes IS NULL OR jsonb_typeof(p_args->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_member' USING ERRCODE='22023';END IF;
  INSERT INTO salah_staff_private.members(user_id,role,permissions,active,updated_by) VALUES(target_user,p_args->>'role',scopes,(p_args->>'active')::boolean,uid) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,permissions=excluded.permissions,active=excluded.active,updated_by=uid,updated_at=clock_timestamp();
  INSERT INTO salah_staff_private.audit(actor_id,action,target,detail)VALUES(uid,p_action,target_user::text,jsonb_build_object('role',p_args->>'role','permissions',scopes,'active',p_args->'active'));RETURN jsonb_build_object('ok',true);
 ELSIF p_action IN('draft.list','review.list') THEN
  v_kind:=p_args->>'kind';IF (p_action='draft.list' AND v_kind IS NULL) OR (v_kind IS NOT NULL AND v_kind NOT IN('reciter','wallpaper')) THEN RAISE EXCEPTION 'invalid_kind' USING ERRCODE='22023';END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT d.id,d.author_id,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Сотрудник'),40) AS author_name,d.kind,d.entity_id,d.payload,d.status,d.revision,d.base_revision,d.review_note,d.created_at,d.updated_at FROM salah_staff_private.drafts d JOIN auth.users u ON u.id=d.author_id WHERE (owner OR d.author_id=uid) AND (v_kind IS NULL OR d.kind=v_kind) AND (p_action<>'review.list' OR d.status='submitted') ORDER BY d.updated_at DESC,d.id LIMIT 100)x;RETURN result;
 ELSIF p_action IN('draft.get','draft.save','draft.submit','review.return','review.reject','catalog.publish','asset.register','asset.list') THEN
  identifier:=(p_args->>'id')::uuid;
  SELECT * INTO draft_row FROM salah_staff_private.drafts WHERE id=identifier FOR UPDATE;
  IF p_action='draft.save' AND draft_row.id IS NULL THEN
   v_kind:=p_args->>'kind';v_entity:=p_args->>'entityId';IF v_kind IS NULL OR v_kind NOT IN('reciter','wallpaper') OR v_entity IS NULL OR NOT v_entity~'^[a-z0-9][a-z0-9.-]{0,79}$' OR jsonb_typeof(p_args->'payload') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_draft' USING ERRCODE='22023';END IF;
   PERFORM salah_staff_private.actor(CASE WHEN v_kind='reciter' THEN 'reciters' ELSE 'wallpapers' END);
   PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,101));
   IF (SELECT count(*) FROM salah_staff_private.drafts WHERE author_id=uid AND status IN('draft','submitted','changes_requested'))>=100 THEN RAISE EXCEPTION 'draft_limit' USING ERRCODE='P0001';END IF;
   SELECT coalesce((SELECT c.revision FROM salah_staff_private.catalog c WHERE c.kind=p_args->>'kind' AND c.entity_id=v_entity),0) INTO rev;
   INSERT INTO salah_staff_private.drafts(id,author_id,kind,entity_id,payload,base_revision) VALUES(identifier,uid,v_kind,v_entity,p_args->'payload',rev) RETURNING * INTO draft_row;
  ELSE
   IF draft_row.id IS NULL OR (NOT owner AND draft_row.author_id<>uid) THEN RAISE EXCEPTION 'draft_unavailable' USING ERRCODE='42501';END IF;
   PERFORM salah_staff_private.actor(CASE WHEN draft_row.kind='reciter' THEN 'reciters' ELSE 'wallpapers' END);
   IF p_action IN('draft.save','draft.submit','review.return','review.reject','catalog.publish') AND (p_args->>'revision')::integer IS DISTINCT FROM draft_row.revision THEN RAISE EXCEPTION 'revision_conflict' USING ERRCODE='P0001';END IF;
   IF p_action='draft.save' THEN
    IF draft_row.status NOT IN('draft','changes_requested') OR draft_row.kind IS DISTINCT FROM p_args->>'kind' OR draft_row.entity_id IS DISTINCT FROM p_args->>'entityId' OR jsonb_typeof(p_args->'payload')<>'object' THEN RAISE EXCEPTION 'draft_locked' USING ERRCODE='P0001';END IF;
    UPDATE salah_staff_private.drafts SET payload=p_args->'payload',revision=revision+1,updated_at=clock_timestamp() WHERE id=identifier RETURNING * INTO draft_row;
   ELSIF p_action='draft.submit' THEN
    IF draft_row.status NOT IN('draft','changes_requested') THEN RAISE EXCEPTION 'draft_locked' USING ERRCODE='P0001';END IF;
    UPDATE salah_staff_private.drafts SET status='submitted',review_note='',revision=revision+1,updated_at=clock_timestamp() WHERE id=identifier RETURNING * INTO draft_row;
   ELSIF p_action IN('review.return','review.reject') THEN
    body:=btrim(p_args->>'note');IF draft_row.status<>'submitted' OR body IS NULL OR length(body) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid_review' USING ERRCODE='22023';END IF;
    UPDATE salah_staff_private.drafts SET status=CASE WHEN p_action='review.return' THEN 'changes_requested' ELSE 'rejected' END,review_note=body,reviewed_by=uid,revision=revision+1,updated_at=clock_timestamp() WHERE id=identifier RETURNING * INTO draft_row;
   ELSIF p_action='catalog.publish' THEN
    IF draft_row.status<>'submitted' OR jsonb_typeof(p_args->'payload')<>'object' OR p_args->'payload'->>'id' IS DISTINCT FROM draft_row.entity_id THEN RAISE EXCEPTION 'invalid_publication' USING ERRCODE='22023';END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(draft_row.kind||':'||draft_row.entity_id,102));
    SELECT coalesce((SELECT c.revision FROM salah_staff_private.catalog c WHERE c.kind=draft_row.kind AND c.entity_id=draft_row.entity_id),0) INTO rev;
    IF rev<>draft_row.base_revision THEN RAISE EXCEPTION 'catalog_conflict' USING ERRCODE='P0001';END IF;
    IF rev=0 AND (SELECT count(*) FROM salah_staff_private.catalog c WHERE c.kind=draft_row.kind)>=100 THEN RAISE EXCEPTION 'catalog_limit' USING ERRCODE='P0001';END IF;
    INSERT INTO salah_staff_private.catalog(kind,entity_id,payload,revision,draft_id,approved_by)VALUES(draft_row.kind,draft_row.entity_id,p_args->'payload',rev+1,draft_row.id,uid)ON CONFLICT(kind,entity_id)DO UPDATE SET payload=excluded.payload,revision=excluded.revision,draft_id=excluded.draft_id,approved_by=uid,published_at=clock_timestamp();
    UPDATE salah_staff_private.drafts SET status='published',reviewed_by=uid,revision=revision+1,updated_at=clock_timestamp() WHERE id=identifier RETURNING * INTO draft_row;
   ELSIF p_action='asset.register' THEN
    IF draft_row.status NOT IN('draft','changes_requested') OR (NOT owner AND draft_row.author_id<>uid) THEN RAISE EXCEPTION 'draft_locked' USING ERRCODE='P0001';END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(draft_row.id::text,103));
    IF (SELECT count(*) FROM salah_staff_private.assets WHERE draft_id=draft_row.id)>=16 THEN RAISE EXCEPTION 'asset_limit' USING ERRCODE='P0001';END IF;
    IF p_args->>'path' IS DISTINCT FROM uid::text||'/'||draft_row.id::text||'/'||(p_args->>'assetId')||'.jpg' THEN RAISE EXCEPTION 'invalid_asset_path' USING ERRCODE='22023';END IF;
    INSERT INTO salah_staff_private.assets(id,draft_id,uploaded_by,object_path,bytes,width,height,sha256)VALUES((p_args->>'assetId')::uuid,draft_row.id,uid,p_args->>'path',(p_args->>'bytes')::integer,(p_args->>'width')::integer,(p_args->>'height')::integer,p_args->>'sha256');
   ELSIF p_action='asset.list' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT id,object_path AS path,bytes,width,height,sha256 FROM salah_staff_private.assets WHERE draft_id=draft_row.id ORDER BY created_at,id)x;RETURN result;
   END IF;
  END IF;
  IF p_action NOT IN('draft.get','asset.list') THEN INSERT INTO salah_staff_private.audit(actor_id,action,target,detail)VALUES(uid,p_action,draft_row.id::text,jsonb_build_object('kind',draft_row.kind,'entityId',draft_row.entity_id,'revision',draft_row.revision));END IF;
  RETURN to_jsonb(draft_row);
 ELSIF p_action='support.list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT t.id,t.subject,t.version,t.status,t.updated_at,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) AS nickname,EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=t.id AND NOT m.owner_reply AND m.created_at>t.owner_seen_at) AS unread FROM public.support_threads t JOIN auth.users u ON u.id=t.user_id WHERE t.app='salah' AND (p_args->>'before' IS NULL OR t.updated_at<(p_args->>'before')::timestamptz) ORDER BY t.updated_at DESC,t.id LIMIT 50)x;RETURN result;
 ELSIF p_action IN('support.read','support.reply','support.close') THEN
  identifier:=(p_args->>'id')::uuid;SELECT * INTO support_row FROM public.support_threads WHERE id=identifier AND app='salah' FOR UPDATE;
  IF support_row.id IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
  IF p_action='support.reply' THEN
   body:=btrim(p_args->>'body');IF body IS NULL OR length(body) NOT BETWEEN 1 AND 3000 OR support_row.status='closed' THEN RAISE EXCEPTION 'invalid_reply' USING ERRCODE='22023';END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
   IF EXISTS(SELECT 1 FROM public.support_messages WHERE id=(p_args->>'messageId')::uuid AND thread_id=support_row.id AND author_id=uid) THEN RETURN jsonb_build_object('ok',true);END IF;
   IF (SELECT count(*) FROM public.support_messages WHERE thread_id=support_row.id)>=100 OR (SELECT count(*) FROM public.support_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=3 OR (SELECT count(*) FROM public.support_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 day')>=100 THEN RAISE EXCEPTION 'support_rate_limit' USING ERRCODE='P0001';END IF;
   INSERT INTO public.support_messages(id,thread_id,author_id,owner_reply,body)VALUES((p_args->>'messageId')::uuid,support_row.id,uid,true,body);
   UPDATE public.support_threads SET status='answered',updated_at=clock_timestamp() WHERE id=support_row.id;
  ELSIF p_action='support.close' THEN UPDATE public.support_threads SET status='closed',updated_at=clock_timestamp() WHERE id=support_row.id;
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO messages FROM(SELECT sm.id,sm.owner_reply,sm.body,sm.created_at FROM public.support_messages sm WHERE sm.thread_id=support_row.id ORDER BY sm.created_at,sm.id LIMIT 100)x;
   SELECT max((v->>'created_at')::timestamptz) INTO seen FROM jsonb_array_elements(messages)v WHERE v->>'owner_reply'='false';
   UPDATE public.support_threads SET owner_seen_at=greatest(owner_seen_at,coalesce(seen,owner_seen_at)) WHERE id=support_row.id;
   SELECT coalesce(jsonb_agg(jsonb_build_object('message_id',p.message_id,'path',p.object_path,'index',p.photo_index)),'[]') INTO result FROM salah_support_private.photos p JOIN public.support_messages m ON m.id=p.message_id WHERE m.thread_id=support_row.id;
   RETURN jsonb_build_object('thread',jsonb_build_object('id',support_row.id,'subject',support_row.subject,'status',support_row.status,'version',support_row.version),'messages',messages,'photos',result);
  END IF;
  INSERT INTO salah_staff_private.audit(actor_id,action,target)VALUES(uid,p_action,support_row.id::text);RETURN jsonb_build_object('ok',true);
 ELSIF p_action='audit.list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT a.id,a.action,a.target,a.detail,a.created_at,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Владелец'),40) AS actor_name FROM salah_staff_private.audit a JOIN auth.users u ON u.id=a.actor_id ORDER BY a.created_at DESC,a.id DESC LIMIT 100)x;RETURN result;
 END IF;
 RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023';
END;$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA salah_staff_private FROM PUBLIC,anon,authenticated;
COMMENT ON SCHEMA salah_staff_private IS 'Server-only staff roles, review drafts and audit. Fresh verified session/MFA/role required by the private request function; no direct Data API grants.';

CREATE TABLE salah_staff_private.chat_rooms(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN('team','direct')),
 participant_a uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 participant_b uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((kind='team' AND participant_a IS NULL AND participant_b IS NULL) OR (kind='direct' AND participant_a IS NOT NULL AND participant_b IS NOT NULL AND participant_a<participant_b))
);
CREATE UNIQUE INDEX staff_team_room ON salah_staff_private.chat_rooms(kind) WHERE kind='team';
CREATE UNIQUE INDEX staff_direct_room ON salah_staff_private.chat_rooms(participant_a,participant_b) WHERE kind='direct';
CREATE TABLE salah_staff_private.chat_messages(
 id uuid PRIMARY KEY,
 room_id uuid NOT NULL REFERENCES salah_staff_private.chat_rooms(id) ON DELETE CASCADE,
 author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 body text NOT NULL DEFAULT '' CHECK(length(body)<=5000),
 redacted boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE salah_staff_private.chat_files(
 id uuid PRIMARY KEY,
 room_id uuid NOT NULL REFERENCES salah_staff_private.chat_rooms(id) ON DELETE CASCADE,
 uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 message_id uuid REFERENCES salah_staff_private.chat_messages(id) ON DELETE CASCADE,
 object_path text NOT NULL UNIQUE,
 filename text NOT NULL CHECK(length(filename) BETWEEN 1 AND 120),
 mime_type text NOT NULL CHECK(length(mime_type)<=150),
 bytes integer NOT NULL CHECK(bytes BETWEEN 1 AND 10485760),
 sha256 text NOT NULL CHECK(sha256~'^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX staff_chat_messages_room ON salah_staff_private.chat_messages(room_id,created_at DESC,id);
CREATE INDEX staff_chat_files_room ON salah_staff_private.chat_files(room_id,message_id,id);
CREATE INDEX staff_chat_files_user ON salah_staff_private.chat_files(uploaded_by,created_at DESC);
CREATE TABLE salah_staff_private.chat_reads(
 room_id uuid NOT NULL REFERENCES salah_staff_private.chat_rooms(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 seen_at timestamptz NOT NULL DEFAULT '-infinity',
 PRIMARY KEY(room_id,user_id)
);
ALTER TABLE salah_staff_private.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_staff_private.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_staff_private.chat_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_staff_private.chat_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA salah_staff_private FROM PUBLIC,anon,authenticated;
INSERT INTO salah_staff_private.chat_rooms(kind)VALUES('team');
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('salah-staff-chat','salah-staff-chat',false,10485760,ARRAY['application/octet-stream','application/pdf','image/jpeg','image/png','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/zip'])ON CONFLICT(id)DO NOTHING;

CREATE FUNCTION salah_staff_private.chat_request(p_action text,p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor jsonb:=salah_staff_private.actor();uid uuid:=(actor->>'id')::uuid;v_room salah_staff_private.chat_rooms%ROWTYPE;target_user uuid;result jsonb;messages jsonb;file_ids uuid[];new_message_id uuid;body text;seen timestamptz;
BEGIN
 IF p_action='chat.contacts' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT u.id,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) AS nickname,CASE WHEN u.id='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid THEN 'owner' ELSE m.role END AS role FROM auth.users u LEFT JOIN salah_staff_private.members m ON m.user_id=u.id WHERE u.id<>uid AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous,false) AND (u.id='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid OR m.active) ORDER BY nickname,u.id LIMIT 100)x;RETURN result;
 ELSIF p_action='chat.rooms' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT r.id,r.kind,r.updated_at,CASE WHEN r.kind='team' THEN 'Команда SALAH' ELSE left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) END AS title,(SELECT left(CASE WHEN cm.redacted THEN 'Сообщение удалено' ELSE cm.body END,100) FROM salah_staff_private.chat_messages cm WHERE cm.room_id=r.id ORDER BY cm.created_at DESC,cm.id DESC LIMIT 1) AS last_message,(SELECT count(*)::int FROM salah_staff_private.chat_messages m WHERE m.room_id=r.id AND m.author_id IS DISTINCT FROM uid AND m.created_at>coalesce(rd.seen_at,'-infinity')) AS unread FROM salah_staff_private.chat_rooms r LEFT JOIN auth.users u ON u.id=CASE WHEN r.participant_a=uid THEN r.participant_b ELSE r.participant_a END LEFT JOIN salah_staff_private.chat_reads rd ON rd.room_id=r.id AND rd.user_id=uid WHERE r.kind='team' OR uid IN(r.participant_a,r.participant_b) ORDER BY r.updated_at DESC,r.id LIMIT 100)x;RETURN result;
 ELSIF p_action='chat.open' THEN
  target_user:=(p_args->>'userId')::uuid;
  IF target_user=uid OR NOT EXISTS(SELECT 1 FROM auth.users u LEFT JOIN salah_staff_private.members m ON m.user_id=u.id WHERE u.id=target_user AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous,false) AND (u.id='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid OR m.active)) THEN RAISE EXCEPTION 'contact_unavailable' USING ERRCODE='42501';END IF;
  INSERT INTO salah_staff_private.chat_rooms(kind,participant_a,participant_b)VALUES('direct',least(uid,target_user),greatest(uid,target_user))ON CONFLICT(participant_a,participant_b)WHERE kind='direct' DO UPDATE SET updated_at=salah_staff_private.chat_rooms.updated_at RETURNING * INTO v_room;RETURN to_jsonb(v_room);
 END IF;
 SELECT * INTO v_room FROM salah_staff_private.chat_rooms WHERE id=(p_args->>'roomId')::uuid FOR UPDATE;
 -- Direct chats are participant-only, even for the application's owner.
 IF v_room.id IS NULL OR (v_room.kind='direct' AND uid NOT IN(v_room.participant_a,v_room.participant_b)) THEN RAISE EXCEPTION 'chat_unavailable' USING ERRCODE='42501';END IF;
 IF p_action='chat.read' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id),'[]') INTO messages FROM(SELECT m.id,m.room_id,m.author_id,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Удалённый аккаунт'),40) AS author_name,CASE WHEN m.redacted THEN '' ELSE m.body END AS body,m.redacted,m.created_at,CASE WHEN v_room.kind='direct' THEN EXISTS(SELECT 1 FROM salah_staff_private.chat_reads rd WHERE rd.room_id=v_room.id AND rd.user_id<>m.author_id AND rd.seen_at>=m.created_at) ELSE false END AS seen FROM salah_staff_private.chat_messages m LEFT JOIN auth.users u ON u.id=m.author_id WHERE m.room_id=v_room.id AND (p_args->>'before' IS NULL OR (p_args->>'beforeId' IS NULL AND m.created_at<(p_args->>'before')::timestamptz OR p_args->>'beforeId' IS NOT NULL AND (m.created_at,m.id)<((p_args->>'before')::timestamptz,(p_args->>'beforeId')::uuid))) ORDER BY m.created_at DESC,m.id DESC LIMIT 80)x;
  SELECT max((x.value->>'created_at')::timestamptz) INTO seen FROM jsonb_array_elements(messages)AS x(value);
  INSERT INTO salah_staff_private.chat_reads(room_id,user_id,seen_at)VALUES(v_room.id,uid,coalesce(seen,'-infinity'))ON CONFLICT(room_id,user_id)DO UPDATE SET seen_at=greatest(salah_staff_private.chat_reads.seen_at,excluded.seen_at);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',f.id,'message_id',f.message_id,'path',f.object_path,'filename',f.filename,'mime_type',f.mime_type,'bytes',f.bytes)),'[]') INTO result FROM salah_staff_private.chat_files f JOIN salah_staff_private.chat_messages m ON m.id=f.message_id WHERE f.room_id=v_room.id AND NOT m.redacted AND m.id IN(SELECT (x.value->>'id')::uuid FROM jsonb_array_elements(messages)AS x(value));
  RETURN jsonb_build_object('room',to_jsonb(v_room),'messages',messages,'files',result);
 ELSIF p_action='chat.send' THEN
  new_message_id:=(p_args->>'messageId')::uuid;body:=btrim(coalesce(p_args->>'body',''));SELECT coalesce(array_agg(x.value::uuid),ARRAY[]::uuid[])INTO file_ids FROM jsonb_array_elements_text(coalesce(p_args->'files','[]'))AS x(value);
  IF length(body)>5000 OR cardinality(file_ids)>5 OR (length(body)=0 AND cardinality(file_ids)=0) THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE='22023';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,104));
  IF EXISTS(SELECT 1 FROM salah_staff_private.chat_messages WHERE id=new_message_id AND room_id=v_room.id AND author_id=uid)THEN RETURN jsonb_build_object('ok',true);END IF;
  IF (SELECT count(*) FROM salah_staff_private.chat_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=30 THEN RAISE EXCEPTION 'chat_rate_limit' USING ERRCODE='P0001';END IF;
  IF cardinality(file_ids)<>(SELECT count(*) FROM salah_staff_private.chat_files WHERE id=ANY(file_ids) AND uploaded_by=uid AND room_id=v_room.id AND message_id IS NULL)THEN RAISE EXCEPTION 'invalid_files' USING ERRCODE='42501';END IF;
  INSERT INTO salah_staff_private.chat_messages(id,room_id,author_id,body)VALUES(new_message_id,v_room.id,uid,body);
  UPDATE salah_staff_private.chat_files SET message_id=new_message_id WHERE id=ANY(file_ids);
  UPDATE salah_staff_private.chat_rooms SET updated_at=clock_timestamp() WHERE id=v_room.id;RETURN jsonb_build_object('ok',true);
 ELSIF p_action='chat.file.register' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,105));
  IF (SELECT coalesce(sum(bytes),0) FROM salah_staff_private.chat_files WHERE uploaded_by=uid AND created_at>clock_timestamp()-interval '1 day')+(p_args->>'bytes')::integer>104857600 THEN RAISE EXCEPTION 'chat_upload_limit' USING ERRCODE='P0001';END IF;
  IF p_args->>'path' IS DISTINCT FROM uid::text||'/'||v_room.id::text||'/'||(p_args->>'fileId')||'/'||(p_args->>'filename') THEN RAISE EXCEPTION 'invalid_asset_path' USING ERRCODE='22023';END IF;
  INSERT INTO salah_staff_private.chat_files(id,room_id,uploaded_by,object_path,filename,mime_type,bytes,sha256)VALUES((p_args->>'fileId')::uuid,v_room.id,uid,p_args->>'path',p_args->>'filename',p_args->>'mimeType',(p_args->>'bytes')::integer,p_args->>'sha256');RETURN jsonb_build_object('ok',true);
 END IF;
 RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023';
END;$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA salah_staff_private FROM PUBLIC,anon,authenticated;
COMMIT;
