BEGIN;
CREATE INDEX support_threads_waiting_app ON public.support_threads(app) WHERE status='open';
CREATE FUNCTION public.support_owner_status(p_app text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=public.support_actor(true);pending bigint;
BEGIN
 IF p_app IS NULL OR p_app NOT IN ('salah','sahaba') THEN RAISE EXCEPTION 'invalid_app' USING ERRCODE='22023';END IF;
 SELECT count(*) INTO pending FROM public.support_threads WHERE app=p_app AND status='open';
 RETURN jsonb_build_object('pending',pending);
END;$$;
REVOKE ALL ON FUNCTION public.support_owner_status(text) FROM PUBLIC,anon,authenticated;
COMMIT;
