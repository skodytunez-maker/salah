-- Release 418: allow the eight added reciters in the existing opt-in leaderboard function.
-- Preserve its current body, SECURITY INVOKER behavior, search_path, and grants.
DO $migration$
DECLARE
 definition text;
 updated text;
 old_fragment constant text := $$'ar.salahbukhatir']) then raise exception 'invalid_input'; end if;$$;
 new_fragment constant text := $$'ar.salahbukhatir','ar.peshawaalkurdi','ar.muhammadalfaqih','ar.fahadalkandari','ar.noreensiddiq','ar.muhammadjibreel','ar.mustafaismail','ar.mahmoudalbanna','ar.muhammadaltablawi']) then raise exception 'invalid_input'; end if;$$;
BEGIN
 SELECT pg_get_functiondef('public.reciter_popularity_add(text,text,uuid)'::regprocedure) INTO definition;
 IF position('p_reciter <> all(ARRAY[' in definition)=0 THEN
  RAISE EXCEPTION 'Unexpected reciter allowlist; inspect function before applying';
 END IF;
 IF position('ar.peshawaalkurdi' in definition)>0
  OR position('ar.muhammadalfaqih' in definition)>0
  OR position('ar.fahadalkandari' in definition)>0
  OR position('ar.noreensiddiq' in definition)>0
  OR position('ar.muhammadjibreel' in definition)>0
  OR position('ar.mustafaismail' in definition)>0
  OR position('ar.mahmoudalbanna' in definition)>0
  OR position('ar.muhammadaltablawi' in definition)>0 THEN
  RAISE EXCEPTION 'New reciter IDs already present; inspect instead of applying twice';
 END IF;
 updated := replace(definition,old_fragment,new_fragment);
 IF updated=definition OR position('ar.alafasy' in updated)=0
  OR position('ar.salahbukhatir' in updated)=0
  OR position('ar.muhammadaltablawi' in updated)=0 THEN
  RAISE EXCEPTION 'Allowlist expansion did not match the expected function definition';
 END IF;
 EXECUTE updated;
END $migration$;

