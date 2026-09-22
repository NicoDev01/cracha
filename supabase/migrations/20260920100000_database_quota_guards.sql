-- Atomic database quota and synchronization guards.
-- Prevents race conditions during concurrent database creation, ensuring the
-- maximum knowledge base limit (25) is strictly enforced in PostgreSQL.

create table if not exists public.user_databases (
  database_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.user_databases enable row level security;
revoke all on public.user_databases from public, anon, authenticated;
grant all on public.user_databases to service_role;
create index if not exists user_databases_user_idx on public.user_databases(user_id);

-- One-time synchronization tracking: records when a user's pre-existing KV databases
-- were imported into SQL, preventing stale snapshots from resurrecting deleted databases.
create table if not exists public.user_database_syncs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  synced_at timestamptz not null default now()
);

alter table public.user_database_syncs enable row level security;
revoke all on public.user_database_syncs from public, anon, authenticated;
grant all on public.user_database_syncs to service_role;

-- Deletion claim tracking: permanently records databases claimed for deletion to prevent
-- concurrent or delayed crawl starts from binding to a deleting/deleted database.
create table if not exists public.user_database_deletions (
  database_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.user_database_deletions enable row level security;
revoke all on public.user_database_deletions from public, anon, authenticated;
grant all on public.user_database_deletions to service_role;

-- Atomically check quota and reserve a database slot.
create or replace function public.database_allocate(
  p_user uuid,
  p_database text,
  p_max integer default 25,
  p_existing_ids text[] default null
)
returns table (allowed boolean, current_count integer) language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
  v_id text;
begin
  -- Advisory transaction lock per user guarantees serialization even if credit_accounts row does not exist yet
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  -- Lock user's row in credit_accounts if existing to serialize allocations with billing
  perform 1 from public.credit_accounts where user_id = p_user for update;

  -- Initial one-time sync of pre-existing KV databases if not already recorded
  if not exists (select 1 from public.user_database_syncs where user_id = p_user) then
    if p_existing_ids is not null then
      foreach v_id in array p_existing_ids loop
        if v_id is not null and length(trim(v_id)) > 0 then
          if not exists (select 1 from public.user_database_deletions where database_id = trim(v_id)) then
            insert into public.user_databases (database_id, user_id, created_at)
            values (trim(v_id), p_user, now())
            on conflict (database_id) do nothing;
          end if;
        end if;
      end loop;
    end if;
    insert into public.user_database_syncs (user_id, synced_at)
    values (p_user, now())
    on conflict (user_id) do nothing;
  end if;

  -- Count existing databases for this user
  select count(*)::integer into v_count from public.user_databases where user_id = p_user;

  -- If this database is already allocated for this user, treat as idempotent success
  if exists (select 1 from public.user_databases where database_id = p_database and user_id = p_user) then
    return query select true, v_count;
    return;
  end if;

  -- Foreign database collision: database_id exists for ANOTHER user
  if exists (select 1 from public.user_databases where database_id = p_database and user_id <> p_user) then
    return query select false, v_count;
    return;
  end if;

  -- Enforce quota limit
  if v_count >= p_max then
    return query select false, v_count;
    return;
  end if;

  insert into public.user_databases (database_id, user_id, created_at)
  values (p_database, p_user, now())
  on conflict (database_id) do nothing;

  if not found then
    return query select false, v_count;
    return;
  end if;

  return query select true, v_count + 1;
end;
$$;

revoke all on function public.database_allocate(uuid, text, integer, text[]) from public, anon, authenticated;
grant execute on function public.database_allocate(uuid, text, integer, text[]) to service_role;

-- Release an allocated database slot upon deletion.
create or replace function public.database_deallocate(p_user uuid, p_database text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  -- Mark deletion as completed if an active claim exists for this user
  update public.user_database_deletions
  set completed_at = coalesce(completed_at, now())
  where database_id = p_database and user_id = p_user;

  delete from public.user_databases where database_id = p_database and user_id = p_user;
  select count(*)::integer into v_count from public.user_databases where user_id = p_user;
  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.database_deallocate(uuid, text) from public, anon, authenticated;
grant execute on function public.database_deallocate(uuid, text) to service_role;

-- Batch sync existing KV databases into SQL for conservative cutover.
create or replace function public.database_sync_batch(p_user uuid, p_database_ids text[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_id text;
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  perform 1 from public.credit_accounts where user_id = p_user for update;

  -- Only import if not already synced; once synced, do not resurrect deleted databases!
  if not exists (select 1 from public.user_database_syncs where user_id = p_user) then
    if p_database_ids is not null then
      foreach v_id in array p_database_ids loop
        if v_id is not null and length(trim(v_id)) > 0 then
          if not exists (select 1 from public.user_database_deletions where database_id = trim(v_id)) then
            insert into public.user_databases (database_id, user_id, created_at)
            values (trim(v_id), p_user, now())
            on conflict (database_id) do nothing;
          end if;
        end if;
      end loop;
    end if;
    insert into public.user_database_syncs (user_id, synced_at)
    values (p_user, now())
    on conflict (user_id) do nothing;
  end if;

  select count(*)::integer into v_count from public.user_databases where user_id = p_user;
  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.database_sync_batch(uuid, text[]) from public, anon, authenticated;
grant execute on function public.database_sync_batch(uuid, text[]) to service_role;

-- Query current database count from PostgreSQL.
create or replace function public.database_count(p_user uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  select count(*)::integer into v_count from public.user_databases where user_id = p_user;
  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.database_count(uuid) from public, anon, authenticated;
grant execute on function public.database_count(uuid) to service_role;

-- Atomically check and claim database deletion, preventing check-then-act race with crawl start.
-- Deletion reservation is separated from completion: the quota slot stays occupied until
-- remote deletion and cleanup finish and database_deallocate is called.
-- Existing claims by the same user can be resumed idempotently upon retry.
create or replace function public.database_claim_delete(p_user uuid, p_database text)
returns table (allowed boolean, reason text) language plpgsql security definer set search_path = '' as $$
declare
  v_holds_count integer;
  v_existing_claim record;
  v_db_owner uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  -- Check if already claimed for deletion
  select user_id, completed_at into v_existing_claim
  from public.user_database_deletions
  where database_id = p_database;

  if found then
    -- Different user cannot resume or touch this deletion claim
    if v_existing_claim.user_id <> p_user then
      return query select false, 'not_found'::text;
      return;
    end if;

    -- If already completed, it is permanently deleted
    if v_existing_claim.completed_at is not null then
      return query select false, 'not_found'::text;
      return;
    end if;

    -- Otherwise, it is an in-progress claim by the SAME user (retry after partial failure)
    select count(*)::integer into v_holds_count from public.credit_holds
    where user_id = p_user and database_id = p_database;

    if v_holds_count > 0 then
      return query select false, 'active_crawl'::text;
      return;
    end if;

    return query select true, 'ok'::text;
    return;
  end if;

  -- Not in user_database_deletions yet. Check user_databases.
  select user_id into v_db_owner
  from public.user_databases
  where database_id = p_database;

  if found then
    if v_db_owner <> p_user then
      return query select false, 'not_found'::text;
      return;
    end if;
  else
    -- Database not in user_databases.
    -- Could be an unsynced KV database of p_user. Ensure no other user has holds or access.
    if exists (select 1 from public.credit_holds where database_id = p_database and user_id <> p_user) then
      return query select false, 'not_found'::text;
      return;
    end if;
    if exists (select 1 from public.crawl_access where database_id = p_database and user_id <> p_user) then
      return query select false, 'not_found'::text;
      return;
    end if;
  end if;

  -- Check for open holds (active crawls) for this database
  select count(*)::integer into v_holds_count from public.credit_holds
  where user_id = p_user and database_id = p_database;

  if v_holds_count > 0 then
    return query select false, 'active_crawl'::text;
    return;
  end if;

  -- Check crawl_access ready flag when associated hold is active
  if exists(
    select 1 from public.crawl_access ca
    join public.credit_holds ch on ca.reference = ch.reference
    where ca.user_id = p_user and ca.database_id = p_database and ca.ready = false
  ) then
    return query select false, 'active_crawl'::text;
    return;
  end if;

  -- Atomically record deletion claim WITHOUT removing from user_databases.
  -- The quota slot stays allocated until database_deallocate is called.
  insert into public.user_database_deletions (database_id, user_id, claimed_at, completed_at)
  values (p_database, p_user, now(), null)
  on conflict (database_id) do update
    set claimed_at = now()
    where public.user_database_deletions.user_id = p_user
      and public.user_database_deletions.completed_at is null;

  return query select true, 'ok'::text;
end;
$$;

revoke all on function public.database_claim_delete(uuid, text) from public, anon, authenticated;
grant execute on function public.database_claim_delete(uuid, text) to service_role;

-- Atomically bind crawl reservation to database and verify database exists (not deleted or claimed for deletion).
-- Serialized with database_claim_delete via pg_advisory_xact_lock to eliminate check-then-act races.
create or replace function public.bind_crawl_hold(p_reference text, p_database text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  select user_id into v_user from public.credit_holds where reference = p_reference for update;
  if not found then
    raise exception 'Missing crawl reservation';
  end if;

  -- Serialize with database_claim_delete and other database operations for this user
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  -- Ensure database has not been deleted or claimed for deletion
  if exists (select 1 from public.user_database_deletions where database_id = p_database) then
    raise exception 'Database not found or deletion in progress';
  end if;

  -- If database is already registered, ensure it belongs to v_user
  if exists (select 1 from public.user_databases where database_id = p_database and user_id <> v_user) then
    raise exception 'Database belongs to another user';
  end if;

  update public.credit_holds set database_id = p_database where reference = p_reference;
  insert into public.crawl_access(database_id, user_id, reference, ready) values(p_database, v_user, p_reference, false)
  on conflict(database_id) do update set reference = excluded.reference, ready = false;
end;
$$;

revoke all on function public.bind_crawl_hold(text, text) from public, anon, authenticated;
grant execute on function public.bind_crawl_hold(text, text) to service_role;

-- Diagnostic preflight check: verifies function signatures and service_role execution rights
-- without mutating data, creating dummy users, or violating foreign key constraints.
create or replace function public.database_preflight_check()
returns table (
  function_name text,
  signature_valid boolean,
  service_role_executable boolean
) language plpgsql security definer set search_path = '' as $$
declare
  v_req record;
  v_proc_oid oid;
  v_has_priv boolean;
begin
  for v_req in
    select * from (values
      ('database_allocate', 'database_allocate(uuid,text,integer,text[])'),
      ('database_deallocate', 'database_deallocate(uuid,text)'),
      ('database_sync_batch', 'database_sync_batch(uuid,text[])'),
      ('database_count', 'database_count(uuid)'),
      ('database_claim_delete', 'database_claim_delete(uuid,text)'),
      ('bind_crawl_hold', 'bind_crawl_hold(text,text)')
    ) as t(fn_name, fn_sig)
  loop
    select p.oid into v_proc_oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid = to_regprocedure('public.' || v_req.fn_sig);

    if v_proc_oid is null then
      function_name := v_req.fn_name;
      signature_valid := false;
      service_role_executable := false;
      return next;
    else
      select has_function_privilege('service_role', v_proc_oid, 'EXECUTE') into v_has_priv;
      function_name := v_req.fn_name;
      signature_valid := true;
      service_role_executable := coalesce(v_has_priv, false);
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.database_preflight_check() from public, anon, authenticated;
grant execute on function public.database_preflight_check() to service_role;
