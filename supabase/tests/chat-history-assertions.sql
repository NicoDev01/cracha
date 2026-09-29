-- Chat history: a conversation belongs to one account and one knowledge base,
-- a late answer cannot revive a deleted conversation, a title the user chose
-- stays, and deleting the account removes everything.
insert into auth.users values ('00000000-0000-4000-8000-0000000000c1');
insert into auth.users values ('00000000-0000-4000-8000-0000000000c2');
do $$
declare
  alice uuid := '00000000-0000-4000-8000-0000000000c1';
  bob uuid := '00000000-0000-4000-8000-0000000000c2';
  c uuid := '00000000-0000-4000-8000-00000000c0c1';
  r json;
begin
  r := public.chat_record(alice, c, 'kb-a', 'Erste Frage', 'user', 'Erste Frage', '[]', null, false);
  assert (r->>'ok')::boolean and (r->>'created')::boolean, 'question did not open the conversation';
  r := public.chat_record(alice, c, 'kb-a', 'x', 'assistant', 'Antwort', '[{"id":"1"}]', '{"model_used":"m"}', false, 'Generierter Titel');
  assert (r->>'ok')::boolean and not (r->>'created')::boolean, 'answer not recorded';
  assert (select title = 'Generierter Titel' and title_source = 'generated' from public.chat_conversations where id = c), 'generated title not applied';
  assert (select array_agg(role order by position) = array['user', 'assistant'] from public.chat_messages where conversation_id = c), 'message order lost';

  -- Someone else's id, or another knowledge base, is refused and leaves no trace.
  r := public.chat_record(bob, c, 'kb-a', 'Fremd', 'user', 'Fremd', '[]', null, false);
  assert r->>'reason' = 'not_found', 'foreign conversation accepted';
  r := public.chat_record(alice, c, 'kb-b', 'Andere', 'user', 'Andere', '[]', null, false);
  assert r->>'reason' = 'database_mismatch', 'conversation switched knowledge base';
  assert (select count(*) = 2 from public.chat_messages where conversation_id = c), 'refused message stored';
  r := public.chat_import(bob, c, 'kb-a', 'Fremd', '[]');
  assert not (r->>'ok')::boolean, 'import took over a foreign conversation';

  -- A title the user gave is not replaced by a generated one.
  update public.chat_conversations set title = 'Mein Titel', title_source = 'user' where id = c;
  perform public.chat_record(alice, c, 'kb-a', 'x', 'user', 'Zweite Frage', '[]', null, false);
  perform public.chat_record(alice, c, 'kb-a', 'x', 'assistant', 'Zweite Antwort', '[]', null, false, 'Anderer Titel');
  assert (select title = 'Mein Titel' from public.chat_conversations where id = c), 'user title overwritten';

  -- An answer to a deleted conversation does not bring it back.
  delete from public.chat_conversations where id = c;
  r := public.chat_record(alice, c, 'kb-a', 'x', 'assistant', 'Späte Antwort', '[]', null, false);
  assert r->>'reason' = 'not_found' and not exists(select 1 from public.chat_conversations where id = c), 'late answer revived a deleted conversation';

  -- Import keeps the order and is safe to repeat.
  r := public.chat_import(alice, c, 'kb-a', 'Alt', '[{"role":"user","content":"Q","created_at":"2026-09-01T10:00:00Z"},{"role":"assistant","content":"A","sources":[],"metadata":null,"is_error":false,"created_at":"2026-09-01T10:00:00Z"}]');
  assert (r->>'imported')::boolean, 'import failed';
  r := public.chat_import(alice, c, 'kb-a', 'Alt', '[{"role":"user","content":"Q","created_at":"2026-09-01T10:00:00Z"}]');
  assert (r->>'ok')::boolean and not (r->>'imported')::boolean, 'repeated import changed data';
  assert (select array_agg(content order by position) = array['Q', 'A'] from public.chat_messages where conversation_id = c), 'import order lost';
  assert (select created_at = '2026-09-01T10:00:00Z' from public.chat_conversations where id = c), 'import timestamps lost';

  -- A conversation is capped; the answer to the last question still fits.
  perform public.chat_record(alice, c, 'kb-a', 'x', 'user', 'Q', '[]', null, false) from generate_series(1, 198);
  r := public.chat_record(alice, c, 'kb-a', 'x', 'user', 'Q', '[]', null, false);
  assert r->>'reason' = 'full', 'conversation not capped';
  r := public.chat_record(alice, c, 'kb-a', 'x', 'assistant', 'A', '[]', null, false);
  assert (r->>'ok')::boolean, 'answer to the last question refused';

  delete from auth.users where id = alice;
  assert not exists(select 1 from public.chat_conversations where user_id = alice), 'conversations kept after account deletion';
  assert not exists(select 1 from public.chat_messages where conversation_id = c), 'messages kept after account deletion';

  assert not has_table_privilege('authenticated', 'public.chat_conversations', 'select'), 'conversations readable by signed-in users';
  assert not has_table_privilege('anon', 'public.chat_messages', 'select'), 'messages readable anonymously';
  assert not has_function_privilege('authenticated', 'public.chat_record(uuid,uuid,text,text,text,text,jsonb,jsonb,boolean,text)', 'execute'), 'chat_record callable by users';
  assert not has_function_privilege('anon', 'public.chat_import(uuid,uuid,text,text,jsonb)', 'execute'), 'chat_import callable anonymously';
end;
$$;
select 'CHAT HISTORY ASSERTIONS PASSED' as result;
