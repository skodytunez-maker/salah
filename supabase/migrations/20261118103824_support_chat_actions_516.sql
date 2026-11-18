BEGIN;
ALTER TABLE public.support_messages ADD COLUMN chat_sequence bigint GENERATED ALWAYS AS IDENTITY;
CREATE UNIQUE INDEX support_chat_sequence ON public.support_messages(chat_sequence);
CREATE INDEX support_chat_thread_sequence ON public.support_messages(thread_id,chat_sequence);
ALTER TABLE public.support_messages ADD COLUMN chat_redacted boolean NOT NULL DEFAULT false;
ALTER TABLE public.support_messages ADD COLUMN reply_to uuid;
CREATE INDEX support_chat_reply_target ON public.support_messages(reply_to) WHERE reply_to IS NOT NULL;
ALTER TABLE public.support_threads ADD COLUMN chat_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.support_threads ADD COLUMN chat_cutoff bigint NOT NULL DEFAULT 0;
ALTER TABLE public.support_threads ADD COLUMN chat_cleared boolean NOT NULL DEFAULT false;
CREATE TABLE salah_support_private.chat_hidden(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 message_id uuid NOT NULL REFERENCES public.support_messages(id) ON DELETE CASCADE,
 thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,message_id)
);
CREATE INDEX support_chat_hidden_thread ON salah_support_private.chat_hidden(user_id,thread_id);
CREATE TABLE salah_support_private.chat_history(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
 cutoff bigint NOT NULL,revision bigint NOT NULL DEFAULT 1,
 PRIMARY KEY(user_id,thread_id)
);
CREATE TABLE salah_support_private.chat_operations(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 operation_id uuid NOT NULL,thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
 action text NOT NULL,scope text NOT NULL,message_id uuid,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,operation_id)
);
CREATE INDEX support_chat_operation_rate ON salah_support_private.chat_operations(user_id,created_at);
ALTER TABLE salah_support_private.chat_hidden ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_support_private.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE salah_support_private.chat_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON salah_support_private.chat_hidden,salah_support_private.chat_history,salah_support_private.chat_operations FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.support_messages_chat_sequence_seq FROM PUBLIC,anon,authenticated;

CREATE FUNCTION salah_support_private.chat_visible(p_message uuid,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.support_messages m JOIN public.support_threads t ON t.id=m.thread_id
 WHERE m.id=p_message AND (t.app<>'salah' OR (NOT m.chat_redacted
 AND m.chat_sequence>greatest(t.chat_cutoff,coalesce((SELECT h.cutoff FROM salah_support_private.chat_history h WHERE h.thread_id=t.id AND h.user_id=p_user),0))
 AND NOT EXISTS(SELECT 1 FROM salah_support_private.chat_hidden h WHERE h.user_id=p_user AND h.message_id=m.id))));
$$;
CREATE FUNCTION salah_support_private.chat_thread_visible(p_thread uuid,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.support_threads t WHERE t.id=p_thread AND (t.app<>'salah'
 OR (NOT t.chat_cleared AND NOT EXISTS(SELECT 1 FROM salah_support_private.chat_history h WHERE h.user_id=p_user AND h.thread_id=t.id))
 OR EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=t.id AND salah_support_private.chat_visible(m.id,p_user))));
$$;
REVOKE ALL ON FUNCTION salah_support_private.chat_visible(uuid,uuid),salah_support_private.chat_thread_visible(uuid,uuid) FROM PUBLIC,anon,authenticated;


CREATE FUNCTION salah_support_private.chat_enrich(p_data jsonb,p_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $enrich$
DECLARE target public.support_threads%ROWTYPE;messages jsonb;version text;
BEGIN
 IF p_data#>>'{thread,app}' IS DISTINCT FROM 'salah' THEN RETURN p_data;END IF;
 SELECT * INTO target FROM public.support_threads WHERE id=(p_data#>>'{thread,id}')::uuid;
 SELECT coalesce(jsonb_agg(e.value||jsonb_build_object('author_id',m.author_id,'canDeleteEveryone',m.author_id=p_user,'reply',CASE WHEN m.reply_to IS NULL THEN NULL WHEN q.id IS NULL OR NOT salah_support_private.chat_visible(q.id,p_user) THEN jsonb_build_object('available',false) ELSE jsonb_build_object('available',true,'id',q.id,'owner_reply',q.owner_reply,'body',left(q.body,180)) END) ORDER BY m.created_at,m.id),'[]'::jsonb) INTO messages
 FROM jsonb_array_elements(p_data->'messages')e(value) JOIN public.support_messages m ON m.id=(e.value->>'id')::uuid LEFT JOIN public.support_messages q ON q.id=m.reply_to AND q.thread_id=m.thread_id;
 SELECT target.chat_revision::text||':'||coalesce((SELECT revision::text FROM salah_support_private.chat_history WHERE user_id=p_user AND thread_id=target.id),'0')||':'||(SELECT count(*)::text FROM salah_support_private.chat_hidden WHERE user_id=p_user AND thread_id=target.id) INTO version;
 RETURN jsonb_set(p_data,'{messages}',messages)||jsonb_build_object('visibilityVersion',version,'canClearEveryone',true);
END;$enrich$;
REVOKE ALL ON FUNCTION salah_support_private.chat_enrich(jsonb,uuid) FROM PUBLIC,anon,authenticated;

-- Patch only the owned legacy read predicates, preserving signatures, grants,
-- read acknowledgements and the separate SAHABA app. Missing anchors fail closed.
DO $patch$
DECLARE signature text;definition text;changed text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['public.support_read(uuid,text,boolean)','public.support_list(text,boolean,timestamp with time zone)','public.support_photo_manifest(uuid,text,boolean)','public.support_owner_status(text)','public.support_user_status(text)','salah_staff_private.request(text,jsonb)'] LOOP
  definition:=pg_get_functiondef(signature::regprocedure);changed:=definition;
  changed:=replace(changed,'m.thread_id=p_id','m.thread_id=p_id AND salah_support_private.chat_visible(m.id,uid)');
  changed:=replace(changed,'m.thread_id=p_thread','m.thread_id=p_thread AND salah_support_private.chat_visible(m.id,uid)');
  changed:=replace(changed,'m.thread_id=s.id','m.thread_id=s.id AND salah_support_private.chat_visible(m.id,uid)');
  changed:=replace(changed,'m.thread_id=t.id','m.thread_id=t.id AND salah_support_private.chat_visible(m.id,uid)');
  changed:=replace(changed,'sm.thread_id=support_row.id','sm.thread_id=support_row.id AND salah_support_private.chat_visible(sm.id,uid)');
  changed:=replace(changed,'WHERE m.thread_id=support_row.id','WHERE m.thread_id=support_row.id AND salah_support_private.chat_visible(m.id,uid)');
  changed:=replace(changed,'WHERE t.app=p_app AND NOT m.owner_reply','WHERE t.app=p_app AND salah_support_private.chat_visible(m.id,uid) AND NOT m.owner_reply');
  changed:=replace(changed,'WHERE t.app=p_app AND t.user_id=uid AND m.owner_reply','WHERE t.app=p_app AND t.user_id=uid AND salah_support_private.chat_visible(m.id,uid) AND m.owner_reply');
  IF signature LIKE '%support_read%' THEN changed:=replace(changed,$needle$RETURN jsonb_build_object('thread',thread,'messages',messages);$needle$,$needle$RETURN salah_support_private.chat_enrich(jsonb_build_object('thread',thread,'messages',messages),uid);$needle$);END IF;
  IF signature LIKE '%support_list%' THEN changed:=replace(changed,'s.app=p_app AND','s.app=p_app AND salah_support_private.chat_thread_visible(s.id,uid) AND');END IF;
  IF signature LIKE '%support_owner_status%' THEN changed:=replace(changed,'s.app=p_app;','s.app=p_app AND salah_support_private.chat_thread_visible(s.id,uid);');END IF;
  IF signature LIKE '%request%' THEN
   changed:=replace(changed,$needle$t.app='salah' AND t.team_visible AND$needle$,$needle$t.app='salah' AND t.team_visible AND salah_support_private.chat_thread_visible(t.id,uid) AND$needle$);
   changed:=replace(changed,$needle$identifier:=(p_args->>'id')::uuid;SELECT * INTO support_row$needle$, $needle$IF p_action='support.reply' THEN PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));END IF;identifier:=(p_args->>'id')::uuid;SELECT * INTO support_row$needle$);
  END IF;
  IF changed=definition THEN RAISE EXCEPTION 'support_chat_legacy_anchor_missing: %',signature;END IF;
  EXECUTE changed;
 END LOOP;
END;$patch$;

CREATE FUNCTION public.support_chat_request(p_app text,p_owner boolean,p_action text,p_args jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(p_owner);target public.support_threads%ROWTYPE;message public.support_messages%ROWTYPE;
 identifier uuid;operation uuid;scope text;mid uuid;reference uuid;body text;version text;prior salah_support_private.chat_operations%ROWTYPE;cutoff bigint;existed boolean;
BEGIN
 IF p_app IS DISTINCT FROM 'salah' OR p_action IS NULL OR p_action NOT IN('read','reply','delete','clear') OR jsonb_typeof(p_args) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023';END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.user_id=uid AND s.id=(auth.jwt()->>'session_id')::uuid AND (s.not_after IS NULL OR s.not_after>now())) THEN RAISE EXCEPTION 'invalid_session' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_args) k WHERE k<>ALL(CASE p_action WHEN 'read' THEN ARRAY['threadId'] WHEN 'reply' THEN ARRAY['threadId','messageId','body','replyTo'] WHEN 'delete' THEN ARRAY['threadId','messageId','scope','operationId'] ELSE ARRAY['threadId','scope','operationId'] END)) THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
 identifier:=(p_args->>'threadId')::uuid;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO target FROM public.support_threads WHERE id=identifier AND app='salah' AND (p_owner OR user_id=uid) FOR UPDATE;
 IF target.id IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
 IF p_action='reply' THEN
  mid:=(p_args->>'messageId')::uuid;reference:=(p_args->>'replyTo')::uuid;body:=p_args->>'body';
  SELECT EXISTS(SELECT 1 FROM public.support_messages m WHERE m.id=mid AND m.thread_id=identifier AND m.author_id=uid) INTO existed;
  IF NOT existed AND reference IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.support_messages m WHERE m.id=reference AND m.thread_id=identifier AND salah_support_private.chat_visible(m.id,uid)) THEN RAISE EXCEPTION 'reply_unavailable' USING ERRCODE='P0001';END IF;
  PERFORM public.support_reply(identifier,p_app,mid,body,p_owner);
  IF NOT existed THEN UPDATE public.support_messages SET reply_to=reference WHERE id=mid AND author_id=uid;END IF;
  RETURN jsonb_build_object('ok',true,'messageId',mid,'threadId',identifier);
 ELSIF p_action IN('delete','clear') THEN
  operation:=(p_args->>'operationId')::uuid;scope:=p_args->>'scope';mid:=(p_args->>'messageId')::uuid;
  IF operation IS NULL OR scope IS NULL OR scope NOT IN('self','everyone') OR (p_action='delete' AND mid IS NULL) THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
  SELECT * INTO prior FROM salah_support_private.chat_operations WHERE user_id=uid AND operation_id=operation;
  IF prior.operation_id IS NOT NULL THEN
   IF prior.thread_id IS DISTINCT FROM identifier OR prior.action IS DISTINCT FROM p_action OR prior.scope IS DISTINCT FROM scope OR prior.message_id IS DISTINCT FROM mid THEN RAISE EXCEPTION 'operation_conflict' USING ERRCODE='22023';END IF;
  ELSE
   IF (SELECT count(*) FROM salah_support_private.chat_operations WHERE user_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=60 THEN RAISE EXCEPTION 'support_rate_limit' USING ERRCODE='P0001';END IF;
   IF p_action='delete' THEN
    SELECT * INTO message FROM public.support_messages WHERE id=mid AND thread_id=identifier FOR UPDATE;
    IF message.id IS NULL OR (scope='everyone' AND message.author_id IS DISTINCT FROM uid) THEN RAISE EXCEPTION 'message_unavailable' USING ERRCODE='42501';END IF;
    IF scope='self' THEN INSERT INTO salah_support_private.chat_hidden(user_id,message_id,thread_id)VALUES(uid,mid,identifier)ON CONFLICT DO NOTHING;
    ELSE UPDATE public.support_messages SET body='Сообщение удалено',chat_redacted=true,reply_to=NULL WHERE id=mid;UPDATE public.support_threads SET chat_revision=chat_revision+1 WHERE id=identifier RETURNING * INTO target;END IF;
   ELSE
    SELECT coalesce(max(chat_sequence),0) INTO cutoff FROM public.support_messages WHERE thread_id=identifier;
    IF scope='self' THEN INSERT INTO salah_support_private.chat_history(user_id,thread_id,cutoff)VALUES(uid,identifier,cutoff)ON CONFLICT(user_id,thread_id)DO UPDATE SET cutoff=greatest(salah_support_private.chat_history.cutoff,excluded.cutoff),revision=salah_support_private.chat_history.revision+1;
    ELSE UPDATE public.support_threads SET chat_cutoff=greatest(chat_cutoff,cutoff),chat_cleared=true,chat_revision=chat_revision+1 WHERE id=identifier RETURNING * INTO target;END IF;
   END IF;
   -- Dispatchers re-check this queue immediately before sending. Revoke queued
   -- alerts for the removed recipient/history in the same deletion transaction.
   DELETE FROM salah_support_private.notification_events e
   WHERE e.thread_id=identifier AND (scope='everyone' OR e.recipient_id=uid)
   AND (p_action='clear' OR e.message_id=mid);
   INSERT INTO salah_support_private.chat_operations(user_id,operation_id,thread_id,action,scope,message_id)VALUES(uid,operation,identifier,p_action,scope,mid);
  END IF;
 END IF;
 SELECT target.chat_revision::text||':'||coalesce((SELECT revision::text FROM salah_support_private.chat_history WHERE user_id=uid AND thread_id=identifier),'0')||':'||(SELECT count(*)::text FROM salah_support_private.chat_hidden WHERE user_id=uid AND thread_id=identifier) INTO version;
 IF p_action<>'read' THEN RETURN jsonb_build_object('ok',true,'threadId',identifier,'messageId',mid,'scope',scope,'operationId',operation,'visibilityVersion',version);END IF;
 RETURN public.support_read(identifier,p_app,p_owner);
END;$$;
REVOKE ALL ON FUNCTION public.support_chat_request(text,boolean,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_chat_request(text,boolean,text,jsonb) TO authenticated;
COMMIT;
