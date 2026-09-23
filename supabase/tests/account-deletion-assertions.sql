-- Account deletion: every account table cascades, payment records stay without
-- an owner, and later Stripe events for them neither fail nor move credits.
insert into auth.users values ('00000000-0000-4000-8000-00000000000d');
do $$
declare u uuid := '00000000-0000-4000-8000-00000000000d'; r json;
begin
  perform public.reconcile_payment('del-session',u,'del-intent',1250,1000,0,null,now(),'{"version":"t"}');
  perform public.credit_hold(u,10,'del-crawl');
  perform public.bind_crawl_hold('del-crawl','del-kb');
  perform public.admit_request(u,'account_delete',5,3600);
  perform public.database_allocate(u,'del-kb-2');
  perform public.database_claim_delete(u,'del-kb-3');

  delete from auth.users where id=u;

  assert (select user_id is null from public.billing_payments where session_id='del-session'), 'payment record lost or still linked';
  assert (select credits=1250 and amount_cents=1000 and consent->>'version'='t' from public.billing_payments where session_id='del-session'), 'payment record altered';
  assert not exists(select 1 from public.credit_accounts where user_id=u), 'credit account kept';
  assert not exists(select 1 from public.credit_entries where user_id=u), 'ledger kept';
  assert not exists(select 1 from public.credit_holds where user_id=u), 'hold kept';
  assert not exists(select 1 from public.crawl_access where user_id=u), 'crawl access kept';
  assert not exists(select 1 from public.request_limits where user_id=u), 'rate limit kept';
  assert not exists(select 1 from public.user_databases where user_id=u), 'database slot kept';
  assert not exists(select 1 from public.user_database_syncs where user_id=u), 'sync marker kept';
  assert not exists(select 1 from public.user_database_deletions where user_id=u), 'deletion claim kept';

  -- A refund after deletion is recorded on the retained record, without credits.
  r := public.reconcile_payment('del-session',u,'del-intent',1250,1000,500,null,now(),'{}');
  assert (r->>'orphaned')::boolean, 'refund after deletion not recognised';
  assert (select refunded_cents=500 and user_id is null from public.billing_payments where session_id='del-session'), 'refund after deletion not recorded';
  assert not exists(select 1 from public.credit_entries where user_id=u), 'credits booked for a deleted account';
  perform public.reconcile_payment('del-session',u,'del-intent',1250,1000,500,'needs_response',now(),'{}');
  assert (select disputed from public.billing_payments where session_id='del-session'), 'dispute after deletion not recorded';
  -- An anonymised dispute blocks nobody.
  assert (public.credit_state('00000000-0000-4000-8000-000000000001')->>'blocked')::boolean is not true, 'orphaned dispute blocks another account';

  -- A payment first seen after the account is gone is still recorded.
  r := public.reconcile_payment('late-session',u,'late-intent',1250,1000,0,null,now(),'{}');
  assert (r->>'orphaned')::boolean and exists(select 1 from public.billing_payments where session_id='late-session' and user_id is null), 'late payment lost';

  -- An existing account can never take over an ownerless record.
  begin
    perform public.reconcile_payment('del-session','00000000-0000-4000-8000-000000000001','del-intent',1250,1000,500,null,now(),'{}');
    raise exception 'ownerless payment claimed';
  exception when raise_exception then
    if sqlerrm <> 'Payment mismatch' then raise; end if;
  end;

  assert not exists(
    select 1 from pg_constraint
     where contype='f' and confrelid='auth.users'::regclass
       and connamespace='public'::regnamespace and confdeltype not in ('c','n')
  ), 'foreign key blocks account deletion';
  assert not has_function_privilege('anon','public.reconcile_payment(text,uuid,text,integer,integer,integer,text,timestamptz,jsonb)','execute'), 'public payment mutation';
end;
$$;
select 'ACCOUNT DELETION ASSERTIONS PASSED' as result;
