BEGIN;
-- Existing and future correspondence stays owner-private unless explicitly shared.
ALTER TABLE public.support_threads ADD COLUMN team_visible boolean NOT NULL DEFAULT false;
CREATE INDEX support_team_queue ON public.support_threads(app,updated_at DESC,id) WHERE team_visible;
CREATE OR REPLACE FUNCTION salah_staff_private.request(p_action text,p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a jsonb;uid uuid;owner boolean;perm text;draft_row salah_staff_private.drafts%ROWTYPE;support_row public.support_threads%ROWTYPE;result jsonb;messages jsonb;seen timestamptz;identifier uuid;v_kind text;v_entity text;body text;rev integer;scopes text[];target_user uuid;
BEGIN
 IF jsonb_typeof(p_args)<>'object' OR octet_length(p_args::text)>100000 THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
 IF p_action='gate' THEN RETURN salah_staff_private.actor(null,false,true);END IF;
 perm:=CASE WHEN p_action LIKE 'support.%' THEN 'support' WHEN p_action IN('draft.save','draft.submit','draft.get','draft.list','asset.register','asset.list') THEN CASE WHEN p_args->>'kind'='reciter' THEN 'reciters' WHEN p_args->>'kind'='wallpaper' THEN 'wallpapers' ELSE null END ELSE null END;
 a:=salah_staff_private.actor(perm,p_action IN('member.list','member.search','member.set','support.share','review.list','review.return','review.reject','catalog.publish','audit.list'));
 uid:=(a->>'id')::uuid;owner:=(a->>'owner')::boolean;
 IF p_action='member.list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT m.user_id AS id,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) AS nickname,m.role,m.permissions,m.active,m.updated_at FROM salah_staff_private.members m JOIN auth.users u ON u.id=m.user_id ORDER BY m.updated_at DESC LIMIT 100)x;RETURN result;
 ELSIF p_action='member.search' THEN
  body:=btrim(p_args->>'query');IF body IS NULL OR length(body) NOT BETWEEN 2 AND 40 THEN RAISE EXCEPTION 'invalid_query' USING ERRCODE='22023';END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT id,left(coalesce(nullif(raw_user_meta_data->>'nickname',''),'Без ника'),40) AS nickname FROM auth.users WHERE email_confirmed_at IS NOT NULL AND NOT coalesce(is_anonymous,false) AND id<>uid AND (id::text=body OR position(lower(body) IN lower(coalesce(raw_user_meta_data->>'nickname','')))>0) ORDER BY created_at DESC LIMIT 20)x;RETURN result;
 ELSIF p_action='member.set' THEN
  target_user:=(p_args->>'userId')::uuid;scopes:=CASE WHEN p_args->>'role'='admin' THEN ARRAY['support','reciters','wallpapers'] WHEN p_args->>'role'='moderator' THEN ARRAY['support'] ELSE null END;
  IF target_user=uid OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target_user AND email_confirmed_at IS NOT NULL AND NOT coalesce(is_anonymous,false)) OR scopes IS NULL OR jsonb_typeof(p_args->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_member' USING ERRCODE='22023';END IF;
  INSERT INTO salah_staff_private.members(user_id,role,permissions,active,updated_by) VALUES(target_user,p_args->>'role',scopes,(p_args->>'active')::boolean,uid) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,permissions=excluded.permissions,active=excluded.active,updated_by=uid,updated_at=clock_timestamp();
  INSERT INTO salah_staff_private.audit(actor_id,action,target,detail)VALUES(uid,p_action,target_user::text,jsonb_build_object('role',p_args->>'role','permissions',scopes,'active',p_args->'active'));RETURN jsonb_build_object('ok',true);
 ELSIF p_action IN('draft.list','review.list') THEN
  v_kind:=p_args->>'kind';IF (p_action='draft.list' AND v_kind IS NULL) OR (v_kind IS NOT NULL AND v_kind NOT IN('reciter','wallpaper')) THEN RAISE EXCEPTION 'invalid_kind' USING ERRCODE='22023';END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT d.id,d.author_id,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Сотрудник'),40) AS author_name,d.kind,d.entity_id,d.payload,d.status,d.revision,d.base_revision,d.review_note,d.created_at,d.updated_at FROM salah_staff_private.drafts d JOIN auth.users u ON u.id=d.author_id WHERE (owner OR d.author_id=uid) AND (v_kind IS NULL OR d.kind=v_kind) AND (p_action<>'review.list' OR d.status='submitted') ORDER BY d.updated_at DESC,d.id LIMIT 100)x;RETURN result;
 ELSIF p_action IN('draft.get','draft.save','draft.submit','review.return','review.reject','catalog.publish','asset.register','asset.list') THEN
  identifier:=(p_args->>'id')::uuid;
  SELECT * INTO draft_row FROM salah_staff_private.drafts WHERE id=identifier FOR UPDATE;
  IF p_action='draft.save' AND draft_row.id IS NULL THEN
   v_kind:=p_args->>'kind';v_entity:=p_args->>'entityId';IF v_kind IS NULL OR v_kind NOT IN('reciter','wallpaper') OR v_entity IS NULL OR NOT v_entity~'^[a-z0-9][a-z0-9.-]{0,79}$' OR jsonb_typeof(p_args->'payload') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_draft' USING ERRCODE='22023';END IF;
   PERFORM salah_staff_private.actor(CASE WHEN v_kind='reciter' THEN 'reciters' ELSE 'wallpapers' END);
   PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,101));
   IF (SELECT count(*) FROM salah_staff_private.drafts WHERE author_id=uid AND status IN('draft','submitted','changes_requested'))>=100 THEN RAISE EXCEPTION 'draft_limit' USING ERRCODE='P0001';END IF;
   SELECT coalesce((SELECT c.revision FROM salah_staff_private.catalog c WHERE c.kind=p_args->>'kind' AND c.entity_id=v_entity),0) INTO rev;
   INSERT INTO salah_staff_private.drafts(id,author_id,kind,entity_id,payload,base_revision) VALUES(identifier,uid,v_kind,v_entity,p_args->'payload',rev) RETURNING * INTO draft_row;
  ELSE
   IF draft_row.id IS NULL OR (NOT owner AND draft_row.author_id<>uid) THEN RAISE EXCEPTION 'draft_unavailable' USING ERRCODE='42501';END IF;
   PERFORM salah_staff_private.actor(CASE WHEN draft_row.kind='reciter' THEN 'reciters' ELSE 'wallpapers' END);
   IF p_action IN('draft.save','draft.submit','review.return','review.reject','catalog.publish') AND (p_args->>'revision')::integer IS DISTINCT FROM draft_row.revision THEN RAISE EXCEPTION 'revision_conflict' USING ERRCODE='P0001';END IF;
   IF p_action='draft.save' THEN
    IF draft_row.status NOT IN('draft','changes_requested') OR draft_row.kind IS DISTINCT FROM p_args->>'kind' OR draft_row.entity_id IS DISTINCT FROM p_args->>'entityId' OR jsonb_typeof(p_args->'payload')<>'object' THEN RAISE EXCEPTION 'draft_locked' USING ERRCODE='P0001';END IF;
    UPDATE salah_staff_private.drafts SET payload=p_args->'payload',revision=revision+1,updated_at=clock_timestamp() WHERE id=identifier RETURNING * INTO draft_row;
   ELSIF p_action='draft.submit' THEN
    IF draft_row.status NOT IN('draft','changes_requested') THEN RAISE EXCEPTION 'draft_locked' USING ERRCODE='P0001';END IF;
    UPDATE salah_staff_private.drafts SET status='submitted',review_note='',revision=revision+1,updated_at=clock_timestamp() WHERE id=identifier RETURNING * INTO draft_row;
   ELSIF p_action IN('review.return','review.reject') THEN
    body:=btrim(p_args->>'note');IF draft_row.status<>'submitted' OR body IS NULL OR length(body) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid_review' USING ERRCODE='22023';END IF;
    UPDATE salah_staff_private.drafts SET status=CASE WHEN p_action='review.return' THEN 'changes_requested' ELSE 'rejected' END,review_note=body,reviewed_by=uid,revision=revision+1,updated_at=clock_timestamp() WHERE id=identifier RETURNING * INTO draft_row;
   ELSIF p_action='catalog.publish' THEN
    IF draft_row.status<>'submitted' OR jsonb_typeof(p_args->'payload')<>'object' OR p_args->'payload'->>'id' IS DISTINCT FROM draft_row.entity_id THEN RAISE EXCEPTION 'invalid_publication' USING ERRCODE='22023';END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(draft_row.kind||':'||draft_row.entity_id,102));
    SELECT coalesce((SELECT c.revision FROM salah_staff_private.catalog c WHERE c.kind=draft_row.kind AND c.entity_id=draft_row.entity_id),0) INTO rev;
    IF rev<>draft_row.base_revision THEN RAISE EXCEPTION 'catalog_conflict' USING ERRCODE='P0001';END IF;
    IF rev=0 AND (SELECT count(*) FROM salah_staff_private.catalog c WHERE c.kind=draft_row.kind)>=100 THEN RAISE EXCEPTION 'catalog_limit' USING ERRCODE='P0001';END IF;
    INSERT INTO salah_staff_private.catalog(kind,entity_id,payload,revision,draft_id,approved_by)VALUES(draft_row.kind,draft_row.entity_id,p_args->'payload',rev+1,draft_row.id,uid)ON CONFLICT(kind,entity_id)DO UPDATE SET payload=excluded.payload,revision=excluded.revision,draft_id=excluded.draft_id,approved_by=uid,published_at=clock_timestamp();
    UPDATE salah_staff_private.drafts SET status='published',reviewed_by=uid,revision=revision+1,updated_at=clock_timestamp() WHERE id=identifier RETURNING * INTO draft_row;
   ELSIF p_action='asset.register' THEN
    IF draft_row.status NOT IN('draft','changes_requested') OR (NOT owner AND draft_row.author_id<>uid) THEN RAISE EXCEPTION 'draft_locked' USING ERRCODE='P0001';END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(draft_row.id::text,103));
    IF (SELECT count(*) FROM salah_staff_private.assets WHERE draft_id=draft_row.id)>=16 THEN RAISE EXCEPTION 'asset_limit' USING ERRCODE='P0001';END IF;
    IF p_args->>'path' IS DISTINCT FROM uid::text||'/'||draft_row.id::text||'/'||(p_args->>'assetId')||'.jpg' THEN RAISE EXCEPTION 'invalid_asset_path' USING ERRCODE='22023';END IF;
    INSERT INTO salah_staff_private.assets(id,draft_id,uploaded_by,object_path,bytes,width,height,sha256)VALUES((p_args->>'assetId')::uuid,draft_row.id,uid,p_args->>'path',(p_args->>'bytes')::integer,(p_args->>'width')::integer,(p_args->>'height')::integer,p_args->>'sha256');
   ELSIF p_action='asset.list' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT id,object_path AS path,bytes,width,height,sha256 FROM salah_staff_private.assets WHERE draft_id=draft_row.id ORDER BY created_at,id)x;RETURN result;
   END IF;
  END IF;
  IF p_action NOT IN('draft.get','asset.list') THEN INSERT INTO salah_staff_private.audit(actor_id,action,target,detail)VALUES(uid,p_action,draft_row.id::text,jsonb_build_object('kind',draft_row.kind,'entityId',draft_row.entity_id,'revision',draft_row.revision));END IF;
  RETURN to_jsonb(draft_row);
 ELSIF p_action='support.share' THEN
  IF jsonb_typeof(p_args->'visible') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_parameters' USING ERRCODE='22023';END IF;
  identifier:=(p_args->>'id')::uuid;
  UPDATE public.support_threads SET team_visible=(p_args->>'visible')::boolean WHERE id=identifier AND app='salah' RETURNING * INTO support_row;
  IF support_row.id IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
  INSERT INTO salah_staff_private.audit(actor_id,action,target,detail)VALUES(uid,p_action,identifier::text,jsonb_build_object('visible',p_args->'visible'));
  RETURN jsonb_build_object('ok',true,'visible',support_row.team_visible);
 ELSIF p_action='support.list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT t.id,t.subject,t.version,t.status,t.updated_at,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Без ника'),40) AS nickname,EXISTS(SELECT 1 FROM public.support_messages m WHERE m.thread_id=t.id AND NOT m.owner_reply AND m.created_at>t.owner_seen_at) AS unread FROM public.support_threads t JOIN auth.users u ON u.id=t.user_id WHERE t.app='salah' AND t.team_visible AND (p_args->>'before' IS NULL OR t.updated_at<(p_args->>'before')::timestamptz) ORDER BY t.updated_at DESC,t.id LIMIT 50)x;RETURN result;
 ELSIF p_action IN('support.read','support.reply','support.close') THEN
  identifier:=(p_args->>'id')::uuid;SELECT * INTO support_row FROM public.support_threads WHERE id=identifier AND app='salah' AND team_visible FOR UPDATE;
  IF support_row.id IS NULL THEN RAISE EXCEPTION 'conversation_unavailable' USING ERRCODE='42501';END IF;
  IF p_action='support.reply' THEN
   body:=btrim(p_args->>'body');IF body IS NULL OR length(body) NOT BETWEEN 1 AND 3000 OR support_row.status='closed' THEN RAISE EXCEPTION 'invalid_reply' USING ERRCODE='22023';END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
   IF EXISTS(SELECT 1 FROM public.support_messages WHERE id=(p_args->>'messageId')::uuid AND thread_id=support_row.id AND author_id=uid) THEN RETURN jsonb_build_object('ok',true);END IF;
   IF (SELECT count(*) FROM public.support_messages WHERE thread_id=support_row.id)>=100 OR (SELECT count(*) FROM public.support_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 minute')>=3 OR (SELECT count(*) FROM public.support_messages WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 day')>=100 THEN RAISE EXCEPTION 'support_rate_limit' USING ERRCODE='P0001';END IF;
   INSERT INTO public.support_messages(id,thread_id,author_id,owner_reply,body)VALUES((p_args->>'messageId')::uuid,support_row.id,uid,true,body);
   UPDATE public.support_threads SET status='answered',updated_at=clock_timestamp() WHERE id=support_row.id;
  ELSIF p_action='support.close' THEN UPDATE public.support_threads SET status='closed',updated_at=clock_timestamp() WHERE id=support_row.id;
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO messages FROM(SELECT sm.id,sm.owner_reply,sm.body,sm.created_at FROM public.support_messages sm WHERE sm.thread_id=support_row.id ORDER BY sm.created_at,sm.id LIMIT 100)x;
   SELECT max((v->>'created_at')::timestamptz) INTO seen FROM jsonb_array_elements(messages)v WHERE v->>'owner_reply'='false';
   UPDATE public.support_threads SET owner_seen_at=greatest(owner_seen_at,coalesce(seen,owner_seen_at)) WHERE id=support_row.id;
   SELECT coalesce(jsonb_agg(jsonb_build_object('message_id',p.message_id,'path',p.object_path,'index',p.photo_index)),'[]') INTO result FROM salah_support_private.photos p JOIN public.support_messages m ON m.id=p.message_id WHERE m.thread_id=support_row.id;
   RETURN jsonb_build_object('thread',jsonb_build_object('id',support_row.id,'subject',support_row.subject,'status',support_row.status,'version',support_row.version),'messages',messages,'photos',result);
  END IF;
  INSERT INTO salah_staff_private.audit(actor_id,action,target)VALUES(uid,p_action,support_row.id::text);RETURN jsonb_build_object('ok',true);
 ELSIF p_action='audit.list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM(SELECT a.id,a.action,a.target,a.detail,a.created_at,left(coalesce(nullif(u.raw_user_meta_data->>'nickname',''),'Владелец'),40) AS actor_name FROM salah_staff_private.audit a JOIN auth.users u ON u.id=a.actor_id ORDER BY a.created_at DESC,a.id DESC LIMIT 100)x;RETURN result;
 END IF;
 RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023';
END;$$;
REVOKE ALL ON FUNCTION salah_staff_private.request(text,jsonb) FROM PUBLIC,anon,authenticated;
COMMIT;
