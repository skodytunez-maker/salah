BEGIN;
-- Private participant visibility only; no Data API or table grants.
ALTER TABLE salah_staff_private.chat_rooms ADD COLUMN redaction_revision bigint NOT NULL DEFAULT 0 CHECK(redaction_revision>=0);
ALTER TABLE salah_staff_private.chat_rooms ADD COLUMN history_cutoff bigint NOT NULL DEFAULT 0 CHECK(history_cutoff>=0);
ALTER TABLE salah_staff_private.chat_rooms ADD COLUMN history_cleared_at timestamptz;
-- Allocate only after the room row is locked, so equal timestamps and retried
-- packets cannot cross a history-clear boundary. Never include this in JSON.
ALTER TABLE salah_staff_private.chat_messages ADD COLUMN message_sequence bigint GENERATED ALWAYS AS IDENTITY;
CREATE UNIQUE INDEX staff_chat_sequence_unique ON salah_staff_private.chat_messages(message_sequence);
CREATE INDEX staff_chat_room_sequence ON salah_staff_private.chat_messages(room_id,message_sequence);
ALTER TABLE salah_staff_private.chat_messages ADD COLUMN redacted_at timestamptz;
ALTER TABLE salah_staff_private.chat_messages ADD COLUMN reply_to uuid REFERENCES salah_staff_private.chat_messages(id) ON DELETE SET NULL;
CREATE INDEX staff_chat_reply_target ON salah_staff_private.chat_messages(reply_to) WHERE reply_to IS NOT NULL;
CREATE TABLE salah_staff_private.chat_hidden_messages(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 message_id uuid NOT NULL REFERENCES salah_staff_private.chat_messages(id) ON DELETE CASCADE,
 room_id uuid NOT NULL REFERENCES salah_staff_private.chat_rooms(id) ON DELETE CASCADE,
 hidden_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,message_id)
);
CREATE INDEX staff_chat_hidden_actor_room ON salah_staff_private.chat_hidden_messages(user_id,room_id);
ALTER TABLE salah_staff_private.chat_hidden_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON salah_staff_private.chat_hidden_messages FROM PUBLIC,anon,authenticated;
CREATE TABLE salah_staff_private.chat_room_history(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 room_id uuid NOT NULL REFERENCES salah_staff_private.chat_rooms(id) ON DELETE CASCADE,
 cutoff bigint NOT NULL CHECK(cutoff>=0),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>=1),
 cleared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,room_id)
);
CREATE TABLE salah_staff_private.chat_clear_operations(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 operation_id uuid NOT NULL,
 room_id uuid NOT NULL REFERENCES salah_staff_private.chat_rooms(id) ON DELETE CASCADE,
 scope text NOT NULL CHECK(scope IN('self','everyone')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,operation_id)
);
CREATE INDEX staff_chat_clear_actor_rate ON salah_staff_private.chat_clear_operations(user_id,created_at);
ALTER TABLE salah_staff_private.chat_room_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_staff_private.chat_clear_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON salah_staff_private.chat_room_history,salah_staff_private.chat_clear_operations FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA salah_staff_private FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION salah_staff_private.chat_request(p_action text, p_args jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE actor jsonb:=salah_staff_private.actor();uid uuid:=(actor->>'id')::uuid;v_room salah_staff_private.chat_rooms%ROWTYPE;target_user uuid;result jsonb;messages jsonb;file_ids uuid[];new_message_id uuid;body text;seen timestamptz;target_message salah_staff_private.chat_messages%ROWTYPE;deletion_scope text;visibility_version text;reply_id uuid;actor_cutoff bigint;cutoff_sequence bigint;requested_operation uuid;prior_operation salah_staff_private.chat_clear_operations%ROWTYPE;
BEGIN
 IF p_action='chat.status' THEN
  WITH visible_rooms AS (
   SELECT r.id,coalesce(rd.seen_at,'-infinity'::timestamptz) AS seen_at,greatest(r.history_cutoff,coalesce(hist.cutoff,0)) AS history_cutoff
   FROM salah_staff_private.chat_rooms r
   LEFT JOIN salah_staff_private.chat_reads rd ON rd.room_id=r.id AND rd.user_id=uid
   LEFT JOIN salah_staff_private.chat_room_history hist ON hist.room_id=r.id AND hist.user_id=uid
   WHERE r.kind='team' OR uid IN(r.participant_a,r.participant_b)
  ), unread AS (
   SELECT m.id,m.room_id,m.created_at
   FROM visible_rooms r JOIN salah_staff_private.chat_messages m ON m.room_id=r.id
   WHERE m.message_sequence>r.history_cutoff AND m.author_id IS DISTINCT FROM uid AND NOT m.redacted AND NOT EXISTS(SELECT 1 FROM salah_staff_private.chat_hidden_messages h WHERE h.message_id=m.id AND h.user_id=uid) AND m.created_at>r.seen_at
  ), room_counts AS (
   SELECT room_id,count(*)::int AS unread FROM unread GROUP BY room_id
  )
  SELECT jsonb_build_object(
   'pending',(SELECT count(*)::int FROM unread),
   'rooms',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',room_id,'unread',unread) ORDER BY room_id),'[]'::jsonb) FROM room_counts),
   'latest',(SELECT jsonb_build_object('id',id,'room',room_id,'created_at',created_at) FROM unread ORDER BY created_at DESC,id DESC LIMIT 1)
  ) INTO result;
  RETURN result;
 ELSIF p_action='chat.contacts' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT u.id,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) AS nickname,CASE WHEN u.id='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid THEN 'owner' ELSE m.role END AS role FROM auth.users u LEFT JOIN salah_staff_private.members m ON m.user_id=u.id WHERE u.id<>uid AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous,false) AND (u.id='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid OR m.active) ORDER BY nickname,u.id LIMIT 100)x;RETURN result;
 ELSIF p_action='chat.rooms' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(
   SELECT r.id,r.kind,r.updated_at,u.id AS "peerId",
    (r.kind='direct' OR coalesce((actor->>'owner')::boolean,false)) AS "canClearEveryone",
    CASE WHEN r.kind='team' THEN 'Команда SALAH' ELSE left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) END AS title,
    (SELECT left(CASE WHEN cm.redacted THEN 'Сообщение удалено' ELSE cm.body END,100)
     FROM salah_staff_private.chat_messages cm WHERE cm.room_id=r.id AND cm.message_sequence>greatest(r.history_cutoff,coalesce(hist.cutoff,0))
     AND NOT EXISTS(SELECT 1 FROM salah_staff_private.chat_hidden_messages h WHERE h.message_id=cm.id AND h.user_id=uid)
     ORDER BY cm.created_at DESC,cm.id DESC LIMIT 1) AS last_message,
    (SELECT count(*)::int FROM salah_staff_private.chat_messages m WHERE m.room_id=r.id AND m.message_sequence>greatest(r.history_cutoff,coalesce(hist.cutoff,0))
     AND m.author_id IS DISTINCT FROM uid AND NOT m.redacted
     AND NOT EXISTS(SELECT 1 FROM salah_staff_private.chat_hidden_messages h WHERE h.message_id=m.id AND h.user_id=uid)
     AND m.created_at>coalesce(rd.seen_at,'-infinity')) AS unread
   FROM salah_staff_private.chat_rooms r
   LEFT JOIN auth.users u ON u.id=CASE WHEN r.participant_a=uid THEN r.participant_b ELSE r.participant_a END
   LEFT JOIN salah_staff_private.chat_reads rd ON rd.room_id=r.id AND rd.user_id=uid
   LEFT JOIN salah_staff_private.chat_room_history hist ON hist.room_id=r.id AND hist.user_id=uid
   WHERE (r.kind='team' OR uid IN(r.participant_a,r.participant_b))
   -- The fixed team address remains usable on older clients after a self clear.
   AND (r.kind='team' OR (r.history_cleared_at IS NULL AND hist.room_id IS NULL)
    OR EXISTS(SELECT 1 FROM salah_staff_private.chat_messages cm WHERE cm.room_id=r.id
     AND cm.message_sequence>greatest(r.history_cutoff,coalesce(hist.cutoff,0))
     AND NOT EXISTS(SELECT 1 FROM salah_staff_private.chat_hidden_messages h WHERE h.message_id=cm.id AND h.user_id=uid)))
   ORDER BY r.updated_at DESC,r.id LIMIT 100)x;RETURN result;
 ELSIF p_action='chat.open' THEN
  target_user:=(p_args->>'userId')::uuid;
  IF target_user=uid OR NOT EXISTS(SELECT 1 FROM auth.users u LEFT JOIN salah_staff_private.members m ON m.user_id=u.id WHERE u.id=target_user AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous,false) AND (u.id='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid OR m.active)) THEN RAISE EXCEPTION 'contact_unavailable' USING ERRCODE='42501';END IF;
  INSERT INTO salah_staff_private.chat_rooms(kind,participant_a,participant_b)VALUES('direct',least(uid,target_user),greatest(uid,target_user))ON CONFLICT(participant_a,participant_b)WHERE kind='direct' DO UPDATE SET updated_at=salah_staff_private.chat_rooms.updated_at RETURNING * INTO v_room;RETURN (to_jsonb(v_room)-'history_cutoff'-'history_cleared_at')||jsonb_build_object('canClearEveryone',v_room.kind='direct' OR coalesce((actor->>'owner')::boolean,false));
 END IF;
 SELECT * INTO v_room FROM salah_staff_private.chat_rooms WHERE id=(p_args->>'roomId')::uuid FOR UPDATE;
 -- Direct chats are participant-only, even for the application's owner.
 IF v_room.id IS NULL OR (v_room.kind='direct' AND uid NOT IN(v_room.participant_a,v_room.participant_b)) THEN RAISE EXCEPTION 'chat_unavailable' USING ERRCODE='42501';END IF;
 SELECT v_room.redaction_revision::text||':'||coalesce((SELECT hist.revision::text FROM salah_staff_private.chat_room_history hist WHERE hist.room_id=v_room.id AND hist.user_id=uid),'0')||':'||count(h.message_id)::text INTO visibility_version FROM salah_staff_private.chat_hidden_messages h WHERE h.room_id=v_room.id AND h.user_id=uid;
 SELECT coalesce((SELECT cutoff FROM salah_staff_private.chat_room_history WHERE room_id=v_room.id AND user_id=uid),0) INTO actor_cutoff;
 IF p_action='chat.clear' THEN
  deletion_scope:=p_args->>'scope';requested_operation:=(p_args->>'operationId')::uuid;
  IF deletion_scope IS NULL OR deletion_scope NOT IN('self','everyone') OR requested_operation IS NULL THEN RAISE EXCEPTION 'invalid_clear' USING ERRCODE='22023';END IF;
  IF deletion_scope='everyone' AND v_room.kind='team' AND NOT coalesce((actor->>'owner')::boolean,false) THEN RAISE EXCEPTION 'chat_unavailable' USING ERRCODE='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,106));
  SELECT * INTO prior_operation FROM salah_staff_private.chat_clear_operations o WHERE o.user_id=uid AND o.operation_id=requested_operation;
  IF prior_operation.operation_id IS NOT NULL THEN
   IF prior_operation.room_id IS DISTINCT FROM v_room.id OR prior_operation.scope IS DISTINCT FROM deletion_scope THEN RAISE EXCEPTION 'operation_conflict' USING ERRCODE='22023';END IF;
   RETURN jsonb_build_object('ok',true,'roomId',v_room.id,'scope',deletion_scope,'operationId',requested_operation,'visibilityVersion',visibility_version);
  END IF;
  IF (SELECT count(*) FROM salah_staff_private.chat_clear_operations WHERE user_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=30 THEN RAISE EXCEPTION 'chat_rate_limit' USING ERRCODE='P0001';END IF;
  SELECT coalesce(max(message_sequence),0) INTO cutoff_sequence FROM salah_staff_private.chat_messages WHERE room_id=v_room.id;
  IF deletion_scope='self' THEN
   INSERT INTO salah_staff_private.chat_room_history(user_id,room_id,cutoff)VALUES(uid,v_room.id,cutoff_sequence)
   ON CONFLICT(user_id,room_id)DO UPDATE SET cutoff=greatest(salah_staff_private.chat_room_history.cutoff,excluded.cutoff),revision=salah_staff_private.chat_room_history.revision+1,cleared_at=clock_timestamp();
  ELSE
   UPDATE salah_staff_private.chat_rooms SET history_cutoff=greatest(history_cutoff,cutoff_sequence),history_cleared_at=clock_timestamp(),redaction_revision=redaction_revision+1,updated_at=clock_timestamp() WHERE id=v_room.id RETURNING * INTO v_room;
  END IF;
  INSERT INTO salah_staff_private.chat_clear_operations(user_id,operation_id,room_id,scope)VALUES(uid,requested_operation,v_room.id,deletion_scope);
  SELECT v_room.redaction_revision::text||':'||coalesce((SELECT hist.revision::text FROM salah_staff_private.chat_room_history hist WHERE hist.room_id=v_room.id AND hist.user_id=uid),'0')||':'||count(h.message_id)::text INTO visibility_version FROM salah_staff_private.chat_hidden_messages h WHERE h.room_id=v_room.id AND h.user_id=uid;
  RETURN jsonb_build_object('ok',true,'roomId',v_room.id,'scope',deletion_scope,'operationId',requested_operation,'visibilityVersion',visibility_version);
 ELSIF p_action='chat.delete' THEN
  deletion_scope:=p_args->>'scope';
  IF deletion_scope IS NULL OR deletion_scope NOT IN('self','everyone') THEN RAISE EXCEPTION 'invalid_scope' USING ERRCODE='22023';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,106));
  SELECT * INTO target_message FROM salah_staff_private.chat_messages WHERE id=(p_args->>'messageId')::uuid AND room_id=v_room.id AND message_sequence>greatest(v_room.history_cutoff,actor_cutoff) FOR UPDATE;
  IF target_message.id IS NULL OR (deletion_scope='everyone' AND target_message.author_id IS DISTINCT FROM uid) THEN RAISE EXCEPTION 'message_unavailable' USING ERRCODE='42501';END IF;
  IF (deletion_scope='self' AND NOT EXISTS(SELECT 1 FROM salah_staff_private.chat_hidden_messages h WHERE h.message_id=target_message.id AND h.user_id=uid)) OR (deletion_scope='everyone' AND NOT target_message.redacted) THEN
   IF (SELECT count(*) FROM salah_staff_private.chat_hidden_messages h WHERE h.user_id=uid AND h.hidden_at>clock_timestamp()-interval '1 minute')+(SELECT count(*) FROM salah_staff_private.chat_messages m WHERE m.author_id=uid AND m.redacted_at>clock_timestamp()-interval '1 minute')>=60 THEN RAISE EXCEPTION 'chat_rate_limit' USING ERRCODE='P0001';END IF;
   IF deletion_scope='self' THEN
    INSERT INTO salah_staff_private.chat_hidden_messages(user_id,message_id,room_id)VALUES(uid,target_message.id,v_room.id) ON CONFLICT(user_id,message_id)DO NOTHING;
   ELSE
    UPDATE salah_staff_private.chat_messages SET body='',reply_to=NULL,redacted=true,redacted_at=clock_timestamp() WHERE id=target_message.id;
    UPDATE salah_staff_private.chat_rooms SET redaction_revision=redaction_revision+1,updated_at=clock_timestamp() WHERE id=v_room.id RETURNING * INTO v_room;
   END IF;
  END IF;
  SELECT v_room.redaction_revision::text||':'||coalesce((SELECT hist.revision::text FROM salah_staff_private.chat_room_history hist WHERE hist.room_id=v_room.id AND hist.user_id=uid),'0')||':'||count(h.message_id)::text INTO visibility_version FROM salah_staff_private.chat_hidden_messages h WHERE h.room_id=v_room.id AND h.user_id=uid;
  RETURN jsonb_build_object('ok',true,'messageId',target_message.id,'scope',deletion_scope,'visibilityVersion',visibility_version);
 ELSIF p_action='chat.read' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id),'[]') INTO messages FROM(SELECT m.id,m.room_id,m.author_id,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Удалённый аккаунт'),40) AS author_name,CASE WHEN m.redacted THEN '' ELSE m.body END AS body,m.redacted,m.created_at,CASE WHEN m.reply_to IS NULL THEN NULL WHEN q.id IS NULL OR q.redacted OR q.message_sequence<=greatest(v_room.history_cutoff,actor_cutoff) OR EXISTS(SELECT 1 FROM salah_staff_private.chat_hidden_messages h WHERE h.message_id=q.id AND h.user_id=uid) THEN jsonb_build_object('available',false) ELSE jsonb_build_object('available',true,'id',q.id,'author',left(coalesce(nullif(qu.raw_user_meta_data->>'nickname',''),'Удалённый аккаунт'),40),'body',left(coalesce(nullif(q.body,''),(SELECT f.filename FROM salah_staff_private.chat_files f WHERE f.message_id=q.id ORDER BY f.created_at,f.id LIMIT 1),''),180)) END AS reply,CASE WHEN v_room.kind='direct' THEN EXISTS(SELECT 1 FROM salah_staff_private.chat_reads rd WHERE rd.room_id=v_room.id AND rd.user_id<>m.author_id AND rd.seen_at>=m.created_at) ELSE false END AS seen FROM salah_staff_private.chat_messages m LEFT JOIN auth.users u ON u.id=m.author_id LEFT JOIN salah_staff_private.chat_messages q ON q.id=m.reply_to AND q.room_id=m.room_id LEFT JOIN auth.users qu ON qu.id=q.author_id WHERE m.room_id=v_room.id AND m.message_sequence>greatest(v_room.history_cutoff,actor_cutoff) AND NOT EXISTS(SELECT 1 FROM salah_staff_private.chat_hidden_messages h WHERE h.message_id=m.id AND h.user_id=uid) AND (p_args->>'before' IS NULL OR (p_args->>'beforeId' IS NULL AND m.created_at<(p_args->>'before')::timestamptz OR p_args->>'beforeId' IS NOT NULL AND (m.created_at,m.id)<((p_args->>'before')::timestamptz,(p_args->>'beforeId')::uuid))) ORDER BY m.created_at DESC,m.id DESC LIMIT 80)x;
  SELECT max((x.value->>'created_at')::timestamptz) INTO seen FROM jsonb_array_elements(messages)AS x(value);
  INSERT INTO salah_staff_private.chat_reads(room_id,user_id,seen_at)VALUES(v_room.id,uid,coalesce(seen,'-infinity'))ON CONFLICT(room_id,user_id)DO UPDATE SET seen_at=greatest(salah_staff_private.chat_reads.seen_at,excluded.seen_at);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',f.id,'message_id',f.message_id,'path',f.object_path,'filename',f.filename,'mime_type',f.mime_type,'bytes',f.bytes)),'[]') INTO result FROM salah_staff_private.chat_files f JOIN salah_staff_private.chat_messages m ON m.id=f.message_id WHERE f.room_id=v_room.id AND NOT m.redacted AND m.id IN(SELECT (x.value->>'id')::uuid FROM jsonb_array_elements(messages)AS x(value));
  RETURN jsonb_build_object('room',(to_jsonb(v_room)-'history_cutoff'-'history_cleared_at')||jsonb_build_object('canClearEveryone',v_room.kind='direct' OR coalesce((actor->>'owner')::boolean,false)),'messages',messages,'files',result,'visibilityVersion',visibility_version);
 ELSIF p_action='chat.send' THEN
  new_message_id:=(p_args->>'messageId')::uuid;body:=btrim(coalesce(p_args->>'body',''));SELECT coalesce(array_agg(x.value::uuid),ARRAY[]::uuid[])INTO file_ids FROM jsonb_array_elements_text(coalesce(p_args->'files','[]'))AS x(value);
  IF length(body)>5000 OR cardinality(file_ids)>5 OR (length(body)=0 AND cardinality(file_ids)=0) THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE='22023';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,104));
  IF EXISTS(SELECT 1 FROM salah_staff_private.chat_messages WHERE id=new_message_id AND room_id=v_room.id AND author_id=uid)THEN RETURN jsonb_build_object('ok',true);END IF;
  IF (SELECT count(*) FROM salah_staff_private.chat_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=30 THEN RAISE EXCEPTION 'chat_rate_limit' USING ERRCODE='P0001';END IF;
  IF cardinality(file_ids)<>(SELECT count(*) FROM salah_staff_private.chat_files WHERE id=ANY(file_ids) AND uploaded_by=uid AND room_id=v_room.id AND message_id IS NULL)THEN RAISE EXCEPTION 'invalid_files' USING ERRCODE='42501';END IF;
  reply_id:=(p_args->>'replyTo')::uuid;
  IF reply_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM salah_staff_private.chat_messages q WHERE q.id=reply_id AND q.room_id=v_room.id AND q.message_sequence>greatest(v_room.history_cutoff,actor_cutoff) AND NOT q.redacted AND NOT EXISTS(SELECT 1 FROM salah_staff_private.chat_hidden_messages h WHERE h.message_id=q.id AND h.user_id=uid)) THEN RAISE EXCEPTION 'reply_unavailable' USING ERRCODE='P0001';END IF;
  INSERT INTO salah_staff_private.chat_messages(id,room_id,author_id,body,reply_to)VALUES(new_message_id,v_room.id,uid,body,reply_id);
  UPDATE salah_staff_private.chat_files SET message_id=new_message_id WHERE id=ANY(file_ids);
  UPDATE salah_staff_private.chat_rooms SET updated_at=clock_timestamp() WHERE id=v_room.id;RETURN jsonb_build_object('ok',true);
 ELSIF p_action='chat.file.register' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,105));
  IF (SELECT coalesce(sum(bytes),0) FROM salah_staff_private.chat_files WHERE uploaded_by=uid AND created_at>clock_timestamp()-interval '1 day')+(p_args->>'bytes')::integer>104857600 THEN RAISE EXCEPTION 'chat_upload_limit' USING ERRCODE='P0001';END IF;
  IF p_args->>'path' IS DISTINCT FROM uid::text||'/'||v_room.id::text||'/'||(p_args->>'fileId')||'/'||(p_args->>'filename') THEN RAISE EXCEPTION 'invalid_asset_path' USING ERRCODE='22023';END IF;
  INSERT INTO salah_staff_private.chat_files(id,room_id,uploaded_by,object_path,filename,mime_type,bytes,sha256)VALUES((p_args->>'fileId')::uuid,v_room.id,uid,p_args->>'path',p_args->>'filename',p_args->>'mimeType',(p_args->>'bytes')::integer,p_args->>'sha256');RETURN jsonb_build_object('ok',true);
 END IF;
 RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023';
END;$function$;

CREATE OR REPLACE FUNCTION salah_staff_private.push_candidates(p_device uuid DEFAULT null,p_message uuid DEFAULT null)
RETURNS TABLE(id uuid,user_id uuid,platform text,subscription jsonb,token text,message_id uuid,room_id uuid,"at" numeric)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT d.id,d.user_id,d.platform,d.subscription,d.native_token,m.id,r.id,extract(epoch FROM m.created_at)*1000
 FROM salah_staff_private.push_devices d
 JOIN auth.users u ON u.id=d.user_id AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous,false)
 JOIN auth.sessions s ON s.id=d.session_id AND s.user_id=d.user_id AND (s.not_after IS NULL OR s.not_after>now())
 LEFT JOIN salah_staff_private.members member ON member.user_id=d.user_id
 JOIN salah_staff_private.chat_rooms r ON r.kind='team' OR d.user_id IN(r.participant_a,r.participant_b)
 JOIN salah_staff_private.chat_messages m ON m.room_id=r.id
 LEFT JOIN salah_staff_private.chat_room_history hist ON hist.room_id=r.id AND hist.user_id=d.user_id
 LEFT JOIN salah_staff_private.chat_reads rd ON rd.room_id=r.id AND rd.user_id=d.user_id
 WHERE d.enabled AND d.updated_at>now()-interval '90 days'
 AND (d.user_id='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid OR member.active)
 AND EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=d.user_id AND f.factor_type='totp' AND f.status='verified')
 AND m.message_sequence>greatest(r.history_cutoff,coalesce(hist.cutoff,0))
 AND NOT m.redacted AND m.author_id IS DISTINCT FROM d.user_id
 AND NOT EXISTS(SELECT 1 FROM salah_staff_private.chat_hidden_messages h WHERE h.message_id=m.id AND h.user_id=d.user_id)
 AND m.created_at>greatest(d.enabled_since,coalesce(rd.seen_at,'-infinity'::timestamptz))
 AND m.created_at>now()-interval '24 hours' AND m.created_at<=now()
 AND (p_device IS NULL OR d.id=p_device) AND (p_message IS NULL OR m.id=p_message)
 AND NOT EXISTS(SELECT 1 FROM salah_staff_private.push_deliveries x WHERE x.device_id=d.id AND x.message_id=m.id AND x.state IN('sent','expired'))
 ORDER BY m.created_at,m.id,d.id LIMIT 100;
$$;
REVOKE ALL ON FUNCTION salah_staff_private.chat_request(text,jsonb),salah_staff_private.push_candidates(uuid,uuid) FROM PUBLIC,anon,authenticated;
COMMIT;
