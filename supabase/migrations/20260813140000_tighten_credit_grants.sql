-- Two grants the credit migration left wider than they need to be.
--
-- 1. handle_new_credit_account is a trigger function, and Supabase publishes
--    every function in the public schema as an RPC endpoint. Postgres refuses
--    to run a function returning `trigger` outside a trigger, so it was not
--    exploitable -- but an endpoint that only ever answers with an error is
--    still an endpoint. A trigger fires as the table owner and needs no grant.
--
-- 2. credit_accounts and credit_entries were readable by `authenticated`,
--    scoped by RLS to the caller's own rows. Nothing uses it: the balance and
--    the ledger reach the browser through /api/credits, which reads with the
--    service role. An unused read grant is an unused read grant, and it also
--    put both tables into the GraphQL schema for every signed-in account.
--
-- What remains is the plainest arrangement there is: RLS on, no policies, no
-- grants. Every row is reachable only by the service role, which is the only
-- thing that ever asked for one.

revoke all on function public.handle_new_credit_account() from public, anon, authenticated;

drop policy if exists "Users read their own credit account" on public.credit_accounts;
drop policy if exists "Users read their own credit entries" on public.credit_entries;

revoke select on public.credit_accounts from authenticated;
revoke select on public.credit_entries from authenticated;
