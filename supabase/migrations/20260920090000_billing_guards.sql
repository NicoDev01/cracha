-- Server-only coordination. Existing holds are preserved for reconciliation;
-- elapsed time alone never proves that delivered pages should be free.
alter table public.credit_holds add column database_id text;
create table public.crawl_access (
  database_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null,
  ready boolean not null default false
);
alter table public.crawl_access enable row level security;
revoke all on public.crawl_access from public,anon,authenticated;
grant all on public.crawl_access to service_role;
create or replace function public.bind_crawl_hold(p_reference text,p_database text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  update public.credit_holds set database_id=p_database where reference=p_reference returning user_id into v_user;
  if not found then raise exception 'Missing crawl reservation'; end if;
  insert into public.crawl_access(database_id,user_id,reference,ready) values(p_database,v_user,p_reference,false)
  on conflict(database_id) do update set reference=excluded.reference,ready=false;
end;
$$;
revoke all on function public.bind_crawl_hold(text,text) from public,anon,authenticated;
grant execute on function public.bind_crawl_hold(text,text) to service_role;
alter table public.credit_accounts drop constraint credit_accounts_balance_check;
-- Negative balances represent already consumed credits from a reversed payment.
-- No new paid work is admitted until the balance covers its price.

create table public.billing_payments (
  session_id text primary key,
  user_id uuid not null references auth.users(id),
  payment_intent text unique not null,
  credits integer not null check (credits > 0),
  amount_cents integer not null check (amount_cents >= 0),
  reversed integer not null default 0,
  refunded_cents integer not null default 0,
  dispute_state text,
  disputed boolean not null default false,
  revision integer not null default 0,
  observed_at timestamptz not null,
  consent jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.billing_payments enable row level security;
revoke all on public.billing_payments from public, anon, authenticated;
grant all on public.billing_payments to service_role;
create index billing_payments_user_idx on public.billing_payments(user_id);

create table public.request_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  requests integer not null,
  primary key (user_id, action)
);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from public, anon, authenticated;

create or replace function public.admit_request(p_user uuid, p_action text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if p_limit < 1 or p_seconds < 1 then raise exception 'Invalid limit'; end if;
  insert into public.request_limits as r values (p_user, p_action, now(), 1)
  on conflict (user_id, action) do update set
    requests = case when r.window_start <= now() - make_interval(secs => p_seconds) then 1 else r.requests + 1 end,
    window_start = case when r.window_start <= now() - make_interval(secs => p_seconds) then now() else r.window_start end
  returning requests into v_count;
  return v_count <= p_limit;
end;
$$;

create or replace function public.credit_state(p_user uuid)
returns json language sql security definer set search_path = '' as $$
  select json_build_object('balance', balance, 'reserved', reserved,
    'blocked', exists(select 1 from public.billing_payments p where p.user_id = p_user and p.disputed))
  from public.credit_accounts where user_id = p_user;
$$;

create or replace function public.credit_hold(p_user uuid, p_amount integer, p_reference text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  select balance into v_balance from public.credit_accounts where user_id = p_user for update;
  if not found then return json_build_object('allowed',false); end if;
  if exists(select 1 from public.billing_payments where user_id=p_user and disputed) then
    return json_build_object('allowed',false,'reason','blocked');
  end if;
  if exists(select 1 from public.credit_holds where user_id=p_user) then
    return json_build_object('allowed',false,'reason','concurrent');
  end if;
  if v_balance < p_amount then return json_build_object('allowed',false); end if;
  insert into public.credit_holds(reference,user_id,amount) values(p_reference,p_user,p_amount);
  update public.credit_accounts set balance=balance-p_amount,reserved=reserved+p_amount,updated_at=now() where user_id=p_user;
  return json_build_object('allowed',true);
end;
$$;

create or replace function public.credit_spend(p_user uuid,p_amount integer,p_kind text,p_reference text,p_detail text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare v_balance integer;
begin
  if p_amount is null or p_amount <= 0 or p_kind not in ('chat','crawl','adjustment') then raise exception 'Invalid debit'; end if;
  select balance into v_balance from public.credit_accounts where user_id=p_user for update;
  if not found then return json_build_object('allowed',false); end if;
  if exists(select 1 from public.credit_entries where kind=p_kind and reference=p_reference) then
    return json_build_object('allowed',false,'duplicate',true);
  end if;
  if v_balance < p_amount or exists(select 1 from public.billing_payments where user_id=p_user and disputed) then
    return json_build_object('allowed',false);
  end if;
  insert into public.credit_entries(user_id,amount,kind,reference,detail) values(p_user,-p_amount,p_kind,p_reference,p_detail);
  update public.credit_accounts set balance=balance-p_amount,updated_at=now() where user_id=p_user;
  return json_build_object('allowed',true,'duplicate',false);
end;
$$;

-- One transaction for original grant, cumulative refunds, dispute holds and
-- reinstatement. Repeated or out-of-order observations cannot mint credits.
create or replace function public.reconcile_payment(
  p_session text,p_user uuid,p_intent text,p_credits integer,p_amount integer,
  p_refunded integer,p_dispute_state text,p_observed timestamptz,p_consent jsonb
)
returns json language plpgsql security definer set search_path = '' as $$
declare v_row public.billing_payments%rowtype; v_target integer; v_delta integer; v_granted json; v_dispute text; v_disputed boolean; v_refunded integer;
begin
  if p_credits <= 0 or p_amount < 0 or p_refunded < 0 or p_refunded > p_amount then raise exception 'Invalid payment'; end if;
  perform 1 from public.credit_accounts where user_id=p_user for update;
  if not found then raise exception 'Unknown account'; end if;
  insert into public.billing_payments(session_id,user_id,payment_intent,credits,amount_cents,observed_at,consent)
  values(p_session,p_user,p_intent,p_credits,p_amount,'-infinity',p_consent) on conflict(session_id) do nothing;
  select * into v_row from public.billing_payments where session_id=p_session for update;
  if v_row.user_id <> p_user or v_row.credits <> p_credits or v_row.payment_intent <> p_intent or v_row.amount_cents <> p_amount then raise exception 'Payment mismatch'; end if;
  -- Refund amounts are cumulative. A local request timestamp is not a Stripe
  -- revision: older snapshots may arrive later, and must not undo a refund.
  v_refunded := greatest(v_row.refunded_cents,p_refunded);
  v_dispute := case
    when v_row.dispute_state='won' then 'won'
    when v_row.dispute_state='lost' and p_dispute_state is distinct from 'won' then 'lost'
    when v_row.dispute_state='warning_closed' and p_dispute_state like 'warning_%' then 'warning_closed'
    else coalesce(p_dispute_state,v_row.dispute_state) end;
  v_disputed := coalesce(v_dispute not in ('won','warning_closed'),false);
  v_granted := public.credit_grant(p_user,p_credits,'purchase',p_session,'Credit-Paket');
  v_target := case when v_disputed then p_credits when p_amount=0 then 0 else ceil(p_credits::numeric*v_refunded/p_amount)::integer end;
  v_delta := v_target-v_row.reversed;
  if v_delta <> 0 then
    insert into public.credit_entries(user_id,amount,kind,reference,detail)
    values(p_user,-v_delta,'adjustment',p_session||':'||(v_row.revision+1),
      case when v_delta>0 then 'Zahlung erstattet oder strittig' else 'Zahlung wieder freigegeben' end);
    update public.credit_accounts set balance=balance-v_delta,updated_at=now() where user_id=p_user;
  end if;
  update public.billing_payments set reversed=v_target,refunded_cents=v_refunded,dispute_state=v_dispute,disputed=v_disputed,revision=revision+1,observed_at=greatest(observed_at,p_observed) where session_id=p_session;
  return json_build_object('granted',v_granted->'granted','reversed',v_target);
end;
$$;

revoke all on function public.admit_request(uuid,text,integer,integer) from public,anon,authenticated;
revoke all on function public.reconcile_payment(text,uuid,text,integer,integer,integer,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.admit_request(uuid,text,integer,integer) to service_role;
grant execute on function public.reconcile_payment(text,uuid,text,integer,integer,integer,text,timestamptz,jsonb) to service_role;

-- Use the same account -> hold lock order as credit_hold and payment writes.
create or replace function public.credit_settle(p_reference text,p_actual integer)
returns json language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_hold public.credit_holds%rowtype; v_spent integer;
begin
  select user_id into v_user from public.credit_holds where reference=p_reference;
  if not found then return json_build_object('settled',false); end if;
  perform 1 from public.credit_accounts where user_id=v_user for update;
  delete from public.credit_holds where reference=p_reference returning * into v_hold;
  if not found then return json_build_object('settled',false); end if;
  v_spent := greatest(0,least(coalesce(p_actual,0),v_hold.amount));
  if v_spent>0 then
    update public.crawl_access set ready=true where reference=p_reference;
    insert into public.credit_entries(user_id,amount,kind,reference,detail) values(v_user,-v_spent,'crawl',p_reference,v_spent||' indexierte Seiten');
  end if;
  update public.credit_accounts set reserved=reserved-v_hold.amount,balance=balance+v_hold.amount-v_spent,updated_at=now() where user_id=v_user;
  return json_build_object('settled',true,'spent',v_spent,'refunded',v_hold.amount-v_spent);
end;
$$;
create or replace function public.credit_release(p_reference text)
returns json language sql security definer set search_path = '' as $$
  select public.credit_settle(p_reference,0);
$$;
