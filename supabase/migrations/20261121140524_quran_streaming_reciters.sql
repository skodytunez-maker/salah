-- Add the new recording IDs while preserving both existing overloads and grants.
DO $migration$
DECLARE
  target regprocedure;
  definition text;
  updated text;
  old_fragment constant text := $$'ar.jahongirnematov']) then raise exception 'invalid_input'; end if;$$;
  new_fragment constant text := $$'ar.jahongirnematov','ar.abdullahbasfar','ar.ibrahimalakhdar','ar.khalidalqahtani','ar.tawfeeqalsayegh','ar.khalifaaltunaiji','ar.ahmadamer','ar.abdulhadikanakeri','ar.abdullahalmatroud','ar.abdullahkhayyat','ar.abdulwadoodhaneef','ar.zainmuhammadahmad','ar.muhammadalmuhaisni','ar.nabilalrifai','ar.yahyahawwa','ar.muhammadrashidalsharif','ar.abdullahalkhalaf','ar.hasansaleh','ar.abdurrahmanalshahhat']) then raise exception 'invalid_input'; end if;$$;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'public.reciter_popularity_add(text,text,uuid)'::regprocedure,
    'public.reciter_popularity_add(text,text,uuid,date)'::regprocedure
  ] LOOP
    SELECT pg_get_functiondef(target) INTO STRICT definition;
    updated := replace(definition, old_fragment, new_fragment);
    IF updated = definition OR position('ar.abdullahbasfar' IN definition) <> 0 THEN
      RAISE EXCEPTION 'Unexpected reciter allowlist in %', target;
    END IF;
    EXECUTE updated;
  END LOOP;
END
$migration$;
