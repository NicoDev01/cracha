-- Chat history moves from the browser into the account.
--
-- chat_sessions and chat_messages were created by hand in the dashboard for a
-- history that was never built; no code wrote to them and both are empty. They
-- are replaced rather than altered, so their schema is finally written down
-- here instead of in the dashboard.
--
-- Ownership follows the knowledge bases: every conversation carries the
-- account it belongs to and the knowledge base it asks, and nothing reaches
-- these tables except the server with the service role, which takes the user
-- id from the verified session. Deleting the account cascades through both
-- tables; deleting a knowledge base deletes its conversations in the app.
drop table if exists public.chat_messages;
drop table if exists public.chat_sessions;

create table public.chat_conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  database_id text not null check (char_length(database_id) between 1 and 160),
  title text not null check (char_length(title) between 1 and 200),
  -- 'question' until the generated title arrives; a title the user gave is
  -- never overwritten by one that was still being generated.
  title_source text not null default 'question' check (title_source in ('question', 'generated', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chat_conversations_user_recent_idx on public.chat_conversations (user_id, updated_at desc);
create index chat_conversations_user_database_idx on public.chat_conversations (user_id, database_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  -- Insertion order; timestamps of a question and its answer can tie.
  position bigint generated always as identity,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 100000),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  metadata jsonb check (metadata is null or jsonb_typeof(metadata) = 'object'),
  is_error boolean not null default false,
  created_at timestamptz not null default now()
);
create index chat_messages_conversation_idx on public.chat_messages (conversation_id, position);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
revoke all on public.chat_conversations from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
grant select, insert, update, delete on public.chat_conversations, public.chat_messages to service_role;

-- Records one message. Only a question may open a conversation: an answer that
-- arrives after its conversation was deleted must not bring it back. A
-- conversation stays with the knowledge base it was opened for.
create or replace function public.chat_record(
  p_user uuid, p_conversation uuid, p_database text, p_title text,
  p_role text, p_content text, p_sources jsonb, p_metadata jsonb, p_is_error boolean,
  p_generated_title text default null
)
returns json language plpgsql security invoker set search_path = '' as $$
declare v_row public.chat_conversations%rowtype; v_created boolean := false; v_count integer;
begin
  if p_role = 'user' then
    insert into public.chat_conversations(id, user_id, database_id, title)
    values (p_conversation, p_user, p_database, left(p_title, 200))
    on conflict (id) do nothing;
    v_created := found;
  end if;
  select * into v_row from public.chat_conversations where id = p_conversation for update;
  if not found or v_row.user_id <> p_user then return json_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_row.database_id <> p_database then return json_build_object('ok', false, 'reason', 'database_mismatch'); end if;
  select count(*) into v_count from public.chat_messages where conversation_id = p_conversation;
  -- An answer may always complete the question before it.
  if v_count >= (case when p_role = 'user' then 200 else 202 end) then
    return json_build_object('ok', false, 'reason', 'full');
  end if;
  insert into public.chat_messages(conversation_id, role, content, sources, metadata, is_error)
  values (p_conversation, p_role, p_content, coalesce(p_sources, '[]'::jsonb), p_metadata, coalesce(p_is_error, false));
  update public.chat_conversations set
    updated_at = now(),
    title = case when p_generated_title is not null and title_source = 'question' then left(p_generated_title, 200) else title end,
    title_source = case when p_generated_title is not null and title_source = 'question' then 'generated' else title_source end
  where id = p_conversation;
  return json_build_object('ok', true, 'created', v_created);
end;
$$;

-- Takes over one conversation that was kept in the browser before this
-- migration. Repeating it changes nothing; an id that belongs to someone else
-- is refused.
create or replace function public.chat_import(
  p_user uuid, p_conversation uuid, p_database text, p_title text, p_messages jsonb
)
returns json language plpgsql security invoker set search_path = '' as $$
declare v_owner uuid; v_message jsonb; v_first timestamptz; v_last timestamptz;
begin
  select min(least((m->>'created_at')::timestamptz, now())), max(least((m->>'created_at')::timestamptz, now()))
    into v_first, v_last
    from jsonb_array_elements(p_messages) m;
  insert into public.chat_conversations(id, user_id, database_id, title, created_at, updated_at)
  values (p_conversation, p_user, p_database, left(p_title, 200), coalesce(v_first, now()), coalesce(v_last, now()))
  on conflict (id) do nothing;
  if not found then
    select user_id into v_owner from public.chat_conversations where id = p_conversation;
    return json_build_object('ok', v_owner = p_user, 'imported', false);
  end if;
  -- One at a time, so positions follow the order the messages were written in.
  for v_message in select m from jsonb_array_elements(p_messages) with ordinality e(m, n) order by n loop
    insert into public.chat_messages(conversation_id, role, content, sources, metadata, is_error, created_at)
    values (
      p_conversation, v_message->>'role', v_message->>'content',
      coalesce(v_message->'sources', '[]'::jsonb), nullif(v_message->'metadata', 'null'::jsonb),
      coalesce((v_message->>'is_error')::boolean, false),
      least((v_message->>'created_at')::timestamptz, now())
    );
  end loop;
  return json_build_object('ok', true, 'imported', true);
end;
$$;

revoke all on function public.chat_record(uuid, uuid, text, text, text, text, jsonb, jsonb, boolean, text) from public, anon, authenticated;
revoke all on function public.chat_import(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.chat_record(uuid, uuid, text, text, text, text, jsonb, jsonb, boolean, text) to service_role;
grant execute on function public.chat_import(uuid, uuid, text, text, jsonb) to service_role;
