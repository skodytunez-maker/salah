CREATE OR REPLACE FUNCTION salah_staff_private.chat_request(p_action text, p_args jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE actor jsonb:=salah_staff_private.actor();uid uuid:=(actor->>'id')::uuid;v_room salah_staff_private.chat_rooms%ROWTYPE;target_user uuid;result jsonb;messages jsonb;file_ids uuid[];new_message_id uuid;body text;seen timestamptz;
BEGIN
 IF p_action='chat.status' THEN
  WITH visible_rooms AS (
   SELECT r.id,coalesce(rd.seen_at,'-infinity'::timestamptz) AS seen_at
   FROM salah_staff_private.chat_rooms r
   LEFT JOIN salah_staff_private.chat_reads rd ON rd.room_id=r.id AND rd.user_id=uid
   WHERE r.kind='team' OR uid IN(r.participant_a,r.participant_b)
  ), unread AS (
   SELECT m.id,m.room_id,m.created_at
   FROM visible_rooms r JOIN salah_staff_private.chat_messages m ON m.room_id=r.id
   WHERE m.author_id IS DISTINCT FROM uid AND NOT m.redacted AND m.created_at>r.seen_at
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
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT r.id,r.kind,r.updated_at,u.id AS "peerId",CASE WHEN r.kind='team' THEN 'Команда SALAH' ELSE left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) END AS title,(SELECT left(CASE WHEN cm.redacted THEN 'Сообщение удалено' ELSE cm.body END,100) FROM salah_staff_private.chat_messages cm WHERE cm.room_id=r.id ORDER BY cm.created_at DESC,cm.id DESC LIMIT 1) AS last_message,(SELECT count(*)::int FROM salah_staff_private.chat_messages m WHERE m.room_id=r.id AND m.author_id IS DISTINCT FROM uid AND m.created_at>coalesce(rd.seen_at,'-infinity')) AS unread FROM salah_staff_private.chat_rooms r LEFT JOIN auth.users u ON u.id=CASE WHEN r.participant_a=uid THEN r.participant_b ELSE r.participant_a END LEFT JOIN salah_staff_private.chat_reads rd ON rd.room_id=r.id AND rd.user_id=uid WHERE r.kind='team' OR uid IN(r.participant_a,r.participant_b) ORDER BY r.updated_at DESC,r.id LIMIT 100)x;RETURN result;
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
END;$function$
