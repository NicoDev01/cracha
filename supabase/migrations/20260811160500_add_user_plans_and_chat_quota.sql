-- The app is publicly signable now, so an account has to have a ceiling. This
-- migration holds only the half that needs a database: the chat counter and the
-- subscription state.
--
-- Knowledge bases and crawled pages are deliberately not here. Both are already
-- recorded in the KV registry, and a second copy in Postgres would be a number
-- that can drift away from the thing it describes. They are counted from the
-- records themselves; see src/lib/server/plan.ts.
--
-- The chat counter cannot be derived from anything, so it is stored -- and it
-- is stored here rather than in KV because two messages sent at the same moment
-- must not both read the same value. Postgres can decide and increment in one
-- statement; KV cannot.

create table public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),

  -- Counts every message ever sent, and never goes back down: the free
  -- allowance is a one-off, not a monthly budget. Cancelling Pro therefore
  -- returns the account to whatever was left of it, not to a fresh 50.
  chat_messages_used integer not null default 0 check (chat_messages_used >= 0),

  -- Written by the Stripe webhook. current_period_end is what makes an expired
  -- subscription fall back on its own: if a webhook is ever missed, the plan
  -- still stops counting as paid the moment the paid period is over.
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_plans enable row level security;

-- No insert, update or delete for anyone: the only writer is the function
-- below, which runs as its owner, and the Stripe webhook with the service role.
-- A user who could write this table could give themselves the paid plan.
revoke all on public.user_plans from anon, authenticated;
grant select on public.user_plans to authenticated;

create policy "Users can read their own plan" on public.user_plans
  for select to authenticated using (auth.uid() = user_id);

/*
 * Decides and charges in one statement. The WHERE clause is the check, so two
 * requests that arrive together cannot both see 49 used and both write 50 --
 * the second one finds the row already at 50 and updates nothing.
 *
 * The allowance is passed in rather than stored here so that the tariff lives
 * in one place in the application. A signed-in user can call this directly with
 * a larger number, but that only inflates their own counter: the number that
 * decides whether an answer is produced is the one /api/chat passes, and that
 * one is not theirs to set.
 */
create or replace function public.consume_chat_message(p_free_limit integer)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pro boolean;
  v_used integer;
begin
  if v_user is null then
    raise exception 'Nicht angemeldet.' using errcode = '28000';
  end if;

  insert into public.user_plans (user_id) values (v_user)
  on conflict (user_id) do nothing;

  update public.user_plans as p
     set chat_messages_used = p.chat_messages_used + 1,
         updated_at = now()
   where p.user_id = v_user
     and (
       (p.plan = 'pro' and (p.current_period_end is null or p.current_period_end > now()))
       or p.chat_messages_used < p_free_limit
     )
  returning
    (p.plan = 'pro' and (p.current_period_end is null or p.current_period_end > now())),
    p.chat_messages_used
  into v_pro, v_used;

  if found then
    return json_build_object('allowed', true, 'pro', v_pro, 'used', v_used);
  end if;

  -- Refused. The current state still goes back, so the caller can say how much
  -- was used and of what instead of only that it is over.
  select (p.plan = 'pro' and (p.current_period_end is null or p.current_period_end > now())),
         p.chat_messages_used
    into v_pro, v_used
    from public.user_plans as p
   where p.user_id = v_user;

  return json_build_object('allowed', false, 'pro', v_pro, 'used', v_used);
end;
$$;

revoke all on function public.consume_chat_message(integer) from public, anon;
grant execute on function public.consume_chat_message(integer) to authenticated;
