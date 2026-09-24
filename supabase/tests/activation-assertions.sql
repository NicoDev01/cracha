-- Activation funnel and reminder claims.
insert into auth.users (id, email, created_at, email_confirmed_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'due@example.test',       now() - interval '30 hours',  now() - interval '30 hours'),
  ('00000000-0000-4000-8000-0000000000a2', 'crawled@example.test',   now() - interval '30 hours',  now() - interval '30 hours'),
  ('00000000-0000-4000-8000-0000000000a3', 'fresh@example.test',     now() - interval '10 hours',  now() - interval '10 hours'),
  ('00000000-0000-4000-8000-0000000000a4', 'unconfirmed@example.test', now() - interval '30 hours', null),
  ('00000000-0000-4000-8000-0000000000a5', 'old@example.test',       now() - interval '100 hours', now() - interval '100 hours'),
  ('00000000-0000-4000-8000-0000000000a6', 'crawling@example.test',  now() - interval '30 hours',  now() - interval '30 hours');

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000a2';
  c uuid := '00000000-0000-4000-8000-0000000000a3';
  f uuid := '00000000-0000-4000-8000-0000000000a6';
  v_count integer;
  v_email text;
begin
  perform public.credit_hold(b, 10, 'act-crawl-b');
  perform public.credit_settle('act-crawl-b', 5);
  update public.credit_entries set created_at = now() - interval '50 hours' where reference = 'act-crawl-b';
  perform public.credit_spend(b, 5, 'chat', 'act-chat-b', null);
  perform public.credit_hold(f, 10, 'act-crawl-f');
  perform public.credit_spend(c, 5, 'chat', 'act-chat-c', null);
  perform public.credit_spend(a, 5, 'chat', 'act-chat-a', null);
  perform public.credit_grant(a, 5, 'refund', 'chat:act-chat-a', 'test');

  select count(*), max(email) into v_count, v_email from public.claim_activation_reminders(50);
  assert v_count = 1 and v_email = 'due@example.test', format('expected only the due account, got %s (%s)', v_count, v_email);

  select count(*) into v_count from public.claim_activation_reminders(50);
  assert v_count = 0, 'a claimed account was handed out twice';

  perform public.finish_activation_reminder(a, false);
  select count(*) into v_count from public.claim_activation_reminders(50);
  assert v_count = 1, 'a failed send was not given back';

  perform public.finish_activation_reminder(a, true);
  select count(*) into v_count from public.claim_activation_reminders(50);
  assert v_count = 0, 'a sent reminder was handed out again';

  update public.activation_reminders set claimed_at = now() - interval '2 hours', sent_at = null where user_id = a;
  select count(*) into v_count from public.claim_activation_reminders(50);
  assert v_count = 1, 'a stale claim was not released';
  perform public.finish_activation_reminder(a, true);
end;
$$;

do $$
declare v jsonb;
begin
  select jsonb_object_agg(step, users) into v
    from public.product_funnel(now() - interval '200 hours', now() - interval '5 hours');
  assert v = '{"Registriert": 6, "E-Mail bestätigt": 5, "Website eingelesen": 1, "Antwort erhalten": 2, "An 2+ Tagen aktiv": 1, "Credits gekauft": 0, "Erinnerung erhalten": 1}'::jsonb,
    format('unexpected funnel %s', v);
end;
$$;

-- Deleting an account takes its reminder row with it.
delete from auth.users where id = '00000000-0000-4000-8000-0000000000a1';
do $$ begin
  assert not exists (select 1 from public.activation_reminders where user_id = '00000000-0000-4000-8000-0000000000a1'), 'reminder row kept';
end $$;
