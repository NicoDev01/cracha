-- The second half of the move to prepaid credits. Split off on purpose: the
-- migration that adds the credit tables is safe to run against the Worker that
-- is live at the time, this one is not. It runs once the build that no longer
-- reads user_plans is deployed.

drop function if exists public.consume_chat_message(integer);
drop table if exists public.user_plans;
