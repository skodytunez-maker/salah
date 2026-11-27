-- Register one reciter in the existing recorded-listening allowlist.
DO $migration$
DECLARE
  target regprocedure;
  definition text;
  old_fragment constant text := $$'ar.abdurrahmanalshahhat']) then raise exception 'invalid_input'; end if;$$;
  new_fragment constant text := $$'ar.abdurrahmanalshahhat','ar.omaribndiyaaldin']) then raise exception 'invalid_input'; end if;$$;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'public.reciter_popularity_add(text,text,uuid)'::regprocedure,
    'public.reciter_popularity_add(text,text,uuid,date)'::regprocedure
  ] LOOP
    SELECT pg_get_functiondef(target) INTO STRICT definition;
    IF position(new_fragment IN definition) > 0 THEN
      CONTINUE;
    END IF;
    IF position(old_fragment IN definition) = 0 OR position('ar.omaribndiyaaldin' IN definition) <> 0 THEN
      RAISE EXCEPTION 'Unexpected reciter allowlist in %', target;
    END IF;
    EXECUTE replace(definition, old_fragment, new_fragment);
  END LOOP;
END
$migration$;
