alter table salah_video_stories_private.stories
  add column poll jsonb check (poll is null or (
    jsonb_typeof(poll) = 'object' and jsonb_typeof(poll -> 'choices') = 'array'
    and char_length(poll ->> 'question') between 1 and 120
    and jsonb_array_length(poll -> 'choices') between 2 and 4
  ));

create table salah_video_stories_private.engagement (
  story_id uuid not null references salah_video_stories_private.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  liked boolean not null default false,
  reaction text check (reaction in ('🤲', '❤️', '👍', '✨')),
  vote smallint check (vote between 0 and 3),
  primary key (story_id, user_id)
);

create table salah_video_stories_private.comments (
  story_id uuid not null references salah_video_stories_private.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default statement_timestamp(),
  primary key (story_id, user_id, id)
);
create index video_story_comments_recent
  on salah_video_stories_private.comments (story_id, created_at desc, id);
create index video_story_engagement_account
  on salah_video_stories_private.engagement (user_id);
create index video_story_comments_account
  on salah_video_stories_private.comments (user_id);

alter table salah_video_stories_private.engagement enable row level security;
alter table salah_video_stories_private.comments enable row level security;
revoke all on salah_video_stories_private.engagement, salah_video_stories_private.comments
  from public, anon, authenticated, service_role;
grant select, insert, update on salah_video_stories_private.engagement to service_role;
grant select, insert on salah_video_stories_private.comments to service_role;

create function salah_video_stories_private.interact(
  story uuid, actor uuid, owner_archive boolean, action text, payload jsonb
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  current_story salah_video_stories_private.stories%rowtype;
  actor_vote smallint;
  counts jsonb;
  likes integer;
  own_like boolean;
  own_reaction text;
  reaction_counts jsonb;
  recent_comments jsonb;
begin
  if action not in ('read', 'like', 'react', 'vote', 'comment') or
     (action <> 'read' and (actor is null or owner_archive)) then
    return '{"error":"forbidden"}'::jsonb;
  end if;

  select * into current_story from salah_video_stories_private.stories
    where id = story and removed_at is null and published_at is not null
      and (owner_archive or highlighted or expires_at > statement_timestamp())
    for share;
  if not found then return '{"error":"unavailable"}'::jsonb; end if;

  case action
    when 'like' then
      insert into salah_video_stories_private.engagement (story_id, user_id, liked)
        values (story, actor, (payload ->> 'value')::boolean)
        on conflict (story_id, user_id) do update set liked = excluded.liked;
    when 'react' then
      insert into salah_video_stories_private.engagement (story_id, user_id, reaction)
        values (story, actor, payload ->> 'value')
        on conflict (story_id, user_id) do update set reaction = excluded.reaction;
    when 'vote' then
      actor_vote := (payload ->> 'value')::smallint;
      if current_story.poll is null or actor_vote is null or actor_vote < 0 or
         actor_vote >= jsonb_array_length(current_story.poll -> 'choices') then
        return '{"error":"invalid_vote"}'::jsonb;
      end if;
      insert into salah_video_stories_private.engagement (story_id, user_id, vote)
        values (story, actor, actor_vote)
        on conflict (story_id, user_id) do update set vote = excluded.vote
        where salah_video_stories_private.engagement.vote is null;
    when 'comment' then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(story::text || actor::text, 0));
      if not exists (select from salah_video_stories_private.comments
          where story_id = story and user_id = actor and id = (payload ->> 'id')::uuid) then
        if (select count(*) from salah_video_stories_private.comments
            where story_id = story and user_id = actor) >= 20 then
          return '{"error":"comment_limit"}'::jsonb;
        end if;
        insert into salah_video_stories_private.comments (story_id, user_id, id, body)
          values (story, actor, (payload ->> 'id')::uuid, payload ->> 'text');
      end if;
    else null;
  end case;

  select count(*) into likes from salah_video_stories_private.engagement
    where story_id = story and liked;
  select coalesce(jsonb_object_agg(reaction, total), '{}'::jsonb) into reaction_counts
    from (select reaction, count(*) as total from salah_video_stories_private.engagement
      where story_id = story and reaction is not null group by reaction) reactions;
  select vote, liked, reaction into actor_vote, own_like, own_reaction
    from salah_video_stories_private.engagement where story_id = story and user_id = actor;
  if current_story.poll is not null then
    select jsonb_agg(total order by option_number) into counts
    from (
      select i as option_number, count(e.vote) as total
      from generate_series(0, jsonb_array_length(current_story.poll -> 'choices') - 1) i
      left join salah_video_stories_private.engagement e on e.story_id = story and e.vote = i
      group by i
    ) results;
  end if;
  select jsonb_agg(jsonb_build_object('id', id, 'body', body, 'createdAt', created_at)
         order by created_at desc, id) into recent_comments
    from (
      select id, body, created_at from salah_video_stories_private.comments
      where story_id = story and (owner_archive or user_id = actor)
      order by created_at desc, id limit 20
    ) recent;

  return jsonb_build_object(
    'likes', likes, 'liked', coalesce(own_like, false), 'reaction', own_reaction, 'reactionCounts', reaction_counts,
    'poll', current_story.poll, 'counts', counts, 'vote', actor_vote,
    'comments', coalesce(recent_comments, '[]'::jsonb)
  );
end;
$$;

revoke all on function salah_video_stories_private.interact(uuid,uuid,boolean,text,jsonb)
  from public, anon, authenticated, service_role;
grant execute on function salah_video_stories_private.interact(uuid,uuid,boolean,text,jsonb) to service_role;
