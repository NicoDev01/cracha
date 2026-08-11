-- Applied to project ncfrgsqfnccjfyezxjsj on 2026-08-11. It is kept here
-- because the database had no recorded migration at all until this one: every
-- table in it was created by hand in the dashboard, so nothing in this
-- repository said what the schema looked like or why.
--
-- Supabase reported projects, tasks and credentials as world-readable and
-- world-writable: RLS was never enabled, so the public anon key alone was
-- enough to read, change or delete every row. They are leftovers from the
-- project template -- no code in this repository names them, no row was ever
-- inserted (pg_stat_user_tables reported n_tup_ins = 0 for all three), and no
-- migration created them. Enabling RLS without policies therefore denies
-- everyone, which is the correct state for a table nothing uses.
--
-- The REVOKE lines matter separately from RLS: PostgREST decides whether a
-- table appears in the REST and GraphQL schema by looking at grants, not at
-- RLS. Without them the tables stay discoverable even though every read
-- returns nothing.

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.credentials enable row level security;

revoke all on public.projects from anon, authenticated;
revoke all on public.tasks from anon, authenticated;
revoke all on public.credentials from anon, authenticated;

-- chat_sessions and chat_messages already carried RLS, but their policies were
-- granted to the role "public", which includes anon. The auth.uid() checks
-- already made an anonymous read return nothing; binding the policies to
-- authenticated says so in the policy itself instead of relying on a null
-- comparison, and dropping the anon grant removes the tables from the schema
-- that is visible before sign-in.
drop policy if exists "Users can view their own sessions" on public.chat_sessions;
drop policy if exists "Users can insert their own sessions" on public.chat_sessions;
drop policy if exists "Users can delete their own sessions" on public.chat_sessions;

create policy "Users can view their own sessions" on public.chat_sessions
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert their own sessions" on public.chat_sessions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete their own sessions" on public.chat_sessions
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can view messages of their sessions" on public.chat_messages;
drop policy if exists "Users can insert messages to their sessions" on public.chat_messages;

create policy "Users can view messages of their sessions" on public.chat_messages
  for select to authenticated using (
    exists (
      select 1 from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = auth.uid()
    )
  );
create policy "Users can insert messages to their sessions" on public.chat_messages
  for insert to authenticated with check (
    exists (
      select 1 from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = auth.uid()
    )
  );

revoke all on public.chat_sessions from anon;
revoke all on public.chat_messages from anon;

-- A trigger function without SECURITY DEFINER still runs with the caller's
-- search_path. Pinning it means a caller cannot shadow a function or type name
-- with something from a schema of their own.
alter function public.trigger_set_timestamp() set search_path = '';
