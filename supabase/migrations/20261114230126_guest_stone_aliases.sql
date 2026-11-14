begin;
-- A display alias for an existing guest ledger, never a new identity or location record.
create sequence salah_competition_private.guest_alias_sequence as bigint minvalue 1 start 1 no cycle;
create table salah_competition_private.guest_aliases(
 guest_id uuid primary key references salah_competition_private.guest_players(public_id) on delete cascade,
 nickname text not null unique check(length(nickname) between 9 and 40 and nickname like 'Гость · %' and nickname!~'[[:cntrl:]]'),
 assigned_at timestamptz not null default clock_timestamp()
);
alter table salah_competition_private.guest_aliases enable row level security;
revoke all on salah_competition_private.guest_aliases from public,anon,authenticated;
revoke all on sequence salah_competition_private.guest_alias_sequence from public,anon,authenticated;
create function salah_competition_private.ensure_guest_alias(p_guest_id uuid)returns text
language plpgsql security invoker set search_path='' as $alias$
declare
 stones text[]:=array['Янтарь','Сапфир','Нефрит','Агат','Аметист','Рубин','Изумруд','Оникс','Алмаз','Опал','Топаз','Жадеит','Гранат','Хризолит','Берилл','Турмалин','Циркон','Малахит','Авантюрин','Лазурит','Шунгит','Сердолик','Гематит','Обсидиан','Хризопраз','Александрит','Аквамарин','Танзанит','Пирит','Селенит','Флюорит','Корунд'];
 colors text[]:=array['Светлый','Золотой','Серебристый','Медовый','Лунный','Солнечный','Белый','Синий','Голубой','Зелёный','Лиловый','Розовый','Красный','Серый','Чёрный','Лазурный','Небесный','Мятный','Оливковый','Жемчужный','Бирюзовый','Малиновый','Пурпурный','Бронзовый','Золотистый','Лавандовый','Сапфировый','Янтарный','Звёздный','Зимний','Летний','Весенний'];
 qualities text[]:=array['Тихий','Уютный','Добрый','Мягкий','Тёплый','Ясный','Чистый','Нежный','Родной','Дивный','Милый','Юный','Верный','Смелый','Ровный','Ласковый'];
 title text;ordinal bigint;n bigint;stone_count integer:=array_length(stones,1);color_count integer:=array_length(colors,1);quality_count integer:=array_length(qualities,1);
begin
 -- The caller already locks the existing ledger. The primary key also makes retries safe.
 perform 1 from salah_competition_private.guest_players where public_id=p_guest_id;
 if not found then return null;end if;
 select nickname into title from salah_competition_private.guest_aliases where guest_id=p_guest_id;
 if found then return title;end if;
 ordinal:=nextval('salah_competition_private.guest_alias_sequence'::regclass);n:=ordinal-1;
 if n<stone_count then title:=stones[n::integer+1];
 else
  n:=n-stone_count;
  if n<stone_count*color_count then title:=colors[(n/stone_count)::integer+1]||' '||lower(stones[(n%stone_count)::integer+1]);
  else
   n:=n-stone_count*color_count;
   if n<stone_count*color_count*quality_count then title:=qualities[(n/(stone_count*color_count))::integer+1]||' '||lower(colors[((n/stone_count)%color_count)::integer+1])||' '||lower(stones[(n%stone_count)::integer+1]);
   else
    -- Keep registration available after the friendly combinations are exhausted.
    -- Decimal bigint is at most19characters; these names remain within40characters.
    title:=stones[((ordinal-1)%stone_count)::integer+1]||' '||ordinal::text;
   end if;
  end if;
 end if;
 title:='Гость · '||title;
 insert into salah_competition_private.guest_aliases(guest_id,nickname)values(p_guest_id,title)
 on conflict(guest_id) do nothing returning nickname into title;
 if not found then
  select nickname into title from salah_competition_private.guest_aliases where guest_id=p_guest_id;
 end if;
 return title;
end;
$alias$;
revoke all on function salah_competition_private.ensure_guest_alias(uuid) from public,anon,authenticated;
grant usage on schema salah_competition_private to service_role;
grant select,insert on salah_competition_private.guest_aliases to service_role;
grant usage on sequence salah_competition_private.guest_alias_sequence to service_role;
grant execute on function salah_competition_private.ensure_guest_alias(uuid) to service_role;
do $backfill$
declare guest record;
begin
 for guest in select public_id from salah_competition_private.guest_players order by created_at,public_id loop
  perform salah_competition_private.ensure_guest_alias(guest.public_id);
 end loop;
end;
$backfill$;
comment on table salah_competition_private.guest_aliases is 'Persisted unique friendly stone names for existing guest ledgers. Public boards project nickname only; selected-city context stays in the separate owner-only activity schema.';
commit;
