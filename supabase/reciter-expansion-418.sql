-- Pending release418. Add only verified reciter IDs; preserve the current function body and all grants.
DO $expansion$
DECLARE definition text; updated text; BEGIN
 SELECT pg_get_functiondef('public.reciter_popularity_add(text,text,uuid)'::regprocedure) INTO definition;
 IF position('p_reciter <> all(ARRAY[' in definition)=0 THEN RAISE EXCEPTION 'Unexpected reciter allowlist: inspect function before applying'; END IF;
 -- The current definition is inspected before this guarded script is applied.
 IF position('ar.peshawaalkurdi' in definition)>0 THEN RAISE EXCEPTION 'New reciter IDs already present; inspect instead of applying twice'; END IF;
 updated := regexp_replace(definition, '(p_reciter <> all\(ARRAY\[[^]]+)', E'\\1,' || '''ar.peshawaalkurdi'',''ar.muhammadalfaqih'',''ar.fahadalkandari'',''ar.noreensiddiq'',''ar.muhammadjibreel'',''ar.mustafaismail'',''ar.mahmoudalbanna'',''ar.muhammadaltablawi''');
 IF updated=definition OR position('ar.muhammadaltablawi' in updated)=0 THEN RAISE EXCEPTION 'Allowlist not extended'; END IF;
 EXECUTE updated;
END $expansion$;
