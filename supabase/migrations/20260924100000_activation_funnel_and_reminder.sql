-- Activation funnel and the one reminder mail.
--
-- The funnel adds no tracking. Every step it counts is already a row: auth
-- creates the user and stamps the confirmation, and the credit ledger books
-- every crawl and every answer, with a refund row for an answer that failed.
-- Counting those says who got how far without a cookie, a script or a new
-- event anywhere — and it forgets a deleted account along with its ledger.
--
-- Aggregates only. Nothing here returns an address or a user id; the reminder
-- functions below are the one place that reads addresses, and they only hand
-- out the ones due for the mail.

-- Created first: the funnel counts who received the reminder.
create table public.activation_reminders (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Set when the mail went out. A row without it is a claim in flight: the
  -- sender took it and has not reported back yet.
  sent_at timestamptz,
  claimed_at timestamptz not null default now()
);

alter table public.activation_reminders enable row level security;
revoke all on public.activation_reminders from anon, authenticated;

create or replace function public.product_funnel(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (step_order integer, step text, users bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with cohort as (
    select u.id, u.email_confirmed_at
      from auth.users u
     where (p_from is null or u.created_at >= p_from)
       and (p_to is null or u.created_at < p_to)
  ),
  -- A chat debit counts as an answer unless it was refunded, which is what
  -- the chat route does when no complete answer arrived.
  answers as (
    select e.user_id, e.created_at
      from public.credit_entries e
     where e.kind = 'chat'
       and not exists (
         select 1 from public.credit_entries r
          where r.kind = 'refund' and r.reference = 'chat:' || e.reference
       )
  ),
  -- Settled crawls only: a failed or cancelled crawl is released, not booked.
  crawls as (
    select e.user_id, e.created_at
      from public.credit_entries e
     where e.kind = 'crawl'
  ),
  active_days as (
    select user_id, count(distinct (created_at at time zone 'Europe/Berlin')::date) as days
      from (select user_id, created_at from answers
            union all
            select user_id, created_at from crawls) activity
     group by user_id
  )
  select 1, 'Registriert', count(*) from cohort
  union all
  select 2, 'E-Mail bestätigt', count(*) from cohort where email_confirmed_at is not null
  union all
  select 3, 'Website eingelesen', count(*) from cohort c
   where exists (select 1 from crawls x where x.user_id = c.id)
  union all
  select 4, 'Antwort erhalten', count(*) from cohort c
   where exists (select 1 from answers a where a.user_id = c.id)
  union all
  select 5, 'An 2+ Tagen aktiv', count(*) from cohort c
   where exists (select 1 from active_days d where d.user_id = c.id and d.days >= 2)
  union all
  select 6, 'Credits gekauft', count(*) from cohort c
   where exists (select 1 from public.credit_entries p where p.user_id = c.id and p.kind = 'purchase')
  union all
  select 7, 'Erinnerung erhalten', count(*) from cohort c
   where exists (select 1 from public.activation_reminders r where r.user_id = c.id and r.sent_at is not null)
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Reminder: one mail, 24 hours after sign-up, to a confirmed account that has
-- not read in a website yet. Never a second one.
-- ---------------------------------------------------------------------------

/*
 * Takes the accounts due for the reminder and marks them taken, in one
 * statement, so two cron runs that overlap cannot mail the same person twice.
 *
 * Due: confirmed, signed up between 24 and 72 hours ago, never crawled, no
 * crawl running, and never reminded. The 72-hour edge keeps the first run
 * after this migration from writing to every older account, and leaves two
 * days of hourly retries when a send fails. A claim that never reported back
 * is released after an hour.
 */
create or replace function public.claim_activation_reminders(p_limit integer default 50)
returns table (user_id uuid, email text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  delete from public.activation_reminders r
   where r.sent_at is null and r.claimed_at < now() - interval '1 hour';

  return query
  with due as (
    select u.id, u.email
      from auth.users u
     where u.email_confirmed_at is not null
       and u.email is not null
       and u.created_at between now() - interval '72 hours' and now() - interval '24 hours'
       and not exists (select 1 from public.credit_entries e where e.user_id = u.id and e.kind = 'crawl')
       and not exists (select 1 from public.credit_holds h where h.user_id = u.id)
       and not exists (select 1 from public.activation_reminders r where r.user_id = u.id)
     order by u.created_at
     limit greatest(0, least(p_limit, 200))
  ),
  claimed as (
    insert into public.activation_reminders (user_id)
    select due.id from due
    on conflict do nothing
    returning activation_reminders.user_id
  )
  select claimed.user_id, due.email::text
    from claimed join due on due.id = claimed.user_id;
end;
$$;

create or replace function public.finish_activation_reminder(p_user uuid, p_sent boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_sent then
    update public.activation_reminders set sent_at = now()
     where user_id = p_user and sent_at is null;
  else
    -- Not sent: give the claim back so the next run tries again.
    delete from public.activation_reminders
     where user_id = p_user and sent_at is null;
  end if;
end;
$$;

revoke all on function public.product_funnel(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_activation_reminders(integer) from public, anon, authenticated;
revoke all on function public.finish_activation_reminder(uuid, boolean) from public, anon, authenticated;
grant execute on function public.product_funnel(timestamptz, timestamptz) to service_role;
grant execute on function public.claim_activation_reminders(integer) to service_role;
grant execute on function public.finish_activation_reminder(uuid, boolean) to service_role;
