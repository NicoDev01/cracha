-- Self-service account deletion.
--
-- Deleting the auth user is the last step of POST /api/account/delete, and
-- every table that belongs to the account follows it by cascade: credit
-- account and ledger, holds, crawl access, rate limits, database slots, sync
-- markers and deletion claims.
--
-- billing_payments is the exception on purpose. Payment records are business
-- records that must be retained (§ 147 AO, § 257 HGB), so they survive the
-- account without it: user_id becomes null. It was `not null references
-- auth.users(id)` without an action, which made auth.admin.deleteUser fail
-- outright for every account that ever bought credits.

alter table public.billing_payments alter column user_id drop not null;
alter table public.billing_payments drop constraint if exists billing_payments_user_id_fkey;
alter table public.billing_payments
  add constraint billing_payments_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- A reference to auth.users that neither cascades nor lets go would make
-- account deletion fail at its very last step, after the knowledge bases are
-- already gone. Refuse to migrate while one exists, including any that was
-- created outside these migration files.
do $$
declare v_blocking text;
begin
  select string_agg(conrelid::regclass::text || '.' || conname, ', ')
    into v_blocking
    from pg_constraint
   where contype = 'f'
     and confrelid = 'auth.users'::regclass
     and connamespace = 'public'::regnamespace
     and confdeltype not in ('c', 'n');
  if v_blocking is not null then
    raise exception 'Foreign keys to auth.users block account deletion: %', v_blocking;
  end if;
end;
$$;

-- credit_state, credit_hold and credit_spend compare billing_payments.user_id
-- with `=`, which a null never satisfies: a retained payment of a deleted
-- account can neither block nor unblock anybody. reconcile_payment is the one
-- function that needs a change.
--
-- Stripe keeps sending refund and dispute events after the account is gone.
-- Before, those raised 'Unknown account', the webhook answered 500 and Stripe
-- retried for days while the retained record never learned about the refund.
-- Now a payment whose account no longer exists is still recorded — refund and
-- dispute state included — but no credits move, because there is no balance
-- left to move them in. The owner check uses `is distinct from`, so a record
-- without an owner can never be claimed by an existing account.
create or replace function public.reconcile_payment(
  p_session text,p_user uuid,p_intent text,p_credits integer,p_amount integer,
  p_refunded integer,p_dispute_state text,p_observed timestamptz,p_consent jsonb
)
returns json language plpgsql security definer set search_path = '' as $$
declare v_row public.billing_payments%rowtype; v_owner uuid; v_target integer; v_delta integer; v_granted json; v_dispute text; v_disputed boolean; v_refunded integer;
begin
  if p_credits <= 0 or p_amount < 0 or p_refunded < 0 or p_refunded > p_amount then raise exception 'Invalid payment'; end if;
  perform 1 from public.credit_accounts where user_id=p_user for update;
  v_owner := case when found then p_user end;
  insert into public.billing_payments(session_id,user_id,payment_intent,credits,amount_cents,observed_at,consent)
  values(p_session,v_owner,p_intent,p_credits,p_amount,'-infinity',p_consent) on conflict(session_id) do nothing;
  select * into v_row from public.billing_payments where session_id=p_session for update;
  if v_row.user_id is distinct from v_owner or v_row.credits <> p_credits or v_row.payment_intent <> p_intent or v_row.amount_cents <> p_amount then raise exception 'Payment mismatch'; end if;
  -- Refund amounts are cumulative. A local request timestamp is not a Stripe
  -- revision: older snapshots may arrive later, and must not undo a refund.
  v_refunded := greatest(v_row.refunded_cents,p_refunded);
  v_dispute := case
    when v_row.dispute_state='won' then 'won'
    when v_row.dispute_state='lost' and p_dispute_state is distinct from 'won' then 'lost'
    when v_row.dispute_state='warning_closed' and p_dispute_state like 'warning_%' then 'warning_closed'
    else coalesce(p_dispute_state,v_row.dispute_state) end;
  v_disputed := coalesce(v_dispute not in ('won','warning_closed'),false);
  if v_owner is null then
    update public.billing_payments set refunded_cents=v_refunded,dispute_state=v_dispute,disputed=v_disputed,revision=revision+1,observed_at=greatest(observed_at,p_observed) where session_id=p_session;
    return json_build_object('granted',false,'reversed',v_row.reversed,'orphaned',true);
  end if;
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

revoke all on function public.reconcile_payment(text,uuid,text,integer,integer,integer,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.reconcile_payment(text,uuid,text,integer,integer,integer,text,timestamptz,jsonb) to service_role;
