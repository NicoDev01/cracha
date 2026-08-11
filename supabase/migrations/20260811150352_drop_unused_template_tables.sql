-- Applied to project ncfrgsqfnccjfyezxjsj on 2026-08-11.
--
-- The previous migration locked these three down; this removes them. They came
-- from the project template, nothing in this repository names them, and
-- pg_stat_user_tables reported n_tup_ins = 0 -- not one row was ever written.
-- Locking an unused table was the smaller change and so came first, but a table
-- that still exists is a table someone can re-expose by flipping RLS off later.
--
-- What is left in the public schema afterwards is chat_messages and
-- chat_sessions. Those are unused too, but they are kept: they are the shape a
-- server-side chat history would need, and dropping them is a decision about
-- that feature rather than about this security finding.
--
-- tasks references projects, so it goes first. credentials stands alone.
drop table if exists public.tasks;
drop table if exists public.projects;
drop table if exists public.credentials;

-- Its only callers were the set_timestamp triggers on those three tables, which
-- went with them.
drop function if exists public.trigger_set_timestamp();
