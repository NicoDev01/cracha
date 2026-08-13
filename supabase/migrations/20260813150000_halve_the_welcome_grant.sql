-- 300 was a free tier; 100 is a trial. It is enough to crawl a small site and
-- ask a handful of questions -- enough to see whether CraCha answers usefully,
-- which is the only thing the grant has to buy.
--
-- Only new accounts are affected. The ones that already hold 300 keep them:
-- taking credits back out of a balance somebody was told they had is not a
-- tariff change, it is a clawback.
--
-- Everything else about the function is unchanged; it is repeated in full
-- because `create or replace` has no way to edit one line.

create or replace function public.handle_new_credit_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_welcome constant integer := 100;
begin
  insert into public.credit_accounts (user_id, balance)
  values (new.id, v_welcome)
  on conflict (user_id) do nothing;

  if found then
    insert into public.credit_entries (user_id, amount, kind, reference, detail)
    values (new.id, v_welcome, 'welcome', new.id::text, 'Startguthaben')
    on conflict (kind, reference) do nothing;
  end if;

  return new;
end;
$$;

-- `create or replace` resets the grants, so the revoke from
-- 20260813140000_tighten_credit_grants.sql has to be repeated. Without it the
-- trigger function is published as an RPC endpoint again.
revoke all on function public.handle_new_credit_account() from public, anon, authenticated;
