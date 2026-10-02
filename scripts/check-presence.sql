BEGIN;
DO $$
DECLARE u uuid; s uuid;
BEGIN
 IF has_table_privilege('authenticated','public.app_presence','SELECT') OR has_table_privilege('anon','public.app_presence','SELECT') OR has_table_privilege('authenticated','public.app_presence','INSERT') THEN RAISE EXCEPTION 'table_access_not_private'; END IF;
 IF has_function_privilege('anon','public.record_app_presence(text,uuid,boolean,bigint)','EXECUTE') THEN RAISE EXCEPTION 'anonymous_rpc_allowed'; END IF;
 SELECT a.user_id,a.id INTO u,s FROM auth.sessions a JOIN auth.users b ON b.id=a.user_id WHERE b.email_confirmed_at IS NOT NULL AND NOT coalesce(b.is_anonymous,false) LIMIT 1;
 IF u IS NULL THEN RAISE EXCEPTION 'active_test_session_required';END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',u,'session_id',s,'role','authenticated')::text,true);
END;$$;
SET LOCAL ROLE authenticated;
SELECT public.record_app_presence('salah','e2141c07-597f-4d39-bcaf-77298742a606',true,1);
SELECT public.record_app_presence('salah','e2141c07-597f-4d39-bcaf-77298742a606',false,3);
SELECT public.record_app_presence('salah','e2141c07-597f-4d39-bcaf-77298742a606',true,2);
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM 1 FROM public.app_presence LIMIT 1;EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'private_table_readable';END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',auth.uid(),'session_id','00000000-0000-4000-8000-000000000000','role','authenticated')::text,true);
 denied:=false;BEGIN PERFORM public.record_app_presence('salah','e2141c07-597f-4d39-bcaf-77298742a606',true,4);EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'revoked_session_allowed';END IF;
END;$$;
RESET ROLE;
DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM public.app_presence WHERE tab_id='e2141c07-597f-4d39-bcaf-77298742a606' AND sequence=3 AND NOT active) THEN RAISE EXCEPTION 'out_of_order_write_overrode_status';END IF;END;$$;
ROLLBACK;
SELECT 'PASS: private table, no anonymous RPC, verified session required, stale writes ignored; test data rolled back.' AS result;
