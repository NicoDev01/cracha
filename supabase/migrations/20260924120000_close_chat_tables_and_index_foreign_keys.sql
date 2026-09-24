-- chat_sessions and chat_messages are still unused: the chat history lives in
-- the browser. Their policies were bound to "authenticated", which kept both
-- tables in the GraphQL and REST schema of every signed-in account, and the
-- Supabase advisor flagged them twice (visible to signed-in users, policies
-- that anonymous sign-ins would also pass). Every other table here is reached
-- only through the service role; these two now follow the same rule. A future
-- server-side history would go through the service role as well.
drop policy if exists "Users can view their own sessions" on public.chat_sessions;
drop policy if exists "Users can insert their own sessions" on public.chat_sessions;
drop policy if exists "Users can delete their own sessions" on public.chat_sessions;
drop policy if exists "Users can view messages of their sessions" on public.chat_messages;
drop policy if exists "Users can insert messages to their sessions" on public.chat_messages;

revoke all on public.chat_sessions from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;

-- Foreign keys without an index make every delete of the referenced row scan
-- the referencing table; account deletion removes auth.users rows.
create index if not exists chat_messages_session_id_idx on public.chat_messages (session_id);
create index if not exists chat_sessions_user_id_idx on public.chat_sessions (user_id);
create index if not exists crawl_access_user_id_idx on public.crawl_access (user_id);
create index if not exists user_database_deletions_user_id_idx on public.user_database_deletions (user_id);
