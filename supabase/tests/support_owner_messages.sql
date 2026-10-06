BEGIN;
SELECT set_config('request.jwt.claims','{}',true);
DO $test$
DECLARE tid uuid:=gen_random_uuid();recipient uuid:=gen_random_uuid();rejected boolean;
BEGIN
 rejected:=false;BEGIN PERFORM public.support_owner_recipient(recipient,'salah');EXCEPTION WHEN SQLSTATE '42501' THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Unauthenticated recipient lookup was accepted';END IF;
 rejected:=false;BEGIN PERFORM public.support_owner_create(tid,recipient,'salah','QA','Unsent QA message','219');EXCEPTION WHEN SQLSTATE '42501' THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Unauthenticated owner message was accepted';END IF;
 IF EXISTS(SELECT 1 FROM public.support_threads WHERE id=tid) OR EXISTS(SELECT 1 FROM public.support_messages WHERE id=tid) THEN RAISE EXCEPTION 'Denied request created data';END IF;
 IF has_function_privilege('anon','public.support_owner_create(uuid,uuid,text,text,text,text)','EXECUTE') OR has_function_privilege('anon','public.support_owner_recipient(uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous function access exposed';END IF;
 IF NOT has_function_privilege('authenticated','public.support_owner_create(uuid,uuid,text,text,text,text)','EXECUTE') OR NOT has_function_privilege('authenticated','public.support_owner_recipient(uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Authenticated function privileges missing';END IF;
 IF has_table_privilege('authenticated','public.support_messages','SELECT') OR has_table_privilege('authenticated','public.support_threads','INSERT') THEN RAISE EXCEPTION 'Direct private table access exposed';END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.support_threads'::regclass,'public.support_messages'::regclass) AND NOT relrowsecurity) THEN RAISE EXCEPTION 'Private conversation RLS disabled';END IF;
 IF EXISTS(SELECT 1 FROM pg_proc WHERE oid IN ('public.support_owner_create(uuid,uuid,text,text,text,text)'::regprocedure,'public.support_owner_recipient(uuid,text)'::regprocedure) AND (NOT prosecdef OR NOT ('search_path=""'=ANY(proconfig)))) THEN RAISE EXCEPTION 'Privileged API search path is not locked';END IF;
END;$test$;
SELECT 'PASS: unauthenticated recipient/create requests denied without writing messages, authenticated-only function privileges, private table grants and RLS preserved' AS result;
ROLLBACK;