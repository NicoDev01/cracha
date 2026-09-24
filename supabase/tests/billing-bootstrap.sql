-- Isolated, EMPTY test database only. Existing auth schema intentionally fails.
create schema auth;
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin; end if;
end $$;
create table auth.users(id uuid primary key, email text, created_at timestamptz not null default now(), email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
create table public.user_plans(user_id uuid, stripe_customer_id text);
