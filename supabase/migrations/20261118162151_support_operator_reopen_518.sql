BEGIN;
-- Private capability: the existing fresh-session/MFA staff actor is authoritative.
-- An administrator sees only cases the owner explicitly shared with the team.
CREATE FUNCTION salah_support_private.operator_reopen(p_thread uuid,p_operation uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $reopen$
DECLARE a jsonb:=salah_staff_private.actor('support');uid uuid:=(a->>'id')::uuid;
 target public.support_threads%ROWTYPE;prior salah_support_private.chat_operations%ROWTYPE;
BEGIN
 IF p_thread IS NULL OR p_operation IS NULL THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
 IF NOT coalesce((a->>'owner')::boolean,false) AND a->>'role' IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'staff_only' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO target FROM public.support_threads WHERE id=p_thread AND app='salah'
  AND(coalesce((a->>'owner')::boolean,false) OR team_visible) FOR UPDATE;
 IF target.id IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
 SELECT * INTO prior FROM salah_support_private.chat_operations WHERE user_id=uid AND operation_id=p_operation;
 IF prior.operation_id IS NOT NULL THEN
  IF prior.thread_id IS DISTINCT FROM p_thread OR prior.action IS DISTINCT FROM 'operator.reopen' OR prior.scope IS DISTINCT FROM 'operator' OR prior.message_id IS NOT NULL THEN RAISE EXCEPTION 'operation_conflict' USING ERRCODE='22023';END IF;
 ELSE
  IF(SELECT count(*) FROM salah_support_private.chat_operations WHERE user_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=60 THEN RAISE EXCEPTION 'support_rate_limit' USING ERRCODE='P0001';END IF;
  IF target.status='closed' THEN
   UPDATE public.support_threads SET status='open',needs_owner_reply=false,waiting_since=NULL,reopened_at=clock_timestamp(),reopen_revision=reopen_revision+1,updated_at=clock_timestamp() WHERE id=p_thread RETURNING * INTO target;
   INSERT INTO salah_staff_private.audit(actor_id,action,target)VALUES(uid,'support.reopen',p_thread::text);
  END IF;
  INSERT INTO salah_support_private.chat_operations(user_id,operation_id,thread_id,action,scope)VALUES(uid,p_operation,p_thread,'operator.reopen','operator');
 END IF;
 -- An operator opening a case neither fabricates a user message nor answers it.
 -- Retried operations return current state, never undo a later closure/reply.
 RETURN jsonb_build_object('ok',true,'threadId',p_thread,'operationId',p_operation,'status',target.status);
END;$reopen$;
REVOKE ALL ON FUNCTION salah_support_private.operator_reopen(uuid,uuid) FROM PUBLIC,anon,authenticated;

DO $patch$
DECLARE definition text;changed text;
BEGIN
 definition:=pg_get_functiondef('public.support_chat_request(text,boolean,text,jsonb)'::regprocedure);
 changed:=replace(definition,$needle$IF p_action='reply' THEN$needle$,$replacement$IF p_action='reopen' AND p_owner THEN RETURN salah_support_private.operator_reopen(identifier,(p_args->>'operationId')::uuid);END IF;
  IF p_action='reply' THEN$replacement$);
 IF changed=definition THEN RAISE EXCEPTION 'support_operator_chat_anchor_missing';END IF;EXECUTE changed;
 definition:=pg_get_functiondef('public.support_conversation_request(text,boolean,text,jsonb)'::regprocedure);
 changed:=replace(definition,$needle$'can_reopen',coalesce(all_closed,true) AND NOT p_owner$needle$,$replacement$'can_reopen',coalesce(all_closed,true)$replacement$);
 IF changed=definition THEN RAISE EXCEPTION 'support_operator_group_anchor_missing';END IF;EXECUTE changed;
 definition:=pg_get_functiondef('salah_staff_private.request(text,jsonb)'::regprocedure);
 changed:=replace(definition,$needle$ELSIF p_action='support.share' THEN$needle$,$replacement$ELSIF p_action='support.reopen' THEN
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_args) k WHERE k NOT IN('id','operationId')) THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
  RETURN salah_support_private.operator_reopen((p_args->>'id')::uuid,(p_args->>'operationId')::uuid);
 ELSIF p_action='support.share' THEN$replacement$);
 IF changed=definition THEN RAISE EXCEPTION 'support_operator_staff_anchor_missing';END IF;EXECUTE changed;
END;$patch$;
COMMIT;
