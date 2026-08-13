-- CraCha sells prepaid credits instead of a monthly plan.
--
-- Why a ledger and not a counter: a counter answers "how much is left" and
-- nothing else. Money needs to answer "where did it go", "was this purchase
-- already applied" and "give that back" -- and a purchase webhook that arrives
-- twice must credit once. So every movement is a row, the balance is the
-- running total, and (kind, reference) is unique: replaying an event changes
-- nothing.
--
-- Invariant, checked in the tests: balance + reserved = sum(credit_entries.amount).
--
-- Nothing here is callable by a signed-in user. Every function below is granted
-- to service_role only, and the application calls them with the service key
-- after it has established the user id from the verified JWT. The previous
-- design let the client call the charging function directly and argued that
-- inflating your own counter only hurts you; that argument does not survive
-- contact with a balance you can also *add* to.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.credit_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- Spendable right now.
  balance integer not null default 0 check (balance >= 0),

  -- Held for a crawl that is still running: already deducted from balance, not
  -- yet spent. A crawl is allowed up to N pages and usually finds fewer, so the
  -- difference has to be able to come back.
  reserved integer not null default 0 check (reserved >= 0),

  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Positive adds, negative spends. No separate direction column: the sign is
  -- the direction, and a sum over the column is the balance.
  amount integer not null check (amount <> 0),

  kind text not null check (kind in ('welcome', 'purchase', 'chat', 'crawl', 'refund', 'adjustment')),

  -- What this booking is about: the Stripe checkout session, the crawl job, the
  -- chat request. Together with kind it is unique, which is what makes every
  -- booking idempotent.
  reference text not null,
  detail text,
  created_at timestamptz not null default now()
);

create unique index credit_entries_kind_reference_key
  on public.credit_entries (kind, reference);
create index credit_entries_user_created_idx
  on public.credit_entries (user_id, created_at desc);

create table public.credit_holds (
  -- The crawl job id. One hold per job, so starting the same job twice cannot
  -- reserve twice.
  reference text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index credit_holds_user_idx on public.credit_holds (user_id);

alter table public.credit_accounts enable row level security;
alter table public.credit_entries enable row level security;
alter table public.credit_holds enable row level security;

revoke all on public.credit_accounts from anon, authenticated;
revoke all on public.credit_entries from anon, authenticated;
revoke all on public.credit_holds from anon, authenticated;

-- Readable, never writable. The application serves these through its own routes;
-- the grant exists so that a direct read is possible without a service key and
-- still cannot show another account.
grant select on public.credit_accounts to authenticated;
grant select on public.credit_entries to authenticated;

create policy "Users read their own credit account" on public.credit_accounts
  for select to authenticated using (auth.uid() = user_id);
create policy "Users read their own credit entries" on public.credit_entries
  for select to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- New accounts
-- ---------------------------------------------------------------------------

/*
 * The welcome grant lives here and only here. It is deliberately not an
 * application constant passed in as an argument: a number that decides what a
 * new account is worth must not be something a caller can name.
 *
 * 300 credits = a 300-page crawl, or 60 questions, or the usual mixture of a
 * 200-page site and 20 questions. src/lib/server/credits.ts repeats the figure
 * for display only and points back here.
 */
create or replace function public.handle_new_credit_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_welcome constant integer := 300;
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

create trigger on_auth_user_created_grant_credits
  after insert on auth.users
  for each row execute function public.handle_new_credit_account();

-- ---------------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------------

/*
 * Balance, and what is currently held back for running crawls.
 *
 * Holds older than a day are released first. A crawl writes to its record on
 * every batch; one that has been silent for 24 hours is not running any more --
 * it died where the failure callback could not reach -- and it must not keep
 * holding credits the account can otherwise never get back.
 */
create or replace function public.credit_state(p_user uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired record;
  v_balance integer;
  v_reserved integer;
begin
  for v_expired in
    select reference, amount from public.credit_holds
     where user_id = p_user and created_at < now() - interval '24 hours'
  loop
    perform public.credit_release(v_expired.reference);
  end loop;

  select balance, reserved into v_balance, v_reserved
    from public.credit_accounts where user_id = p_user;

  if not found then
    return json_build_object('exists', false, 'balance', 0, 'reserved', 0, 'available', 0);
  end if;

  return json_build_object(
    'exists', true,
    'balance', v_balance,
    'reserved', v_reserved,
    'available', v_balance
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Spending
-- ---------------------------------------------------------------------------

/*
 * Decides and charges in one statement. The WHERE clause is the check, so two
 * requests arriving together cannot both find the last credit unspent.
 *
 * The ledger insert comes after the debit and sits in its own block, which
 * gives it an implicit savepoint: a reference that was already charged rolls
 * the debit back and reports the booking as a duplicate rather than taking the
 * credits a second time.
 */
create or replace function public.credit_spend(
  p_user uuid,
  p_amount integer,
  p_kind text,
  p_reference text,
  p_detail text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Betrag muss positiv sein.' using errcode = '22023';
  end if;
  if p_kind not in ('chat', 'crawl', 'adjustment') then
    raise exception 'Unzulässige Buchungsart: %', p_kind using errcode = '22023';
  end if;

  update public.credit_accounts as a
     set balance = a.balance - p_amount,
         updated_at = now()
   where a.user_id = p_user
     and a.balance >= p_amount
  returning a.balance into v_balance;

  if not found then
    select a.balance into v_balance from public.credit_accounts as a where a.user_id = p_user;
    return json_build_object('allowed', false, 'balance', coalesce(v_balance, 0));
  end if;

  begin
    insert into public.credit_entries (user_id, amount, kind, reference, detail)
    values (p_user, -p_amount, p_kind, p_reference, p_detail);
  exception when unique_violation then
    update public.credit_accounts as a
       set balance = a.balance + p_amount, updated_at = now()
     where a.user_id = p_user
    returning a.balance into v_balance;
    return json_build_object('allowed', true, 'duplicate', true, 'balance', v_balance);
  end;

  return json_build_object('allowed', true, 'duplicate', false, 'balance', v_balance);
end;
$$;

/*
 * Adds credits: a purchase, a refund, a correction. Same idempotency rule --
 * Stripe delivers a webhook more than once often enough that "at least once"
 * has to mean "exactly once" here.
 */
create or replace function public.credit_grant(
  p_user uuid,
  p_amount integer,
  p_kind text,
  p_reference text,
  p_detail text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Betrag muss positiv sein.' using errcode = '22023';
  end if;
  if p_kind not in ('purchase', 'refund', 'adjustment', 'welcome') then
    raise exception 'Unzulässige Buchungsart: %', p_kind using errcode = '22023';
  end if;

  insert into public.credit_accounts (user_id, balance)
  values (p_user, 0)
  on conflict (user_id) do nothing;

  begin
    insert into public.credit_entries (user_id, amount, kind, reference, detail)
    values (p_user, p_amount, p_kind, p_reference, p_detail);
  exception when unique_violation then
    select a.balance into v_balance from public.credit_accounts as a where a.user_id = p_user;
    return json_build_object('granted', false, 'duplicate', true, 'balance', v_balance);
  end;

  update public.credit_accounts as a
     set balance = a.balance + p_amount, updated_at = now()
   where a.user_id = p_user
  returning a.balance into v_balance;

  return json_build_object('granted', true, 'duplicate', false, 'balance', v_balance);
end;
$$;

-- ---------------------------------------------------------------------------
-- Crawls: hold, then settle against what was actually fetched
-- ---------------------------------------------------------------------------

/*
 * A crawl is allowed up to N pages and normally finds fewer. Charging N up
 * front and never giving the difference back would make every crawl cost its
 * ceiling; charging only at the end would let ten crawls started in the same
 * second each see the full balance as free. So the ceiling is held, and the
 * settlement decides the price.
 */
create or replace function public.credit_hold(
  p_user uuid,
  p_amount integer,
  p_reference text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Betrag muss positiv sein.' using errcode = '22023';
  end if;

  insert into public.credit_holds (reference, user_id, amount)
  values (p_reference, p_user, p_amount)
  on conflict (reference) do nothing;

  if not found then
    select a.balance into v_balance from public.credit_accounts as a where a.user_id = p_user;
    return json_build_object('allowed', true, 'duplicate', true, 'balance', coalesce(v_balance, 0));
  end if;

  update public.credit_accounts as a
     set balance = a.balance - p_amount,
         reserved = a.reserved + p_amount,
         updated_at = now()
   where a.user_id = p_user
     and a.balance >= p_amount
  returning a.balance into v_balance;

  if not found then
    delete from public.credit_holds where reference = p_reference;
    select a.balance into v_balance from public.credit_accounts as a where a.user_id = p_user;
    return json_build_object('allowed', false, 'balance', coalesce(v_balance, 0));
  end if;

  return json_build_object('allowed', true, 'duplicate', false, 'balance', v_balance);
end;
$$;

/* The crawl finished: charge what it really fetched, hand the rest back. */
create or replace function public.credit_settle(p_reference text, p_actual integer)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold public.credit_holds%rowtype;
  v_spent integer;
  v_balance integer;
begin
  delete from public.credit_holds where reference = p_reference returning * into v_hold;
  if not found then
    return json_build_object('settled', false, 'reason', 'no_hold');
  end if;

  v_spent := greatest(0, least(coalesce(p_actual, 0), v_hold.amount));

  update public.credit_accounts as a
     set reserved = greatest(0, a.reserved - v_hold.amount),
         balance = a.balance + (v_hold.amount - v_spent),
         updated_at = now()
   where a.user_id = v_hold.user_id
  returning a.balance into v_balance;

  if v_spent > 0 then
    insert into public.credit_entries (user_id, amount, kind, reference, detail)
    values (v_hold.user_id, -v_spent, 'crawl', p_reference, p_actual || ' Seiten')
    on conflict (kind, reference) do nothing;
  end if;

  return json_build_object('settled', true, 'spent', v_spent,
    'refunded', v_hold.amount - v_spent, 'balance', v_balance);
end;
$$;

/* The crawl failed or was cancelled: nothing was delivered, nothing is charged. */
create or replace function public.credit_release(p_reference text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold public.credit_holds%rowtype;
  v_balance integer;
begin
  delete from public.credit_holds where reference = p_reference returning * into v_hold;
  if not found then
    return json_build_object('released', false);
  end if;

  update public.credit_accounts as a
     set reserved = greatest(0, a.reserved - v_hold.amount),
         balance = a.balance + v_hold.amount,
         updated_at = now()
   where a.user_id = v_hold.user_id
  returning a.balance into v_balance;

  return json_build_object('released', true, 'amount', v_hold.amount, 'balance', v_balance);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: the application, never the browser
-- ---------------------------------------------------------------------------

revoke all on function public.credit_state(uuid) from public, anon, authenticated;
revoke all on function public.credit_spend(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.credit_grant(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.credit_hold(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.credit_settle(text, integer) from public, anon, authenticated;
revoke all on function public.credit_release(text) from public, anon, authenticated;

grant execute on function public.credit_state(uuid) to service_role;
grant execute on function public.credit_spend(uuid, integer, text, text, text) to service_role;
grant execute on function public.credit_grant(uuid, integer, text, text, text) to service_role;
grant execute on function public.credit_hold(uuid, integer, text) to service_role;
grant execute on function public.credit_settle(text, integer) to service_role;
grant execute on function public.credit_release(text) to service_role;

-- ---------------------------------------------------------------------------
-- Carried over from the subscription model
-- ---------------------------------------------------------------------------

-- Accounts that reached Stripe keep their customer, so a returning buyer is not
-- a second customer over there. Everything else in user_plans described a
-- monthly plan that no longer exists, and no account was ever on it -- verified
-- before writing this: zero rows with plan = 'pro'.
--
-- The accounts that exist today predate the trigger above, so they also need
-- their welcome grant here. New accounts get it from the trigger.
insert into public.credit_accounts (user_id, balance, stripe_customer_id)
select u.id, 300, p.stripe_customer_id
  from auth.users as u
  left join public.user_plans as p on p.user_id = u.id
on conflict (user_id) do update
  set stripe_customer_id = coalesce(excluded.stripe_customer_id, public.credit_accounts.stripe_customer_id);

insert into public.credit_entries (user_id, amount, kind, reference, detail)
select u.id, 300, 'welcome', u.id::text, 'Startguthaben'
  from auth.users as u
on conflict (kind, reference) do nothing;

-- user_plans and consume_chat_message are dropped in a separate migration, not
-- here: the Worker running in production still reads both, and dropping them
-- before the new build is live would break the chat for as long as the deploy
-- takes.
