-- Extend only the existing reciter allowlist; preserve body, privileges and scoring.
DO $migration$
DECLARE definition text;updated text;
 old_fragment constant text := $$'ar.muhammadaltablawi']) then raise exception 'invalid_input'; end if;$$;
 new_fragment constant text := $$'ar.muhammadaltablawi','ar.ahmadtalib','ar.muhammaddibirov','ar.kamilsamigullin','ar.alijonqori','ar.jahongirnematov']) then raise exception 'invalid_input'; end if;$$;
BEGIN
 SELECT pg_get_functiondef('public.reciter_popularity_add(text,text,uuid)'::regprocedure) INTO definition;
 IF position('p_reciter <> all(ARRAY[' in definition)=0 OR position('ar.ahmadtalib' in definition)>0 OR position('ar.muhammaddibirov' in definition)>0 THEN RAISE EXCEPTION 'Unexpected reciter allowlist; inspect before applying';END IF;
 updated:=replace(definition,old_fragment,new_fragment);
 IF updated=definition OR position('ar.alafasy' in updated)=0 OR position('ar.muhammadaltablawi' in updated)=0 OR position('ar.ahmadtalib' in updated)=0 OR position('ar.muhammaddibirov' in updated)=0 THEN RAISE EXCEPTION 'Reciter expansion did not match expected definition';END IF;
 EXECUTE updated;
END $migration$;
