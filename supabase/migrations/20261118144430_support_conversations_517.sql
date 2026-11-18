BEGIN;
CREATE INDEX support_conversation_contact_activity ON public.support_threads(app,user_id,updated_at DESC,id DESC);
CREATE INDEX support_conversation_messages_order ON public.support_messages(created_at DESC,id DESC,thread_id);
CREATE FUNCTION salah_support_private.conversation_version(p_contact uuid,p_actor uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT md5(coalesce(string_agg(t.id::text||':'||t.chat_revision||':'||t.chat_cutoff||':'||t.reopen_revision||':'||coalesce(h.revision,0)||':'||(SELECT count(*) FROM salah_support_private.chat_hidden x WHERE x.thread_id=t.id AND x.user_id=p_actor),',' ORDER BY t.id),''))
 FROM public.support_threads t LEFT JOIN salah_support_private.chat_history h ON h.thread_id=t.id AND h.user_id=p_actor WHERE t.app='salah' AND t.user_id=p_contact;
$$;
REVOKE ALL ON FUNCTION salah_support_private.conversation_version(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.support_conversation_request(p_app text,p_owner boolean,p_action text,p_args jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(p_owner);contact uuid;anchor uuid;selected public.support_threads%ROWTYPE;item public.support_threads%ROWTYPE;
 result jsonb;thread jsonb;messages jsonb;page jsonb;next_page jsonb;version text;operation uuid;child_operation uuid;scope text;prior salah_support_private.chat_operations%ROWTYPE;cursor_at timestamptz;cursor_id uuid;seen record;pending boolean;all_closed boolean;
BEGIN
 IF p_owner IS NULL OR p_app IS DISTINCT FROM 'salah' OR p_action IS NULL OR p_action NOT IN('list','read','clear','close') OR jsonb_typeof(p_args) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023';END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.user_id=uid AND s.id=(auth.jwt()->>'session_id')::uuid AND (s.not_after IS NULL OR s.not_after>now())) THEN RAISE EXCEPTION 'invalid_session' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_args) k WHERE k<>ALL(CASE p_action WHEN 'list' THEN ARRAY['before'] WHEN 'read' THEN ARRAY['threadId','before','around'] WHEN 'clear' THEN ARRAY['threadId','scope','operationId'] ELSE ARRAY['threadId','operationId'] END)) THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
 IF p_args->'before' IS NOT NULL AND p_args->'before'<>'null'::jsonb THEN
  IF jsonb_typeof(p_args->'before') IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_args->'before') k WHERE k NOT IN('at','id')) THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
  cursor_at:=(p_args#>>'{before,at}')::timestamptz;cursor_id:=(p_args#>>'{before,id}')::uuid;
  IF cursor_at IS NULL OR cursor_id IS NULL THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
 END IF;
 IF p_action='list' THEN
  WITH visible AS MATERIALIZED(SELECT t.* FROM public.support_threads t WHERE t.app='salah' AND (p_owner OR t.user_id=uid) AND salah_support_private.chat_thread_visible(t.id,uid)),
  contacts AS(SELECT t.user_id,max(t.updated_at) activity,bool_or(t.needs_owner_reply AND t.status<>'closed') awaiting,bool_and(t.status='closed') closed,
   bool_or(EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=t.id AND m.owner_reply IS DISTINCT FROM p_owner AND m.created_at>coalesce(CASE WHEN p_owner THEN t.owner_seen_at ELSE t.user_seen_at END,'-infinity'::timestamptz) AND salah_support_private.chat_visible(m.id,uid))) unread
   FROM visible t GROUP BY t.user_id),
  page AS(SELECT c.* FROM contacts c WHERE cursor_at IS NULL OR (c.activity,c.user_id)<(cursor_at,cursor_id) ORDER BY c.activity DESC,c.user_id DESC LIMIT 51),
  enriched AS(SELECT c.*,jsonb_build_object('id',last_case.id,'app','salah','subject',last_case.subject,'nickname',CASE WHEN p_owner THEN left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) ELSE NULL END,
   'status',CASE WHEN c.closed THEN 'closed' WHEN c.awaiting THEN 'open' ELSE 'answered' END,'updated_at',c.activity,'last_message_at',last_message.created_at,'last_message',left(last_message.body,140),
   'awaiting_owner',c.awaiting,'owner_unread',p_owner AND c.unread,'user_unread',NOT p_owner AND c.unread,'conversation_id',c.user_id)||CASE WHEN p_owner THEN jsonb_build_object('user_id',c.user_id) ELSE '{}'::jsonb END value
   FROM page c JOIN auth.users u ON u.id=c.user_id
   CROSS JOIN LATERAL(SELECT t.id,t.subject FROM visible t WHERE t.user_id=c.user_id ORDER BY t.updated_at DESC,t.id DESC LIMIT 1)last_case
   LEFT JOIN LATERAL(SELECT m.body,m.created_at FROM public.support_messages m JOIN visible t ON t.id=m.thread_id WHERE t.user_id=c.user_id AND salah_support_private.chat_visible(m.id,uid) ORDER BY m.created_at DESC,m.id DESC LIMIT 1)last_message ON true),
  displayed AS(SELECT * FROM enriched ORDER BY activity DESC,user_id DESC LIMIT 50)
  SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(value ORDER BY activity DESC,user_id DESC) FROM displayed),'[]'::jsonb),'next',CASE WHEN (SELECT count(*) FROM page)>50 THEN(SELECT jsonb_build_object('at',activity,'id',user_id) FROM displayed ORDER BY activity,user_id LIMIT 1) ELSE NULL END) INTO result;
  RETURN result;
 END IF;
 anchor:=(p_args->>'threadId')::uuid;
 SELECT t.user_id INTO contact FROM public.support_threads t WHERE t.id=anchor AND t.app='salah' AND (p_owner OR t.user_id=uid);
 IF contact IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
 IF p_action='read' AND p_args->>'around' IS NOT NULL THEN
  IF p_args->'before' IS NOT NULL AND p_args->'before'<>'null'::jsonb THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
  SELECT m.created_at,m.id INTO cursor_at,cursor_id FROM public.support_messages m JOIN public.support_threads t ON t.id=m.thread_id WHERE m.id=(p_args->>'around')::uuid AND t.app='salah' AND t.user_id=contact AND salah_support_private.chat_visible(m.id,uid);
  IF cursor_id IS NULL THEN RAISE EXCEPTION 'message_unavailable' USING ERRCODE='42501';END IF;
 END IF;
 IF p_action IN('clear','close') THEN
  operation:=(p_args->>'operationId')::uuid;scope:=CASE WHEN p_action='close' THEN 'everyone' ELSE p_args->>'scope' END;
  IF operation IS NULL OR scope IS NULL OR scope NOT IN('self','everyone') OR p_action='close' AND p_owner IS DISTINCT FROM true THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
  PERFORM 1 FROM public.support_threads t WHERE t.app='salah' AND t.user_id=contact ORDER BY t.id FOR UPDATE;
  SELECT * INTO prior FROM salah_support_private.chat_operations WHERE user_id=uid AND operation_id=operation;
  IF prior.operation_id IS NOT NULL THEN
   IF prior.thread_id IS DISTINCT FROM anchor OR prior.action IS DISTINCT FROM 'conversation.'||p_action OR prior.scope IS DISTINCT FROM scope THEN RAISE EXCEPTION 'operation_conflict' USING ERRCODE='22023';END IF;
  ELSE
   IF(SELECT count(*) FROM salah_support_private.chat_operations WHERE user_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=60 THEN RAISE EXCEPTION 'support_rate_limit' USING ERRCODE='P0001';END IF;
   FOR item IN SELECT t.* FROM public.support_threads t WHERE t.app='salah' AND t.user_id=contact ORDER BY t.id LOOP
    child_operation:=md5(operation::text||':'||item.id::text||':'||p_action)::uuid;
    IF p_action='close' THEN
     IF item.status<>'closed' THEN PERFORM public.support_close(item.id,'salah');END IF;
    ELSE
     IF scope='self' THEN INSERT INTO salah_support_private.chat_history(user_id,thread_id,cutoff,reopen_revision)
      VALUES(uid,item.id,(SELECT coalesce(max(chat_sequence),0) FROM public.support_messages WHERE thread_id=item.id),item.reopen_revision)
      ON CONFLICT(user_id,thread_id) DO UPDATE SET cutoff=greatest(salah_support_private.chat_history.cutoff,excluded.cutoff),revision=salah_support_private.chat_history.revision+1,reopen_revision=excluded.reopen_revision;
     ELSE UPDATE public.support_threads SET chat_cutoff=greatest(chat_cutoff,(SELECT coalesce(max(chat_sequence),0) FROM public.support_messages WHERE thread_id=item.id)),chat_cleared=true,chat_revision=chat_revision+1,chat_clear_reopen_revision=reopen_revision WHERE id=item.id;END IF;
     DELETE FROM salah_support_private.notification_events WHERE thread_id=item.id AND(scope='everyone' OR recipient_id=uid);
    END IF;
   END LOOP;
   INSERT INTO salah_support_private.chat_operations(user_id,operation_id,thread_id,action,scope)VALUES(uid,operation,anchor,'conversation.'||p_action,scope);
  END IF;
  RETURN jsonb_build_object('ok',true,'threadId',anchor,'operationId',operation,'scope',scope,'visibilityVersion',salah_support_private.conversation_version(contact,uid));
 END IF;
 SELECT t.* INTO selected FROM public.support_threads t WHERE t.app='salah' AND t.user_id=contact ORDER BY(t.status<>'closed')DESC,salah_support_private.chat_thread_visible(t.id,uid)DESC,t.updated_at DESC,t.id DESC LIMIT 1;
 IF selected.id IS NULL THEN SELECT * INTO selected FROM public.support_threads WHERE id=anchor;END IF;
 SELECT bool_or(t.needs_owner_reply AND t.status<>'closed'),bool_and(t.status='closed') INTO pending,all_closed FROM public.support_threads t WHERE t.app='salah' AND t.user_id=contact AND salah_support_private.chat_thread_visible(t.id,uid);
 SELECT jsonb_build_object('id',selected.id,'app','salah','subject',selected.subject,'version',selected.version,'status',selected.status,'created_at',selected.created_at,'updated_at',selected.updated_at,'team_visible',selected.team_visible,
  'nickname',CASE WHEN p_owner THEN left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) ELSE NULL END) INTO thread FROM auth.users u WHERE u.id=contact;
 WITH page AS(SELECT m.id,m.thread_id,m.owner_reply,m.body,m.created_at,t.subject thread_subject,t.status thread_status FROM public.support_messages m JOIN public.support_threads t ON t.id=m.thread_id
  WHERE t.app='salah' AND t.user_id=contact AND salah_support_private.chat_visible(m.id,uid) AND(cursor_at IS NULL OR(m.created_at,m.id)<(cursor_at,cursor_id) OR p_args->>'around' IS NOT NULL AND(m.created_at,m.id)=(cursor_at,cursor_id)) ORDER BY m.created_at DESC,m.id DESC LIMIT 101),
 displayed AS(SELECT * FROM page ORDER BY created_at DESC,id DESC LIMIT 100)
 SELECT coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at,d.id) FROM displayed d),'[]'::jsonb),CASE WHEN(SELECT count(*) FROM page)>100 THEN(SELECT jsonb_build_object('at',created_at,'id',id) FROM displayed ORDER BY created_at,id LIMIT 1) ELSE NULL END INTO messages,next_page;
 FOR seen IN SELECT(e.value->>'thread_id')::uuid thread_id,max((e.value->>'created_at')::timestamptz) at FROM jsonb_array_elements(messages)e(value) WHERE(e.value->>'owner_reply')::boolean IS DISTINCT FROM p_owner GROUP BY(e.value->>'thread_id')::uuid ORDER BY(e.value->>'thread_id')::uuid LOOP
  IF p_owner THEN UPDATE public.support_threads SET owner_seen_at=greatest(owner_seen_at,seen.at) WHERE id=seen.thread_id;
  ELSE UPDATE public.support_threads SET user_seen_at=greatest(user_seen_at,seen.at) WHERE id=seen.thread_id AND user_id=uid;END IF;
 END LOOP;
 result:=salah_support_private.chat_enrich(jsonb_build_object('thread',thread,'messages',messages),uid);
 result:=jsonb_set(result,'{thread}',result->'thread'||jsonb_build_object('awaiting_owner',coalesce(pending,false),'receipt_visible',coalesce(pending,false),'can_reopen',coalesce(all_closed,true) AND NOT p_owner));
 RETURN result||jsonb_build_object('conversationId',contact,'anchorId',anchor,'next',next_page,'unread',EXISTS(SELECT 1 FROM public.support_threads t JOIN public.support_messages m ON m.thread_id=t.id WHERE t.app='salah' AND t.user_id=contact AND m.owner_reply IS DISTINCT FROM p_owner AND m.created_at>coalesce(CASE WHEN p_owner THEN t.owner_seen_at ELSE t.user_seen_at END,'-infinity'::timestamptz) AND salah_support_private.chat_visible(m.id,uid)),'visibilityVersion',salah_support_private.conversation_version(contact,uid),'photoManifest',(SELECT coalesce(jsonb_agg(jsonb_build_object('message_id',p.message_id,'path',p.object_path) ORDER BY p.object_path),'[]'::jsonb) FROM salah_support_private.photos p WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(messages)e(value) WHERE(e.value->>'id')::uuid=p.message_id) AND salah_support_private.chat_visible(p.message_id,uid)));
END;$$;
REVOKE ALL ON FUNCTION public.support_conversation_request(text,boolean,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_conversation_request(text,boolean,text,jsonb) TO authenticated;
COMMIT;
